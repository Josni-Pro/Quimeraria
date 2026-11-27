import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { acknowledgeReveal, createGame, fuseCards, inspectFusionVariants, loadGame, serializeGame } from "../docs/engine.js";
import { FUSION_ART_BATCH_01 } from "../docs/fusion-art-batch-01.js";
import { FUSION_ART_BATCH_02 } from "../docs/fusion-art-batch-02.js";
import { FUSION_ART_BATCH_03 } from "../docs/fusion-art-batch-03.js";
import { FUSION_ART_BATCH_04 } from "../docs/fusion-art-batch-04.js";
import { FUSION_ART_BATCH_05 } from "../docs/fusion-art-batch-05.js";
import { firstGenerationArtCoverage } from "../docs/art-coverage.js";
import { getPortrait, illustrationRecord } from "../docs/illustrations.js";

test("Los lotes se resuelven por ID de variante y contienen pinturas WebP distintas", () => {
  const state = createGame();
  const ids = new Set();
  const digests = new Set();
  assert.equal(FUSION_ART_BATCH_01.length, 13);
  assert.equal(FUSION_ART_BATCH_02.length, 20);
  assert.equal(FUSION_ART_BATCH_03.length, 20);
  assert.equal(FUSION_ART_BATCH_04.length, 25);
  assert.equal(FUSION_ART_BATCH_05.length, 40);
  const entries = [
    ...FUSION_ART_BATCH_01, ...FUSION_ART_BATCH_02, ...FUSION_ART_BATCH_03,
    ...FUSION_ART_BATCH_04, ...FUSION_ART_BATCH_05
  ];
  for (const { id, parents, asset, direction, heritage } of entries) {
    const result = inspectFusionVariants(state, ...parents);
    assert.ok(result.ok, result.error);
    const card = result.variants.find(variant => variant.id === id);
    assert.ok(card, id);
    assert.equal(card.generation, 1);
    assert.ok(!ids.has(id), id);
    ids.add(id);
    assert.equal(card.identity.brief.artDirection, direction);
    if (asset.startsWith("lote-04/") || asset.startsWith("lote-05/")) {
      assert.equal(heritage.length, 2);
      assert.deepEqual(card.identity.brief.artHeritage, heritage);
      assert.ok(heritage.every(trait => trait.length > 0));
    }
    assert.equal(card.identity.illustration.final, asset);

    const expected = `./assets/${asset}.webp`;
    for (const level of [1, 2, 3]) {
      const portrait = getPortrait(card, state, level, { defer: true });
      assert.deepEqual(illustrationRecord(card, portrait), {
        status: "definitiva", reference: id, provisional: null, final: expected
      });
    }

    const historical = { ...card, identity: { ...card.identity, illustration: { reference: id, final: null } } };
    assert.equal(getPortrait(historical, state).src, expected);
    for (const sibling of result.variants.filter(variant => variant.id !== id)) {
      assert.notEqual(getPortrait(sibling, state, 1, { defer: true }).src, expected, "La pintura pertenece a una sola variante");
    }

    const bytes = readFileSync(new URL(`../docs/assets/${asset}.webp`, import.meta.url));
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert.ok(!digests.has(digest), asset);
    digests.add(digest);
  }
  const files = readdirSync(new URL("../docs/assets/lote-05/", import.meta.url)).sort();
  const declared = FUSION_ART_BATCH_05.map(({ asset }) => {
    assert.match(asset, /^lote-05\/[a-z0-9-]+$/);
    return asset.slice("lote-05/".length) + ".webp";
  }).sort();
  assert.deepEqual(files, declared, "Cada WebP del lote debe figurar en el registro");
});


test("La cobertura cuenta variantes, archivos distintos y reutilización de catálogo por separado", () => {
  const result = firstGenerationArtCoverage();
  assert.equal(result.total, 1206);
  assert.equal(result.painted, 140 + FUSION_ART_BATCH_05.length);
  assert.equal(result.unique, 129 + FUSION_ART_BATCH_05.length);
  assert.equal(result.painted + result.baked + result.generated + result.missing, result.total);
  assert.equal(result.missing, 0);
  assert.equal(result.catalogue, 16);
  assert.deepEqual(result.shared.map(({ name, variants }) => [name, variants]), [["Dragón", 11], ["Grifo", 2]]);
});

test("Una revelación guardada con arte provisional resuelve automáticamente la pintura por ID", () => {
  const game = createGame();
  game.inventory.ajolote = 1;
  const fusion = fuseCards(game, "ajolote", "zorro", () => 0);
  assert.ok(fusion.ok, fusion.error);
  const { card, state } = fusion;
  const entry = FUSION_ART_BATCH_04.find(row => row.id === card.id);
  assert.equal(entry.id, "fusion(ajolote+zorro)");
  const { artDirection, artHeritage, ...provisionalBrief } = card.identity.brief;
  const oldSnapshot = {
    ...card, identity: { ...card.identity, brief: provisionalBrief,
      illustration: { reference: card.id, status: "provisional WebP", final: null, provisional: "fusiones/ajolote--zorro" } }
  };
  state.fusions[card.id] = oldSnapshot;
  const restored = loadGame(serializeGame(state));
  assert.equal(restored.inventory[card.id], 1);
  assert.equal(restored.pendingReveal.cardId, card.id);
  assert.deepEqual(restored.fusionCopies[card.id], state.fusionCopies[card.id]);
  assert.equal(getPortrait(restored.fusions[card.id], restored).src, `./assets/${entry.asset}.webp`);
});

test("Una partida de b86a55f reanuda el Destilador con la pintura del lote 05 y conserva sus datos", () => {
  const fixture = new URL("./fixtures/quimeraria-v7-before-art-05.json", import.meta.url);
  const serialized = readFileSync(fixture, "utf8");
  const saved = JSON.parse(serialized);
  const { cardId: id } = saved.pendingReveal;
  const snapshot = saved.fusions[id];
  assert.equal(snapshot.identity.illustration.status, "procedural SVG");

  const restored = loadGame(serialized);
  assert.equal(restored.coins, saved.coins);
  assert.deepEqual(restored.inventory, saved.inventory);
  assert.deepEqual(restored.fusionCopies, saved.fusionCopies);
  assert.deepEqual(restored.pendingReveal, saved.pendingReveal);
  for (const field of ["name", "description", "parents", "lineage", "rarity", "generation", "stats", "concept", "identity"]) {
    assert.deepEqual(restored.fusions[id][field], snapshot[field], field);
  }
  assert.equal(getPortrait(restored.fusions[id], restored).src, "./assets/lote-05/destilador-dos-escuelas.webp");

  const acknowledged = acknowledgeReveal(restored, saved.pendingReveal.id);
  assert.ok(acknowledged.ok, acknowledged.error);
  const reopened = loadGame(serializeGame(acknowledged.state));
  assert.equal(reopened.pendingReveal, null);
  assert.equal(reopened.coins, saved.coins);
  assert.deepEqual(reopened.inventory, saved.inventory);
  assert.deepEqual(reopened.fusionCopies, saved.fusionCopies);
});
