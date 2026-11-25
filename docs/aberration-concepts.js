import { aberrationId, aberrationPainting } from "./aberration-art-pilot.js";
import { baseIdentity } from "./creature-identity.js";
import { getCreatureConcept } from "./creature-concepts.js";
import { conceptScale } from "./creature-scale.js";
import { PORTRAIT_PROFILES } from "./portrait-profiles.js";

export const ABERRATION_RULES_VERSION = 2;
export const FAILURE_FAMILIES = Object.freeze({
  anatomical: "Anatómica", physiological: "Fisiológica", structural: "Estructural",
  elemental: "Elemental", conceptual: "Conceptual", supernatural: "Sobrenatural",
  incomplete: "Incompleta", excess: "Por exceso", historical: "Histórica"
});

export const FAILURE_AXES = Object.freeze({
  locomotion: "Locomoción", perception: "Percepción", manipulation: "Manipulación",
  respiration: "Respiración", stability: "Estabilidad corporal", coordination: "Coordinación",
  toolUse: "Uso de herramientas", structure: "Integración estructural", form: "Viabilidad de la forma"
});

const aquaticForms = new Set(["aquatic", "amphibian", "cephalopod"]);
const rigidTags = ["construction", "smithing", "armored", "equipment", "alchemy"];
const isAquatic = ({ concept }) => aquaticForms.has(concept.anatomy);
const canMove = ({ concept }) => concept.anatomy !== "construct" || concept.tags.includes("carrier");
const rigid = ({ concept }) => Boolean(concept.structure || concept.nature === "artificial" ||
  rigidTags.some(tag => concept.tags.includes(tag)));

function historicalExpressions(concept, depth) {
  const expressions = [...depth.expressions];
  if (concept.tags.includes("tracker")) expressions.push({ type: "sense", trait: "percepción de rastros" });
  if (concept.tags.includes("regeneration") || concept.capabilities.includes("regen")) {
    expressions.push({ type: "physiology", trait: "renovación de tejido de la criatura" });
  }
  if (concept.affinities.length) expressions.push({ type: "power", trait: `afinidad de ${concept.affinities[0]}` });
  return { ...depth, expressions };
}

function parentInfo(card) {
  const concept = getCreatureConcept(card);
  const depth = concept.depth ?? (card.generation > 0
    ? historicalExpressions(concept, baseIdentity(card, concept))
    : baseIdentity(card, concept));
  const form = concept.anatomy === "hybrid"
    ? card.lineage.map(id => PORTRAIT_PROFILES[id]).find(profile => profile?.face === "elephant")?.id
      ?? card.lineage.find(id => PORTRAIT_PROFILES[id]?.face && PORTRAIT_PROFILES[id].face !== "human")
    : null;
  const portrait = PORTRAIT_PROFILES[form ?? card.id];
  const scale = concept.scale ?? conceptScale(form ? { id: form } : card, concept);
  const anatomy = form === "mamut" ? "quadruped" : concept.anatomy;
  return { card, concept, depth, anatomy, scale, head: portrait?.face ?? null };
}

function use(info, contribution, ...types) {
  const expression = types.map(type => info.depth.expressions.find(entry => entry.type === type)).find(Boolean)
    ?? info.depth.expressions[0] ?? { type: "external", trait: info.concept.features[0] ?? info.card.name };
  return { parentId: info.card.id, name: info.card.name, ...expression, contribution };
}

function form(family, name, body, attempt, impairments, contributions) {
  const blocks = Object.entries(impairments).map(([axis, evidence]) => ({ axis, evidence }));
  const failure = blocks.map(({ evidence }) => evidence).join(" ");
  return { family, name, body, attempt, failure, impairments: blocks, visual: failure, contributions };
}

