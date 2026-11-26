import { getCreatureConcept } from "./creature-concepts.js";
import { profileAdjustments } from "./profile-weights.js";

export const COMBAT_STATS = Object.freeze({
  vitality: "Vitalidad", strength: "Fuerza", defense: "Defensa", agility: "Agilidad",
  magic: "Poder mágico", resistance: "Resistencia mágica"
});
export const MOBILITY_LABELS = Object.freeze({
  ground: "Terrestre", agile: "Ágil", aerial: "Aérea", aquatic: "Acuática", amphibious: "Anfibia"
});

export const CAPABILITY_FAMILIES = Object.freeze({
  direct: { name: "Daño directo", group: "offense" },
  area: { name: "Daño de área", group: "offense" },
  piercing: { name: "Perforación", group: "offense" },
  multi: { name: "Ataques múltiples", group: "offense" },
  periodic: { name: "Daño periódico", group: "offense" },
  protect: { name: "Protección", group: "defense" },
  shield: { name: "Escudos", group: "defense" },
  resist: { name: "Resistencia", group: "defense" },
  intercept: { name: "Intercepción", group: "defense" },
  heal: { name: "Curación directa", group: "recovery" },
  regen: { name: "Regeneración", group: "recovery" },
  cleanse: { name: "Purificación", group: "recovery" },
  slow: { name: "Ralentización", group: "control" },
  stun: { name: "Aturdimiento", group: "control" },
  silence: { name: "Silencio", group: "control" },
  immobilize: { name: "Inmovilización", group: "control" },
  empower: { name: "Potenciación", group: "support" },
  weaken: { name: "Debilitamiento", group: "control" },
  summon: { name: "Invocación", group: "summoning" }
});
export const UTILITY_FAMILIES = Object.freeze({
  explore: "Exploración", transport: "Transporte", craft: "Fabricación", heal: "Cuidados",
  logistics: "Logística", supply: "Suministros", protect: "Protección", research: "Investigación",
  events: "Resolución de eventos", support: "Apoyo", survival: "Supervivencia"
});

const STAT_IDS = Object.keys(COMBAT_STATS);
const role = (name, weights, capabilities, utility = []) => Object.freeze({
  name,
  weights: Object.freeze(Object.fromEntries(STAT_IDS.map((stat, i) => [stat, weights[i]]))),
  capabilities: Object.freeze(capabilities),
  utility: Object.freeze(utility)
});

// La primera capacidad expresa la función característica del rol. Las demás
// son opciones compatibles cuando la interpretación justifica asignarlas.
export const COMBAT_ROLES = Object.freeze({
  guardian: role("Guardián", [9, 5, 9, 3, 2, 6], ["protect", "shield", "resist", "intercept", "direct"], ["protect"]),
  fighter: role("Combatiente", [6, 7, 6, 6, 3, 5], ["direct", "protect", "multi", "piercing", "resist"]),
  striker: role("Asaltante", [6, 10, 5, 7, 2, 3], ["direct", "piercing", "area", "multi", "stun"]),
  marksman: role("Tirador", [4, 8, 4, 8, 4, 4], ["piercing", "direct", "multi", "periodic", "slow"], ["explore"]),
  assassin: role("Asesino", [4, 8, 3, 10, 3, 4], ["multi", "piercing", "direct", "weaken", "periodic"], ["explore"]),
  mage: role("Hechicero", [4, 2, 3, 5, 10, 8], ["area", "direct", "periodic", "shield", "silence", "weaken"], ["research"]),
  healer: role("Sanador", [7, 2, 5, 4, 7, 8], ["heal", "cleanse", "regen", "shield", "protect"], ["heal"]),
  support: role("Soporte", [6, 3, 5, 5, 7, 7], ["empower", "shield", "cleanse", "heal", "regen"], ["support"]),
  controller: role("Controlador", [5, 3, 5, 7, 7, 6], ["slow", "stun", "silence", "immobilize", "weaken", "multi", "shield"], ["events"]),
  summoner: role("Invocador", [5, 2, 4, 4, 10, 8], ["summon", "empower", "shield", "periodic"], ["research"]),
  artillery: role("Artillería", [6, 7, 6, 2, 8, 4], ["area", "piercing", "periodic", "direct", "stun"]),
  logistics: role("Logístico", [8, 4, 6, 5, 4, 6], ["protect", "shield", "empower", "regen"], ["logistics", "supply"])
});

export const PROFILE_VERSION = 2;

export const PROFILE_RULES = Object.freeze({
  baseBudgets: Object.freeze([200, 250, 300, 350, 400]),
  rarityBudgets: Object.freeze([0, 5, 10, 15, 20]),
  deploymentByGeneration: Object.freeze([1, 2, 3, 4, 5]),
  secondaryWeight: 0.25,
  minStatShare: 0.05,
  maxStatShare: 0.35,
  maxCombatCapabilities: 4,
  maxUtilityCapabilities: 4
});

function clampIndex(value, array) {
  return Number.isInteger(value) ? Math.max(0, Math.min(value, array.length - 1)) : 0;
}

