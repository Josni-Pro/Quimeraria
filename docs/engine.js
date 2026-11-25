import {
  ABILITIES, CARDS, ECONOMY, MISSIONS, PACKS, RARITIES, RECIPES, STATS, STARTER, TRAITS
} from "./catalog.js";
import { nameFusion } from "./fusion-names.js";
import { ABERRATION_DEFECTS, ALCHEMY, ANIMATION_MODES, fusionRates } from "./game-config.js";
import { decorateClassicFusion, selectVariant, variantIdentity, variantsFor } from "./fusion-variants.js";
import { aberrationsFor } from "./aberration-concepts.js";
import { aberrationId } from "./aberration-art-pilot.js";

export const SAVE_VERSION = 4;
export const MAX_GENERATION = ALCHEMY.maxGeneration;

const STAT_KEYS = Object.keys(STATS);
const RARITY_CAP = RARITIES.length - 1;
const MAX_ABILITY_BONUS = 3;
const MAX_HISTORY = 24;
const MAX_PORTRAIT_LEVEL = 3;
const SAVED_CONCEPT_LISTS = ["tags", "features", "habitat", "knowledge", "tools", "materials", "affinities", "capabilities", "utility"];
const BASE_CARDS = new Map(CARDS.map(card => [card.id, {
  ...card, generation: 0, parents: [], lineage: [card.id]
}]));
const RECIPE_BY_PARENTS = new Map(RECIPES.map(recipe => [fusionId(...recipe.parents), recipe]));
const PACK_BY_ID = new Map(PACKS.map(pack => [pack.id, pack]));
const MISSION_BY_ID = new Map(MISSIONS.map(mission => [mission.id, mission]));

function pairId(kind, ...ids) {
  return `${kind}(${ids.sort().join("+")})`;
}

function fusionId(...ids) {
  return pairId("fusion", ...ids);
}

function owns(map, id) {
  return map && typeof id === "string" && Object.hasOwn(map, id) ? map[id] : undefined;
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

function recordAlchemy(state, entry) {
  return [entry, ...state.alchemyHistory].slice(0, ALCHEMY.historyLimit);
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
    fusionCopies: {},
    aberrationCopies: {},
    fusions: {},
    aberrations: {},
    portraits: {},
    essences: {},
    discovered: Object.keys(STARTER),
    history: [],
    alchemyHistory: [],
    pendingReveal: null,
    sequence: 0,
    settings: { animation: "full" },
    stats: { packs: 0, fusions: 0, fusionFailures: 0, essencesCreated: 0, essencesUsed: 0, expeditions: 0, won: 0, missions: {} }
  };
}

export function getCard(id, state) {
  return BASE_CARDS.get(id) ?? owns(state?.fusions, id) ?? owns(state?.aberrations, id);
}

export function getFusionCopies(state, id) {
  return owns(state?.fusionCopies, id) ?? [];
}

export function getAberrationCopies(state, id) {
  return owns(state?.aberrationCopies, id) ?? [];
}

function functional(card) {
  return Boolean(card && card.category !== "aberration");
}

export function setAnimationMode(state, animation) {
  if (!ANIMATION_MODES.includes(animation)) return error("Esta opción de animación no está disponible.");
  return { ok: true, state: { ...state, settings: { ...state.settings, animation } } };
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

function fusionGeneration(a, b) {
  return Math.max(a.generation, b.generation) + 1;
}

function checkParents(a, b, { allowIdenticalFusion = false } = {}) {
  if (!a || !b) return "Selecciona dos cartas para realizar una fusión.";
  if (!functional(a) || !functional(b)) return "Las aberraciones se usan en Alquimia.";
  if (fusionGeneration(a, b) > MAX_GENERATION) {
    return `Las quimeras de generación ${MAX_GENERATION} alcanzaron el límite de fusión.`;
  }
  if (sameLineage(a, b) && !(allowIdenticalFusion && a.id === b.id)) {
    return "Una quimera requiere materiales que no repitan sus linajes.";
  }
  return null;
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
    generation: fusionGeneration(a, b),
    parents: [a.id, b.id],
    lineage: unique([...a.lineage, ...b.lineage]).sort()
  };
  const statBreakdown = Object.fromEntries(STAT_KEYS.map(stat => [stat, {
    first: a.stats[stat], second: b.stats[stat], result: stats[stat]
  }]));
  return { card, recipe, synergy, explanation, sharedTraits, statBreakdown };
}

