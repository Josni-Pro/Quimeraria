import { RECIPES } from "./catalog.js";
import { renderFusionPortrait } from "./fusion-art.js";

const library = new Map(RECIPES.map(recipe => [pairKey(recipe.parents), recipe]));
const finishes = ["", "", "Refinada", "Magistral"];

function pairKey(parents) {
  return [...parents].sort().join("\u0000");
}

export function assetPortrait(key) {
  return typeof key === "string" && /^[a-z0-9_-]+$/.test(key) ? `./assets/${key}.webp` : null;
}

export function portraitLevelFor(card, state) {
  return card.category === "fusion" ? state?.portraits?.[card.id] ?? 1 : 0;
}

export function getPortrait(card, state, level = portraitLevelFor(card, state)) {
  if (card.category !== "fusion") return { src: assetPortrait(card.art), kind: "painted", level: 0 };
  const recipe = library.get(pairKey(card.parents));
  if (recipe?.art) {
    const key = level === 1 ? recipe.art : recipe.artVariants?.[level - 2] ?? recipe.artVariants?.[0] ?? recipe.art;
    return { src: assetPortrait(key), kind: "painted", level };
  }
  return { src: renderFusionPortrait(card, state, level), kind: "generated", level };
}

export function portraitFinish(level) {
  return finishes[level] ?? "";
}
