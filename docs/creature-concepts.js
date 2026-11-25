// El catálogo conserva sus rasgos de expedición. Estos datos describen qué puede
// aportar cada carta a una nueva interpretación.
export const CONCEPT_LABELS = {
  nature: { biological: "Biológica", mythical: "Mítica", mythic: "Mítica", divine: "Divina",
    artificial: "Artificial", elemental: "Elemental", symbiotic: "Simbiótica", spiritual: "Espiritual" },
  anatomy: { humanoid: "Humanoide", quadruped: "Cuadrúpeda", avian: "Avícola",
    reptilian: "Reptiliana", aquatic: "Acuática", amphibian: "Anfibia", cephalopod: "Cefalópoda",
    serpentine: "Serpentina", centaur: "Centauroide", construct: "Constructo", hybrid: "Híbrida" },
  size: { small: "Pequeña", medium: "Mediana", large: "Grande", colossal: "Colosal" },
  intelligence: { animal: "Animal", sapient: "Sapiente", divine: "Divina" }
};

export const CONCEPT_LIMITS = Object.freeze({
  tags: 8, features: 5, habitats: 2, knowledge: 3, tools: 3, materials: 3,
  affinities: 2, capabilities: 4, utility: 4, inheritance: 6
});

const intellect = {
  human: { nature: "biological", anatomy: "humanoid", size: "medium", intelligence: "sapient", habitat: ["asentamientos"] },
  animal: { nature: "biological", size: "medium", intelligence: "animal" },
  extinct: { nature: "biological", size: "large", intelligence: "animal", tags: ["ancestral"] },
  mythic: { nature: "mythic", size: "large", intelligence: "sapient", tags: ["legendary"] },
  deity: { nature: "divine", anatomy: "humanoid", size: "medium", intelligence: "divine", tags: ["supernatural"] },
  fusion: { nature: "mythic", anatomy: "hybrid", size: "medium", intelligence: "sapient" }
};

const vocation = (profession, role, knowledge, tools, utility, tags = [], materials = []) =>
  ({ speciesId: "humano", profession, role, knowledge, tools, utility, tags: ["profession", ...tags], materials });
const form = (anatomy, size, role, features, habitat, tags = [], details = {}) =>
  ({ anatomy, size, role, features, habitat, tags, ...details });