export function describeDiscoveredFusion(state, cardId) {
  if (!state.discovered.includes(cardId)) return null;
  const card = owns(state.fusions, cardId);
  if (!card) return null;
  const [a, b] = card.parents.map(id => getCard(id, state));
  if (!a || !b) return null;
  const generated = createFusion(a, b);
  if (card.id !== generated.card.id) {
    return { synergy: generated.synergy, explanation: [card.description] };
  }
  const current = card.rarity === generated.card.rarity && card.ability === generated.card.ability;
  const { synergy, explanation } = current ? generated : createFusion(a, b, card);
  return { synergy, explanation };
}

function createHistoricalAberration(a, b) {
  const id = pairId("aberration", a.id, b.id);
  const lineage = unique([...a.lineage, ...b.lineage]).sort();
  const inherited = new Set([
    ...a.traits, ...b.traits, ...lineage.flatMap(ancestor => BASE_CARDS.get(ancestor).traits)
  ]);
  const options = Object.entries(ABERRATION_DEFECTS)
    .filter(([, info]) => !info.traits || info.traits.some(trait => inherited.has(trait)));
  let seed = 2166136261;
  for (const character of id) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  const [defect, info] = options[(seed >>> 0) % options.length];
  const name = nameFusion(id, a, b, ancestor => BASE_CARDS.get(ancestor));
  return {
    id,
    name: `${info.name} de ${name}`,
    category: "aberration",
    rarity: null,
    stats: null,
    ability: null,
    traits: inheritedTraits(a, b, [], null),
    art: null,
    description: info.description,
    defect,
    generation: fusionGeneration(a, b),
    parents: [a.id, b.id],
    lineage
  };
}

export function previewFusion(state, idA, idB) {
  const [a, b] = [idA, idB].map(id => getCard(id, state));
  const invalid = checkParents(a, b, { allowIdenticalFusion: true });
  if (invalid) return error(invalid);
  if (!hasSelection(state, [idA, idB])) return error("Necesitas una copia disponible por cada material.");
  const cost = ECONOMY.fusionCosts[Math.max(a.rarity, b.rarity)];
  const generation = fusionGeneration(a, b);
  return {
    ok: true, cost, affordable: state.coins >= cost, generation, ...fusionRates(generation)
  };
}

export function inspectFusionVariants(state, idA, idB) {
  const [a, b] = [idA, idB].sort().map(id => getCard(id, state));
  const invalid = checkParents(a, b, { allowIdenticalFusion: true });
  if (invalid) return error(invalid);
  return { ok: true, variants: variantsFor(a, b, createFusion(a, b).card) };
}

export function inspectAberrationVariants(state, idA, idB) {
  const [a, b] = [idA, idB].map(id => getCard(id, state));
  const invalid = checkParents(a, b, { allowIdenticalFusion: true });
  if (invalid) return error(invalid);
  return { ok: true, variants: aberrationsFor(a, b, fusionGeneration(a, b)) };
}

function successfulFusion(state, a, b, rng, origin) {
  const original = createFusion(a, b);
  const selected = selectVariant(variantsFor(a, b, original.card), sample(rng));
  const { probability, ...card } = selected;
  return { ...original, card: getCard(card.id, state) ?? { ...card, origin } };
}

function updateCopies(previous, inventory, materials, cardId, copy) {
  const copies = { ...previous };
  for (const [id, count] of countSelections(materials)) {
    const stack = owns(copies, id) ?? [];
    if (!stack.length) continue;
    // Consume untracked historical copies first, then the oldest tracked copies.
    const trackedToRemove = Math.max(0, count - (inventory[id] - stack.length));
    if (trackedToRemove >= stack.length) delete copies[id];
    else if (trackedToRemove) copies[id] = stack.slice(trackedToRemove);
  }
  if (copy) copies[cardId] = [...(copies[cardId] ?? []), copy];
  return copies;
}

