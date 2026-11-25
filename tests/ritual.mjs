import assert from "node:assert/strict";
import { test } from "node:test";
import { energyAccent, playRitual, RITUAL_DURATION } from "../docs/ritual.js";

class Element extends EventTarget {
  focus() {}
  removeAttribute() {}
}

class Dialog extends Element {
  constructor() {
    super();
    const added = new Set();
    const elements = new Map();
    this.classList = { add: value => added.add(value), contains: value => added.has(value) };
    this.style = new Map();
    this.style.setProperty = this.style.set;
    this.querySelector = selector => {
      if (!elements.has(selector)) elements.set(selector, new Element());
      return elements.get(selector);
    };
  }

  setAttribute() {}

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  }

  remove() {
    this.removed = true;
  }
}

function setup(t, reduced = false) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const dialog = new Dialog();
  const original = { document: globalThis.document, matchMedia: globalThis.matchMedia };
  globalThis.matchMedia = () => ({ matches: reduced });
  globalThis.document = { createElement: () => dialog, body: { append() {} } };
  t.after(() => {
    if (original.document === undefined) delete globalThis.document;
    else globalThis.document = original.document;
    if (original.matchMedia === undefined) delete globalThis.matchMedia;
    else globalThis.matchMedia = original.matchMedia;
  });
  return dialog;
}

const materials = [
  { name: "Búho", src: "./assets/buho.webp", accent: energyAccent({ traits: ["vuelo"] }) },
  { name: "Obrero", src: "./assets/obrero.webp", accent: energyAccent({ traits: ["forja"] }) }
];

function revealCard(failed) {
  return {
    title: failed ? "Aberración de prueba" : "Quimera inédita",
    html: '<img src="./assets/retrato-final.webp" alt="">',
    rarity: failed ? undefined : 4,
    failed
  };
}

function click(dialog, selector) {
  dialog.querySelector(selector).dispatchEvent(new Event("click"));
}

async function guardedReveal(t, failed) {
  const dialog = setup(t);
  let requested = 0;
  let committedToInterface = 0;
  const playing = playRitual({
    mode: "full",
    materials,
    reveal: () => {
      requested += 1;
      return revealCard(failed);
    },
    onReveal: () => { committedToInterface += 1; }
  });
  for (const material of materials) assert.ok(dialog.innerHTML.includes(material.name));
  assert.doesNotMatch(dialog.innerHTML, /retrato-final|Aberración de prueba|Quimera inédita/);
  assert.equal(dialog.classList.contains("fusion-ritual--unstable"), false);
  assert.deepEqual(
    [dialog.style.get("--material-primary"), dialog.style.get("--material-secondary")],
    materials.map(material => material.accent)
  );
  t.mock.timers.tick(RITUAL_DURATION.full - 1);
  await Promise.resolve();
  assert.equal(requested, 0);
  assert.equal(committedToInterface, 0);

  t.mock.timers.tick(1);
  await Promise.resolve();
  assert.equal(requested, 1);
  assert.equal(committedToInterface, 1);
  assert.equal(dialog.classList.contains("fusion-ritual--unstable"), failed);
  assert.equal(dialog.classList.contains("fusion-ritual--brilliant"), !failed);
  assert.match(dialog.querySelector(".fusion-ritual__stage").innerHTML, /retrato-final/);
  click(dialog, ".fusion-ritual__next");
  await playing;
  assert.equal(dialog.removed, true);
}

test("El retrato exitoso permanece fuera de la animación inicial", t => guardedReveal(t, false));
test("El fallo usa la misma fase inicial y se distingue al revelar", t => guardedReveal(t, true));

test("La esencia oculta los progenitores y permite saltar", async t => {
  const dialog = setup(t, true);
  let result = 0;
  const playing = playRitual({
    mode: "full",
    kind: "essence",
    materials,
    reveal: () => {
      result += 1;
      return revealCard(false);
    }
  });
  assert.match(dialog.className, /fusion-ritual--reduced.*fusion-ritual--essence/);
  assert.doesNotMatch(dialog.innerHTML, /Búho|Obrero|\.webp/);
  assert.equal(result, 0);
  click(dialog, ".fusion-ritual__skip");
  await Promise.resolve();
  assert.equal(result, 1);
  t.mock.timers.tick(RITUAL_DURATION.full);
  assert.equal(result, 1);
  click(dialog, ".fusion-ritual__next");
  await playing;
});

test("La configuración sin animación revela el resultado de inmediato", async t => {
  const dialog = setup(t);
  let result = 0;
  const playing = playRitual({
    mode: "off",
    reveal: () => {
      result += 1;
      return revealCard(false);
    }
  });
  assert.equal(result, 1);
  assert.equal(dialog.classList.contains("fusion-ritual--static"), true);
  click(dialog, ".fusion-ritual__next");
  await playing;
});
