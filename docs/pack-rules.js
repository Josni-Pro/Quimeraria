import { CARDS, RARITIES } from "./catalog.js";
import { CARD_PACK_TAGS, historicalPack, PACK_FAMILIES, PACK_RULES_VERSION, shopPack } from "./pack-config.js";

const poolsByFamily = Object.fromEntries(Object.entries(PACK_FAMILIES).map(([family, { matches }]) =>
  [family, RARITIES.map((_, rare) => CARDS.filter(card => card.rarity === rare && matches(CARD_PACK_TAGS[card.id])))]));
const legacyPools = new Map();
const profiles = new Map();

export function sample(rng) {
  const value = rng();
  return Number.isFinite(value) ? Math.max(0, Math.min(1 - Number.EPSILON, value)) : 0;
}

function eligibleWeights(weights, pools) {
  return weights.map((weight, rarity) => pools[rarity].length && weight > 0 ? weight : 0);
}

function normalize(weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map(weight => total > 0 ? weight / total : 0);
}

function draw(pools, weights, rng) {
  let cursor = sample(rng) * weights.reduce((sum,weight) => sum + weight,0);
  let rarity = weights.findLastIndex(weight => weight > 0);
  for (let i = 0; i < weights.length; i++) {
    cursor -= weights[i];
    if (cursor < 0) { rarity = i; break; }
  }
  const pool = pools[rarity];
  return pool[Math.floor(sample(rng) * pool.length)].id;
}

export function getShopPackOdds(id,version = PACK_RULES_VERSION) {
  const key = id+"@"+version;
  if (profiles.has(key)) return profiles.get(key);
  const pack = shopPack(id,version);
  if (!pack) return null;
  const groups = pack.positions.map(({ family, count, weights }) => {
    const pools = poolsByFamily[family];
    const odds = normalize(eligibleWeights(weights,pools));
    if (!odds.some(Boolean)) throw new Error(`No hay resultados para ${id}/${family}.`);
    const byCard = Object.fromEntries(pools.flatMap((pool, rarity) => odds[rarity]
      ? pool.map(card => [card.id, odds[rarity] / pool.length]) : []));
    return { family, thematic: !["general","premium"].includes(family), label: PACK_FAMILIES[family].name, count, weights, pools, odds, byCard };
  });
  const atLeastOne = key => 1 - groups.reduce((none, group) => none * (1 - key(group)) ** group.count, 1);
  const rarities = RARITIES.map((_, index) => atLeastOne(group => group.odds[index]));
  const expectedRarities = RARITIES.map((_, index) => groups.reduce((n, group) => n + group.odds[index] * group.count, 0));
  const cards = CARDS.filter(card => groups.some(group => group.byCard[card.id])).map(card => ({
    card, chance: atLeastOne(group => group.byCard[card.id] ?? 0),
    expected: groups.reduce((sum, group) => sum + (group.byCard[card.id] ?? 0) * group.count, 0)
  }));
  const themedIds = new Set(groups.filter(group => group.thematic).flatMap(group => Object.keys(group.byCard)));
  const expectedThematic = cards.reduce((total, row) => total + (themedIds.has(row.card.id) ? row.expected : 0),0);
  const expectedDuplicates = pack.slots - cards.reduce((total, row) => total + row.chance,0);
  const profile = { pack, groups, rarities, expectedRarities, expectedThematic, expectedDuplicates, cards };
  profiles.set(key,profile);
  return profile;
}

export function rollShopPack(id, rng = Math.random, version) {
  const profile = getShopPackOdds(id,version);
  if (!profile) return [];
  const cards = profile.groups.flatMap(({ pools, odds, count }) =>
    Array.from({ length: count }, () => draw(pools, odds, rng)));
  // La mezcla evita que la posición visual del reverso delate una garantía temática.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(sample(rng) * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function getLegacyPackOdds(pity, id) {
  const pack = historicalPack(id);
  if (!pack) return null;
  if (!legacyPools.has(id)) legacyPools.set(id, RARITIES.map((_, rarity) => CARDS.filter(card =>
    card.rarity === rarity && (!pack.categories || pack.categories.includes(card.category)))));
  const pools = legacyPools.get(id);
  const weights = eligibleWeights(pack.weights,pools);
  const protectedWeights = weights.map((weight,rarity) => rarity >= pack.pityRarity ? weight : 0);
  const odds = normalize(weights);
  const protectedOdds = normalize(protectedWeights);
  const counter = pity[id] ?? 0;
  const hasPity = Boolean(pack.pityAt && protectedOdds.some(Boolean));
  const remaining = hasPity ? Math.max(1, pack.pityAt - counter) : null;
  return { pack, pools, odds, protectedOdds, weights, protectedWeights, counter, hasPity, remaining, pityActive: remaining === 1 };
}

const rarityById = new Map(CARDS.map(card => [card.id, card.rarity]));
export function rollLegacyPack(pity, id, rng = Math.random) {
  const { pack, pools, weights, protectedWeights, hasPity, counter, pityActive } = getLegacyPackOdds(pity, id);
  const cards = [];
  let qualified = false;
  let pityTriggered = false;
  for (let i = 0; i < pack.slots; i++) {
    const guaranteed = pityActive && !qualified && i === pack.slots - 1;
    const cardId = draw(pools, guaranteed ? protectedWeights : weights, rng);
    cards.push(cardId);
    qualified ||= rarityById.get(cardId) >= pack.pityRarity;
    pityTriggered ||= guaranteed;
  }
  const next = { ...pity };
  if (!hasPity || qualified) delete next[id];
  else next[id] = counter + 1;
  return { cards, pity: next, pityTriggered };
}
