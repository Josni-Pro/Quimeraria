import { CARDS } from "./catalog.js";
import { getCreatureConcept, inheritCreatureConcept } from "./creature-concepts.js";

export const FUSION_RULES_VERSION = 1;

export const VARIANT_FAMILIES = Object.freeze({
  classic: "Quimérica", hybrid: "Hibridación", anthropomorphic: "Antropomorfización",
  kin: "Linaje humanoide", profession: "Transferencia de profesión",
  equipment: "Equipamiento", carrier: "Portadora de estructuras", transmutation: "Transmutación",
  construct: "Construcción viviente", element: "Manifestación elemental", symbiosis: "Simbiosis",
  divine: "Manifestación divina", evolution: "Evolutiva", ancestral: "Ancestral",
  mythology: "Mitológica", convergence: "Convergente", legacy: "Histórica"
});
export const VARIANT_QUALITY_WEIGHTS = Object.freeze({
  common: 55, uncommon: 30, rare: 12, exceptional: 3
});
export const VARIANT_QUALITY_LABELS = Object.freeze({
  common: "Común", uncommon: "Poco común", rare: "Rara", exceptional: "Excepcional"
});

const species = new Map(CARDS.map(card => [card.id, card]));

// Los ID base no admiten paréntesis ni separadores. Los ID generados tienen
// paréntesis balanceados, por lo que sus pares siguen siendo inequívocos.
export function variantIdentity(parents, key) {
  const combinationId = `fusion(${[...parents].sort().join("+")})`;
  const id = ["classic", "legacy"].includes(key) ? combinationId : `variant(${combinationId};${key})`;
  return { id, combinationId, variantId: id };
}

function variant(key, family, quality, shape, name, description, spec, visual = description) {
  return { key, family, quality, shape, name, description, spec, visual };
}

function fromClassic(card) {
  return variant("classic", "classic", "common", "classic", card.name, card.description, {},
    `Retrato de la fusión original de ${card.name}.`);
}

function buildCard(classic, parents, option, probability) {
  const ids = variantIdentity(classic.parents, option.key);
  const concept = inheritCreatureConcept(...parents, option.spec);
  concept.speciesId ??= ids.variantId;
  const final = option.key === "classic" ? classic.art : option.spec.final ?? null;
  return {
    ...classic, ...ids, variantKey: option.key, fusionRulesVersion: FUSION_RULES_VERSION,
    name: option.name, description: option.description, art: final,
    family: option.family, quality: option.quality, probability, concept,
    identity: {
      shape: option.shape, accent: option.spec.accent ?? null,
      anatomy: concept.anatomy, speciesId: concept.speciesId, visual: option.visual,
      materials: concept.materials, accessories: concept.tools, powers: concept.capabilities,
      illustration: { reference: ids.variantId, final, status: final ? "compatible" : "provisional" }
    }
  };
}

export function decorateClassicFusion(card, a, b) {
  const option = { ...fromClassic(card), key: "legacy", family: "legacy" };
  const decorated = buildCard(card, [a, b], option, null);
  // Las cartas históricas conservan el identificador y el arte original.
  return {
    ...decorated, id: card.id, variantId: card.id, art: card.art,
    identity: { ...decorated.identity, illustration: {
      reference: card.id, final: card.art ?? null, status: card.art ? "compatible" : "provisional"
    } }
  };
}