function commitFusion(state, result, { materials = [], paid = 0, essenceId = null }) {
  const { card } = result;
  const failed = card.category === "aberration";
  const outcome = failed ? "aberration" : "success";
  const portraitLevel = failed ? 1 : Math.min(MAX_PORTRAIT_LEVEL, (state.portraits[card.id] ?? 0) + 1);
  const sequence = state.sequence + 1;
  const copy = failed ? null : { id: `copy-${sequence}`, origin: essenceId ? "essence" : "fusion" };
  const aberrationCopy = failed ? { id: `aberration-copy-${sequence}` } : null;
  const reveal = {
    id: `reveal-${sequence}`, kind: essenceId ? "essence" : "fusion", outcome,
    cardId: card.id, parents: card.parents, portraitLevel, paid,
    ...(aberrationCopy ? { instanceId: aberrationCopy.id } : {})
  };
  const entry = {
    kind: failed ? "aberration" : essenceId ? "recovered" : "fusion",
    cardId: card.id, parents: card.parents, paid,
    ...(copy ? { copyId: copy.id } : {}), ...(aberrationCopy ? { instanceId: aberrationCopy.id } : {}),
    ...(essenceId ? { essenceId } : {})
  };
  const next = {
    ...state,
    coins: state.coins - paid,
    inventory: inventoryAfter(state, materials, [card.id]),
    fusionCopies: updateCopies(state.fusionCopies, state.inventory, materials, card.id, copy),
    ...(failed ? { aberrations: { ...state.aberrations, [card.id]: card } } : {
      fusions: { ...state.fusions, [card.id]: card },
      portraits: { ...state.portraits, [card.id]: portraitLevel }
    }),
    ...(failed ? { aberrationCopies: updateCopies(state.aberrationCopies, state.inventory, [], card.id, aberrationCopy) } : {}),
    discovered: unique([...state.discovered, card.id]),
    history: record(state, entry),
    alchemyHistory: failed || essenceId ? recordAlchemy(state, entry) : state.alchemyHistory,
    pendingReveal: reveal,
    sequence,
    stats: {
      ...state.stats, fusions: state.stats.fusions + Number(!failed),
      fusionFailures: state.stats.fusionFailures + Number(failed),
      essencesUsed: state.stats.essencesUsed + Number(Boolean(essenceId))
    }
  };
  return { ok: true, ...result, state: next, outcome, portraitLevel, reveal,
    ...(aberrationCopy ? { instanceId: aberrationCopy.id } : {}) };
}

export function fuseCards(state, idA, idB, rng = Math.random) {
  if (state.pendingReveal) return error("Revela la carta pendiente para iniciar otra fusión.");
  const preview = previewFusion(state, idA, idB);
  if (!preview.ok) return preview;
  if (!preview.affordable) return error("No tienes suficientes monedas para esta fusión.");

  const materials = [idA, idB].sort();
  const [a, b] = materials.map(id => getCard(id, state));
  let result;
  if (preview.aberrationRate === 0 || sample(rng) < preview.successRate) {
    result = successfulFusion(state, a, b, rng, "fusion");
  } else {
    const { probability, ...selected } = selectVariant(aberrationsFor(a, b, preview.generation), sample(rng));
    result = { card: getCard(selected.id, state) ?? selected };
  }
  return commitFusion(state, result, { materials, paid: preview.cost });
}

export function acknowledgeReveal(state, id) {
  if (!state.pendingReveal || state.pendingReveal.id !== id) return error("Esta revelación ya no está pendiente.");
  return { ok: true, state: { ...state, pendingReveal: null } };
}

function essencePool(state, sources) {
  const parents = sources.flatMap(id => owns(state.aberrations, id).parents);
  return [...countSelections(parents)].sort(([first], [second]) => first < second ? -1 : 1)
    .map(([id, count]) => ({ id, count }));
}

