// Las medidas describen la versión del catálogo de Quimeraria. La altura
// terrestre se mide en postura natural y la longitud incluye la cola visible.
export const SCALE_LABELS = {
  tiny: "Diminuta", small: "Pequeña", medium: "Mediana", human: "Humanoide",
  large: "Grande", huge: "Enorme", colossal: "Colosal"
};

const HUMAN = ["human", 1.7, null, 70, null, 20, "mobiliario y puertas de 2 m"];
const BASE = {
  lobo: ["medium", 0.8, 1.5, 45, null, 0, "matorral a la altura del pecho"],
  zorro: ["small", 0.38, 0.95, 6, null, 0, "hierba y raíces a ras de suelo"],
  buho: ["small", 0.45, 0.45, 0.9, 1.05, 0, "ramas comparables al grosor de una muñeca"],
  oso: ["large", 1.2, 2.1, 310, null, 0, "troncos y vegetación a la altura del hombro"],
  pulpo: ["small", null, 0.75, 3, null, 0, "cantos y algas de poca altura"],
  ajolote: ["tiny", null, 0.23, 0.12, null, 0, "grava y hojas sumergidas"],
  mamut: ["huge", 3.3, 5.4, 5600, null, 750, "adulto a la altura del vientre"],
  velociraptor: ["medium", 0.6, 1.9, 18, null, 0, "arbustos a la altura del pecho"],
  triceratops: ["huge", 3, 8, 6500, null, 1300, "adulto debajo de la gola"],
  anquilosaurio: ["huge", 2, 7, 5700, null, 700, "arbustos y persona junto al flanco"],
  megalodon: ["huge", null, 14, 36000, null, 0, "una lancha y oleaje de mar abierto"],
  rinoceronte_lanudo: ["large", 1.8, 3.4, 2100, null, 140, "hierbas y rocas de estepa"],
  grifo: ["large", 1.6, 2.7, 340, 5.3, 135, "una cornisa con baranda de altura humana"],
  dragon: ["huge", 3.5, 11, 4600, 16, 160, "roquedos y un paso de montaña"],
  fenix: ["medium", 0.9, 1.15, 4.5, 2.25, 0, "una rama gruesa o una almena"],
  esfinge: ["large", 1.8, 2.8, 270, null, 0, "escalones y sillares de un umbral"],
  sirena: ["medium", null, 1.9, 72, null, 0, "algas y objetos de buceo"],
  atenea: HUMAN,
  anubis: ["human", 1.9, null, 84, null, 20, "pórtico funerario con escalones humanos"],
  quetzalcoatl: ["large", null, 5, 135, null, 0, "puertas de piedra y terrazas de un asentamiento"],
  thor: ["human", 1.95, null, 105, null, 30, "puerta de 2 m e instrumentos de mano"]
};

export const bodyScale = (category, heightM, lengthM, massKg, wingspanM, payloadKg, environment, rationale) =>
  ({ category, heightM, lengthM, massKg, wingspanM, payloadKg, environment, rationale });

function from(data, rationale) {
  return bodyScale(...data, rationale);
}

const RECOGNIZED = {
  lobo_terrible: ["large", 0.86, 1.7, 64, null, 0, "hierba y coyotes a distancia"],
  oso_cavernario: ["large", 1.4, 2.5, 480, null, 0, "una entrada de cueva baja"],
  ortro: ["large", 1.25, 2.4, 145, null, 0, "escalones de un santuario"],
  kitsune: BASE.zorro,
  cerbero: ["large", 1.7, 3, 230, null, 0, "hojas de una puerta funeraria"],
  wyvern: ["large", 1.3, 3.2, 100, 5.2, 0, "una cornisa arbolada"],
  kraken: ["colossal", null, 43, 80000, null, 0, "un barco y el oleaje"],
  jormungandr: ["colossal", null, 950, null, null, 0, "islote completo y embarcación"],
  aker: ["large", 1.65, 3.4, 620, null, 0, "bloques y escalones de la necrópolis"],
  simurgh: ["large", 1.5, 2.4, 56, 5, 0, "un viajero bajo el alero de su refugio"],
  ahuizotl: ["medium", 0.6, 1.5, 36, null, 0, "las raíces de la ribera"],
  smilodon: ["large", 1.1, 1.9, 220, null, 0, "hierbas de pradera y piedras"],
  elasmotherium: ["huge", 2.5, 4.6, 4000, null, 0, "hierbas cortas y arbustos de estepa"],
  utahraptor: ["large", 1.7, 5, 270, null, 0, "troncos caídos y árboles jóvenes"]
};

const FALLBACK = {
  quadruped: ["medium", 0.9, 1.6, 45, null, 0, "vegetación próxima"],
  avian: BASE.buho,
  reptilian: BASE.velociraptor,
  aquatic: BASE.sirena,
  amphibian: BASE.ajolote,
  cephalopod: BASE.pulpo,
  serpentine: BASE.quetzalcoatl,
  construct: ["medium", 1.2, 1.4, 210, null, 0, "peldaños y herramientas del entorno"],
  hybrid: ["medium", 0.85, 1.6, 55, null, 0, "suelo y elementos próximos"],
  centaur: ["large", 2.05, 2.6, 450, null, 0, "un adulto a la altura del torso"]
};