const ALCHEMICAL_MAMMOTH = [
  variant("laboratory", "carrier", "common", "laboratory", "Laboratorio alquímico ambulante",
    "El lomo del mamut sostiene un laboratorio suspendido. Su trompa alcanza las válvulas que mantienen estables los reactivos en marcha.",
    { role: "support", secondaryRole: "logistics", anatomy: "quadruped", size: "colossal", intelligence: "sapient",
      structure: "laboratory", tools: ["retortas suspendidas", "arnés de válvulas"], materials: ["cobre", "reactivos"],
      tags: ["carrier", "alchemy"], utility: ["craft", "supply", "research", "transport"], accent: "#61d8b3" },
    "Mamut lanudo con colmillos curvos, arnés de cobre y retortas suspendidas sobre la espalda."),
  variant("siege", "equipment", "rare", "artillery", "Bastión de pólvora verde",
    "Un mamut acciona con la trompa una pieza de asedio alquímica. Sus patas y su arnés ancho absorben el retroceso sin bloquearle el paso.",
    { role: "artillery", secondaryRole: "guardian", anatomy: "quadruped", size: "colossal", intelligence: "sapient",
      structure: "artillery", tools: ["cañón alquímico", "arnés de retroceso"], materials: ["acero", "reactivos"],
      tags: ["carrier", "alchemy"], capabilities: ["area", "piercing"], accent: "#dfad70" },
    "Mamut con plataforma baja, pesado cañón de cobre y refuerzos de acero sobre los hombros."),
  variant("settlement", "carrier", "exceptional", "settlement", "Asentamiento del Crisol Errante",
    "El mamut colosal transporta viviendas, depósitos y talleres alquímicos. Contrapesos suspendidos mantienen nivelado el asentamiento al caminar.",
    { role: "logistics", secondaryRole: "support", anatomy: "quadruped", size: "colossal", intelligence: "sapient",
      structure: "settlement", tools: ["talleres", "contrapesos", "depósitos"], materials: ["madera", "cobre"],
      tags: ["carrier", "alchemy"], utility: ["transport", "logistics", "supply", "craft"], accent: "#d8ba7c" },
    "Mamut gigantesco con caserío fortificado sobre el lomo y depósitos colgantes a ambos lados."),
  variant("transmuted", "transmutation", "common", "transmuted", "Mamut de Vetaclara",
    "La alquimia convirtió la dentina del mamut en cristal y su pelaje almacena calor. Las vetas descargan la presión hacia los colmillos.",
    { role: "guardian", secondaryRole: "fighter", anatomy: "quadruped", size: "colossal",
      materials: ["cristal", "marfil"], features: ["colmillos cristalizados", "pelaje térmico"],
      tags: ["carrier", "alchemy", "armored"], capabilities: ["resist", "shield"], accent: "#78c7f7" }),
  variant("practitioner", "anthropomorphic", "uncommon", "humanoid", "Destilador de Marfil",
    "Un mamut bípedo practica la alquimia con manos articuladas. Su trompa sirve de tercera pinza para sujetar los recipientes.",
    { role: "support", secondaryRole: "fighter", anatomy: "humanoid", intelligence: "sapient",
      profession: "alquimia", features: ["trompa prensil", "manos articuladas"], tools: ["retorta", "mortero"],
      tags: ["alchemy", "manipulator"], utility: ["craft", "research"], accent: "#e3a973" }),
  variant("kin", "kin", "uncommon", "kin", "Alquimista de Linaje Mamut",
    "Alquimista humanoide de constitución robusta. El plumón invernal y los colmillos cortos conservan el linaje del mamut sin entorpecer el oficio.",
    { role: "support", secondaryRole: "guardian", anatomy: "humanoid", intelligence: "sapient",
      profession: "alquimia", features: ["colmillos cortos", "cabello abundante"], tools: ["mortero", "manto invernal"],
      tags: ["alchemy", "burly"], utility: ["craft", "supply"], accent: "#f3c994" }),
  variant("colossus", "construct", "exceptional", "construct", "Coloso Alquímico",
    "Un núcleo de reactivos mueve placas minerales articuladas siguiendo la estructura de carga del mamut. Las patas de piedra descargan el peso hacia el suelo.",
    { role: "guardian", secondaryRole: "mage", anatomy: "construct", nature: "artificial", size: "colossal",
      features: ["núcleo alquímico", "patas columnares"], materials: ["piedra", "cristal"],
      tags: ["alchemy", "armored", "carrier"], capabilities: ["shield", "area"], accent: "#b0abfe" })
];

const has = (concept, tag) => concept.tags.includes(tag);
const any = (concepts, tag) => concepts.some(concept => has(concept, tag));
const form = (concept, fields) => ({
  anatomy: concept.anatomy, size: concept.size, intelligence: concept.intelligence, ...fields
});

