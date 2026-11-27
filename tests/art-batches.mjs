import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createGame, fuseCards, inspectFusionVariants, loadGame, serializeGame } from "../docs/engine.js";
import { FUSION_ART_BATCH_01 } from "../docs/fusion-art-batch-01.js";
import { FUSION_ART_BATCH_02 } from "../docs/fusion-art-batch-02.js";
import { FUSION_ART_BATCH_03 } from "../docs/fusion-art-batch-03.js";
import { FUSION_ART_BATCH_04 } from "../docs/fusion-art-batch-04.js";
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
  const entries = [...FUSION_ART_BATCH_01, ...FUSION_ART_BATCH_02, ...FUSION_ART_BATCH_03, ...FUSION_ART_BATCH_04];
  for (const { id, parents, asset, direction, heritage } of entries) {
    const result = inspectFusionVariants(state, ...parents);
    assert.ok(result.ok, result.error);
    const card = result.variants.find(variant => variant.id === id);
    assert.ok(card, id);
    assert.equal(card.generation, 1);
    assert.ok(!ids.has(id), id);
    ids.add(id);
    assert.equal(card.identity.brief.artDirection, direction);
    if (asset.startsWith("lote-04/")) {
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
});


test("La cobertura cuenta variantes, archivos distintos y reutilización de catálogo por separado", () => {
  const result = firstGenerationArtCoverage();
  assert.equal(result.total, 1206);
  assert.equal(result.painted, 115 + FUSION_ART_BATCH_04.length);
  assert.equal(result.unique, 104 + FUSION_ART_BATCH_04.length);
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
