import {
  ABILITIES, CARDS, ECONOMY, MISSIONS, PACKS, RARITIES, RECIPES, STATS, STARTER, TRAITS
} from "./catalog.js";
import { nameFusion } from "./fusion-names.js";

export const SAVE_VERSION = 1;
export const MAX_GENERATION = 2;

const STAT_KEYS = Object.keys(STATS);
const RARITY_CAP = RARITIES.length - 1;
const MAX_ABILITY_BONUS = 3;
const MAX_HISTORY = 24;
const MAX_PORTRAIT_LEVEL = 3;
const BASE_CARDS = new Map(CARDS.map(card => [card.id, {
  ...card, generation: 0, parents: [], lineage: [card.id]
}]));
const RECIPE_BY_PARENTS = new Map(RECIPES.map(recipe => [fusionId(...recipe.parents), recipe]));
const PACK_BY_ID = new Map(PACKS.map(pack => [pack.id, pack]));
const MISSION_BY_ID = new Map(MISSIONS.map(mission => [mission.id, mission]));

function fusionId(...ids) {
  return `fusion(${ids.sort().join("+")})`;
}

function owns(map, id) {
  return Object.hasOwn(map, id) ? map[id] : undefined;
}

function error(message) {
  return { ok: false, error: message };
}

function unique(values) {
  return [...new Set(values)];
}