function vocationalOptions(jobCard, bodyCard, job, body) {
  const vocation = job.profession ?? jobCard.name.toLowerCase();
  const role = job.role ?? "support";
  const feature = body.features[0] ?? "constitución heredada";
  const results = [
    variant("practitioner", "profession", "uncommon", "humanoid", `Oficiante de ${vocation} · ${bodyCard.name}`,
      `El linaje de ${bodyCard.name} adquiere manos articuladas y aprende ${vocation} de ${jobCard.name}. Su ${feature} sigue siendo útil para el oficio.`,
      { anatomy: "humanoid", intelligence: "sapient", profession: vocation, role,
        secondaryRole: body.role, features: ["manos articuladas", feature], tools: job.tools, utility: job.utility,
        tags: ["profession", "manipulator"] })
  ];
  const groundCarrier = has(body, "carrier") && ["large", "colossal"].includes(body.size) &&
    ["quadruped", "reptilian"].includes(body.anatomy);
  if (groundCarrier && ["equipment", "construction", "alchemy"].some(tag => has(job, tag))) {
    const tools = job.tools.length ? job.tools.join(" y ") : "herramientas de campaña";
    results.push(variant("workshop", "carrier", "rare", "laboratory", `Taller itinerante de ${vocation}`,
      `${bodyCard.name} transporta ${tools} en una plataforma baja y reparte su peso entre las patas. Un equipo aplica el oficio de ${jobCard.name} durante las paradas.`,
      form(body, { structure: "workshop", role: "logistics", secondaryRole: role, tools: job.tools,
        tags: ["carrier", "profession"], utility: ["transport", ...job.utility, "logistics"] })));
  }
  if (has(job, "magic") && ["quadruped", "avian", "reptilian", "serpentine"].includes(body.anatomy)) {
    results.push(variant("enchanted", "transmutation", "rare", "transmuted", `Custodio transmutado · ${bodyCard.name}`,
      `Las inscripciones de ${jobCard.name} se integran en el cuerpo de ${bodyCard.name}. Se encienden con su movimiento y desvían parte de los golpes.`,
      form(body, { nature: "mythic", role: "guardian", secondaryRole: "mage",
        materials: ["runas minerales"], tags: ["magic", "armored"], capabilities: ["shield"], utility: ["protect"] })));
  }
  return results;
}

const AQUATIC_BODIES = new Set(["aquatic", "amphibian", "cephalopod"]);

function sameSpeciesOption(card, concept) {
  if (AQUATIC_BODIES.has(concept.anatomy)) {
    return variant("evolution", "evolution", "uncommon", "symbiotic", `${card.name} de las Corrientes`,
      `Dos ejemplares de ${card.name} dan origen a un linaje que percibe las vibraciones del agua. Se orienta en la oscuridad y evita que la corriente arrastre a su grupo.`,
      form(concept, { role: "controller", features: ["órganos sensibles a vibraciones"],
        tags: ["aquatic"], capabilities: ["slow"], utility: ["explore", "protect"] }));
  }
  if (has(concept, "winged")) {
    return variant("evolution", "evolution", "uncommon", "aerial", `${card.name} de las Alturas`,
      `Del linaje de ${card.name} nace un volador de alas más largas que utiliza las corrientes ascendentes para cubrir grandes distancias.`,
      form(concept, { role: "marksman", features: ["alas de gran envergadura"],
        tags: ["winged"], capabilities: ["piercing"], utility: ["explore", "survival"] }));
  }
  const biped = concept.anatomy === "humanoid";
  return variant("evolution", "evolution", "uncommon", biped ? "humanoid" : "colossal",
    `${card.name} del Bastión`,
    `Dos ejemplares de ${card.name} desarrollan una forma adaptada a defender pasos estrechos. Una postura baja y apoyos reforzados le permiten resistir el empuje sin perder movilidad.`,
    form(concept, { role: "guardian", secondaryRole: concept.role, features: ["apoyos reforzados"],
      tags: ["armored"], capabilities: ["intercept", "resist"], utility: ["protect"] }));
}

