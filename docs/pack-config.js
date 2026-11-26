import { CARDS, PACKS as LEGACY_PACKS } from "./catalog.js";
import { getCreatureConcept } from "./creature-concepts.js";

export { LEGACY_PACKS };
export const BASE_PACK_COST = LEGACY_PACKS.find(pack => pack.id === "esencial").cost;
export const PACK_DISCOUNTS = Object.freeze({ 1: 0, 5: 5, 10: 10 });
export const MAX_PACK_PURCHASE = 10;
export const PACK_RULES_VERSION = 2;

export const PACK_TAGS = Object.freeze({
  natural: "Animal natural", terrestrial: "Animal terrestre", aerial: "Aérea", aquatic: "Acuática",
  amphibian: "Anfibia", prehistoric: "Prehistórica", profession: "Profesión", craft: "Artesanía",
  knowledge: "Conocimiento", technology: "Tecnología", magic: "Magia", fantastic: "Fantástica",
  mythological: "Mitológica", deity: "Deidad", supernatural: "Sobrenatural"
});

function classify(card) {
  const { anatomy, tags, profession, knowledge, tools } = getCreatureConcept(card);
  const natural = card.category === "animal";
  const ancient = card.category === "extinct";
  const fantasy = card.category === "mythic";
  const deity = card.category === "deity";
  const aerial = anatomy === "avian" || tags.includes("winged");
  const aquatic = ["aquatic", "cephalopod"].includes(anatomy) || tags.includes("aquatic");
  const amphibian = anatomy === "amphibian" || tags.includes("amphibious");
  return Object.freeze(Object.keys({
    ...(natural && { natural: true }),
    ...((natural || ancient) && !aerial && !aquatic && !amphibian && { terrestrial: true }),
    ...(aerial && { aerial: true }), ...(aquatic && { aquatic: true }), ...(amphibian && { amphibian: true }),
    ...(ancient && { prehistoric: true }), ...(profession && { profession: true }),
    ...(tags.some(tag => ["smithing", "construction", "alchemy"].includes(tag)) && { craft: true }),
    ...(knowledge.length && { knowledge: true }),
    ...(profession && tools.length && tags.includes("equipment") && { technology: true }),
    ...(tags.includes("magic") && { magic: true }),
    ...(fantasy && { fantastic: true }), ...((fantasy || deity) && { mythological: true, supernatural: true }),
    ...(deity && { deity: true })
  }));
}

export const CARD_PACK_TAGS = Object.freeze(Object.fromEntries(CARDS.map(card => [card.id, classify(card)])));

export const PACK_FAMILIES = Object.freeze({
  general: { name: "Catálogo general", matches: () => true },
  premium: { name: "Catálogo general · rara o superior", matches: () => true },
  nature: { name: "Animal natural terrestre o aéreo", matches: tags => tags.includes("natural") && (tags.includes("terrestrial") || tags.includes("aerial")) },
  natural: { name: "Animal natural", matches: tags => tags.includes("natural") },
  civilization: { name: "Profesión", matches: tags => tags.includes("profession") },
  prehistoric: { name: "Criatura prehistórica", matches: tags => tags.includes("prehistoric") },
  depths: { name: "Criatura acuática o anfibia", matches: tags => tags.includes("aquatic") || tags.includes("amphibian") },
  arcane: { name: "Magia o criatura fantástica", matches: tags => tags.includes("magic") || tags.includes("fantastic") },
  myth: { name: "Criatura mitológica o divina", matches: tags => tags.includes("mythological") },
  deity: { name: "Deidad", matches: tags => tags.includes("deity") }
});

const position = (family, count, weights) => ({ family, count, weights });
const general = (count, weights = [65, 25, 8, 1.7, .3]) => position("general", count, weights);
function pack(id, name, multiplier, description, theme, color, positions) {
  return Object.freeze({
    id, name, cost: Math.round(BASE_PACK_COST * multiplier), description, theme, color,
    art: `./assets/sobres/${theme}.webp`, slots: positions.reduce((n, position) => n + position.count, 0),
    positions: Object.freeze(positions.map(spec => Object.freeze({ ...spec, weights: Object.freeze(spec.weights) })))
  });
}