const BASE_DETAILS = {
  civil: vocation("oficios civiles", "logistics", ["adaptación local", "intercambio"], ["suministros"], ["supply", "events"], ["social"]),
  obrero: vocation("construcción", "guardian", ["apuntalamiento"], ["andamios", "cuñas"], ["craft", "protect"], ["construction", "equipment"], ["madera"]),
  alquimista: vocation("alquimia", "support", ["transmutación", "elaboración de reactivos"], ["retorta", "mortero"], ["craft", "research", "supply"], ["alchemy", "magic", "equipment"], ["reactivos"]),
  mago: vocation("magia rúnica", "mage", ["inscripción rúnica"], ["grimorio"], ["research", "events"], ["magic", "equipment"], ["runas"]),
  abogado: vocation("abogacía", "controller", ["negociación", "derecho"], ["escrituras"], ["events", "support"], ["social", "ritual"]),
  medica: vocation("medicina", "healer", ["diagnóstico", "primeros auxilios"], ["estuche médico"], ["heal", "survival"], ["medicine", "equipment"]),
  herrera: vocation("herrería", "fighter", ["trabajo de los metales"], ["martillo", "yunque"], ["craft", "protect"], ["smithing", "equipment", "construction"], ["acero"]),
  cartografa: vocation("cartografía", "logistics", ["orientación", "lectura del terreno"], ["brújula", "mapas"], ["explore", "logistics"], ["navigation", "equipment"]),
  musico: vocation("música", "support", ["armonía", "coordinación"], ["instrumento"], ["support", "events"], ["social", "sound"]),
  arquitecta: vocation("arquitectura", "logistics", ["arquitectura", "reparto de cargas"], ["planos", "compás"], ["craft", "logistics", "protect"], ["construction", "equipment"], ["piedra"]),
  lobo: form("quadruped", "medium", "fighter", ["hocico rastreador", "patas corredoras"], ["bosque", "tundra"], ["canid", "pack", "tracker"], { utility: ["explore", "protect"] }),
  zorro: form("quadruped", "small", "assassin", ["orejas sensibles", "cola tupida"], ["bosque", "pradera"], ["canid", "tracker", "stealth"], { utility: ["explore", "survival"] }),
  buho: form("avian", "small", "assassin", ["alas silenciosas", "visión nocturna"], ["bosque"], ["bird", "winged", "stealth"], { utility: ["explore"] }),
  oso: form("quadruped", "large", "striker", ["garras", "cuerpo robusto"], ["bosque", "montaña"], ["mammal", "burly", "carrier"], { utility: ["survival", "protect"] }),
  pulpo: form("cephalopod", "small", "controller", ["brazos prensiles", "camuflaje"], ["océano"], ["aquatic", "manipulator", "stealth"], { capabilities: ["multi", "weaken"], utility: ["explore", "survival"] }),
  ajolote: form("amphibian", "small", "healer", ["branquias externas", "tejidos regenerativos"], ["agua dulce"], ["amphibious", "regeneration"], { capabilities: ["regen"], utility: ["heal", "survival"] }),
  mamut: form("quadruped", "colossal", "guardian", ["trompa prensil", "colmillos curvos", "pelaje aislante"], ["estepa fría"], ["proboscidean", "mammal", "carrier", "burly"], { materials: ["marfil"], utility: ["transport", "protect", "survival"] }),
  velociraptor: form("reptilian", "medium", "assassin", ["cola de contrapeso", "garras de agarre"], ["llanura"], ["reptile", "dinosaur", "stealth"], { capabilities: ["piercing"], utility: ["explore"] }),
  triceratops: form("quadruped", "colossal", "guardian", ["gola ósea", "cuernos de embestida"], ["llanura"], ["reptile", "dinosaur", "carrier", "armored"], { materials: ["hueso"], utility: ["transport", "protect"] }),
  anquilosaurio: form("quadruped", "colossal", "guardian", ["placas óseas", "cola de maza"], ["llanura"], ["reptile", "dinosaur", "carrier", "armored"], { materials: ["hueso"], utility: ["transport", "protect"] }),
  megalodon: form("aquatic", "colossal", "striker", ["mandíbulas anchas", "aletas propulsoras"], ["océano"], ["aquatic", "burly"], { materials: ["dentina"], utility: ["survival"] }),
  rinoceronte_lanudo: form("quadruped", "large", "striker", ["cuerno frontal", "pelaje aislante"], ["estepa fría"], ["mammal", "carrier", "burly"], { utility: ["transport", "survival"] }),
  grifo: form("quadruped", "large", "striker", ["alas", "garras rapaces"], ["montaña"], ["winged", "bird", "carrier"], { utility: ["explore", "transport"] }),
  dragon: form("reptilian", "colossal", "artillery", ["alas", "mandíbulas ígneas", "escamas"], ["montaña"], ["reptile", "winged", "fire", "magic", "carrier"], { affinities: ["fuego"], capabilities: ["area", "periodic"], utility: ["protect"] }),
  fenix: form("avian", "medium", "healer", ["plumas de ceniza viva", "alas ígneas"], ["desierto"], ["winged", "bird", "fire", "magic", "regeneration"], { affinities: ["fuego"], materials: ["ceniza"], capabilities: ["regen", "heal"], utility: ["heal", "survival"] }),
  esfinge: form("quadruped", "large", "controller", ["cuerpo leonino", "rostro humano"], ["desierto"], ["feline", "guardian", "ritual", "social"], { knowledge: ["acertijos"], utility: ["events", "protect"] }),
  sirena: form("aquatic", "medium", "controller", ["cola natatoria", "voz resonante"], ["océano"], ["aquatic", "magic", "sound"], { affinities: ["agua"], knowledge: ["eco marino"], utility: ["explore", "events"] }),
  quetzalcoatl: form("serpentine", "colossal", "mage", ["cuerpo serpentiforme", "plumas"], ["cielo"], ["reptile", "winged", "magic", "ritual"], { affinities: ["viento"], culture: "tradición mesoamericana", utility: ["explore", "events"] }),
  anubis: form("humanoid", "large", "controller", ["cabeza de chacal", "manos hábiles"], ["necrópolis"], ["canid", "magic", "ritual"], { knowledge: ["rituales funerarios"], tools: ["balanza"], culture: "tradición egipcia", utility: ["events", "protect"] }),
  atenea: form("humanoid", "medium", "support", ["manos hábiles", "postura erguida"], ["ciudad"], ["magic", "social", "equipment"], { knowledge: ["estrategia", "artesanía"], tools: ["égida"], culture: "tradición griega", utility: ["craft", "protect", "support"] }),
  thor: form("humanoid", "large", "striker", ["brazos robustos", "manos hábiles"], ["montaña"], ["magic", "burly", "equipment"], { affinities: ["rayo"], tools: ["martillo"], culture: "tradición nórdica", utility: ["protect", "survival"] })
};