function symbioticOption(a, b, ac, bc) {
  const mixedHabitat = AQUATIC_BODIES.has(ac.anatomy) !== AQUATIC_BODIES.has(bc.anatomy);
  if (mixedHabitat) {
    const [water, land] = AQUATIC_BODIES.has(ac.anatomy) ? [a, b] : [b, a];
    return variant("symbiosis", "symbiosis", "uncommon", "symbiotic", `Vigía de Dos Orillas · ${water.name}`,
      `El organismo de ${water.name} habita una cámara húmeda del cuerpo de ${land.name}. La cámara detecta vibraciones y el portador puede cruzar tierra firme sin que se seque.`,
      { anatomy: "amphibian", nature: "symbiotic", role: "support", secondaryRole: "controller",
        features: ["cámara húmeda protegida"], tags: ["symbiosis", "amphibious"],
        capabilities: ["empower", "slow"], utility: ["explore", "protect"] });
  }
  const sharedAnatomy = ac.anatomy === bc.anatomy ? ac.anatomy : "hybrid";
  return variant("symbiosis", "symbiosis", "uncommon", "symbiotic", `Pacto de ${a.name} y ${b.name}`,
    `Dos órganos vinculados conservan ${ac.features[0] ?? "la constitución del primer linaje"} y ${bc.features[0] ?? "la del segundo"}. Intercambian alertas y coordinan la retirada antes de abandonar el refugio.`,
    { anatomy: sharedAnatomy, nature: "symbiotic", role: "support", secondaryRole: "controller",
      features: ["órganos de enlace"], tags: ["symbiosis"], capabilities: ["empower", "slow"],
      utility: ["explore", "protect"] });
}

function recognizedOptions(a, b, ac, bc) {
  const variants = [];
  if (ac.speciesId === bc.speciesId && has(ac, "canid")) {
    if (ac.speciesId === "zorro") {
      variants.push(variant("kitsune", "mythology", "rare", "kitsune", "Kitsune",
        "El zorro de la tradición japonesa confunde a sus perseguidores con colas ilusorias. Conserva el oído agudo del linaje y desvía los rastros hacia caminos falsos.",
        { speciesId: "kitsune", nature: "spiritual", anatomy: "quadruped", intelligence: "sapient",
          culture: "tradición japonesa", features: ["colas ilusorias", "orejas sensibles"], tags: ["canid", "magic"],
          role: "controller", secondaryRole: "assassin", capabilities: ["slow", "weaken"], utility: ["events", "explore"] }));
    }
    if (ac.speciesId === "lobo") {
      variants.push(variant("dire-wolf", "ancestral", "rare", "colossal", "Lobo terrible",
        "Forma ancestral inspirada en el cánido extinto. Combina las tácticas de manada con una mandíbula ancha que sostiene a la presa.",
        { speciesId: "lobo_terrible", nature: "biological", anatomy: "quadruped", size: "large", intelligence: "animal",
          features: ["mandíbula ancha"], tags: ["canid", "ancestral", "pack"], role: "striker",
          capabilities: ["direct", "multi"], utility: ["survival"] }));
      variants.push(variant("orthros", "mythology", "exceptional", "orthros", "Ortro",
        "Sabueso bicéfalo de la tradición griega. Las dos cabezas comparten el paso de una misma manada y vigilan entradas opuestas sin estorbarse.",
        { speciesId: "ortro", nature: "mythic", anatomy: "quadruped", size: "large", intelligence: "sapient",
          culture: "tradición griega", features: ["dos cabezas coordinadas"], tags: ["canid", "guardian"],
          role: "guardian", secondaryRole: "fighter", capabilities: ["intercept", "multi"], utility: ["protect"] }));
    }
  }
  const airborneReptile = (has(ac, "reptile") && has(bc, "winged")) || (has(bc, "reptile") && has(ac, "winged"));
  if (a.id !== b.id && airborneReptile && any([ac, bc], "fire")) {
    const dragon = species.get("dragon");
    const native = getCreatureConcept(dragon);
    variants.push(variant("dragon", "convergence", "rare", "convergent", dragon.name,
      `El linaje reptiliano y el vuelo se estabilizan como los de un dragón. El fuego heredado de ${has(ac, "fire") ? a.name : b.name} alimenta su aliento ígneo.`,
      { ...native, speciesId: dragon.id, final: dragon.art }));
  }
  return variants;
}