function splitBudget(budget, weights) {
  const total = STAT_IDS.reduce((sum, stat) => sum + weights[stat], 0);
  const min = Math.floor(PROFILE_RULES.minStatShare * budget);
  const max = Math.floor(PROFILE_RULES.maxStatShare * budget);
  const ideal = Object.fromEntries(STAT_IDS.map(stat => [stat, budget * weights[stat] / total]));
  const stats = Object.fromEntries(STAT_IDS.map(stat => [stat, Math.max(min, Math.min(max, Math.floor(ideal[stat])))]));
  const assigned = STAT_IDS.reduce((sum, stat) => sum + stats[stat], 0);
  const direction = Math.sign(budget-assigned);
  for (let remaining = budget-assigned; remaining !== 0; remaining -= direction) {
    const available = STAT_IDS.filter(stat => direction > 0 ? stats[stat] < max : stats[stat] > min);
    const best = available.reduce((first,second) =>
      direction * (ideal[second]-stats[second]) > direction * (ideal[first]-stats[first]) ? second : first);
    stats[best] += direction;
  }
  return stats;
}

function getMobility(concept, roleId) {
  if (concept.anatomy === "amphibian") return "amphibious";
  if (["aquatic", "cephalopod"].includes(concept.anatomy)) return "aquatic";
  if (concept.anatomy === "avian" || concept.tags.includes("winged")) return "aerial";
  if (roleId === "assassin" || roleId === "marksman") return "agile";
  return "ground";
}

const LEGACY_ROLE = Object.freeze({ power: "striker", guard: "guardian", focus: "support" });

function getRole(card, concept) {
  if (typeof concept.role === "string" && Object.hasOwn(COMBAT_ROLES, concept.role)) return concept.role;
  if (concept.tags.includes("alchemy")) return "support";
  if (concept.tags.includes("regeneration") || concept.tags.includes("medicine")) return "healer";
  if (concept.tags.includes("magic")) return "mage";
  const strongest = Object.entries(card.stats ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  return LEGACY_ROLE[strongest] ?? "fighter";
}

function capabilitySelection(concept, primary, secondary) {
  const allowed = new Set([...primary.capabilities, ...(secondary?.capabilities ?? [])]);
  return [...new Set([
    primary.capabilities[0],
    ...concept.capabilities.filter(id => allowed.has(id)),
    secondary?.capabilities[0]
  ].filter(Boolean))].slice(0, PROFILE_RULES.maxCombatCapabilities);
}

function utilityProfile(concept, primary, secondary, mobility) {
  const inferred = mobility === "aerial" || mobility === "aquatic" ? ["explore"] : [];
  const capabilities = [...new Set([...concept.utility, ...primary.utility, ...(secondary?.utility ?? []), ...inferred])]
    .filter(id => Object.hasOwn(UTILITY_FAMILIES, id)).slice(0, PROFILE_RULES.maxUtilityCapabilities);
  const ratings = Object.fromEntries(capabilities.map(id => [
    id, Math.min(3, 1 + Number(concept.utility.includes(id)) + Number(primary.utility.includes(id)))
  ]));
  return Object.freeze({ capabilities: Object.freeze(capabilities), ratings: Object.freeze(ratings) });
}

const profileCache = new WeakMap();

export function getCreatureProfiles(card) {
  const concept = getCreatureConcept(card);
  if (!concept) return null;
  if (profileCache.has(card)) return profileCache.get(card);

  const role = getRole(card, concept);
  const secondaryRole = typeof concept.secondaryRole === "string" && concept.secondaryRole !== role &&
    Object.hasOwn(COMBAT_ROLES, concept.secondaryRole) ? concept.secondaryRole : null;
  const primary = COMBAT_ROLES[role];
  const secondary = COMBAT_ROLES[secondaryRole];
  const generation = clampIndex(card.generation, PROFILE_RULES.baseBudgets);
  const rarity = clampIndex(card.rarity, PROFILE_RULES.rarityBudgets);
  const powerBudget = PROFILE_RULES.baseBudgets[generation] + PROFILE_RULES.rarityBudgets[rarity];
  const adjustments = profileAdjustments(card,concept);
  const weights = Object.fromEntries(STAT_IDS.map((stat,i) => [stat, Math.max(.8,
    primary.weights[stat] + (secondary?.weights[stat] ?? 0) * PROFILE_RULES.secondaryWeight + adjustments[i])]));
  const capabilities = capabilitySelection(concept, primary, secondary);
  const stats = splitBudget(powerBudget, weights);
  const byPoints = [...STAT_IDS].sort((a, b) => stats[b] - stats[a]);
  const mobility = getMobility(concept, role);
  const combat = Object.freeze({
    version: PROFILE_VERSION, role, secondaryRole,
    powerBudget,
    deploymentCost: PROFILE_RULES.deploymentByGeneration[generation],
    stats: Object.freeze(stats),
    affinities: Object.freeze([...concept.affinities]),
    capabilities: Object.freeze(capabilities),
    offensive: Object.freeze(capabilities.filter(id => CAPABILITY_FAMILIES[id].group === "offense")),
    defensive: Object.freeze(capabilities.filter(id => CAPABILITY_FAMILIES[id].group === "defense")),
    mobility,
    strengths: Object.freeze(byPoints.slice(0, 2)),
    weaknesses: Object.freeze(byPoints.slice(-2))
  });
  const profiles = Object.freeze({ combat, utility: utilityProfile(concept, primary, secondary, mobility) });
  profileCache.set(card, profiles);
  return profiles;
}
