import { getCreatureConcept } from "../creature-concepts.js";
import { getCreatureProfiles } from "../creature-profiles.js";
import { baseIdentity } from "../creature-identity.js";
import { TRAINING_RULES } from "./config.js";

const damage = (kind, factor, pierce = 0) => ({ type: "damage", kind, factor, pierce });
const status = (id, duration = 1, value = 0) => ({ type: "status", id, duration, value });
const heal = factor => ({ type: "heal", factor });
const shield = factor => ({ type: "shield", factor });

const skills = {
  strike: ["Golpe", "offense", "melee", 0, "strike", [damage("physical", .88)]],
  bolt: ["Proyectil", "offense", "reach", 0, "arrow", [damage("physical", .77)]],
  spark: ["Pulso", "offense", "reach", 0, "arcane", [damage("magic", .77)]],
  assist: ["Intervención", "offense", "melee", 0, "slash", [damage("physical", .69)]],
  direct: ["Carga", "offense", "melee", 2, "charge", [damage("physical", 1.38)]],
  piercing: ["Tiro rasante", "offense", "reach", 2, "arrow", [damage("physical", 1.16, .34)]],
  volley: ["Doble proyectil", "offense", "reach", 3, "arrow", [damage("physical", .65), damage("physical", .58)]],
  multi: ["Garras cruzadas", "offense", "melee", 2, "slash", [damage("physical", .56), damage("physical", .49)]],
  area: ["Onda de impacto", "offense", "area", 3, "arcane", [damage("magic", .79)]],
  periodic: ["Mordedura tóxica", "offense", "melee", 3, "slash", [damage("physical", .83), status("poison", 2, 5)]],
  protect: ["Interponerse", "guard", "allyOther", 2, "guard", [shield(.85), status("intercept", 2)]],
  intercept: ["Cobertura mutua", "guard", "allyOther", 3, "guard", [shield(.62), status("intercept", 2), status("armor", 2, 10)]],
  shield: ["Barrera", "guard", "ally", 2, "shield", [shield(1.12)]],
  resist: ["Baluarte", "guard", "self", 3, "shield", [shield(1.22), status("armor", 2, 14)]],
  heal: ["Primeros auxilios", "heal", "ally", 2, "heal", [heal(1.11)]],
  regen: ["Restauración gradual", "heal", "ally", 3, "regen", [heal(.59), status("regen", 2, 7)]],
  cleanse: ["Purificar", "cleanse", "ally", 3, "cleanse", [{ type: "cleanse" }, heal(.62)]],
  slow: ["Corriente adversa", "control", "reach", 2, "water", [damage("magic", .76), status("slow", 2, 15)]],
  stun: ["Impacto volcador", "control", "melee", 4, "heavy", [damage("physical", 1.13), status("stun")]],
  silence: ["Sello de quietud", "control", "reach", 3, "divine", [damage("magic", .84), status("silence", 2)]],
  immobilize: ["Raíces de contención", "control", "reach", 3, "earth", [damage("magic", .78), status("root", 2)]],
  weaken: ["Abrir brecha", "control", "reach", 2, "arcane", [damage("magic", .81), status("expose", 2), status("weaken", 2, 9)]],
  empower: ["Ceder el ritmo", "buff", "allyOther", 2, "buff", [status("rally", 2, 10), status("haste", 2, 9)]],
  push: ["Barrido de avance", "offense", "melee", 3, "charge", [damage("physical", 1.03), { type: "retreat" }]],
  guardBreak: ["Embate decisivo", "offense", "melee", 3, "heavy", [damage("physical", 1.70, .17), status("expose", 2)]],
  fire: ["Descarga de brasas", "offense", "area", 4, "fire", [damage("magic", .92), status("burn", 2, 6)]],
  water: ["Marea recobrada", "heal", "ally", 3, "water", [heal(.9), status("regen", 2, 6)]],
  wind: ["Sendero de vendaval", "control", "area", 4, "wind", [damage("magic", .77), status("slow", 2, 14)]],
  lightning: ["Trueno conducido", "control", "reach", 4, "lightning", [damage("magic", 1.42), status("stun")]],
  strategy: ["Defensa prevista", "guard", "allyOther", 3, "divine", [shield(1.12), status("intercept", 2), status("insight", 2, 11)]],
  judgment: ["Umbral del juicio", "control", "reach", 4, "divine", [damage("magic", 1.18), status("silence", 2), status("expose", 2)]],
  reagent: ["Reacción catalítica", "buff", "allyOther", 3, "alchemy", [status("insight", 2, 16), shield(.58)]],
  forge: ["Templar en caliente", "guard", "ally", 3, "fire", [shield(1.19), status("armor", 2, 12)]],
  feathers: ["Ceniza regeneradora", "heal", "ally", 4, "regen", [heal(1.29), status("regen", 2, 8)]],
  medicine: ["Estabilización", "heal", "ally", 3, "heal", [{ type: "cleanse" }, heal(1.39)]],
  mantle: ["Cortina de tinta", "control", "area", 4, "water", [damage("magic", .65), status("weaken", 2, 11)]],
  mass: ["Resguardo de marfil", "guard", "allyOther", 3, "earth", [shield(1.29), status("intercept", 2)]],
  reserves: ["Reserva de campaña", "guard", "ally", 3, "buff", [shield(.88), status("haste", 2, 11)]],
  conjure: ["Velo de concentración", "buff", "ally", 3, "arcane", [status("insight", 2, 13), shield(.55)]]
};

