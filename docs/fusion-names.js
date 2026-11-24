// Motifs supply a stem, a body form and an epithet. New cards can declare their
// own nameMotif in the catalog or use the defaults derived from name and traits.
const CARD_MOTIFS = {
  civil: ["Urbi", "Errante", "de los Caminos"],
  obrero: ["Ferro", "Puntal", "del Andamio"],
  alquimista: ["Criso", "Crisol", "del Crisol"],
  mago: ["Runa", "Umbral", "del Sello"],
  abogado: ["Lexi", "Juez", "del Pacto"],
  medica: ["Vita", "Pulso", "del Remedio"],
  herrera: ["Caldo", "Forja", "de la Fragua"],
  cartografa: ["Meridi", "Brújula", "de las Sendas"],
  musico: ["Sono", "Eco", "de la Resonancia"],
  arquitecta: ["Arqui", "Bóveda", "de los Arcos"],
  lobo: ["Lupo", "Colmillo", "de la Manada"],
  zorro: ["Vulpi", "Cola", "de los Atajos"],
  buho: ["Nocti", "Pluma", "de la Medianoche"],
  oso: ["Urso", "Zarpa", "del Deshielo"],
  pulpo: ["Octo", "Tentáculo", "de la Tinta"],
  ajolote: ["Axolo", "Branquia", "de los Canales"],
  mamut: ["Marfi", "Mamut", "de la Estepa"],
  velociraptor: ["Velo", "Garra", "del Precipicio"],
  triceratops: ["Tri", "Cuerno", "del Pedregal"],
  anquilosaurio: ["Anquilo", "Coraza", "del Estrato"],
  megalodon: ["Mare", "Aleta", "de las Fosas"],
  rinoceronte_lanudo: ["Rino", "Pelaje", "de la Escarcha"],
  grifo: ["Grifi", "Pico", "de los Riscos"],
  dragon: ["Draco", "Escama", "de las Brasas"],
  fenix: ["Ascua", "Ala", "de la Aurora"],
  esfinge: ["Enigmo", "Esfinge", "del Enigma"],
  sirena: ["Sire", "Marea", "de los Bajíos"],
  quetzalcoatl: ["Eolo", "Serpiente", "del Céfiro"],
  anubis: ["Duat", "Chacal", "del Tránsito"],
  atenea: ["Egi", "Égida", "del Consejo"],
  thor: ["Tora", "Trueno", "de la Tormenta"],
};

const TRAIT_FORMS = {
  agilidad: ["Garra", "del Salto"],
  alquimia: ["Crisol", "del Vapor"],
  anfibio: ["Branquia", "de la Orilla"],
  arremetida: ["Cuerno", "de la Carga"],
  autoridad: ["Cetro", "del Juramento"],
  canto: ["Voz", "del Canto"],
  colmillos: ["Fauce", "del Rastro"],
  coraza: ["Coraza", "del Baluarte"],
  curacion: ["Pulso", "del Alivio"],
  erudicion: ["Glifo", "del Archivo"],
  forja: ["Forja", "del Yunque"],
  fuego: ["Llama", "de las Brasas"],
  magia: ["Runa", "del Velo"],
  manada: ["Aullido", "del Llano"],
  nocturno: ["Sombra", "de la Vigilia"],
  oceano: ["Marea", "del Abismo"],
  olfato: ["Hocico", "del Rastro"],
  presagio: ["Oráculo", "del Presagio"],
  regeneracion: ["Brote", "del Renacer"],
  sigilo: ["Paso", "del Silencio"],
  temple: ["Muro", "del Temple"],
  tormenta: ["Rayo", "de la Centella"],
  vuelo: ["Ala", "de las Alturas"],
};

const CREATURE_CATEGORIES = new Set(["animal", "extinct", "mythic"]);

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  }
  return result >>> 0;
}

function motif(card) {
  const known = card.nameMotif ?? CARD_MOTIFS[card.id];
  if (known) return known;
  const words = card.name.match(/\p{L}+/gu) ?? [card.id];
  const stem = words.reduce((longest, word) => word.length > longest.length ? word : longest).slice(0, 6);
  const [form, epithet] = card.traits.map(trait => TRAIT_FORMS[trait]).find(Boolean)
    ?? ["Nexo", "del Encuentro"];
  return [stem, form, epithet];
}

function joinName(stem, form) {
  const lowerStem = stem.toLocaleLowerCase("es");
  const lowerForm = form.toLocaleLowerCase("es");
  const tail = lowerStem.at(-1) === lowerForm[0] ? lowerForm.slice(1) : lowerForm;
  return lowerStem[0].toLocaleUpperCase("es") + lowerStem.slice(1) + tail;
}

function pick(cards, seed) {
  return cards[seed % cards.length];
}

function selectByCategory(cards, wantCreature, seed) {
  const matching = cards.filter(card => CREATURE_CATEGORIES.has(card.category) === wantCreature);
  return pick(matching.length ? matching : cards, seed);
}

export function nameFusion(id, a, b, getBaseCard) {
  const [first, second] = a.id <= b.id ? [a, b] : [b, a];
  const firstLineage = first.lineage.map(getBaseCard);
  const secondLineage = second.lineage.map(getBaseCard);
  const firstHasCreature = firstLineage.some(card => CREATURE_CATEGORIES.has(card.category));
  const secondHasCreature = secondLineage.some(card => CREATURE_CATEGORIES.has(card.category));
  const seed = hash(id);
  const firstIsBody = first.generation === second.generation
    ? (firstHasCreature === secondHasCreature ? seed % 2 === 0 : firstHasCreature)
    : first.generation > second.generation;
  const bodyLineage = firstIsBody ? firstLineage : secondLineage;
  const stemLineage = firstIsBody ? secondLineage : firstLineage;
  const body = selectByCategory(bodyLineage, true, hash(`${id}/cuerpo`));
  const source = selectByCategory(stemLineage, false, hash(`${id}/origen`));
  const name = joinName(motif(source)[0], motif(body)[1]);

  if (first.generation === 0 && second.generation === 0) return name;

  const bodyAncestor = bodyLineage.find(card => card.id !== body.id) ?? body;
  const bodyEpithet = motif(bodyAncestor)[2];
  if (first.generation !== second.generation) return `${name} ${bodyEpithet}`;

  const stemAncestor = stemLineage.find(card => card.id !== source.id) ?? source;
  const stemEpithet = motif(stemAncestor)[2];
  return `${name} ${bodyEpithet} y ${stemEpithet}`;
}