function countSelections(ids) {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

function hasSelection(state, ids) {
  return [...countSelections(ids)].every(([id, required]) => (owns(state.inventory, id) ?? 0) >= required);
}

function record(state, entry) {
  return [entry, ...state.history].slice(0, MAX_HISTORY);
}

function inventoryAfter(state, removed, added) {
  const inventory = { ...state.inventory };
  for (const [id, amount] of countSelections(removed)) {
    inventory[id] -= amount;
    if (inventory[id] === 0) delete inventory[id];
  }
  for (const [id, amount] of countSelections(added)) {
    inventory[id] = (owns(inventory, id) ?? 0) + amount;
  }
  return inventory;
}

export function createGame() {
  return {
    version: SAVE_VERSION,
    coins: ECONOMY.startingCoins,
    pity: {},
    inventory: { ...STARTER },
    fusions: {},
    portraits: {},
    discovered: Object.keys(STARTER),
    history: [],
    stats: { packs: 0, fusions: 0, expeditions: 0, won: 0, missions: {} }
  };
}

export function getCard(id, state) {
  return BASE_CARDS.get(id) ?? (state ? owns(state.fusions, id) : undefined);
}

function topStat(stats) {
  return STAT_KEYS.reduce((best, stat) => stats[stat] > stats[best] ? stat : best);
}

function families(card) {
  return unique(card.traits.map(trait => TRAITS[trait]?.family).filter(Boolean));
}

function origins(card) {
  return unique(card.lineage.map(id => BASE_CARDS.get(id).category));
}

function sameLineage(a, b) {
  return (a.generation > 0 || b.generation > 0) && a.lineage.some(id => b.lineage.includes(id));
}

function budgetCurve(a, b, rarity, specialization) {
  const budget = RARITIES[rarity].budget;
  const maxStat = Math.ceil(budget * 0.58);
  const minimum = 2;
  const weights = Object.fromEntries(STAT_KEYS.map(stat => [
    stat, a.stats[stat] + b.stats[stat] + (stat === specialization.stat ? specialization.weight : 0)
  ]));
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const stats = Object.fromEntries(STAT_KEYS.map(stat => [stat, minimum]));
  const distributable = budget - minimum * STAT_KEYS.length;
  const ideal = Object.fromEntries(STAT_KEYS.map(stat => [
    stat, budget * weights[stat] / totalWeight
  ]));

  for (let remaining = distributable; remaining > 0; remaining -= 1) {
    const candidates = STAT_KEYS.filter(stat => stats[stat] < maxStat);
    const next = candidates.reduce((best, stat) =>
      ideal[stat] - stats[stat] > ideal[best] - stats[best] ? stat : best);
    stats[next] += 1;
  }
  return stats;
}

function inherentAbility(a, b, combinedStats) {
  const options = [a.ability, b.ability].filter(id => id && owns(ABILITIES, id));
  const mainStat = topStat(combinedStats);
  return options.sort((first, second) =>
    Number(ABILITIES[second].stat === mainStat) - Number(ABILITIES[first].stat === mainStat) ||
    ABILITIES[second].bonus - ABILITIES[first].bonus)[0] ?? null;
}

function inheritedTraits(a, b, sharedTraits, recipe) {
  return unique([
    ...(recipe?.traits ?? []),
    a.traits[0],
    b.traits[0],
    ...sharedTraits,
    ...a.traits,
    ...b.traits
  ].filter(id => id && owns(TRAITS, id))).slice(0, 3);
}

function createFusion(a, b, previous) {
  const id = fusionId(a.id, b.id);
  const recipe = RECIPE_BY_PARENTS.get(id) ?? null;
  const sharedTraits = a.traits.filter(trait => b.traits.includes(trait));
  const bFamilies = families(b);
  const sharedFamilies = families(a).filter(family => bFamilies.includes(family));
  const complementary = topStat(a.stats) !== topStat(b.stats);
  const aOrigins = origins(a);
  const bOrigins = origins(b);
  const differentOrigins = aOrigins.length !== bOrigins.length || aOrigins.some(origin => !bOrigins.includes(origin));
  const affinity = Boolean(sharedTraits.length || sharedFamilies.length);
  const synergy = Number(affinity) + Number(complementary) + Number(differentOrigins);

  const baseRarity = Math.floor((a.rarity + b.rarity) / 2);
  const naturalRarity = baseRarity + Number(synergy >= 2);
  const strongest = Math.max(a.rarity, b.rarity);
  const topTierAllowed = Math.min(a.rarity, b.rarity) >= RARITY_CAP - 1;
  const proposedTier = recipe?.rarity ?? naturalRarity;
  const rarity = Math.min(proposedTier, strongest + 1, topTierAllowed ? RARITY_CAP : RARITY_CAP - 1);
  const combinedStats = Object.fromEntries(STAT_KEYS.map(stat => [stat, a.stats[stat] + b.stats[stat]]));
  const ability = previous ? previous.ability : (recipe?.ability ?? inherentAbility(a, b, combinedStats));
  const traits = inheritedTraits(a, b, sharedTraits, recipe);
  const specialization = recipe?.specialization ?? { stat: ability ? ABILITIES[ability]?.stat : null, weight: 2 };
  const weight = Math.max(0, Math.min(6, specialization.weight));
  const stats = previous?.stats ?? budgetCurve(a, b, rarity, { ...specialization, weight });

  const explanation = [];
  if (previous) explanation.push("La fusión conserva la carta que ya descubriste.");
  else if (recipe) explanation.push("La fórmula registrada determina el nombre y los rasgos destacados.");
  if (differentOrigins) explanation.push("Los orígenes distintos aportan un punto de afinidad.");
  if (sharedTraits.length) {
    explanation.push(`Comparten ${sharedTraits.map(trait => TRAITS[trait].name.toLowerCase()).join(", ")} y ganan un punto de afinidad.`);
  } else if (affinity) {
    explanation.push("Los rasgos emparentados aportan un punto de afinidad.");
  }
  if (complementary) explanation.push("Las especialidades complementarias aportan un punto de afinidad.");
  if (!previous && recipe?.rarity !== undefined) {
    explanation.push("Esta fórmula fija su rareza dentro del límite de sus materiales.");
  } else if (!previous) {
    explanation.push(synergy >= 2 && rarity > baseRarity
      ? "La afinidad eleva un grado la rareza media de los materiales."
      : "La rareza parte del promedio de los materiales, redondeado hacia abajo.");
    if (proposedTier >= RARITY_CAP && !topTierAllowed) {
      explanation.push("Una quimera mítica requiere dos materiales épicos o míticos.");
    }
  }
  if (ability) {
    const effect = ABILITIES[ability];
    explanation.push(`${effect.name} aporta +${Math.min(effect.bonus, MAX_ABILITY_BONUS)} de ${STATS[effect.stat].name.toLowerCase()} en expediciones de ese atributo.`);
  }

  const card = previous ?? {
    id,
    name: recipe?.name ?? nameFusion(id, a, b, lineageId => BASE_CARDS.get(lineageId)),
    category: "fusion",
    rarity,
    stats,
    ability,
    traits,
    art: recipe?.art ?? null,
    description: recipe?.description ?? `Quimera que combina los rasgos de ${a.name} y ${b.name}.`,
    generation: Math.max(a.generation, b.generation) + 1,
    parents: [a.id, b.id],
    lineage: unique([...a.lineage, ...b.lineage]).sort()
  };
  const statBreakdown = Object.fromEntries(STAT_KEYS.map(stat => [stat, {
    first: a.stats[stat], second: b.stats[stat], result: stats[stat]
  }]));
  return { card, recipe, synergy, explanation, sharedTraits, statBreakdown };
}

export function previewFusion(state, idA, idB) {
  const [a, b] = [idA, idB].sort().map(id => getCard(id, state));
  if (!a || !b) return error("Selecciona dos cartas para ver su fusión.");
  if (!hasSelection(state, [idA, idB])) return error("Necesitas una copia disponible por cada material.");
  if (Math.max(a.generation, b.generation) >= MAX_GENERATION) {
    return error("Una quimera de segunda generación ya alcanzó su límite de fusión.");
  }
  if (sameLineage(a, b)) return error("Una quimera requiere materiales que no repitan sus linajes.");

  const id = fusionId(a.id, b.id);
  const previous = getCard(id, state);
  const fusion = createFusion(a, b, previous);
  const cost = ECONOMY.fusionCosts[Math.max(a.rarity, b.rarity)];
  const currentPortrait = owns(state.portraits ?? {}, id) ?? Number(Boolean(previous));
  const portraitLevel = Math.min(MAX_PORTRAIT_LEVEL, currentPortrait + 1);
  return { ok: true, ...fusion, cost, affordable: state.coins >= cost, portraitLevel };
}

export function fuseCards(state, idA, idB) {
  const preview = previewFusion(state, idA, idB);
  if (!preview.ok) return preview;
  if (!preview.affordable) return error("No tienes suficientes monedas para esta fusión.");

  const { card, cost, portraitLevel } = preview;
  const next = {
    ...state,
    coins: state.coins - cost,
    inventory: inventoryAfter(state, [idA, idB], [card.id]),
    fusions: { ...state.fusions, [card.id]: card },
    portraits: { ...state.portraits, [card.id]: portraitLevel },
    discovered: unique([...state.discovered, card.id]),
    history: record(state, { kind: "fusion", cardId: card.id, parents: card.parents, paid: cost }),
    stats: { ...state.stats, fusions: state.stats.fusions + 1 }
  };
  return { ...preview, state: next };
}

function packPools(pack) {
  return RARITIES.map((_, rarity) => CARDS.filter(card =>
    card.rarity === rarity && (!pack.categories || pack.categories.includes(card.category))));
}

function probabilities(weights) {
  const sum = weights.reduce((total, weight) => total + weight, 0);
  return weights.map(weight => sum > 0 ? weight * 100 / sum : 0);
}

function packDistribution(state, pack) {
  const pools = packPools(pack);
  const weights = pools.map((pool, rarity) => pool.length ? (pack.weights[rarity] ?? 0) : 0);
  const protectedWeights = weights.map((weight, rarity) => rarity >= pack.pityRarity ? weight : 0);
  const counter = owns(state.pity, pack.id) ?? 0;
  const hasPity = Boolean(pack.pityAt && protectedWeights.some(weight => weight > 0));
  const remaining = hasPity ? Math.max(1, pack.pityAt - counter) : null;
  return {
    pools, weights, protectedWeights, counter, remaining, hasPity, pityActive: hasPity && remaining === 1
  };
}

export function getPackOdds(state, packId) {
  const pack = PACK_BY_ID.get(packId);
  if (!pack) return error("Este sobre no está disponible.");

  const distribution = packDistribution(state, pack);
  if (!distribution.weights.some(weight => weight > 0)) return error("Este sobre no tiene cartas disponibles.");
  return {
    ok: true,
    pack,
    counter: distribution.counter,
    remaining: distribution.remaining,
    pityActive: distribution.pityActive,
    odds: probabilities(distribution.weights),
    guaranteedOdds: distribution.hasPity ? probabilities(distribution.protectedWeights) : null
  };
}

function sample(rng) {
  const value = rng();
  return Number.isFinite(value) ? Math.max(0, Math.min(1 - Number.EPSILON, value)) : 0;
}

function weightedIndex(weights, rng) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let choice = sample(rng) * total;
  const lastEligible = weights.findLastIndex(weight => weight > 0);
  for (let index = 0; index < weights.length; index += 1) {
    choice -= weights[index];
    if (choice < 0) return index;
  }
  return lastEligible;
}