const descriptions = {
  damage: effect => `Daño ${effect.kind === "magic" ? "mágico" : "físico"}${effect.pierce ? " con perforación" : ""}`,
  status: effect => ({
    intercept: "Intercepción (una vez por ronda)", armor: "Defensa elevada", regen: "Regeneración",
    poison: "Veneno", slow: "Ralentización", stun: "Aturdimiento con resistencia posterior", silence: "Silencio",
    root: "Inmovilización", expose: "Vulnerabilidad", weaken: "Fuerza reducida", rally: "Fuerza elevada",
    haste: "Agilidad elevada", insight: "Poder mágico elevado", burn: "Quemadura"
  }[effect.id]),
  heal: () => "Curación", shield: () => "Escudo", cleanse: () => "Purificación", retreat: () => "Empuje a una plaza trasera libre"
};

export const SKILLS = Object.freeze(Object.fromEntries(Object.entries(skills).map(([id, value]) => {
  const [name, intent, target, cooldown, visual, effects] = value;
  return [id, Object.freeze({ id, name, intent, target, cooldown, visual, effects,
    description: [...new Set(effects.map(effect => descriptions[effect.type](effect)))].join(" · ") + (target === "area" ? " · Hasta tres blancos" : "") })];
})));

const BASE_SIGNATURES = {
  fenix: ["heal", "feathers"], medica: ["heal", "medicine"], pulpo: ["slow", "mantle"], mamut: ["protect", "mass"],
  atenea: ["empower", "strategy"], anubis: ["slow", "judgment"], quetzalcoatl: ["weaken", "wind"],
  thor: ["direct", "lightning"], dragon: ["area", "fire"], alquimista: ["empower", "reagent"], herrera: ["direct", "forge"],
  ajolote: ["heal", "water"], triceratops: ["protect", "push"], sirena: ["slow", "water"], grifo: ["direct", "push"]
};

const ROLE_SPECIAL = {
  guardian: "intercept", fighter: "guardBreak", striker: "stun", marksman: "piercing", assassin: "periodic",
  mage: "weaken", healer: "cleanse", support: "shield", controller: "immobilize", summoner: "conjure",
  artillery: "guardBreak", logistics: "reserves"
};
const ROLE_ALTERNATE = {
  guardian: "resist", fighter: "direct", striker: "multi", marksman: "volley", assassin: "multi",
  mage: "area", healer: "regen", support: "empower", controller: "weaken", summoner: "shield",
  artillery: "area", logistics: "shield"
};

