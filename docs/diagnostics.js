import { CARDS, RARITIES } from "./catalog.js";
import { acknowledgeReveal, createGame, fuseCards, getCard, inspectFusionVariants, previewFusion } from "./engine.js";
import { getPortrait, illustrationRecord } from "./illustrations.js";
import { getCreatureConcept, CONCEPT_LABELS } from "./creature-concepts.js";
import { CAPABILITY_FAMILIES, COMBAT_ROLES, COMBAT_STATS, getCreatureProfiles, MOBILITY_LABELS, UTILITY_FAMILIES } from "./creature-profiles.js";
import { buildArtBrief } from "./fusion-art-registry.js";
import { VARIANT_FAMILIES, VARIANT_QUALITY_LABELS } from "./fusion-variants.js";

const examples = [
  ["alquimista", "mamut"], ["alquimista", "lobo"], ["medica", "oso"], ["abogado", "dragon"],
  ["mago", "alquimista"], ["arquitecta", "atenea"], ["lobo", "zorro"], ["buho", "grifo"],
  ["dragon", "thor"], ["zorro", "zorro"], ["lobo", "lobo"], ["triceratops", "anquilosaurio"],
  ["velociraptor", "buho"], ["pulpo", "sirena"], ["herrera", "fenix"], ["anubis", "thor"],
  ["dragon", "grifo"], ["alquimista", "alquimista"],
  [["alquimista", "mamut"], "dragon"],
  [["zorro", "buho"], ["thor", "mago"]],
  [[["mamut", "obrero"], "dragon"], "sirena"],
  [["lobo", "zorro"], ["lobo", "zorro"]],
  [{ parents: ["alquimista", "mamut"], key: "colossus", label: "Coloso Alquímico" }, "mago"],
  ["medica", "buho"], ["pulpo", "mamut"], ["atenea", "thor"], ["musico", "pulpo"],
  ["anubis", "esfinge"], ["ajolote", "lobo"], ["velociraptor", "velociraptor"], ["atenea", "atenea"],
  ["buho", "esfinge"], ["atenea", "grifo"],
  [{ parents: ["lobo", "lobo"], key: "trail-evolution", label: "Lobo de Huella Fría" }, "triceratops"]
];

const exampleSelect = document.querySelector("#example");
const firstSelect = document.querySelector("#parent-a");
const secondSelect = document.querySelector("#parent-b");
const pairTitle = document.querySelector("#pair-title");
const pairSummary = document.querySelector("#pair-summary");
const compatible = document.querySelector("#compatible");
const results = document.querySelector("#variants");
const exportRegistry = document.querySelector("#export-registry");
const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const currency = new Intl.NumberFormat("es-MX");
const collator = new Intl.Collator("es-MX");
let state = freshState();
let pool = new Set(CARDS.map(card => card.id));
let shown = [];

function freshState() {
  return {
    ...createGame(),
    coins: 1_000_000,
    inventory: Object.fromEntries(CARDS.map(card => [card.id, 12]))
  };
}

function cardName(id) {
  return getCard(id, state)?.name ?? id;
}

function exampleName(pair) {
  return pair.map(id => Array.isArray(id) ? `(${exampleName(id)})` : id.label ?? cardName(id)).join(" + ");
}

function seedParent(value) {
  if (typeof value === "string") return value;
  const parents = Array.isArray(value) ? value : value.parents;
  const [first, second] = parents.map(seedParent);
  let variantRoll = 0;
  if (value.key) {
    const { variants } = inspectFusionVariants(state, first, second);
    for (const variant of variants) {
      if (variant.variantKey === value.key) {
        variantRoll += variant.probability / 2;
        break;
      }
      variantRoll += variant.probability;
    }
  }
  let draws = 0;
  const option = fuseCards(state, first, second, () => draws++ === 0 ? 0 : variantRoll);
  if (!option.ok) throw new Error(option.error);
  state = acknowledgeReveal(option.state, option.reveal.id).state;
  pool.add(option.card.id);
  return option.card.id;
}

function option(value, label) {
  return new Option(label, value);
}

function choices() {
  return [...pool].map(id => getCard(id, state)).sort((a, b) => collator.compare(a.name, b.name));
}

function updateSelectors(first, second) {
  const known = choices();
  firstSelect.replaceChildren(...known.map(card => option(card.id, choiceLabel(card))));
  secondSelect.replaceChildren(...known.map(card => option(card.id, choiceLabel(card))));
  firstSelect.value = first;
  secondSelect.value = second;
}