export function openPack(state, packId, rng = Math.random) {
  const pack = PACK_BY_ID.get(packId);
  if (!pack) return error("Este sobre no está disponible.");
  if (state.coins < pack.cost) return error("No tienes suficientes monedas para este sobre.");

  const { pools, weights, protectedWeights, counter, hasPity, pityActive } = packDistribution(state, pack);
  if (!weights.some(weight => weight > 0)) return error("Este sobre no tiene cartas disponibles.");

  const cards = [];
  let qualified = false;
  let pityTriggered = false;
  for (let slot = 0; slot < pack.slots; slot += 1) {
    const guaranteed = pityActive && !qualified && slot === pack.slots - 1;
    const rarity = weightedIndex(guaranteed ? protectedWeights : weights, rng);
    const pool = pools[rarity];
    cards.push(getCard(pool[Math.floor(sample(rng) * pool.length)].id));
    qualified ||= rarity >= pack.pityRarity;
    pityTriggered ||= guaranteed;
  }

  const ids = cards.map(card => card.id);
  const pity = { ...state.pity };
  if (!hasPity || qualified) delete pity[pack.id];
  else pity[pack.id] = counter + 1;
  const next = {
    ...state,
    coins: state.coins - pack.cost,
    inventory: inventoryAfter(state, [], ids),
    discovered: unique([...state.discovered, ...ids]),
    pity,
    history: record(state, { kind: "pack", packId, cards: ids, paid: pack.cost, pityTriggered }),
    stats: { ...state.stats, packs: state.stats.packs + 1 }
  };
  return { ok: true, state: next, pack, cards, pityTriggered };
}