function interpretations(a, b, classic) {
  const results = [fromClassic(classic)];
  const parents = [a, b];
  const concepts = parents.map(getCreatureConcept);
  const [ac, bc] = concepts;
  if (a.id === "alquimista" && b.id === "mamut") return [...results, ...ALCHEMICAL_MAMMOTH];

  if (a.id === b.id || ac.speciesId === bc.speciesId && !ac.profession && !bc.profession) {
    results.push(sameSpeciesOption(a, ac));
  } else if (ac.profession && bc.profession) {
    results.push(variant("guild", "profession", "uncommon", "humanoid", `Maestría del Oficio Doble · ${a.name} y ${b.name}`,
      `Un artesano integra ${ac.profession} y ${bc.profession}. Cambia de herramienta según el problema y comparte sus hallazgos con la cuadrilla.`,
      { anatomy: "humanoid", intelligence: "sapient", role: "support", secondaryRole: "logistics",
        profession: `${ac.profession} y ${bc.profession}`, tools: [...ac.tools.slice(0, 1), ...bc.tools.slice(0, 1)],
        knowledge: [...ac.knowledge.slice(0, 1), ...bc.knowledge.slice(0, 1)], utility: ["support", ...ac.utility, ...bc.utility] }));
  } else if (ac.profession || bc.profession) {
    const job = ac.profession ? 0 : 1;
    results.push(...vocationalOptions(parents[job], parents[1 - job], concepts[job], concepts[1 - job]));
  } else {
    results.push(symbioticOption(a, b, ac, bc));
  }
  if (any(concepts, "winged") && !concepts.every(concept => concept.anatomy === "humanoid")) {
    const flyer = has(ac, "winged") ? a : b;
    const other = flyer === a ? b : a;
    results.push(variant("aerial", "hybrid", "uncommon", "aerial", `Planeador de ${other.name}`,
      `Las alas heredadas de ${flyer.name} sostienen una forma aligerada de ${other.name}. Los tendones de las alas cierran el perfil al aterrizar.`,
      { anatomy: "avian", size: "medium", features: ["tendones de ala reforzados", "huesos ligeros"],
        tags: ["winged"], role: "marksman", utility: ["explore"], capabilities: ["piercing"] }));
  }
  const element = concepts.flatMap(concept => concept.affinities)[0];
  if (element && any(concepts, "magic")) {
    results.push(variant("elemental", "element", "rare", "elemental", `Foco de ${element} · ${classic.name}`,
      `La afinidad de ${element} toma cuerpo alrededor de un núcleo que combina las formas de ${a.name} y ${b.name}. El núcleo recompone la envoltura cuando se dispersa.`,
      { nature: "elemental", anatomy: "construct", role: "mage", secondaryRole: "controller",
        affinities: [element], features: ["núcleo de cohesión"], tags: ["magic"],
        materials: [element], capabilities: ["area", "weaken"], utility: ["events", "research"] }));
  }
  if (ac.nature === "divine" || bc.nature === "divine") {
    const deity = ac.nature === "divine" ? a : b;
    const mortal = deity === a ? b : a;
    results.push(variant("divine", "divine", "exceptional", "ritual", `Oráculo del Voto · ${mortal.name}`,
      `Un pacto de ${deity.name} encarna en un oficiante que utiliza las aptitudes de ${mortal.name} para interpretar y custodiar los juramentos.`,
      { nature: "divine", anatomy: "humanoid", intelligence: "sapient", role: "controller", secondaryRole: "support",
        features: ["manos rituales", "sello de juramento"], tags: ["ritual", "magic"], capabilities: ["silence"], utility: ["events", "support"] }));
  }
  return [...results, ...recognizedOptions(a, b, ac, bc)];
}

// Los registros reutilizados por la galería y la Forja contienen solo datos.
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const CACHE_LIMIT = 128;
const cache = new Map();

export function variantsFor(a, b, classicCard) {
  const parents = a.id <= b.id ? [a, b] : [b, a];
  const { combinationId } = variantIdentity(parents.map(card => card.id), "classic");
  const entry = cache.get(combinationId);
  if (entry && entry.parents.every((parent, index) => parent === parents[index])) return entry.cards;

  const options = interpretations(...parents, classicCard);
  const groupSizes = new Map();
  for (const { quality } of options) groupSizes.set(quality, (groupSizes.get(quality) ?? 0) + 1);
  const total = [...groupSizes.keys()].reduce((sum, quality) => sum + VARIANT_QUALITY_WEIGHTS[quality], 0);
  const cards = freeze(options.map(option => buildCard(classicCard, parents, option,
    VARIANT_QUALITY_WEIGHTS[option.quality] / (total * groupSizes.get(option.quality)))));
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(combinationId, { parents, cards });
  return cards;
}

export function selectVariant(variants, roll) {
  let threshold = roll;
  for (const variant of variants) {
    if (threshold < variant.probability) return variant;
    threshold -= variant.probability;
  }
  return variants.at(-1);
}