function anatomy([a, b]) {
  if (!canMove(a) || !canMove(b) || [a, b].every(isAquatic) || a.concept.profession && b.concept.profession) return null;
  const body = a.concept.profession || isAquatic(a) ? b : a;
  return form("anatomical", "Paso en Espejo", body,
    "La fusión intentó coordinar dos maneras de apoyarse y girar.",
    {
      locomotion: "Los pares de apoyos se pliegan sobre el mismo costado. Las puntas quedan enfrentadas por encima del suelo, sin recorrido de impulso.",
      stability: "La torsión hunde un flanco contra el suelo y la articulación bifurcada cierra el ángulo necesario para incorporarse."
    },
    [use(a, "establece la primera trayectoria de apoyo", "external", "physiology"),
      use(b, "intenta girar el mismo apoyo en dirección contraria", "physiology", "behavior")]);
}

function physiology([a, b]) {
  const receptor = [a, b].find(info => info.depth.expressions.some(({ type }) => ["physiology", "sense"].includes(type)));
  const driver = receptor === a ? b : a;
  if (!receptor || !driver.depth.expressions.some(({ type }) => ["sense", "power", "physiology"].includes(type))) return null;
  const water = isAquatic(receptor) && isAquatic(driver);
  return form("physiological", water ? "Eco de Retorno" : "Reflejo de Retorno", receptor,
    "La transformación quiso usar una señal de un linaje para coordinar los reflejos del otro.",
    water ? {
      coordination: "La onda contrae el manto sobre sí mismo. Los brazos quedan plegados hacia el centro y sus extremos se aprisionan en un nudo sin superficie capaz de impulsar agua.",
      perception: "El rostro queda ladeado y hundido entre dobleces del manto. Los receptores apuntan hacia dentro, donde la señal vuelve a cerrar los brazos."
    } : {
      coordination: "El reflejo reúne todos los apoyos bajo el mismo pliegue y los contrae unos contra otros, fuera de toda postura estable.",
      perception: "El tejido contraído tapa el plano de los receptores. Los que quedan a la vista se orientan al interior del pliegue y repiten la misma señal."
    },
    [use(receptor, "recibe la señal y repite el reflejo", "physiology", "sense"),
      use(driver, "emite la señal que realimenta el circuito", "power", "sense", "physiology")]);
}

function structure([a, b]) {
  const builder = [a, b].find(rigid);
  const body = builder === a ? b : a;
  if (!builder || !(rigid(body) || body.scale.payloadKg > 0 || body.concept.tags.includes("carrier"))) return null;
  return form("structural", "Contrafuerte Empotrado", body,
    "La transformación trató de repartir la carga mediante una estructura integrada.",
    {
      structure: "El arco nace de ambos lados de los mismos apoyos. Su clave cede y la estructura pasa a descargar directamente en el suelo sobre un costado del cuerpo.",
      locomotion: "El arco empotrado fuerza los apoyos hacia dentro y los deja suspendidos en ángulos opuestos. El cuerpo queda tendido bajo el peso de su propia estructura."
    },
    [use(builder, "determina el trazado del refuerzo rígido", "knowledge", "power", "external"),
      use(body, "necesita flexionar el apoyo que cruza el puntal", "physiology", "external")]);
}

function element([a, b]) {
  const source = [a, b].find(info => info.concept.affinities.length > 0);
  const receiver = source === a ? b : a;
  if (!source || !(receiver.concept.affinities.length || rigid(receiver) || receiver.concept.tags.includes("magic"))) return null;
  const affinity = source.concept.affinities[0];
  return form("elemental", receiver.concept.affinities.includes("agua") ? "Marea que se Apaga" : "Forma que se Disipa",
    source, "El cruce intentó mantener un cuerpo continuo mientras cambiaba de estado.",
    {
      form: `El tramo de ${affinity} se hunde hacia la unión entre materiales. El contorno queda abierto y pierde materia por puntos opuestos antes de asumir una forma estable.`,
      locomotion: "Las superficies propulsoras se pliegan hacia el centro o se desgranan antes de desplegarse. Toda la masa termina apoyada en el suelo o dispersa bajo su propio peso."
    },
    [use(source, `mantiene el tramo de ${affinity}`, "power", "physiology", "domain"),
      use(receiver, "determina la segunda forma cuya transición pierde materia", "power", "knowledge", "physiology")]);
}

