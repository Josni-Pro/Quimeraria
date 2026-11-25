import { artStatus, resolvePortraitAsset } from "./fusion-art-registry.js";
import { renderFusionPortrait } from "./fusion-art.js";
import { renderProvisionalPortrait } from "./provisional-art.js";
import { renderAberrationPortrait } from "./aberration-portrait.js";

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
  const asset = resolvePortraitAsset(card, level);
  if (asset) return { src: assetPortrait(asset.key), kind: asset.kind, level };
  if (card.category !== "fusion" && card.category !== "aberration") return { src: null, kind: "missing", level };
  if (card.category === "aberration") {
    return defer ? { src: null, kind: "generated", format: "svg", level, deferred: true }
      : { src: renderAberrationPortrait(card), kind: "generated", format: "svg", level };
  }
  if (card.category === "fusion" && card.identity?.shape && card.identity.shape !== "classic") {
    return defer ? { src: null, kind: "generated", format: "svg", level, deferred: true }
      : { src: renderProvisionalPortrait(card, level), kind: "generated", format: "svg", level };
  }
  if (defer) return { src: null, kind: "generated", format: "canvas", level, deferred: true };
  return { src: renderFusionPortrait(card, state, level), kind: "generated", format: "canvas", level };
}

export function portraitFinish(level) {
  return finishes[level] ?? "";
}

export function portraitStatus(portrait) {
  const format = portrait.src || portrait.deferred ? portrait.format : null;
  return artStatus(portrait.kind, format);
}

export function illustrationRecord(card, portrait) {
  const status = portraitStatus(portrait);
  return {
    status, reference: card.identity?.illustration?.reference ?? card.id,
    provisional: status !== "definitiva" ? portrait.src : null,
    final: status === "definitiva" ? portrait.src : null
  };
}