function choiceLabel(card) {
  return card.generation ? `${card.name} · G${card.generation}` : card.name;
}

function formatList(values) {
  return values?.length ? values.join(", ") : "—";
}

function escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderRows(items) {
  return `<dl>${items.map(([label, value]) => `<dt>${escape(label)}</dt><dd>${escape(value || "—")}</dd>`).join("")}</dl>`;
}

const familyName = id => VARIANT_FAMILIES[id] ?? id;
const qualityName = id => VARIANT_QUALITY_LABELS[id] ?? id;

function displayNames(values, dictionary, property) {
  return formatList(values?.map(value => property ? dictionary[value]?.[property] ?? value : dictionary[value] ?? value));
}

const inheritanceLabels = {
  features: "rasgo", knowledge: "conocimiento", materials: "material", affinities: "afinidad",
  tags: "atributo", tools: "herramienta", habitat: "hábitat", utility: "utilidad", capabilities: "capacidad"
};

function inspectProfile(profiles, concept) {
  const { combat, utility } = profiles;
  return [
    ["Rol principal", COMBAT_ROLES[combat.role]?.name],
    ["Rol secundario", COMBAT_ROLES[combat.secondaryRole]?.name],
    ["Presupuesto de poder", currency.format(combat.powerBudget)],
    ["Costo de despliegue orientativo", currency.format(combat.deploymentCost)],
    ["Estadísticas", formatList(Object.entries(COMBAT_STATS).map(([id, label]) => `${label} ${combat.stats[id]}`))],
    ["Afinidades", formatList(combat.affinities)],
    ["Movilidad", MOBILITY_LABELS[combat.mobility]],
    ["Capacidades compatibles", displayNames(combat.capabilities, CAPABILITY_FAMILIES, "name")],
    ["Fortalezas", displayNames(combat.strengths, COMBAT_STATS)],
    ["Debilidades", displayNames(combat.weaknesses, COMBAT_STATS)],
    ["Utilidad", formatList(utility.capabilities.map(id => `${UTILITY_FAMILIES[id]} ${utility.ratings[id]}/3`))],
    ["Conocimientos transmisibles", formatList(concept.knowledge)],
    ["Rasgos transmisibles", formatList(concept.features)],
    ["Atributos conceptuales", formatList(concept.tags)],
    ["Herencia directa", formatList(concept.inheritance?.map(source => `${cardName(source.parentId)} · ${inheritanceLabels[source.field]}: ${source.value}`))]
  ];
}

function variantArticle(card, index) {
  const concept = getCreatureConcept(card);
  const { combat, utility } = getCreatureProfiles(card);
  const { identity } = card;
  const portrait = getPortrait(card, state);
  const { status, final, provisional } = illustrationRecord(card, portrait);
  const brief = identity.brief ?? buildArtBrief(card, card.parents.map(id => getCard(id, state)));
  const name = escape(card.name);
  const quality = qualityName(card.quality);
  const chance = number.format(card.probability * 100) + "\u00a0%";
  const artRegistry = [
    ["Identificador de combinación", card.combinationId],
    ["Identificador de variante", card.variantId],
    ["Especie", identity?.speciesId ?? concept.speciesId],
    ["Progenitores", formatList(card.parents.map(cardName))],
    ["Linaje", formatList(card.lineage.map(cardName))],
    ["Generación", card.generation],
    ["Familia", familyName(card.family)],
    ["Rareza de carta", RARITIES[card.rarity]?.name],
    ["Calidad conceptual", quality],
    ["Probabilidad dado el éxito", chance],
    ["Descripción visual", brief.silhouette],
    ["Anatomía", CONCEPT_LABELS.anatomy[concept.anatomy] ?? concept.anatomy],
    ["Naturaleza", CONCEPT_LABELS.nature[concept.nature]],
    ["Tamaño", CONCEPT_LABELS.size[concept.size]],
    ["Accesorios", formatList(identity?.accessories?.length ? identity.accessories : concept.tools)],
    ["Materiales", formatList(identity?.materials?.length ? identity.materials : concept.materials)],
    ["Poderes representativos", formatList(identity?.powers?.length ? identity.powers : concept.affinities)],
    ["Extremidades y rasgos", formatList(brief.limbs)],
    ["Rostro y motivos", formatList(brief.face)],
    ["Vestimenta", formatList(brief.clothing)],
    ["Estructuras", formatList(brief.structures)],
    ["Poderes visibles", formatList(brief.visiblePowers)],
    ["Función en escena", brief.action],
    ["Aportes de cada progenitor", formatList(brief.sources.map(source => `${source.name} · ${source.motif}`))],
    ["Distintivo", brief.distinguishingFeatures],
    ...(brief.artDirection ? [["Dirección artística", brief.artDirection]] : []),
    ["Referencia de ilustración", identity?.illustration?.reference],
    ["Estado de ilustración", status]
  ];
  const imageLink = portrait.src && portrait.src.startsWith("./assets/") ? `<a href="${escape(portrait.src)}">Imagen ${status}</a>` : "";
  const finalLink = !imageLink && (final || provisional) ? `<a href="${escape(final || provisional)}" download>Descargar imagen</a>` : "";
  const available = pool.has(card.id);
  return `<article class="variant">
    ${portrait.src ? `<img class="variant__art" src="${escape(portrait.src)}" alt="${name}" loading="lazy" decoding="async">` : ""}
    <div class="variant__body">
      <p class="variant__meta">${escape(familyName(card.family))} · ${escape(quality)} · ${chance}</p>
      <h3 class="variant__name">${name}</h3>
      <p>${escape(card.description)}</p>
      <p class="variant__role">${escape([combat.role, combat.secondaryRole].filter(Boolean).map(role => COMBAT_ROLES[role]?.name).join(" / "))} · Generación ${card.generation}</p>
      <details><summary>Combate, utilidad y herencia</summary>${renderRows(inspectProfile({ combat, utility }, concept))}</details>
      <details><summary>Registro de ilustración</summary>${renderRows(artRegistry)}<div class="variant__refs">${imageLink}${finalLink}</div></details>
      <button type="button" class="variant__button" data-add="${index}" ${available ? "disabled" : ""}>${available ? "En la lista de progenitores" : "Añadir a progenitores"}</button>
    </div>
  </article>`;
}