export const SHOP_PACKS = Object.freeze([
  pack("explorador", "Sobre del Explorador", 1, "Un mapa abierto a todos los linajes. La forma más económica de ampliar tu inventario.", "explorador", "#ddb77b",
    [general(5)]),
  pack("naturaleza", "Sobre de la Naturaleza", 1.3, "Rastros del bosque y del cielo. Busca animales naturales terrestres y aves.", "naturaleza", "#a7cd87",
    [position("nature", 4, [73, 27, 0, 0, 0]), general(2)]),
  pack("civilizacion", "Sobre de la Civilización", 1.3, "La obra de quienes curan, levantan, trazan y transforman el mundo con sus oficios.", "civilizacion", "#e6a878",
    [position("civilization", 4, [44, 43, 13, 0, 0]), general(2)]),
  pack("primordial", "Sobre de la Era Primordial", 1.5, "Especies extintas que perduran en piedra, colmillos y ámbar.", "primordial", "#e9b46e",
    [position("prehistoric", 4, [43, 32, 19, 6, 0]), general(2, [65, 25, 8, 1.2, .8])]),
  pack("profundidades", "Sobre de las Profundidades", 1.5, "Linajes del océano y del agua dulce reunidos bajo un cierre de nácar.", "profundidades", "#88cad2",
    [position("depths", 4, [35, 52, 0, 13, 0]), general(2, [65, 25, 8, 1.2, .8])]),
  pack("lo-arcano", "Sobre de lo Arcano", 2, "Profesiones mágicas, criaturas fantásticas y poderes extraordinarios.", "arcano", "#c3a1f0",
    [position("arcane", 4, [0, 45, 33, 20.25, 1.75]), general(3, [55, 30, 12, 2.5, .5])]),
  pack("panteon", "Sobre del Panteón", 2.5, "Une los linajes de las leyendas con los de las deidades.", "panteon", "#efcf82",
    [position("deity", 1, [0, 0, 0, 94, 6]), position("myth", 3, [0, 38, 39, 21, 2]), general(3, [55, 30, 12, 2.5, .5])]),
  pack("quimerico", "Sobre Quimérico", 3, "Diez progenitores de distintos linajes. Garantiza una carta rara o superior.", "quimerico", "#b5d7c1",
    [position("natural", 2, [65, 35, 0, 0, 0]), position("civilization", 2, [45, 41, 14, 0, 0]),
      position("prehistoric", 1, [42, 32, 20, 6, 0]), position("myth", 1, [0, 42, 36, 17, 5]), general(3, [58, 27, 11, 3, 1]),
      position("premium", 1, [0, 0, 59, 28, 13])])
]);

const previousPositions = {
  primordial:[position("prehistoric",4,[43,32,19,6,0]),general(2)],
  profundidades:[position("depths",4,[35,52,0,13,0]),general(2)],
  "lo-arcano":[position("arcane",4,[0,45,33,19,3]),general(3,[55,30,12,2.5,.5])],
  quimerico:[position("natural",2,[65,35,0,0,0]),position("civilization",2,[45,41,14,0,0]),
    position("prehistoric",1,[42,32,20,6,0]),position("myth",1,[0,44,37,17,2]),general(4)]
};
const shop = new Map(SHOP_PACKS.map(pack => [pack.id, pack]));
const legacy = new Map(LEGACY_PACKS.map(pack => [pack.id, pack]));
export function shopPack(id, version = PACK_RULES_VERSION) {
  const current = shop.get(id);
  return current && version === 1 && Object.hasOwn(previousPositions,id)
    ? { ...current,positions:previousPositions[id] } : current;
}
export const historicalPack = id => legacy.get(id);
export const packDefinition = id => shopPack(id) ?? historicalPack(id);

export function packArtwork(pack) {
  return pack.art.startsWith("./") ? pack.art : `./assets/sobre-${pack.art}.webp`;
}