export function conceptScale(card, concept) {
  if (concept.scale) return concept.scale;
  const known = BASE[card.id] ?? BASE[concept.speciesId] ?? RECOGNIZED[concept.speciesId];
  const human = concept.anatomy === "humanoid";
  const scale = known ?? (human ? HUMAN : FALLBACK[concept.anatomy] ?? FALLBACK.hybrid);
  const rationale = concept.nature === "divine" && known ? "Forma de referencia de la deidad. Su escala puede variar entre manifestaciones."
    : RECOGNIZED[concept.speciesId] ? "La longitud y la masa corresponden a esta interpretación de la especie legendaria o ancestral."
    : "Proporciones del cuerpo descrito en la ficha.";
  return from(scale, rationale);
}

export function fusionScale(card, parents, concept, option) {
  const { spec, key, family } = option;
  if (spec.scale) return spec.scale;
  if (BASE[spec.speciesId] || RECOGNIZED[spec.speciesId]) return conceptScale(card, concept);
  if (key === "air-rescue") return bodyScale("human", 1.7, null, 66, 3.2, 15, "un adulto junto al rescatista y un anclaje a la altura de la cintura",
    "El cuerpo permite atención manual a escala humana. El anclaje sostiene a la persona durante la evacuación.");
  if (concept.anatomy === "humanoid") {
    const scale = from(HUMAN, "La postura erguida y los instrumentos se ajustan a una persona adulta.");
    const inheritsWings = ["kin", "anthropomorphic"].includes(family) &&
      parents.some(({ concept: source }) => source.features[0]?.startsWith("alas"));
    return { ...scale, wingspanM: inheritsWings ? 2.8 : null };
  }
  if (key === "counterfort-archive") return bodyScale("huge", 5, 7, 6500, null, 750, "un adulto cruzando la pasarela",
    "Los apoyos y el espacio de almacenamiento requieren un volumen capaz de repartir la carga.");
  if (key === "hundred-pieces") return bodyScale("large", 2.25, 1.15, 260, null, 0, "umbral de 2,5 m y piezas que se agarran con las manos",
    "El pecho articulado deja espacio para el tablero y sus mecanismos.");
  if (key === "living-alloy") return from(BASE.anquilosaurio, "El bastidor de acero conserva la planta del blindado que le da forma.");
  if (key === "colossus") return bodyScale("colossal", 10, 12, 24000, null, 0, "abedules y un edificio de dos pisos",
    "La transmutación de piedra articula un cuerpo mineral con pilares y permite su altura y masa extraordinarias.");

  const body = parents.find(({ card }) => card.id === spec.bodySource)
    ?? (family === "carrier" ? parents.find(({ concept }) => concept.scale.payloadKg > 0 && concept.anatomy !== "humanoid") : null)
    ?? parents.find(({ concept: source }) => source.anatomy === concept.anatomy && !source.profession)
    ?? (key === "classic" ? parents.find(({ concept: source }) => !source.profession && source.anatomy !== "humanoid") : null);
  if (body) {
    const scale = body.concept.scale;
    const aerial = option.shape === "aerial" && scale.wingspanM;
    return {
      ...scale,
      wingspanM: aerial ? Math.round(scale.wingspanM * 1.2 * 100) / 100 : scale.wingspanM,
      rationale: family === "carrier" ? "La estructura se dimensiona según la carga del portador y la reparte sobre sus apoyos."
        : aerial ? "El vuelo de largo recorrido alarga las alas con respecto a la forma de referencia."
        : `Conserva las dimensiones del plan corporal de ${body.card.name}.`
    };
  }
  return conceptScale(card, concept);
}

export function scaleDimensions(scale, number = new Intl.NumberFormat("es-MX")) {
  return [[scale.heightM, "altura", "m"], [scale.lengthM, "longitud", "m"],
    [scale.massKg, "masa", "kg"], [scale.wingspanM, "envergadura", "m"], [scale.payloadKg || null, "carga transportable", "kg"]]
    .filter(([value]) => value !== null)
    .map(([value, label, unit]) => `${label} ≈ ${number.format(value)} ${unit}`).join(" · ");
}

export function equipmentDimensions(card, concept) {
  if (card.variantKey === "air-rescue") return "Bolsa médica de unos 45 cm, mosquetones de mano y anclaje fijo a la altura de la cintura.";
  if (concept.structure) return "La base se ajusta a los apoyos. Barandas de unos 90 cm y pasos de 2 m cuando la estructura la usa una persona.";
  if (concept.tools.length) return concept.scale.category === "human"
    ? "Herramientas al alcance de la mano y del antebrazo. Mesa de unos 85 cm cuando se trabaja de pie."
    : "Instrumentos dimensionados al agarre del órgano que los opera. Objetos humanos a escala de mano si los usa un visitante.";
  return "La escena no necesita herramientas ni accesorios.";
}
