import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CARDS } from "../docs/catalog.js";
import { createGame, fuseCards, loadGame, serializeGame } from "../docs/engine.js";
import { CARD_PACK_TAGS, LEGACY_PACKS, PACK_DISCOUNTS, SHOP_PACKS } from "../docs/pack-config.js";
import { seededRng, simulatePacks } from "../docs/pack-diagnostics.js";
import { getShopPackOdds, rollLegacyPack, rollShopPack } from "../docs/pack-rules.js";
import { acknowledgePackOpening, getBaseCopies, purchasePackBatch, quotePackPurchase, revealPackCards, startPackOpening } from "../docs/pack-transactions.js";
import { renderPackOpening } from "../docs/pack-shop.js";

const reload = state => loadGame(serializeGame(state));
const start = () => ({ ...createGame(), coins:20_000 });
const collected = state => Object.values(state.inventory).reduce((total,value) => total+value,0);
const ids = operation => operation.packs.map(pack => pack.id);
const stateAfter = operation => {
  assert.ok(operation.ok, operation.error);
  return operation.state;
};

test("Ocho sobres usan las etiquetas del catálogo G0 y sus probabilidades se normalizan por grupo", () => {
  assert.equal(Object.keys(CARD_PACK_TAGS).length,31);
  assert.deepEqual(SHOP_PACKS.map(pack => pack.slots),[5,6,6,6,6,7,7,10]);
  assert.deepEqual(SHOP_PACKS.map(pack => pack.cost),[55,72,72,83,83,110,138,165]);
  assert.ok(CARD_PACK_TAGS.megalodon.includes("aquatic") && CARD_PACK_TAGS.megalodon.includes("prehistoric"));
  assert.ok(["aquatic","fantastic","mythological"].every(tag => CARD_PACK_TAGS.sirena.includes(tag)));
  assert.ok(["deity","mythological","aerial"].every(tag => CARD_PACK_TAGS.quetzalcoatl.includes(tag)));
  assert.ok(["profession","knowledge","magic"].every(tag => CARD_PACK_TAGS.alquimista.includes(tag)));
  for (const pack of SHOP_PACKS) {
    const { cards,groups,rarities } = getShopPackOdds(pack.id);
    assert.ok(cards.every(({ card,chance }) => CARDS.includes(card) && chance > 0 && chance <= 1));
    assert.ok(groups.every(group => Math.abs(Object.values(group.byCard).reduce((sum,value) => sum+value,0)-1)<1e-12));
    assert.deepEqual(rarities,rarities.map((_,i) => 1-groups.reduce((n,group) => n*(1-group.odds[i])**group.count,1)));
    assert.equal(cards.length,31);
  }
});

test("Mínimos temáticos y elegibilidad en 10 000 aperturas por tipo", () => {
  const expected = [[],[4],[4],[4],[4],[4],[1,3],[2,2,1,1,1]];
  for (const [index,pack] of SHOP_PACKS.entries()) {
    assert.deepEqual(pack.positions.filter(position => position.family !== "general").map(position => position.count),expected[index]);
    const simulation = simulatePacks(pack.id,10_000,1977);
    assert.equal(simulation.violations,0,pack.id);
    assert.ok(simulation.withDuplicates > 0);
    for (const [i,chance] of getShopPackOdds(pack.id).rarities.entries()) {
      assert.ok(Math.abs(simulation.rarities[i].presence-chance) < .006+5*Math.sqrt(chance*(1-chance)/10_000));
    }
  }
  assert.deepEqual(simulatePacks("quimerico",100,14),simulatePacks("quimerico",100,14));
});

test("Tarifas de 1, 5 y 10 en los ocho sobres, redondeo al final y saldo insuficiente", () => {
  const initial = start();
  for (const pack of SHOP_PACKS) {
    for (const quantity of [1,5,10]) {
      const quote = quotePackPurchase(initial,pack.id,quantity);
      assert.equal(quote.discount,PACK_DISCOUNTS[quantity]);
      assert.equal(quote.original,pack.cost*quantity);
      assert.equal(quote.final,Math.round(quote.original*(100-quote.discount)/100));
      assert.equal(quote.saving,quote.original-quote.final);
      assert.equal(quote.cards,pack.slots*quantity);
      const operation = purchasePackBatch(initial,pack.id,quantity,initial.sequence);
      assert.equal(operation.state.coins,initial.coins-quote.final);
      assert.equal(operation.packs.reduce((n,pack) => n+pack.paid,0),quote.final);
      assert.equal(operation.packs.length,quantity);
      assert.equal(collected(operation.state),collected(initial));
      assert.ok(!purchasePackBatch({...initial,coins:quote.final-1},pack.id,quantity).ok);
      assert.ok(purchasePackBatch({...initial,coins:quote.final},pack.id,quantity).ok);
      assert.ok(!purchasePackBatch(operation.state,pack.id,quantity,initial.sequence).ok);
    }
  }
  assert.equal(quotePackPurchase(initial,"primordial",5).final,394);
  assert.equal(quotePackPurchase(initial,"quimerico",10).final,1485);
  assert.equal(quotePackPurchase(initial,"panteon",3).discount,0);
  for (const value of [-1,0,1.2,Infinity,NaN,11,"5",null]) assert.ok(!purchasePackBatch(initial,"quimerico",value).ok);
  assert.ok(!purchasePackBatch(initial,"esencial",1).ok);
});