function snapshotProgenitors(state, progenitors, previous = []) {
  const saved = new Map(Array.isArray(previous) ? previous.filter(isRecord).map(entry => [entry.id, entry.card]) : []);
  return progenitors.map(({ id, count }) => {
    const card = getCard(id, state);
    const prior = saved.get(id);
    const preservesIdentity = isRecord(prior) && prior.id === id && prior.category === card.category
      && prior.generation === card.generation && JSON.stringify(prior.parents) === JSON.stringify(card.parents)
      && JSON.stringify(prior.lineage) === JSON.stringify(card.lineage)
      && typeof prior.name === "string" && Array.isArray(prior.traits) && isRecord(prior.stats)
      && STAT_KEYS.every(key => natural(prior.stats[key]) > 0) && Number.isInteger(prior.rarity) && Boolean(RARITIES[prior.rarity]);
    return { id, count, card: structuredClone(preservesIdentity ? prior : card) };
  });
}

function progenitorCards(state, progenitors) {
  return progenitors.map(({ id, count }) => ({ id, count, card: getCard(id, state) }));
}

function recoveredPairs(progenitors) {
  const pairs = [];
  for (const [index, first] of progenitors.entries()) {
    for (const second of progenitors.slice(index)) {
      if (first === second && first.count < 2) continue;
      if (!checkParents(first.card, second.card, { allowIdenticalFusion: true })) pairs.push([first.card, second.card]);
    }
  }
  return pairs;
}

export function previewEssence(state, aberrationIds) {
  if (state.pendingReveal) return error("Revela la carta pendiente antes de destilar una esencia.");
  const required = ALCHEMY.aberrationsPerEssence;
  if (!Array.isArray(aberrationIds) || aberrationIds.length !== required) {
    return error(`Selecciona ${required} aberraciones para crear una esencia.`);
  }
  if (!aberrationIds.every(id => owns(state.aberrations, id)) || !hasSelection(state, aberrationIds)) {
    return error("Necesitas una copia disponible de cada aberración seleccionada.");
  }
  const progenitors = essencePool(state, aberrationIds);
  const pairCount = recoveredPairs(progenitorCards(state, progenitors)).length;
  if (!pairCount) return error("Estas aberraciones no conservan una pareja compatible.");
  return { ok: true, progenitors, pairCount };
}

export function createEssence(state, aberrationIds) {
  const preview = previewEssence(state, aberrationIds);
  if (!preview.ok) return preview;
  const { progenitors, pairCount } = preview;
  const sequence = state.sequence + 1;
  const id = `essence-${sequence}`;
  const sources = [...aberrationIds].sort();
  const essence = { id, category: "essence", name: "Esencia Quimérica", sources,
    progenitors: snapshotProgenitors(state, progenitors), pairCount };
  const entry = { kind: "essence", essenceId: id, sources, progenitors };
  const next = {
    ...state,
    inventory: inventoryAfter(state, sources, []),
    aberrationCopies: updateCopies(state.aberrationCopies, state.inventory, sources),
    essences: { ...state.essences, [id]: essence },
    history: record(state, entry),
    alchemyHistory: recordAlchemy(state, entry),
    sequence,
    stats: { ...state.stats, essencesCreated: state.stats.essencesCreated + 1 }
  };
  return { ok: true, state: next, essence };
}