const TRAIT_CONCEPTS = {
  alquimia: "alchemy", arremetida: "burly", autoridad: "social", canto: "sound", coraza: "armored",
  curacion: "medicine", forja: "equipment", fuego: "fire", manada: "pack", magia: "magic",
  oceano: "aquatic", olfato: "tracker", presagio: "ritual", regeneracion: "regeneration",
  sigilo: "stealth", tormenta: "storm", vuelo: "winged"
};

const TRAIT_AFFINITIES = { fuego: "fuego", oceano: "agua", tormenta: "rayo" };
const ARRAY_LIMITS = {
  tags: CONCEPT_LIMITS.tags, features: CONCEPT_LIMITS.features, habitat: CONCEPT_LIMITS.habitats,
  knowledge: CONCEPT_LIMITS.knowledge, tools: CONCEPT_LIMITS.tools, materials: CONCEPT_LIMITS.materials,
  affinities: CONCEPT_LIMITS.affinities, capabilities: CONCEPT_LIMITS.capabilities, utility: CONCEPT_LIMITS.utility
};
const CAPABILITIES_FROM_TAGS = {
  armored: ["protect", "resist"], burly: ["direct"], medicine: ["heal", "cleanse"],
  regeneration: ["regen"], magic: ["area"], alchemy: ["empower"],
  stealth: ["piercing"], pack: ["multi"], social: ["empower"]
};
const UTILITY_FROM_TAGS = {
  tracker: ["explore"], carrier: ["transport"], construction: ["craft", "protect"],
  alchemy: ["craft", "research"], ritual: ["events"], medicine: ["heal"],
  navigation: ["explore", "logistics"], social: ["support"], regeneration: ["survival"]
};
const BODIES_WITH_HANDS = new Set(["humanoid", "centaur", "construct", "cephalopod"]);
const AQUATIC_BODIES = new Set(["aquatic", "cephalopod", "amphibian"]);
const MULTIFUNCTION_STRUCTURES = new Set(["laboratory", "platform", "settlement", "artillery", "workshop"]);

function distinct(items, limit) {
  return [...new Set(items.filter(item => typeof item === "string" && item.length > 0))].slice(0, limit);
}

const baseCache = new WeakMap();

export function getCreatureConcept(card) {
  if (!card || ["aberration", "essence"].includes(card.category)) return null;
  if (card.concept) return card.concept;
  if (baseCache.has(card)) return baseCache.get(card);
  const defaults = intellect[card.category] ?? intellect.fusion;
  const details = BASE_DETAILS[card.id] ?? {};
  const traitTags = (card.traits ?? []).map(trait => TRAIT_CONCEPTS[trait]);
  const tags = distinct([...(details.tags ?? []), ...(defaults.tags ?? []), ...traitTags], CONCEPT_LIMITS.tags);
  const fields = { ...defaults, ...details, tags,
    affinities: [...(details.affinities ?? []), ...(card.traits ?? []).map(trait => TRAIT_AFFINITIES[trait])],
    capabilities: [...(details.capabilities ?? []), ...tags.flatMap(tag => CAPABILITIES_FROM_TAGS[tag] ?? [])],
    utility: [...(details.utility ?? []), ...tags.flatMap(tag => UTILITY_FROM_TAGS[tag] ?? [])]
  };
  const concept = {
    ...fields,
    speciesId: card.speciesId ?? details.speciesId ?? card.id,
    inheritance: Object.freeze([]),
    ...Object.fromEntries(Object.entries(ARRAY_LIMITS).map(([field, limit]) => [
      field, Object.freeze(distinct(fields[field] ?? [], limit))
    ]))
  };
  const frozen = Object.freeze(concept);
  baseCache.set(card, frozen);
  return frozen;
}

