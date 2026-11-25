import { RECIPES } from "./catalog.js";
import { BAKED_FUSIONS } from "./fusion-bakes.js";
import { fusionArtKey, PAINTED_FUSIONS, PORTRAIT_OVERRIDES } from "./fusion-paintings.js";
import { renderFusionPortrait } from "./fusion-art.js";

const library = new Map(RECIPES.map(recipe => [fusionArtKey(recipe.parents), recipe]));
const finishes = ["", "", "Refinada", "Magistral"];

export function assetPortrait(key) {
  if (typeof key !== "string" || !/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/.test(key)) return null;
  return `./assets/${key}.webp`;
}

export function portraitLevelFor(card, state) {
  if (card.category === "aberration") return 1;
  return card.category === "fusion" ? state?.portraits?.[card.id] ?? 1 : 0;
}

export function getPortrait(card, state, level = portraitLevelFor(card, state), { defer = false } = {}) {
  if (!["fusion", "aberration"].includes(card.category)) {
    return { src: assetPortrait(card.art), kind: "painted", level: 0 };
  }
  const override = PORTRAIT_OVERRIDES.get(card.id);
  if (override?.length) {
    return { src: assetPortrait(override[level - 1] ?? override.at(-1)), kind: "painted", level };
  }
  if (card.category === "fusion") {
    const pair = fusionArtKey(card.parents);
    const recipe = library.get(pair);
    if (recipe?.art) {
      const key = level === 1 ? recipe.art : recipe.artVariants?.[level - 2] ?? recipe.artVariants?.[0] ?? recipe.art;
      return { src: assetPortrait(key), kind: "painted", level };
    }
    if (PAINTED_FUSIONS.has(pair)) return { src: assetPortrait("fusiones/" + pair), kind: "painted", level };
    if (level === 1 && BAKED_FUSIONS.has(pair)) return { src: assetPortrait("fusiones/" + pair), kind: "baked", level };
  }
  if (defer) return { src: null, kind: "generated", level, deferred: true };
  return { src: renderFusionPortrait(card, state, level), kind: "generated", level };
}

export function portraitFinish(level) {
  return finishes[level] ?? "";
}