function labState() {
  const inventory = Object.fromEntries([...pool].map(id => [id, 2]));
  return { ...state, inventory };
}

function renderPair() {
  const first = firstSelect.value;
  const second = secondSelect.value;
  const lab = labState();
  pairTitle.textContent = `${cardName(first)} + ${cardName(second)}`;
  let validCount = 0;
  for (const opt of secondSelect.options) {
    const card = getCard(opt.value, state);
    const valid = previewFusion(lab, first, opt.value).ok;
    validCount += Number(valid);
    opt.textContent = choiceLabel(card) + (valid ? "" : " · incompatible");
  }
  compatible.textContent = `${validCount} progenitores disponibles compatibles con ${cardName(first)}.`;
  const found = inspectFusionVariants(lab, first, second);
  shown = found.ok ? found.variants : [];
  pairSummary.textContent = found.ok
    ? `${shown.length} variantes. Las probabilidades se aplican después de una fusión exitosa.`
    : found.error;
  exportRegistry.hidden = !found.ok;
  results.innerHTML = shown.map(variantArticle).join("");
}

function loadExample(index) {
  state = freshState();
  pool = new Set(CARDS.map(card => card.id));
  const [first, second] = examples[index].map(seedParent);
  updateSelectors(first, second);
  renderPair();
}

exampleSelect.replaceChildren(option("", "Selección manual"), ...examples.map((pair, index) => option(index, exampleName(pair))));
exampleSelect.value = "0";
exampleSelect.addEventListener("change", () => {
  if (exampleSelect.value !== "") loadExample(Number(exampleSelect.value));
});
for (const select of [firstSelect, secondSelect]) {
  select.addEventListener("change", () => {
    exampleSelect.value = "";
    renderPair();
  });
}
results.addEventListener("click", event => {
  const button = event.target.closest("button[data-add]");
  if (!button) return;
  const card = shown[Number(button.dataset.add)];
  if (!card) return;
  // The gallery keeps a specimen in memory so any candidate can be used as
  // a parent without rerolling or contacting the game's storage.
  state = { ...state, fusions: { ...state.fusions, [card.id]: card } };
  pool.add(card.id);
  updateSelectors(firstSelect.value, secondSelect.value);
  renderPair();
  results.querySelector(`[data-add="${button.dataset.add}"]`)?.closest("article")?.querySelector("summary")?.focus();
});
exportRegistry.addEventListener("click", () => {
  const variants = shown.map(card => {
    const portrait = getPortrait(card, state);
    return {
      ...card,
      ...getCreatureProfiles(card),
      illustrationRegistry: illustrationRecord(card, portrait)
    };
  });
  const url = URL.createObjectURL(new Blob([JSON.stringify(variants, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "quimeraria-registro-cruce.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
loadExample(0);
