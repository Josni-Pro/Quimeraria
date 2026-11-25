import { aberrationId, aberrationPainting } from "./aberration-art-pilot.js";
import { baseIdentity } from "./creature-identity.js";
import { getCreatureConcept } from "./creature-concepts.js";
import { conceptScale } from "./creature-scale.js";
import { PORTRAIT_PROFILES } from "./portrait-profiles.js";

export const ABERRATION_RULES_VERSION = 1;
export const FAILURE_FAMILIES = Object.freeze({
  anatomical: "Anatómica", physiological: "Fisiológica", structural: "Estructural",
  elemental: "Elemental", conceptual: "Conceptual", supernatural: "Sobrenatural",
  incomplete: "Incompleta", excess: "Por exceso", historical: "Histórica"
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

const form = (family, name, body, attempt, failure, visual, contributions) =>
  ({ family, name, body, attempt, failure, visual, contributions });

function anatomy([a, b]) {
  if (!canMove(a) || !canMove(b) || [a, b].every(isAquatic) || a.concept.profession && b.concept.profession) return null;
  const body = a.concept.profession || isAquatic(a) ? b : a;
  return form("anatomical", "Paso en Espejo", body,
    "La fusión intentó coordinar dos maneras de apoyarse y girar.",
    "Las guías de movimiento convergen en una articulación que intenta orientar el mismo apoyo en dos direcciones. Al cargar peso, ambas trayectorias se bloquean.",
    "Mostrar un solo cuerpo y un apoyo bifurcado en una misma articulación. Las huellas se interrumpen donde el peso cambia de lado.",
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
    water ? "La señal acuática rebota hacia el mismo circuito sensorial que la recibió. Sus apéndices se cierran al unísono antes de completar el impulso."
      : "El receptor devuelve la señal al tejido que la emitió y dispara el mismo reflejo. Cada movimiento se repite antes de que el cuerpo pueda orientarse.",
    water ? "La cabeza y el manto pertenecen al mismo cuerpo. Mostrar ondas que retornan a su contorno y apéndices que se repliegan en la misma dirección."
      : "Marcar la señal que vuelve sobre un receptor visible y el repliegue involuntario. Mantener el tejido continuo.",
    [use(receptor, "recibe la señal y repite el reflejo", "physiology", "sense"),
      use(driver, "emite la señal que realimenta el circuito", "power", "sense", "physiology")]);
}

function structure([a, b]) {
  const builder = [a, b].find(rigid);
  const body = builder === a ? b : a;
  if (!builder || !(rigid(body) || body.scale.payloadKg > 0 || body.concept.tags.includes("carrier"))) return null;
  return form("structural", "Contrafuerte Empotrado", body,
    "La transformación trató de repartir la carga mediante una estructura integrada.",
    "El refuerzo sostiene el peso en reposo, pero puentea los dos lados de una articulación. Cuando el cuerpo intenta desplazarse, el puntal ocupa el arco que la articulación necesita recorrer.",
    "Una riostra corta se fija a dos puntos de una articulación de la misma criatura. Mostrar dónde apoya el peso y el pie que arrastra.",
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
    `El tramo de ${affinity} cede el flujo demasiado pronto. La materia se desprende en la transición y el extremo propulsor se rehace antes de cerrar su contorno, por lo que el conjunto pierde el impulso.`,
    "Mostrar una sola silueta y el gradiente donde gotas o briznas se desprenden antes de completar el extremo del cuerpo.",
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
    twoTrades ? `La misma articulación debe inmovilizarse para ${job.concept.profession} y conservar juego para ${body.concept.profession}. Cuando se fija para una tarea, la otra interrumpe el gesto antes de completarse.`
      : smith ? "La mandíbula adopta el cabezal de un martillo, pero el mango se fija lateralmente al hocico. La boca queda inmóvil y el apoyo no alcanza la pieza que debería trabajar."
      : `El cuerpo incorpora ${instrument} justo donde necesita girar para usarlo. El gesto profesional empieza, pero el órgano fija la herramienta fuera del recorrido de sus apoyos.`,
    "Enseñar la herramienta integrada y la tarea interrumpida mediante una pieza dentro del mismo plano. El obstáculo nace en el cuerpo, con escala acorde al portador.",
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
    wind && aegis ? "La defensa devuelve el viento al collar que debía guiarlo. Las dos corrientes se cierran sobre la primera espira y el camino queda bajo la ráfaga."
      : "La primera manifestación devuelve al cuerpo el poder que debía canalizar. Al intentar expresarse, la segunda lo repliega y la forma vuelve a su estado previo, sin cumplir su propósito.",
    "La manifestación nace de la misma silueta. Mostrar dos trazas con sentidos opuestos y el lugar donde el cuerpo queda encerrado por su propio poder.",
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
    shore ? "Una aleta a medio formar envuelve los apoyos posteriores. El tejido larvario empieza a responder al agua, pero la aleta no se abre para nadar ni deja posar los pies."
      : "La envoltura nueva endurece un tramo antes de que el tramo vecino termine de remodelarse. El borde rígido detiene la siguiente flexión y la transición queda visible.",
    shore ? "Un cuerpo de orilla conserva los apoyos delanteros. Una membrana larvaria continua encierra las patas traseras sin terminar la aleta."
      : "Contrastar una piel o cubierta consolidada con el tejido en transición del mismo cuerpo. La frontera cruza un punto de flexión o paso de la forma.",
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
    `El borde vuelve a producir ${layer} antes de que se retraiga el anterior. Las capas llenan el hueco de la articulación y cada intento de moverse cierra aún más el paso.`,
    "Repetir la misma clase de estructura alrededor de un solo apoyo. Mostrar los bordes que se tocan y la extremidad que ya no puede continuar su recorrido.",
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
        anatomy: body.anatomy, visual: kind.visual, attempt: kind.attempt, failure: kind.failure,
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
