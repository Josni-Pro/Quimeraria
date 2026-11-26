import { CARDS, RARITIES } from "./catalog.js";
import { getLegacyPackOdds, getShopPackOdds, rollLegacyPack, rollShopPack } from "./pack-rules.js";

const cards = new Map(CARDS.map(card => [card.id,card]));
export function seededRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value,1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function simulatePacks(id, iterations = 10_000, seed = 1977) {
  if (!Number.isInteger(iterations) || iterations < 1) throw new RangeError("Indica una cantidad positiva de aperturas.");
  const profile = getShopPackOdds(id);
  const old = !profile && getLegacyPackOdds({},id);
  if (!profile && !old) throw new RangeError("Sobre desconocido.");
  const pack = (profile || old).pack;
  const rng = seededRng(seed);
  const counts = Object.fromEntries(CARDS.map(card => [card.id, { copies:0, presence:0 }]));
  const rarities = RARITIES.map(() => ({ copies:0, presence:0 }));
  const featured = new Set(profile?.groups.filter(group => group.thematic).flatMap(group => Object.keys(group.byCard)));
  const allowed = new Set(profile ? profile.cards.map(({ card }) => card.id) :
    old.pools.flatMap((pool,i) => old.odds[i] ? pool.map(card => card.id) : []));
  const reserved = profile?.groups.filter(group => group.family !== "general") ?? [];
  let duplicates = 0, withDuplicates = 0, thematic = 0, violations = 0, pity = {}, guaranteesActivated = 0;
  for (let n = 0; n < iterations; n++) {
    const historic = old && rollLegacyPack(pity,id,rng);
    const ids = historic ? historic.cards : rollShopPack(id,rng);
    if (historic) {
      pity = historic.pity;
      guaranteesActivated += Number(historic.pityTriggered);
    }
    const unique = new Set(ids);
    const presentRarities = new Set();
    for (const cardId of ids) {
      const rarity = cards.get(cardId).rarity;
      counts[cardId].copies++;
      rarities[rarity].copies++;
      presentRarities.add(rarity);
      thematic += Number(featured.has(cardId));
    }
    for (const cardId of unique) counts[cardId].presence++;
    for (const rarity of presentRarities) rarities[rarity].presence++;
    duplicates += ids.length - unique.size;
    withDuplicates += Number(ids.length !== unique.size);

    // Los grupos más estrechos preceden a sus superconjuntos en las definiciones.
    const unassigned = [...ids].sort((a,b) => cards.get(a).rarity-cards.get(b).rarity);
    if (ids.length !== pack.slots || ids.some(cardId => !allowed.has(cardId)) || reserved.some(group => {
      for (let i = 0; i < group.count; i++) {
        const at = unassigned.findIndex(cardId => Object.hasOwn(group.byCard,cardId));
        if (at === -1) return true;
        unassigned.splice(at,1);
      }
      return false;
    })) violations++;
  }
  const perPack = values => values.map(value => ({ copies: value.copies / iterations, presence: value.presence / iterations }));
  return { id, seed: seed >>> 0, iterations, slots:pack.slots, violations, guaranteesActivated,
    duplicates: duplicates / iterations, withDuplicates: withDuplicates / iterations, thematic: thematic / iterations,
    rarities: perPack(rarities), cards: Object.fromEntries(Object.entries(counts).map(([id, value]) => [id,perPack([value])[0]])) };
}