const CONFLICTING_TAGS = {
  // Las capacidades para ambientes opuestos solo se heredan juntas si la
  // interpretación tiene cuerpo anfibio. El hábitat es distinto de la afinidad.
  aquatic: ["terrestrial-only"],
  "terrestrial-only": ["aquatic"],
  wingless: ["winged"],
  winged: ["wingless"]
};

function canInherit(field, value, concept, source) {
  if (field === "tags") {
    const wingsFit = value !== "winged" ||
      ["avian", "reptilian", "hybrid", "quadruped", "serpentine", "construct"].includes(concept.anatomy);
    const waterFits = value !== "aquatic" || AQUATIC_BODIES.has(concept.anatomy) || concept.anatomy === "hybrid";
    return wingsFit && waterFits && !(CONFLICTING_TAGS[value] ?? []).some(other => concept.tags.includes(other));
  }
  if (field === "habitat" && value === "océano") {
    return AQUATIC_BODIES.has(concept.anatomy) || (concept.anatomy === "hybrid" && concept.tags.includes("aquatic"));
  }
  if (field === "features") {
    return concept.anatomy === source.anatomy || concept.anatomy === "hybrid" || concept.anatomy === "centaur";
  }
  if (field === "tools") {
    return BODIES_WITH_HANDS.has(concept.anatomy) || MULTIFUNCTION_STRUCTURES.has(concept.structure) || concept.tags.includes("manipulator");
  }
  if (field === "knowledge" && concept.intelligence === "animal") return false;
  return true;
}

export function inheritCreatureConcept(a, b, spec = {}) {
  const parents = a.id <= b.id ? [a, b] : [b, a];
  const contributors = parents.map(getCreatureConcept);
  const [first, second] = contributors;
  const concept = {
    speciesId: spec.speciesId ?? null,
    nature: spec.nature ?? (first.nature === second.nature ? first.nature : "mythic"),
    anatomy: spec.anatomy ?? (first.anatomy === second.anatomy ? first.anatomy : "hybrid"),
    size: spec.size ?? (first.size === second.size ? first.size : "medium"),
    intelligence: spec.intelligence ?? (contributors.some(parent => parent.intelligence !== "animal") ? "sapient" : "animal"),
    profession: spec.profession ?? null,
    structure: spec.structure ?? null,
    culture: spec.culture ?? null,
    role: spec.role ?? null,
    secondaryRole: spec.secondaryRole ?? null,
    inheritance: []
  };
  for (const [field, limit] of Object.entries(ARRAY_LIMITS)) {
    concept[field] = distinct(spec[field] ?? [], limit);
  }

  // Conserva una selección de características inmediatas. Repartir los seis
  // espacios entre progenitores evita que uno ocupe todo el registro o que se
  // reciclen sin límite las capacidades de cada antepasado.
  const order = ["features", "knowledge", "materials", "affinities", "tags", "tools", "habitat", "utility", "capabilities"];
  const limitPerParent = CONCEPT_LIMITS.inheritance / parents.length;
  for (const [i, parent] of contributors.entries()) {
    let added = 0;
    for (const field of order) {
      if (added >= limitPerParent) break;
      if (concept[field].length >= ARRAY_LIMITS[field]) continue;
      const value = (parent[field] ?? []).find(item => !concept[field].includes(item) && canInherit(field, item, concept, parent));
      if (!value) continue;
      concept[field].push(value);
      concept.inheritance.push({ parentId: parents[i].id, field, value });
      added += 1;
    }
  }
  return concept;
}
