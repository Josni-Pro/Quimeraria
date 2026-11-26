import assert from "node:assert/strict";
import { LEGACY_PACKS, SHOP_PACKS } from "../docs/pack-config.js";
import { getShopPackOdds } from "../docs/pack-rules.js";
import { simulatePacks } from "../docs/pack-diagnostics.js";
import { quotePackPurchase } from "../docs/pack-transactions.js";

const count = Number(process.argv[2] ?? 10_000);
const seed = Number(process.argv[3] ?? 1977);
const results = [...LEGACY_PACKS,...SHOP_PACKS].map(pack => {
  const odds = getShopPackOdds(pack.id);
  const sample = simulatePacks(pack.id,count,seed);
  assert.equal(sample.violations,0);
  if (odds) for (const [rarity,expected] of odds.rarities.entries()) {
    const sd = Math.sqrt(expected * (1-expected) / count);
    assert.ok(Math.abs(sample.rarities[rarity].presence - expected) <= 5 * sd + .005,
      `Distribución inesperada en ${pack.id}/${rarity}`);
  }
  return {
    ...sample, cost:pack.cost,
    expectedRarities:odds?.expectedRarities,
    costsPerRarity: (odds?.expectedRarities ?? sample.rarities.map(r => r.copies)).map(mean =>
      mean > 0 ? [1,5,10].map(quantity => (odds ? quotePackPurchase({coins:0},pack.id,quantity).final/quantity : pack.cost)/mean) : null), rarityPresence:odds?.rarities,
    expectedThematic:odds?.expectedThematic, expectedDuplicates:odds?.expectedDuplicates,
    intendedSlots:odds?.groups.filter(group => group.thematic).reduce((n,group) => n + group.count,0),
    quotes: odds && [1,5,10].map(quantity => {
      const { cards, original, discount, saving, final }=quotePackPurchase({coins:0},pack.id,quantity);
      return { quantity,cards,original,discount,saving,final,perCard:final/cards };
    })
  };
});
console.log(JSON.stringify(results,null,2));
