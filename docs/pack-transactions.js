import { CARDS } from "./catalog.js";
import { historicalPack, MAX_PACK_PURCHASE, PACK_DISCOUNTS, packDefinition, shopPack } from "./pack-config.js";
import { rollLegacyPack, rollShopPack } from "./pack-rules.js";

const baseIds = new Set(CARDS.map(card => card.id));
const fail = error => ({ ok: false, error });
const natural = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const suffix = (id, prefix) => typeof id === "string" && id.startsWith(prefix + "-") &&
  /^[1-9][0-9]*$/.test(id.slice(prefix.length + 1)) ? natural(Number(id.slice(prefix.length + 1))) : 0;

export function quotePackPurchase(state, id, quantity) {
  const pack = shopPack(id);
  if (!pack) return fail("Este sobre no está a la venta.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PACK_PURCHASE) {
    return fail(`Elige de 1 a ${MAX_PACK_PURCHASE} sobres.`);
  }
  const original = pack.cost * quantity;
  const discount = PACK_DISCOUNTS[quantity] ?? 0;
  const final = Math.round(original * (100 - discount) / 100);
  return { ok: true, pack, quantity, cards: pack.slots * quantity, original, discount, saving: original - final,
    final, remaining: state.coins - final, affordable: state.coins >= final };
}

export function purchasePackBatch(state, id, quantity, expectedSequence) {
  if (expectedSequence !== undefined && expectedSequence !== state.sequence) {
    return fail("La confirmación ya cambió. Revisa el precio y vuelve a confirmar.");
  }
  const quote = quotePackPurchase(state,id,quantity);
  if (!quote.ok) return quote;
  if (!quote.affordable) return fail("No tienes suficientes óbolos para esta compra.");
  let sequence = state.sequence + 1;
  const batchId = `pack-order-${sequence}`;
  const basePaid = Math.floor(quote.final / quantity);
  const remainder = quote.final % quantity;
  const packs = Array.from({ length: quantity }, (_, index) => ({
    id: `pack-seal-${++sequence}`, packId: id, batchId, paid: basePaid + Number(index < remainder)
  }));
  return { ok: true, quote, batchId, packs,
    state: { ...state, sequence, coins: quote.remaining, packStock: [...(state.packStock ?? []), ...packs] } };
}

export function startPackOpening(state, sealIds, rng = Math.random) {
  if (state.pendingPack) return fail("Completa la apertura pendiente.");
  if (!Array.isArray(sealIds) || !sealIds.length || sealIds.length > MAX_PACK_PURCHASE || new Set(sealIds).size !== sealIds.length) {
    return fail("Selecciona sobres distintos de la misma compra.");
  }
  const stock = state.packStock ?? [];
  const inventory = new Map(stock.map(pack => [pack.id, pack]));
  const seals = sealIds.map(id => inventory.get(id));
  const first = seals[0];
  if (seals.some(seal => !seal || seal.batchId !== first.batchId || seal.packId !== first.packId)) {
    return fail("Alguno de estos sobres ya no está disponible.");
  }
  const definition = packDefinition(first.packId);
  if (!definition) return fail("Este sobre no tiene una definición disponible.");

  let sequence = state.sequence + 1;
  const id = `pack-opening-${sequence}`;
  const known = new Set(state.discovered);
  let pity = state.pity;
  const packs = seals.map(seal => {
    const historical = historicalPack(seal.packId) && rollLegacyPack(pity,seal.packId,rng);
    if (historical) pity = historical.pity;
    const ids = historical ? historical.cards : rollShopPack(seal.packId,rng);
    const cards = ids.map(cardId => {
      const record = { id: `base-copy-${++sequence}`, cardId, isNew: !known.has(cardId) };
      known.add(cardId);
      return record;
    });
    return { ...seal, cards, ...(historical?.pityTriggered && { pityTriggered: true }) };
  });
  const pendingPack = { id, packs, revealed: [] };
  return { ok: true, opening: pendingPack, state: { ...state, sequence, pity, pendingPack,
    packStock: stock.filter(seal => !sealIds.includes(seal.id)) } };
}

export function revealPackCards(state, openingId, selected = null) {
  const opening = state.pendingPack;
  if (!opening || opening.id !== openingId) return fail("Esta apertura ya terminó.");
  const cards = opening.packs.flatMap(pack => pack.cards);
  const outstanding = new Set(cards.filter(card => !opening.revealed.includes(card.id)).map(card => card.id));
  const requested = selected === null ? [...outstanding] : selected;
  if (!Array.isArray(requested) || !requested.length || requested.some(id => !outstanding.has(id))) {
    return fail("Estas cartas ya se revelaron.");
  }
  const revealed = [...new Set([...opening.revealed, ...requested])];
  const pendingPack = { ...opening, revealed };
  if (revealed.length < cards.length) return { ok: true, state: { ...state, pendingPack }, complete: false };

  const inventory = { ...state.inventory };
  const baseCopies = { ...state.baseCopies };
  for (const card of cards) {
    inventory[card.cardId] = (inventory[card.cardId] ?? 0) + 1;
    if (baseCopies[card.cardId] === state.baseCopies?.[card.cardId]) baseCopies[card.cardId] = [...(baseCopies[card.cardId] ?? [])];
    baseCopies[card.cardId].push({ id: card.id, packId: opening.packs[0].packId });
  }
  const ids = cards.map(card => card.cardId);
  const entry = { kind: "pack", packId: opening.packs[0].packId, cards: ids, quantity: opening.packs.length,
    paid: opening.packs.reduce((total, pack) => total + pack.paid, 0),
    pityTriggered: opening.packs.some(pack => pack.pityTriggered) };
  return { ok: true, complete: true, state: { ...state, pendingPack, inventory, baseCopies,
    discovered: [...new Set([...state.discovered, ...ids])],
    history: [entry, ...state.history].slice(0,24),
    stats: { ...state.stats, packs: state.stats.packs + opening.packs.length } } };
}