export function previewExpedition(state, missionId, cardIds) {
  const mission = MISSION_BY_ID.get(missionId);
  if (!mission) return error("Esta expedición no está disponible.");
  if (!Array.isArray(cardIds) || cardIds.length !== mission.slots || !hasSelection(state, cardIds)) {
    return error(`Selecciona ${mission.slots === 1 ? "una carta disponible" : `${mission.slots} cartas disponibles`}.`);
  }
  const cards = cardIds.map(id => getCard(id, state));
  if (cards.some(card => !card)) return error("Alguna de las cartas seleccionadas ya no está disponible.");

  const lines = cards.map(card => {
    const skill = card.ability ? owns(ABILITIES, card.ability) : null;
    const base = card.stats[mission.stat ?? topStat(card.stats)];
    const bonus = skill?.stat === mission.stat && skill ? Math.min(skill.bonus, MAX_ABILITY_BONUS) : 0;
    return { id: card.id, name: card.name, base, ability: bonus > 0 ? skill.name : null, bonus, total: base + bonus };
  });
  const matchingTrait = mission.trait && cards.some(card => card.traits.includes(mission.trait));
  const traitBonus = matchingTrait ? (mission.traitBonus ?? 0) : 0;
  const score = lines.reduce((total, line) => total + line.total, traitBonus);
  const success = score >= mission.threshold;
  const baseReward = success ? mission.reward : Math.max(1, mission.failureReward ?? Math.floor(mission.reward / 5));
  const firstClear = success && !(owns(state.stats.missions, missionId) > 0) ? (mission.firstClear ?? 0) : 0;
  const result = {
    missionId, cards: cardIds.slice(), success, score, threshold: mission.threshold,
    reward: baseReward + firstClear, baseReward, firstClear, traitBonus, lines
  };
  return { ok: true, mission, result };
}

