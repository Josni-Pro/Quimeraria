import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CARDS, RECIPES } from "../docs/catalog.js";
import { createGame, fuseCards } from "../docs/engine.js";
import { getPortrait } from "../docs/illustrations.js";
import { PORTRAIT_OVERRIDES } from "../docs/fusion-paintings.js";

const root = new URL("../docs/", import.meta.url);
const site = new URL("https://propietario.github.io/quimeraria/");
const index = readFileSync(new URL("index.html", root), "utf8");
const visited = new Set();

function validateFile(relative) {
  assert.ok(relative.startsWith("./"), "GitHub Pages carga archivos relativos al repositorio");
  const resolved = new URL(relative, site);
  assert.ok(resolved.href.startsWith(site.href), "El archivo debe quedar dentro del proyecto");
  const local = new URL(relative, root);
  if (!visited.has(local.href)) {
    visited.add(local.href);
    const bytes = readFileSync(local, "utf8");
    if (relative.endsWith(".js")) {
      for (const [, child] of bytes.matchAll(/^(?:import |export .*? from )[\s\S]*?["'](\.\/[a-z0-9.-]+\.js)["']/gm)) validateFile(child);
    }
  }
}

for (const [, relative] of index.matchAll(/(?:src|href)="([^"#]+)"/g)) validateFile(relative);
readFileSync(new URL(".nojekyll", root));

const state = {
  ...createGame(),
  coins: 1_000_000,
  inventory: Object.fromEntries(CARDS.map(card => [card.id, 2]))
};
const recipeKeys = new Set(RECIPES.map(recipe => [...recipe.parents].sort().join("+")));
const images = new Map();
const artKinds = {};
let abyssOverrides = 0;

function verifyWebP(relative, cardName) {
  assert.ok(new URL(relative, site).href.startsWith(site.href), cardName);
  const file = readFileSync(new URL(relative, root));
  assert.equal(file.toString("ascii", 0, 4), "RIFF", cardName);
  assert.equal(file.toString("ascii", 8, 12), "WEBP", cardName);
  assert.ok(file.length > 1000, cardName);
  const digest = createHash("sha256").update(file).digest("hex");
  assert.ok(!images.has(digest), `${cardName} repite los gráficos de ${images.get(digest)}`);
  images.set(digest, cardName);
}

for (const [index, first] of CARDS.entries()) {
  for (const second of CARDS.slice(index)) {
    const success = fuseCards(state, first.id, second.id, () => 0);
    assert.equal(success.outcome, "success");
    const { card } = success;
    const art = getPortrait(card, state, 1, { defer: true });
    assert.ok(["baked", "painted"].includes(art.kind), card.name);
    verifyWebP(art.src, card.name);
    artKinds[art.kind] = (artKinds[art.kind] ?? 0) + 1;
    if (recipeKeys.has([...card.parents].sort().join("+"))) {
      for (const level of [2, 3]) verifyWebP(getPortrait(card, state, level).src, `${card.name} ${level}`);
    }

    const failure = fuseCards(state, first.id, second.id, () => 0.99);
    assert.equal(failure.outcome, "aberration");
    const aberration = getPortrait(failure.card, state, 1, { defer: true });
    if (aberration.kind === "painted") {
      verifyWebP(aberration.src, failure.card.name);
      abyssOverrides += 1;
    } else {
      assert.ok(aberration.deferred, failure.card.name);
      assert.equal(aberration.format, "svg");
    }
  }
}

for (const [id, assets] of PORTRAIT_OVERRIDES) {
  for (const key of assets) verifyWebP(`./assets/${key}.webp`, id);
}

assert.equal((artKinds.baked ?? 0) + (artKinds.painted ?? 0), CARDS.length * (CARDS.length + 1) / 2);
console.log(JSON.stringify({ crucesEnDisco: artKinds, aberracionesConPintura: abyssOverrides, webpDistintos: images.size, recursosRelativos: visited.size }));
