import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createGame, inspectFusionVariants } from "../docs/engine.js";
import { FUSION_ART_BATCH_01 } from "../docs/fusion-art-batch-01.js";
import { getPortrait, illustrationRecord } from "../docs/illustrations.js";

test("El lote 01 se resuelve por ID de variante y contiene pinturas WebP distintas", () => {
  const state = createGame();
  const ids = new Set();
  const digests = new Set();
  assert.ok(FUSION_ART_BATCH_01.length >= 10 && FUSION_ART_BATCH_01.length <= 15);
  for (const { id, parents, asset, direction } of FUSION_ART_BATCH_01) {
    const result = inspectFusionVariants(state, ...parents);
    assert.ok(result.ok, result.error);
    const card = result.variants.find(variant => variant.id === id);
    assert.ok(card, id);
    assert.ok(!ids.has(id), id);
    ids.add(id);
    assert.equal(card.identity.brief.artDirection, direction);
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
    const classic = result.variants.find(variant => variant.variantKey === "classic");
    assert.notEqual(getPortrait(classic, state).src, expected, "La pintura no debe afectar a la variante clásica");

    const bytes = readFileSync(new URL(`../docs/assets/${asset}.webp`, import.meta.url));
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert.ok(!digests.has(digest), asset);
    digests.add(digest);
  }
});