export function runExpedition(state, missionId, cardIds) {
  const preview = previewExpedition(state, missionId, cardIds);
  if (!preview.ok) return preview;
  const { result } = preview;
  const missions = { ...state.stats.missions };
  if (result.success) missions[missionId] = (owns(missions, missionId) ?? 0) + 1;
  const next = {
    ...state,
    coins: state.coins + result.reward,
    history: record(state, { kind: "expedition", missionId, success: result.success, reward: result.reward, score: result.score }),
    stats: {
      ...state.stats, missions, expeditions: state.stats.expeditions + 1,
      won: state.stats.won + Number(result.success)
    }
  };
  return { ...preview, state: next };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function natural(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function cleanCounts(source, allow) {
  const clean = {};
  if (!isRecord(source)) return clean;
  for (const [key, value] of Object.entries(source)) {
    if (allow(key) && natural(value) > 0) clean[key] = value;
  }
  return clean;
}

function restoreFusions(source) {
  const fusions = {};
  if (!isRecord(source)) return fusions;

  for (let generation = 1; generation <= MAX_GENERATION; generation += 1) {
    for (const [id, snapshot] of Object.entries(source)) {
      if (!isRecord(snapshot) || snapshot.generation !== generation || !Array.isArray(snapshot.parents)
          || snapshot.parents.length !== 2 || !snapshot.parents.every(parent => typeof parent === "string")) continue;

      const parents = [...snapshot.parents].sort();
      const [a, b] = parents.map(parent => getCard(parent, { fusions }));
      if (id !== fusionId(...parents) || !a || !b || generation !== Math.max(a.generation, b.generation) + 1
          || sameLineage(a, b)) continue;

      const fallback = createFusion(a, b).card;
      const oldParentNames = [a, b].map(parent => {
        const oldName = owns(source, parent.id)?.name;
        return typeof oldName === "string" ? oldName : parent.name;
      });
      const legacyName = oldParentNames.join(" × ");
      const legacyDescription = `Quimera que combina los rasgos de ${oldParentNames[0]} y ${oldParentNames[1]}.`;
      const savedName = typeof snapshot.name === "string" && snapshot.name !== legacyName && snapshot.name.trim();
      const savedDescription = typeof snapshot.description === "string"
        && snapshot.description !== legacyDescription && snapshot.description.trim();
      // Preserve a discovered card's original recipe and stats on future catalog additions.
      const tier = RARITIES[snapshot.rarity];
      const stats = isRecord(snapshot.stats) ? STAT_KEYS.map(stat => natural(snapshot.stats[stat])) : [];
      const hasBudget = tier && stats.every(value => value > 0 && value <= Math.ceil(tier.budget * 0.58))
        && stats.reduce((sum, value) => sum + value, 0) === tier.budget;
      const validRarity = Number.isInteger(snapshot.rarity) && snapshot.rarity >= 0
        && snapshot.rarity <= Math.max(a.rarity, b.rarity) + 1
        && (snapshot.rarity < RARITY_CAP || Math.min(a.rarity, b.rarity) >= RARITY_CAP - 1);
      const savedTraits = Array.isArray(snapshot.traits)
        ? unique(snapshot.traits.filter(trait => typeof trait === "string" && owns(TRAITS, trait))).slice(0, 3) : [];
      const savedAbility = typeof snapshot.ability === "string" && owns(ABILITIES, snapshot.ability);
      fusions[id] = {
        ...fallback,
        name: savedName ? snapshot.name.slice(0, 180) : fallback.name,
        description: savedDescription ? snapshot.description.slice(0, 400) : fallback.description,
        ...(hasBudget && validRarity ? { rarity: snapshot.rarity, stats: Object.fromEntries(STAT_KEYS.map((stat, index) => [stat, stats[index]])) } : {}),
        traits: savedTraits.length > 0 ? savedTraits : fallback.traits,
        ability: savedAbility || snapshot.ability === null ? snapshot.ability : fallback.ability
      };
    }
  }
  return fusions;
}

function restoreHistory(source, state) {
  if (!Array.isArray(source)) return [];
  const history = [];
  for (const entry of source.slice(0, MAX_HISTORY)) {
    if (!isRecord(entry)) continue;
    if (entry.kind === "fusion" && getCard(entry.cardId, state)) {
      const card = getCard(entry.cardId, state);
      history.push({ kind: entry.kind, cardId: card.id, parents: card.parents, paid: natural(entry.paid) });
    }
    if (entry.kind === "pack" && PACK_BY_ID.has(entry.packId) && Array.isArray(entry.cards)) {
      history.push({ kind: entry.kind, packId: entry.packId, cards: entry.cards.filter(id => BASE_CARDS.has(id)),
        paid: natural(entry.paid), pityTriggered: Boolean(entry.pityTriggered) });
    }
    if (entry.kind === "expedition" && MISSION_BY_ID.has(entry.missionId)) {
      history.push({ kind: entry.kind, missionId: entry.missionId, success: Boolean(entry.success),
        reward: natural(entry.reward), score: natural(entry.score) });
    }
  }
  return history;
}

export function serializeGame(state) {
  return JSON.stringify(state);
}

export function loadGame(serialized) {
  let raw;
  try {
    raw = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
  } catch {
    return createGame();
  }
  if (!isRecord(raw) || raw.version !== SAVE_VERSION || !isRecord(raw.inventory)) return createGame();

  const fusions = restoreFusions(raw.fusions);
  const savedPortraits = isRecord(raw.portraits) ? raw.portraits : {};
  const portraits = Object.fromEntries(Object.keys(fusions).map(id => [
    id, Math.min(MAX_PORTRAIT_LEVEL, natural(owns(savedPortraits, id)) || 1)
  ]));
  const inventory = cleanCounts(raw.inventory, id => Boolean(getCard(id, { fusions })));
  // A missing catalog entry or a damaged save must still leave a team that can earn coins.
  if (Object.keys(inventory).length === 0) Object.assign(inventory, STARTER);
  const pity = cleanCounts(raw.pity, id => Boolean(PACK_BY_ID.get(id)?.pityAt));
  for (const id of Object.keys(pity)) pity[id] = Math.min(pity[id], PACK_BY_ID.get(id).pityAt - 1);
  const previousStats = isRecord(raw.stats) ? raw.stats : {};
  const stats = {
    packs: natural(previousStats.packs),
    fusions: natural(previousStats.fusions),
    expeditions: natural(previousStats.expeditions),
    won: Math.min(natural(previousStats.won), natural(previousStats.expeditions)),
    missions: cleanCounts(previousStats.missions, id => MISSION_BY_ID.has(id))
  };
  const knownIds = Array.isArray(raw.discovered)
    ? raw.discovered.filter(id => typeof id === "string" && getCard(id, { fusions })) : [];
  const state = {
    version: SAVE_VERSION, coins: natural(raw.coins), inventory, fusions, portraits, pity, stats,
    discovered: unique([...knownIds, ...Object.keys(inventory), ...Object.keys(fusions)]), history: []
  };
  state.history = restoreHistory(raw.history, state);
  return state;
}