export function acknowledgePackOpening(state, openingId) {
  if (state.pendingPack?.id !== openingId ||
      state.pendingPack.revealed.length !== state.pendingPack.packs.reduce((n, pack) => n + pack.cards.length, 0)) {
    return fail("Revela las cartas para terminar la apertura.");
  }
  return { ok: true, state: { ...state, pendingPack: null } };
}

export function packStockGroups(state) {
  const batches = new Map();
  for (const pack of state.packStock ?? []) {
    if (!batches.has(pack.batchId)) batches.set(pack.batchId, []);
    batches.get(pack.batchId).push(pack);
  }
  return [...batches.values()].reverse();
}

export function getBaseCopies(state, id) {
  return baseIds.has(id) ? state.baseCopies?.[id] ?? [] : [];
}

export function restorePackData(raw, inventory) {
  let sequence = natural(raw.sequence);
  const restored = {};
  const seenSeals = new Set();
  const seal = saved => {
    const id = suffix(saved?.id,"pack-seal");
    const order = suffix(saved?.batchId,"pack-order");
    if (!id || !order || !packDefinition(saved?.packId) || seenSeals.has(saved.id)) return null;
    seenSeals.add(saved.id);
    sequence = Math.max(sequence,id,order);
    return { id: saved.id, packId: saved.packId, batchId: saved.batchId, paid: natural(saved.paid) };
  };
  const seenCards = new Set();
  function copy(saved) {
    const id = suffix(saved?.id,"base-copy");
    if (!id || seenCards.has(saved.id)) return false;
    seenCards.add(saved.id);
    sequence = Math.max(sequence,id);
    return true;
  }

  if (Array.isArray(raw.packStock)) restored.packStock = raw.packStock.map(seal).filter(Boolean);
  if (raw.pendingPack === null) restored.pendingPack = null;
  const opening = raw.pendingPack;
  if (suffix(opening?.id,"pack-opening") && Array.isArray(opening.packs) && opening.packs.length > 0 &&
      opening.packs.length <= MAX_PACK_PURCHASE) {
    const packId = opening.packs[0]?.packId;
    const definition = packDefinition(packId);
    const batchId = opening.packs[0]?.batchId;
    if (definition && opening.packs.every(pack => pack?.packId === packId && pack.batchId === batchId &&
      Array.isArray(pack.cards) && pack.cards.length === definition.slots && pack.cards.every(card => baseIds.has(card?.cardId)))) {
      const packs = opening.packs.map(saved => {
        const record = seal(saved);
        if (!record || !saved.cards.every(copy)) return null;
        return { ...record, cards: saved.cards.map(card => ({ id: card.id, cardId: card.cardId, isNew: Boolean(card.isNew) })),
          ...(saved.pityTriggered && { pityTriggered: true }) };
      });
      if (packs.every(Boolean)) {
        const ids = new Set(packs.flatMap(pack => pack.cards.map(card => card.id)));
        const revealed = Array.isArray(opening.revealed) ? [...new Set(opening.revealed.filter(id => ids.has(id)))] : [];
        sequence = Math.max(sequence,suffix(opening.id,"pack-opening"));
        restored.pendingPack = { id: opening.id, packs, revealed };
      }
    }
  }

  if (raw.baseCopies && typeof raw.baseCopies === "object" && !Array.isArray(raw.baseCopies)) {
    restored.baseCopies = {};
    // Una apertura terminada comparte referencias con las copias que entregó.
    seenCards.clear();
    const pendingIds = new Set(restored.pendingPack?.packs.flatMap(pack => pack.cards.map(card => card.id)));
    const complete = pendingIds.size === restored.pendingPack?.revealed.length;
    for (const [cardId, entries] of Object.entries(raw.baseCopies)) {
      if (!baseIds.has(cardId) || !inventory[cardId] || !Array.isArray(entries)) continue;
      const copies = [];
      for (const entry of entries) {
        if (copies.length >= inventory[cardId]) break;
        if (!packDefinition(entry?.packId) || (!complete && pendingIds.has(entry.id)) || !copy(entry)) continue;
        copies.push({ id: entry.id, packId: entry.packId });
      }
      if (copies.length) restored.baseCopies[cardId] = copies;
    }
  }
  return { ...restored, sequence };
}
