import { RECIPES } from "./catalog.js";
import { CONCEPT_LABELS, getCreatureConcept } from "./creature-concepts.js";
import { equipmentDimensions } from "./creature-scale.js";
import { FUSION_ART_BATCH_01 } from "./fusion-art-batch-01.js";
import { FUSION_ART_BATCH_02 } from "./fusion-art-batch-02.js";
import { FUSION_ART_BATCH_03 } from "./fusion-art-batch-03.js";
import { BAKED_FUSIONS } from "./fusion-bakes.js";
import { fusionArtKey, PAINTED_FUSIONS, PORTRAIT_OVERRIDES } from "./fusion-paintings.js";
import { PORTRAIT_PROFILES } from "./portrait-profiles.js";

const recipes = new Map(RECIPES.map(recipe => [fusionArtKey(recipe.parents), recipe]));
const batch = new Map([FUSION_ART_BATCH_01, FUSION_ART_BATCH_02, FUSION_ART_BATCH_03]
  .flatMap(entries => entries.map(entry => [entry.id, entry])));
const dedicated = new Map([
  ["variant(fusion(alquimista+mamut);colossus)", ["piloto/coloso-alquimico"]],
  ["variant(fusion(zorro+zorro);kitsune)", ["piloto/kitsune"]]
]);

export function resolvePortraitAsset(card, level = 1) {
  if (!["fusion", "aberration"].includes(card.category)) {
    return card.art ? { key: card.art, kind: "painted" } : null;
  }
  const painting = batch.get(card.id);
  if (painting) return { key: painting.asset, kind: "painted" };
  const override = dedicated.get(card.id) ?? PORTRAIT_OVERRIDES.get(card.id);
  if (override?.length) return { key: override[level - 1] ?? override.at(-1), kind: "painted" };
  if (card.category === "aberration") return null;

  if (card.identity?.shape && card.identity.shape !== "classic") {
    const key = card.identity.illustration?.final;
    return key ? { key, kind: "painted" } : null;
  }
  const pair = fusionArtKey(card.parents);
  const recipe = recipes.get(pair);
  if (recipe?.art) {
    const key = level === 1 ? recipe.art : recipe.artVariants?.[level - 2] ?? recipe.artVariants?.[0] ?? recipe.art;
    return { key, kind: "painted" };
  }
  if (PAINTED_FUSIONS.has(pair)) return { key: "fusiones/" + pair, kind: "painted" };
  if (level === 1 && BAKED_FUSIONS.has(pair)) return { key: "fusiones/" + pair, kind: "baked" };
  return null;
}

export function artStatus(kind, format) {
  if (kind === "painted") return "definitiva";
  if (kind === "baked") return "provisional WebP";
  if (format === "svg") return "procedural SVG";
  if (format === "canvas") return "procedural Canvas";
  return "pendiente";
}

const bodyPlans = {
  quadruped: "Cuatro patas bajo el tronco y cabeza proyectada hacia delante",
  humanoid: "Tronco erguido, dos piernas y dos brazos con manos libres",
  avian: "Dos alas abiertas, dos patas bajo el pecho y cola de timón",
  aquatic: "Cuerpo hidrodinámico con miembros propulsores",
  amphibian: "Cuerpo bajo y extremidades aptas para la orilla",
  cephalopod: "Manto abombado sobre una corona de brazos",
  serpentine: "Eje serpentiforme continuo con curvas de apoyo",
  reptilian: "Tronco reptiliano, cola de contrapeso y articulaciones visibles",
  construct: "Cuerpo ensamblado con uniones y puntos de carga visibles",
  hybrid: "Integrar los rasgos de ambos progenitores en un solo cuerpo articulado"
};

function sourceBrief(parent, concept, contribution) {
  const profile = PORTRAIT_PROFILES[parent.id];
  const motif = profile?.visual ?? (concept.features.join(", ") || parent.identity?.visual);
  return {
    id: parent.id, name: parent.name, motif: motif || parent.description,
    ...(contribution ? { expression: contribution.type, trait: contribution.trait } : {}),
    ...(contribution?.action ? { action: contribution.action } : {}),
    ...(concept.depth.mythology ? { mythology: concept.depth.mythology } : {})
  };
}

export function buildArtBrief(card, parents) {
  const concept = getCreatureConcept(card);
  const sources = parents.map((parent, index) => sourceBrief(parent, getCreatureConcept(parent), concept.depth.contributions?.[index]));
  const contrast = card.identity?.visual ?? sources.map(source => source.motif).join(" junto a ");
  const body = concept.scale.form === "hybrid" ? parents.map(getCreatureConcept)
    .find(source => !source.profession && source.anatomy !== "hybrid")?.anatomy ?? concept.scale.form : concept.scale.form;
  const anatomy = bodyPlans[body] ?? bodyPlans.hybrid;
  const features = concept.features.length ? concept.features : sources.map(source => source.motif);
  const artDirection = batch.get(card.id)?.direction;
  return {
    silhouette: `${anatomy}. Rasgos reconocibles: ${/[.!?]$/.test(contrast) ? contrast : contrast + "."}`,
    anatomy: CONCEPT_LABELS.anatomy[concept.scale.form] ?? concept.scale.form,
    size: CONCEPT_LABELS.size[concept.size] ?? concept.size,
    scale: concept.scale,
    equipmentDimensions: equipmentDimensions(card, concept),
    integration: concept.depth.integration || card.description,
    limbs: features,
    face: sources.map(source => source.motif),
    clothing: concept.profession ? sources.filter(source => PORTRAIT_PROFILES[source.id]?.face === "human").map(source => source.motif) : [],
    materials: concept.materials,
    tools: concept.tools,
    structures: concept.structure ? [concept.structure] : [],
    visiblePowers: [...concept.affinities, ...concept.features.filter(feature => /luz|ígneo|núcleo|rayo|runa|regener/i.test(feature))],
    action: card.description.startsWith("Quimera que combina los rasgos")
      ? `Mostrar ${features.slice(0, 2).join(" y ")} en una postura funcional.` : card.description,
    distinguishingFeatures: contrast,
    ...(artDirection ? { artDirection } : {}),
    sources
  };
}
