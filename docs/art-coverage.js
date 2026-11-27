import { CARDS } from "./catalog.js";
import { createGame, inspectFusionVariants } from "./engine.js";
import { assetPortrait, getPortrait, portraitStatus } from "./illustrations.js";

const catalogue = new Set(CARDS.map(card => assetPortrait(card.art)));

export function artCoverage(cards, state) {
  const counts = { total: cards.length, painted: 0, baked: 0, generated: 0, missing: 0, catalogue: 0 };
  const files = new Map();
  for (const card of cards) {
    const portrait = getPortrait(card, state, 1, { defer: true });
    const status = portraitStatus(portrait);
    if (status === "definitiva" && portrait.src) {
      counts.painted++;
      if (catalogue.has(portrait.src)) counts.catalogue++;
      const file = files.get(portrait.src) ?? { src: portrait.src, name: card.name, variants: 0 };
      file.variants++;
      files.set(portrait.src, file);
    } else if (status === "provisional WebP") counts.baked++;
    else if (status.startsWith("procedural")) counts.generated++;
    else counts.missing++;
  }
  return { ...counts, unique: files.size, shared: [...files.values()].filter(file => file.variants > 1) };
}

export function firstGenerationArtCoverage() {
  const state = createGame();
  const cards = CARDS.flatMap((first, index) => CARDS.slice(index).flatMap(second =>
    inspectFusionVariants(state, first.id, second.id).variants));
  return artCoverage(cards, state);
}