function profession([a, b]) {
  const job = [a, b].find(info => info.concept.profession);
  const body = job === a ? b : a;
  if (!job || job.concept.profession === body.concept.profession) return null;
  const smith = job.concept.profession === "herrería";
  const twoTrades = Boolean(body.concept.profession);
  const instrument = job.concept.tools[0] ?? "instrumento de trabajo";
  return form("conceptual", smith ? "Mordaza sin Alcance" : "Oficio sin Recorrido", body,
    `La transformación convirtió un gesto de ${job.concept.profession} en una función corporal.`,
    twoTrades ? {
      manipulation: `El mismo órgano intenta fijarse para ${job.concept.profession} y desplegarse para ${body.concept.profession}. Las dos piezas quedan fundidas en oposición y atrapan los apoyos que deberían moverlas.`,
      locomotion: "Los apoyos quedaron retenidos entre el mecanismo y el tórax. El conjunto cae sobre la herramienta en lugar de poder tomarla."
    } : smith ? {
      respiration: "La mandíbula fue sustituida por un yunque continuo con el pecho. La unión de metal estrecha el hocico y tapa la abertura de la boca.",
      manipulation: "El peso del yunque retuerce el cuello hasta el suelo y aprisiona los apoyos delanteros. Estos quedan detrás de la base y fuera del alcance de la pieza de trabajo."
    } : {
      toolUse: `El cuerpo incorpora ${instrument} en sustitución del órgano que debía manipularlo. Ambos extremos del útil se funden con la misma sección corporal y la herramienta pierde todo recorrido.`,
      stability: "La pieza rígida cruza el plano de los apoyos y el torso se hunde sobre ella. Los extremos de apoyo quedan por encima del suelo."
    },
    [use(job, "aporta el gesto técnico y el útil que debía ejecutarlo", "knowledge", "function"),
      use(body, twoTrades ? "impone una segunda secuencia de trabajo sobre el mismo órgano"
        : "aporta los apoyos y el alcance que impiden terminar el gesto", "knowledge", "external", "physiology")]);
}

function divine([a, b]) {
  const power = [a, b].find(info => info.concept.nature === "divine" || info.concept.tags.includes("magic"));
  const other = power === a ? b : a;
  if (!power || !(other.concept.affinities.length || other.concept.tags.includes("magic") || other.concept.nature === "divine")) return null;
  const wind = [a, b].find(info => info.concept.affinities.includes("viento"));
  const aegis = [a, b].some(info => info.concept.tools.includes("égida"));
  return form("supernatural", wind && aegis ? "Égida a Contraviento" : "Dominio en Retorno", wind ?? power,
    "La fusión quiso que un poder sostuviera la manifestación del otro.",
    {
      form: wind && aegis ? "La égida se funde del revés en la primera espira. Los dos flujos chocan contra esa hendidura y pliegan la manifestación hacia su propia cresta."
        : "Las dos manifestaciones doblan en direcciones opuestas el mismo contorno. La envoltura se atrapa sobre sí misma y pierde los tramos que debían darle una forma estable.",
      stability: "La cresta y el eje corporal quedan prensados por los pliegues de la propia envoltura. La masa yace atravesada sobre el suelo, sin un apoyo desde el que desplegarse."
    },
    [use(power, "configura la manifestación que intenta contener el flujo", "domain", "power", "knowledge"),
      use(other, "da el flujo que vuelve contra la manifestación", "domain", "power", "function")]);
}

function incomplete([a, b]) {
  const sea = [a, b].find(isAquatic);
  const dry = sea ? (sea === a ? b : a) : null;
  const shore = sea && ["quadruped", "reptilian", "humanoid", "hybrid"].includes(dry.anatomy);
  const body = shore ? dry : a;
  return form("incomplete", shore ? "Ribera a Medias" : "Molde sin Cierre", body,
    shore ? "La fusión intentó cambiar el mismo apoyo entre orilla y agua." : "La unión intentó compartir una superficie que cambiara con el movimiento.",
    shore ? {
      locomotion: "La membrana larvaria se cierra sobre los apoyos delanteros y posteriores. Sus puntas quedan suspendidas en direcciones opuestas dentro de una aleta que tampoco se abre.",
      stability: "El vientre es el único contacto con el fondo. Las crestas acuáticas quedan aplastadas entre el cuello y la cubierta plegada."
    } : {
      form: "El límite entre la cubierta rígida y el tejido a medio formar se cierra en diagonal sobre el torso, hundiéndolo dentro de su propia forma.",
      locomotion: "Los apoyos o superficies propulsoras quedan fundidos al borde interno y ninguno alcanza una posición desde la que mover la masa."
    },
    shore ? [use(sea, "introduce la transición acuática que quedó a medio cerrar", "physiology", "external"),
      use(dry, "aporta los apoyos que quedaron inmovilizados", "external", "behavior")]
      : [use(a, "conserva la superficie que ya consolidó", "external", "knowledge"),
        use(b, "impulsa la transformación del tramo que sigue flexible", "physiology", "power", "external")]);
}