test("Cien cartas Quiméricas tras recargar sin cambiar el sorteo, consumir sobres extra ni duplicar créditos", () => {
  const initial = start();
  const paid = purchasePackBatch(initial,"quimerico",10,initial.sequence);
  const bought = reload(stateAfter(paid));
  assert.equal(bought.packStock.length,10);
  assert.equal(bought.coins,initial.coins-1485);
  assert.ok(!startPackOpening(bought,[ids(paid)[0],ids(paid)[0]]).ok);
  const pending = startPackOpening(bought,ids(paid),seededRng(71));
  const restored = reload(stateAfter(pending));
  assert.deepEqual(restored.pendingPack,pending.opening);
  assert.equal(restored.packStock.length,0);
  assert.equal(collected(restored),collected(initial));
  assert.ok(!startPackOpening(restored,ids(paid)).ok);
  const openingId = pending.opening.id;
  assert.ok(!acknowledgePackOpening(restored,openingId).ok);
  const first = pending.opening.packs[0].cards[0];
  const previewed = reload(stateAfter(revealPackCards(restored,openingId,[first.id])));
  assert.deepEqual(previewed.pendingPack.revealed,[first.id]);
  assert.equal(collected(previewed),collected(initial));
  const earned = reload(stateAfter(revealPackCards(previewed,openingId)));
  assert.equal(collected(earned)-collected(initial),100);
  assert.equal(earned.coins,bought.coins);
  assert.equal(earned.stats.packs,initial.stats.packs+10);
  assert.equal(earned.history[0].paid,1485);
  assert.equal(earned.history[0].quantity,10);
  assert.equal(new Set(Object.values(earned.baseCopies).flat().map(copy => copy.id)).size,100);
  assert.ok(!revealPackCards(earned,openingId).ok);
  const finished = reload(stateAfter(acknowledgePackOpening(earned,openingId)));
  assert.ok(!revealPackCards(finished,openingId).ok);
  assert.ok(!startPackOpening(finished,ids(paid)).ok);
  assert.deepEqual(finished.inventory,earned.inventory);
});

test("La compra múltiple tiene el mismo sorteo que los sobres normales y los reversos no exponen cartas", () => {
  for (const pack of SHOP_PACKS) {
    const paid = purchasePackBatch(start(),pack.id,5);
    const opening = stateAfter(startPackOpening(paid.state,ids(paid),seededRng(363)));
    const random = seededRng(363);
    for (const receipt of opening.pendingPack.packs) {
      assert.deepEqual(receipt.cards.map(card => card.cardId),rollShopPack(pack.id,random));
    }
    const ui = { sheet:0, flip:null };
    const html = renderPackOpening(opening,ui,() => assert.fail("Un reverso consultó la carta"),() => assert.fail("Un reverso cargó un retrato"));
    assert.equal([...html.matchAll(/class="pack-back"/g)].length,pack.slots);
    assert.doesNotMatch(html,/class="pack-face"|data-rare="/);
  }
});

test("Los sobres sellados históricos conservan cantidad, rareza y garantía de su contador", () => {
  for (const pack of LEGACY_PACKS) {
    const legacy = reload({ ...start(), version:4, pity:{[pack.id]:pack.pityAt-1},
      packStock:[{ id:"pack-seal-8",batchId:"pack-order-7",packId:pack.id,paid:pack.cost }] });
    const opened = startPackOpening(legacy,["pack-seal-8"],() => 0);
    assert.equal(opened.opening.packs[0].cards.length,3);
    assert.equal(opened.opening.packs[0].pityTriggered,true);
    assert.deepEqual(opened.opening.packs[0].cards.map(card => card.cardId),rollLegacyPack(legacy.pity,pack.id,() => 0).cards);
    assert.equal(opened.state.coins,legacy.coins);
  }
  const saved = readFileSync(new URL("./fixtures/quimeraria-v3-before-refinement.json",import.meta.url),"utf8");
  const old = JSON.parse(saved), migrated = loadGame(saved);
  for (const key of ["coins","inventory","discovered","pity","essences","fusions"]) assert.deepEqual(migrated[key],old[key]);
});

test("El historial de descubrimientos se respeta y las copias compradas se consumen una a una", () => {
  const initial = { ...start(), discovered:[...start().discovered,"civil"] };
  const bought = purchasePackBatch(initial,"explorador",1);
  const opened = startPackOpening(bought.state,ids(bought),() => 0);
  assert.ok(opened.opening.packs[0].cards.every(card => card.cardId === "civil" && !card.isNew));
  const awarded = stateAfter(revealPackCards(opened.state,opened.opening.id));
  const copies = getBaseCopies(awarded,"civil");
  assert.equal(copies.length,5);
  const fused = stateAfter(fuseCards(awarded,"civil","lobo",() => 0));
  assert.deepEqual(getBaseCopies(reload(fused),"civil"),copies.slice(1));
  const never = purchasePackBatch(start(),"explorador",1);
  const fresh = startPackOpening(never.state,ids(never),() => 0);
  assert.equal(fresh.opening.packs[0].cards.filter(card => card.isNew).length,1);
});

test("Los ocho recursos de tienda son WebP verticales y ligeros", () => {
  const dimension = data => {
    if (data.toString("ascii",12,16) === "VP8X") return [data.readUIntLE(24,3)+1,data.readUIntLE(27,3)+1];
    assert.equal(data.toString("ascii",12,16),"VP8 ");
    return [data.readUInt16LE(26)&16383,data.readUInt16LE(28)&16383];
  };
  for (const pack of SHOP_PACKS) {
    const image = readFileSync(new URL("../docs/"+pack.art.slice(2),import.meta.url));
    assert.equal(image.toString("ascii",8,12),"WEBP");
    assert.deepEqual(dimension(image),[768,1152]);
    assert.ok(image.length<170_000);
  }
});