export function useEssence(state, essenceId, rng = Math.random) {
  if (state.pendingReveal) return error("Revela la carta pendiente antes de usar una esencia.");
  const essence = owns(state.essences, essenceId);
  if (!essence) return error("Esta esencia ya no está disponible.");
  const pairs = recoveredPairs(essence.progenitors);
  if (!pairs.length) return error("Esta esencia se conserva. Sus progenitores requieren una regla compatible para recuperarla.");

  const [a, b] = pairs[Math.floor(sample(rng) * pairs.length)];
  const result = successfulFusion(state, a, b, rng, "essence");
  const essences = { ...state.essences };
  delete essences[essenceId];
  return commitFusion({ ...state, essences }, result, { essenceId });
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

export function getExpeditionSlots(state, missionId) {
  const mission = MISSION_BY_ID.get(missionId);
  if (missionId !== "senda") return mission?.slots;
  const hasCreature = Object.entries(state.inventory).some(([id, count]) => count > 0 && functional(getCard(id, state)));
  return hasCreature ? mission?.slots : 0;
}

export function previewExpedition(state, missionId, cardIds) {
  const mission = MISSION_BY_ID.get(missionId);
  if (!mission) return error("Esta expedición no está disponible.");
  const slots = getExpeditionSlots(state, missionId);
  if (!Array.isArray(cardIds) || cardIds.length !== slots || !hasSelection(state, cardIds)) {
    const selection = slots === 1 ? "una carta disponible" : `${slots} cartas disponibles`;
    return error(slots === 0 ? "Puedes recorrer la Senda sin cartas." : `Selecciona ${selection}.`);
  }
  const cards = cardIds.map(id => getCard(id, state));
  if (cards.some(card => !card)) return error("Alguna de las cartas seleccionadas ya no está disponible.");
  if (cards.some(card => !functional(card))) return error("Las aberraciones se usan en Alquimia.");

  const lines = cards.map(card => {
    const skill = card.ability ? owns(ABILITIES, card.ability) : null;
    const base = card.stats[mission.stat ?? topStat(card.stats)];
    const bonus = skill?.stat === mission.stat && skill ? Math.min(skill.bonus, MAX_ABILITY_BONUS) : 0;
    return { id: card.id, name: card.name, base, ability: bonus > 0 ? skill.name : null, bonus, total: base + bonus };
  });
  const matchingTrait = mission.trait && cards.some(card => card.traits.includes(mission.trait));
  const traitBonus = matchingTrait ? (mission.traitBonus ?? 0) : 0;
  const recovery = slots === 0;
  const score = recovery ? mission.threshold : lines.reduce((total, line) => total + line.total, traitBonus);
  const success = score >= mission.threshold;
  const baseReward = success ? mission.reward : Math.max(1, mission.failureReward ?? Math.floor(mission.reward / 5));
  const firstClear = success && !(owns(state.stats.missions, missionId) > 0) ? (mission.firstClear ?? 0) : 0;
  const result = {
    missionId, cards: cardIds.slice(), success, score, threshold: mission.threshold,
    reward: baseReward + firstClear, baseReward, firstClear, traitBonus, lines, recovery
  };
  return { ok: true, mission: recovery ? { ...mission, slots } : mission, result };
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

function restoreVariantFields(snapshot, parents, id) {
  const { variantKey, fusionRulesVersion, family, quality, identity, concept, origin } = snapshot;
  if (typeof variantKey !== "string" || !/^[a-z0-9_-]{1,80}$/.test(variantKey)) return null;
  const key = variantIdentity(parents, variantKey);
  if (id !== key.id
      || natural(fusionRulesVersion) === 0 || typeof family !== "string" || typeof quality !== "string"
      || !isRecord(identity) || !isRecord(concept) || typeof concept.speciesId !== "string") return null;
  for (const field of SAVED_CONCEPT_LISTS) {
    const list = concept[field];
    if (!Array.isArray(list) || list.some(value => typeof value !== "string")) return null;
  }
  if (!Array.isArray(concept.inheritance)
      || concept.inheritance.some(item => !isRecord(item) || !parents.includes(item.parentId)
          || typeof item.field !== "string" || typeof item.value !== "string")) return null;
  return {
    ...key, variantKey, fusionRulesVersion, family, quality, identity, concept,
    origin: origin === "fusion" || origin === "essence" ? origin : "legacy"
  };
}

function restoreFusions(source) {
  const fusions = {};
  if (!isRecord(source)) return fusions;

  const snapshots = Object.entries(source).filter(([, snapshot]) => isRecord(snapshot) && natural(snapshot.generation) > 0)
    .sort(([, a], [, b]) => a.generation - b.generation);
  for (const [id, snapshot] of snapshots) {
    const parents = savedParents(snapshot);
    if (!parents) continue;
    const [a, b] = parents.map(parent => getCard(parent, { fusions }));
    // La compatibilidad del sorteo vigente solo se consulta para nuevas
    // operaciones. Un registro histórico mantiene su cuerpo y su linaje.
    if (!functional(a) || !functional(b) || snapshot.generation !== fusionGeneration(a, b)) continue;

    const fallback = createFusion(a, b).card;
    const variant = restoreVariantFields(snapshot, parents, id);
    if (!variant && id !== fallback.id) continue;
    const savedName = typeof snapshot.name === "string" && snapshot.name.trim();
    const savedDescription = typeof snapshot.description === "string" && snapshot.description.trim();
    // Keep a discovered card's attributes when later versions change its recipe.
    const tier = Number.isInteger(snapshot.rarity) ? RARITIES[snapshot.rarity] : null;
    const stats = isRecord(snapshot.stats) ? STAT_KEYS.map(stat => natural(snapshot.stats[stat])) : [];
    const hasBudget = tier && stats.every(value => value > 0 && value <= Math.ceil(tier.budget * 0.58))
      && stats.reduce((sum, value) => sum + value, 0) === tier.budget;
    const validRarity = Number.isInteger(snapshot.rarity) && snapshot.rarity >= 0
      && snapshot.rarity <= Math.max(a.rarity, b.rarity) + 1
      && (snapshot.rarity < RARITY_CAP || Math.min(a.rarity, b.rarity) >= RARITY_CAP - 1);
    const savedTraits = Array.isArray(snapshot.traits)
      ? unique(snapshot.traits.filter(trait => typeof trait === "string" && owns(TRAITS, trait))).slice(0, 3) : [];
    const savedAbility = typeof snapshot.ability === "string" && owns(ABILITIES, snapshot.ability);
    const restored = {
      ...fallback, id,
      name: savedName ? snapshot.name : fallback.name,
      description: savedDescription ? snapshot.description : fallback.description,
      art: snapshot.art === null || typeof snapshot.art === "string" ? snapshot.art : fallback.art,
      ...(hasBudget && validRarity ? { rarity: snapshot.rarity, stats: Object.fromEntries(STAT_KEYS.map((stat, index) => [stat, stats[index]])) } : {}),
      traits: savedTraits.length > 0 ? savedTraits : fallback.traits,
      ability: savedAbility || snapshot.ability === null ? snapshot.ability : fallback.ability
    };
    if (variant) {
      fusions[id] = { ...restored, ...variant };
    } else {
      const { probability, ...historical } = decorateClassicFusion(restored, a, b);
      fusions[id] = { ...historical, origin: "legacy" };
    }
  }
  return fusions;
}

function savedParents(snapshot) {
  return Array.isArray(snapshot.parents) && snapshot.parents.length === 2 && snapshot.parents.every(id => typeof id === "string")
    ? [...snapshot.parents].sort() : null;
}

function restoreAberrations(source, state) {
  const aberrations = {};
  if (!isRecord(source)) return aberrations;
  for (const [id, snapshot] of Object.entries(source)) {
    if (!isRecord(snapshot)) continue;
    const parents = savedParents(snapshot);
    if (!parents) continue;
    const [a, b] = parents.map(parent => getCard(parent, state));
    if (!functional(a) || !functional(b)) continue;
    const generation = fusionGeneration(a, b);
    if (id === pairId("aberration", ...parents)) {
      const fallback = createHistoricalAberration(a, b);
      const defect = owns(ABERRATION_DEFECTS, snapshot.defect);
      aberrations[id] = {
        ...fallback,
        name: typeof snapshot.name === "string" && snapshot.name.trim() ? snapshot.name : fallback.name,
        description: typeof snapshot.description === "string" && snapshot.description.trim() ? snapshot.description
          : defect?.description ?? fallback.description,
        defect: defect ? snapshot.defect : fallback.defect,
        family: "historical"
      };
    } else if (/^[a-z][a-z0-9-]{0,48}$/.test(snapshot.defect ?? "") && id === aberrationId(parents, snapshot.defect)
        && natural(snapshot.failureRulesVersion) > 0 && snapshot.generation === generation
        && isRecord(snapshot.identity) && typeof snapshot.identity.visual === "string"
        && typeof snapshot.name === "string" && typeof snapshot.description === "string"
        && typeof snapshot.family === "string" && Array.isArray(snapshot.identity.contributions)) {
      aberrations[id] = {
        ...snapshot, id, variantId: id, combinationId: pairId("aberration", ...parents), parents, generation,
        lineage: unique([...a.lineage, ...b.lineage]).sort(), category: "aberration", rarity: null, stats: null, ability: null
      };
    }
  }
  return aberrations;
}

function actionNumber(id, prefix) {
  if (typeof id !== "string" || !id.startsWith(`${prefix}-`)) return 0;
  const suffix = id.slice(prefix.length + 1);
  return /^[1-9][0-9]*$/.test(suffix) ? natural(Number(suffix)) : 0;
}

function restoreFusionCopies(source, inventory, fusions) {
  if (!isRecord(source)) return {};
  const copies = {};
  const seen = new Set();
  for (const [id, entries] of Object.entries(source)) {
    const quantity = owns(inventory, id);
    if (!quantity || !owns(fusions, id) || !Array.isArray(entries)) continue;
    const recovered = [];
    for (const copy of entries) {
      if (recovered.length === quantity) break;
      if (!isRecord(copy) || !actionNumber(copy.id, "copy") || seen.has(copy.id)
          || (copy.origin !== "fusion" && copy.origin !== "essence")) continue;
      seen.add(copy.id);
      recovered.push({ id: copy.id, origin: copy.origin });
    }
    if (recovered.length) copies[id] = recovered;
  }
  return copies;
}

function restoreAberrationCopies(source, inventory, aberrations) {
  if (!isRecord(source)) return {};
  const copies = {};
  const seen = new Set();
  for (const [id, entries] of Object.entries(source)) {
    if (!owns(inventory, id) || !owns(aberrations, id) || !Array.isArray(entries)) continue;
    const recovered = [];
    for (const copy of entries) {
      if (recovered.length === inventory[id]) break;
      if (!isRecord(copy) || !actionNumber(copy.id, "aberration-copy") || seen.has(copy.id)) continue;
      seen.add(copy.id);
      recovered.push({ id: copy.id });
    }
    if (recovered.length) copies[id] = recovered;
  }
  return copies;
}

function restoreSources(state, source) {
  return Array.isArray(source) && source.length > 0 && source.every(id => typeof id === "string" && owns(state.aberrations, id))
    ? [...source].sort() : null;
}

function restoreEssences(source, state) {
  const essences = {};
  if (!isRecord(source)) return essences;
  for (const [id, snapshot] of Object.entries(source)) {
    if (!actionNumber(id, "essence") || !isRecord(snapshot)) continue;
    const sources = restoreSources(state, snapshot.sources);
    if (!sources) continue;
    const progenitors = snapshotProgenitors(state, essencePool(state, sources), snapshot.progenitors);
    essences[id] = {
      id, category: "essence", name: "Esencia Quimérica", sources, progenitors,
      pairCount: recoveredPairs(progenitors).length
    };
  }
  return essences;
}

function restorePendingReveal(saved, state) {
  if (!isRecord(saved) || !actionNumber(saved.id, "reveal") || !owns(state.inventory, saved.cardId)) return null;
  const card = getCard(saved.cardId, state);
  const failed = card?.category === "aberration";
  if ((!failed && card?.category !== "fusion") || (saved.kind !== "fusion" && saved.kind !== "essence")
      || (failed && saved.kind === "essence")) return null;
  return {
    id: saved.id, kind: saved.kind, outcome: failed ? "aberration" : "success",
    cardId: card.id, parents: card.parents, portraitLevel: failed ? 1 : state.portraits[card.id],
    paid: saved.kind === "fusion" ? natural(saved.paid) : 0,
    ...(failed && getAberrationCopies(state, card.id).some(copy => copy.id === saved.instanceId)
      ? { instanceId: saved.instanceId } : {})
  };
}

function restoreHistory(source, state, limit = MAX_HISTORY) {
  if (!Array.isArray(source)) return [];
  const history = [];
  for (const entry of source.slice(0, limit)) {
    if (!isRecord(entry)) continue;
    if (entry.kind === "fusion" || entry.kind === "aberration" || entry.kind === "recovered") {
      const card = getCard(entry.cardId, state);
      if (card?.category !== (entry.kind === "aberration" ? "aberration" : "fusion")) continue;
      const restored = { kind: entry.kind, cardId: card.id, parents: card.parents, paid: natural(entry.paid) };
      if (actionNumber(entry.copyId, "copy")) restored.copyId = entry.copyId;
      if (entry.kind === "aberration" && actionNumber(entry.instanceId, "aberration-copy")) restored.instanceId = entry.instanceId;
      if (entry.kind === "recovered") {
        if (!actionNumber(entry.essenceId, "essence")) continue;
        restored.essenceId = entry.essenceId;
        restored.paid = 0;
      }
      history.push(restored);
    }
    if (entry.kind === "essence" && actionNumber(entry.essenceId, "essence")) {
      const sources = restoreSources(state, entry.sources);
      if (sources) history.push({ kind: "essence", essenceId: entry.essenceId, sources, progenitors: essencePool(state, sources) });
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
  if (!isRecord(raw) || ![1, 2, 3, SAVE_VERSION].includes(raw.version) || !isRecord(raw.inventory)) return createGame();

  const fusions = restoreFusions(raw.fusions);
  const aberrations = restoreAberrations(raw.aberrations, { fusions });
  const cards = { fusions, aberrations };
  const essences = restoreEssences(raw.essences, cards);
  const savedPortraits = isRecord(raw.portraits) ? raw.portraits : {};
  const portraits = Object.fromEntries(Object.keys(fusions).map(id => [
    id, Math.min(MAX_PORTRAIT_LEVEL, natural(owns(savedPortraits, id)) || 1)
  ]));
  const inventory = cleanCounts(raw.inventory, id => Boolean(getCard(id, cards)));
  const fusionCopies = restoreFusionCopies(raw.fusionCopies, inventory, fusions);
  const aberrationCopies = restoreAberrationCopies(raw.aberrationCopies, inventory, aberrations);
  if (raw.version === 1 && Object.keys(inventory).length === 0) Object.assign(inventory, STARTER);
  const pity = cleanCounts(raw.pity, id => Boolean(PACK_BY_ID.get(id)?.pityAt));
  for (const id of Object.keys(pity)) pity[id] = Math.min(pity[id], PACK_BY_ID.get(id).pityAt - 1);
  const previousStats = isRecord(raw.stats) ? raw.stats : {};
  const stats = {
    packs: natural(previousStats.packs),
    fusions: natural(previousStats.fusions),
    fusionFailures: natural(previousStats.fusionFailures),
    essencesCreated: natural(previousStats.essencesCreated),
    essencesUsed: natural(previousStats.essencesUsed),
    expeditions: natural(previousStats.expeditions),
    won: Math.min(natural(previousStats.won), natural(previousStats.expeditions)),
    missions: cleanCounts(previousStats.missions, id => MISSION_BY_ID.has(id))
  };
  const knownIds = Array.isArray(raw.discovered)
    ? raw.discovered.filter(id => typeof id === "string" && getCard(id, cards)) : [];
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const state = {
    version: SAVE_VERSION, coins: natural(raw.coins), inventory, fusionCopies, aberrationCopies, ...cards, essences, portraits, pity, stats,
    discovered: unique([...knownIds, ...Object.keys(inventory), ...Object.keys(fusions), ...Object.keys(aberrations)]),
    history: [], alchemyHistory: [], pendingReveal: null, sequence: natural(raw.sequence),
    settings: { ...settings, animation: ANIMATION_MODES.includes(settings.animation) ? settings.animation : "full" }
  };
  state.history = restoreHistory(raw.history, state);
  state.alchemyHistory = restoreHistory(raw.alchemyHistory, state, ALCHEMY.historyLimit)
    .filter(entry => entry.kind === "aberration" || entry.kind === "essence" || entry.kind === "recovered");
  state.pendingReveal = restorePendingReveal(raw.pendingReveal, state);
  state.sequence = Math.max(state.sequence, actionNumber(state.pendingReveal?.id, "reveal"),
    ...Object.keys(essences).map(id => actionNumber(id, "essence")),
    ...state.alchemyHistory.map(entry => Math.max(actionNumber(entry.essenceId, "essence"), actionNumber(entry.instanceId, "aberration-copy"))));
  for (const stack of Object.values(fusionCopies)) {
    for (const copy of stack) state.sequence = Math.max(state.sequence, actionNumber(copy.id, "copy"));
  }
  for (const stack of Object.values(aberrationCopies)) {
    for (const copy of stack) state.sequence = Math.max(state.sequence, actionNumber(copy.id, "aberration-copy"));
  }
  return state;
}