const PASSIVES = {
  regeneration: { name: "Reserva regenerativa", description: "Regenera 6 de vitalidad la primera vez que comienza una ronda por debajo del 55 %.", trigger: "renew" },
  armored: { name: "Coraza estable", description: "Empieza con un escudo del 12 % de la vitalidad.", trigger: "shell" },
  pack: { name: "Ritmo de manada", description: "Comienza con +8 de agilidad si tiene un aliado adyacente.", trigger: "pack" },
  strategy: { name: "Previsión", description: "Comienza con +8 de poder mágico durante dos rondas.", trigger: "strategy" },
  alchemy: { name: "Reserva catalítica", description: "Comienza con +8 de poder mágico durante dos rondas.", trigger: "strategy" },
  aerial: { name: "Paso aéreo", description: "Alcanza la retaguardia protegida con sus ataques básicos.", trigger: "reach" },
  carrier: { name: "Apoyo firme", description: "Empieza con un escudo del 12 % de la vitalidad.", trigger: "shell" },
  fallback: { name: "Aplomo inicial", description: "Comienza con +6 de defensa durante la primera ronda.", trigger: "brace" }
};

export function prepareCombatant(card, rules = TRAINING_RULES) {
  const concept = getCreatureConcept(card);
  if (!concept || !card.stats || card.category === "aberration" || card.category === "essence") return null;
  const { combat, utility } = getCreatureProfiles(card);
  const stats = { ...combat.stats };
  const tags = concept.tags;
  const capabilities = combat.capabilities.filter(id => id !== "summon" && SKILLS[id]);
  const signature = BASE_SIGNATURES[card.id];
  const main = signature?.[0] ?? capabilities[0] ?? "empower";
  const isMagic = combat.role === "mage" || combat.role === "summoner" || stats.magic > stats.strength * 1.25;
  const affinities = combat.affinities;
  const domain = concept.nature === "divine" && concept.knowledge.includes("estrategia");
  const special = signature?.[1] ?? (
    capabilities.some(id => ["direct", "area", "periodic"].includes(id)) && affinities.includes("fuego") ? "fire" :
    capabilities.includes("area") && affinities.includes("viento") ? "wind" :
    capabilities.includes("area") && affinities.includes("rayo") ? "lightning" :
    capabilities.includes("heal") && tags.includes("regeneration") ? "feathers" :
    capabilities.includes("empower") && tags.includes("alchemy") ? "reagent" :
    capabilities.includes("protect") && domain ? "strategy" :
    capabilities.find(id => id !== main) ?? ROLE_SPECIAL[combat.role] ?? "guardBreak"
  );
  const fallback = combat.role === "marksman" || combat.role === "artillery" ? "bolt" : isMagic ? "spark"
    : ["healer", "guardian", "support", "logistics"].includes(combat.role) ? "assist" : "strike";
  const trait = tags.includes("regeneration") ? "regeneration" : tags.includes("armored") ? "armored" :
    tags.includes("pack") ? "pack" : domain || card.id === "atenea" ? "strategy" :
    tags.includes("alchemy") ? "alchemy" : combat.mobility === "aerial" ? "aerial" :
    tags.includes("carrier") ? "carrier" : "fallback";
  const identity = concept.depth ?? baseIdentity(card, concept);
  const motif = identity.expressions.find(item => item.type !== "external")?.trait ?? concept.knowledge[0] ?? concept.features[0] ?? card.name;

  return {
    cardId: card.id, name: card.name, generation: card.generation ?? 0, role: combat.role,
    secondaryRole: combat.secondaryRole, stats, affinities: [...affinities], mobility: combat.mobility,
    capabilities, utility: [...utility.capabilities], motif,
    cost: rules.deployment[card.generation ?? 0] ?? combat.deploymentCost,
    maxHp: Math.round(rules.healthBase + stats.vitality * rules.healthPerVitality),
    basic: fallback, main, special: special === main ? ROLE_ALTERNATE[combat.role] : special,
    passive: PASSIVES[trait]
  };
}