function excess([a, b]) {
  const source = [a, b].find(info => info.concept.tags.some(tag => ["alchemy", "regeneration", "armored", "construction"].includes(tag)));
  const other = source === a ? b : a;
  if (!source) return null;
  const body = source.scale.payloadKg > other.scale.payloadKg ? source : other;
  const brace = [a, b].some(info => info.concept.tags.includes("construction"));
  const layer = brace ? "puntales minerales" : source.concept.tags.includes("regeneration") ? "rebordes nuevos de tejido" : "láminas de protección";
  return form("excess", brace ? "Puntales Saturados" : "Crecimiento sin Holgura", body,
    `El cruce intentó reforzar un apoyo con ${layer}.`,
    {
      structure: `Se superponen ${layer} hasta formar una cuña bajo el torso. Las capas se entrecruzan con la superficie corporal y levantan del suelo las extremidades que debían proteger.`,
      locomotion: "Los apoyos quedan enterrados dentro de las capas y sus extremos apuntan fuera del arco de movimiento. El peso reposa sobre el material saturado."
    },
    [use(source, "mantiene activo el proceso de producción del material", "power", "physiology", "knowledge"),
      use(other, "aporta la pieza o el soporte que pierde su holgura", "knowledge", "external", "physiology")]);
}

const library = [
  ["axis-lock", anatomy], ["sensory-loop", physiology], ["load-bind", structure], ["phase-bleed", element],
  ["blocked-craft", profession], ["domain-knot", divine], ["interrupted", incomplete], ["overgrowth", excess]
];
const cache = new Map();
const CACHE_LIMIT = 128;

export function aberrationsFor(first, second, generation) {
  const ordered = first.id <= second.id ? [first, second] : [second, first];
  const parents = ordered.map(({ id }) => id);
  const combinationId = `aberration(${parents.join("+")})`;
  const cached = cache.get(combinationId);
  if (cached?.cards[0] === ordered[0] && cached.cards[1] === ordered[1]) return cached.variants;
  const entries = ordered.map(parentInfo);
  const failures = library.map(([key, rule]) => [key, rule(entries)]).filter(([, failure]) => failure);
  const lineage = [...new Set(ordered.flatMap(card => card.lineage))].sort();
  const variants = failures.map(([key, kind]) => {
    const id = aberrationId(parents, key);
    const art = aberrationPainting(id)?.asset ?? null;
    const body = kind.body;
    const accuracy = kind.contributions.slice().sort((a, b) => parents.indexOf(a.parentId) - parents.indexOf(b.parentId));
    return {
      id, variantId: id, combinationId, defect: key, failureRulesVersion: ABERRATION_RULES_VERSION,
      name: `${kind.name} · ${ordered.map(card => card.name).join(" y ")}`,
      description: `${kind.attempt} ${kind.failure}`, family: kind.family, category: "aberration",
      rarity: null, stats: null, ability: null, traits: [...new Set(ordered.flatMap(card => card.traits))].slice(0, 3),
      generation, parents, lineage, art,
      identity: {
        anatomy: body.anatomy, visual: kind.visual, attempt: kind.attempt, failure: kind.failure, impairments: kind.impairments,
        scale: body.scale, source: body.card.id, head: body.head, contributions: accuracy,
        illustration: { reference: id, final: art, status: art ? "definitiva" : "procedural SVG" }
      },
      probability: 1 / failures.length
    };
  });
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(combinationId, { cards: ordered, variants });
  return variants;
}
