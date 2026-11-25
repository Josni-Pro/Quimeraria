import assert from "node:assert/strict";
import { CARDS } from "../docs/catalog.js";
import { acknowledgeReveal, createGame, fuseCards, getCard, inspectFusionVariants } from "../docs/engine.js";
import { simulateCombat } from "../docs/combat/bots.js";
import { budgetUsed, startCombat } from "../docs/combat/engine.js";
import { trainingOpponent } from "../docs/combat/roster.js";
import { prepareCombatant, SKILLS } from "../docs/combat/skills.js";

const samples = Number(process.argv[2] ?? 40);
assert.ok(Number.isInteger(samples) && samples > 0, "Indica una cantidad positiva de semillas.");
let archive = { ...createGame(), coins: 10_000, inventory: Object.fromEntries(CARDS.map(card => [card.id, 20])) };
function fuse(first, second, choose = 0) {
  const rolls = [0, choose];
  const result = fuseCards(archive, first, second, () => rolls.shift() ?? 0);
  assert.ok(result.ok, result.error);
  assert.equal(result.outcome, "success");
  archive = acknowledgeReveal(result.state, result.reveal.id).state;
  return result.card.id;
}

function lineage(first, ...next) {
  let previous = first;
  return next.map(id => (previous = fuse(previous, id)));
}

const first = lineage("mamut","lobo","fenix","alquimista","thor");
const second = lineage("triceratops","buho","medica","ajolote","quetzalcoatl");
const third = lineage("grifo","velociraptor","pulpo","mago","dragon");
const { variants } = inspectFusionVariants(archive, "buho", "buho");
let accumulated = 0;
const marksman = variants.find(variant => {
  if (variant.concept.role === "marksman") return true;
  accumulated += variant.probability;
  return false;
});
assert.ok(marksman);
const highOwl = fuse("buho", "buho", accumulated + marksman.probability / 2);
assert.equal(prepareCombatant(getCard(highOwl, archive)).role, "marksman");
const forge = fuse("herrera","oso");
const physician = fuse("fenix","medica");
const team = (...ids) => Array.from({ length: 6 }, (_, slot) => ids[slot] ? {
  copyId: `sample:${slot}`, profile: prepareCombatant(getCard(ids[slot], archive))
} : null);

const economy = team("mamut","lobo","velociraptor","buho","medica","alquimista");
const attack = team("lobo","grifo","thor","buho","dragon","anubis");
const wards = team("mamut","triceratops","obrero","fenix","medica","ajolote");
const elements = team("pulpo","sirena","quetzalcoatl","mago","alquimista","dragon");
const middle = team(first[1],third[1],null,null,second[1]);
const high = team(first[3],null,null,null,second[3]);
const balanced = team(first[0],second[0],forge,highOwl,physician,third[0]);
const thirdGeneration = team(first[2],third[2],null,null,second[2]);
const rows = [
  ["1 criatura · espejo", team("lobo"), team("lobo")],
  ["2 criaturas · G1 espejo", team(first[0],second[0]), team(first[0],second[0])],
  ["3 criaturas · G2–G3", team(first[2],null,third[1],null,second[2]), middle],
  ["4 criaturas · curación y control", team("mamut","pulpo",null,"medica","anubis"), team("triceratops","lobo",null,null,"sirena","buho")],
  ["5 criaturas · reserva mixta", team(first[0],second[1],third[2],"fenix","alquimista"), attack],
  ["6 criaturas · ataque y defensa", attack, wards],
  ["6 criaturas · defensa espejo", wards, wards],
  ["6 criaturas · físico y magia", attack, elements],
  ["6 G0 frente a 3 G2", economy, middle],
  ["6 G0 frente a 2 G4", economy, high],
  ["2 G4 frente a 3 G2", high, middle],
  ["6 G1 frente a 2 G4", balanced, high],
  ["3 G3 frente a 2 G4", thirdGeneration, high],
  ["Logística y control", team("civil","cartografa",null,"abogado","arquitecta","medica"), elements],
  ...["beginner","normal","hard"].map(difficulty =>
    [`Patrulla ${difficulty}`, economy, trainingOpponent("tide", difficulty, budgetUsed(economy)), difficulty])
];

const roleTotals = new Map();
const events = { damage: 0, heal: 0, shield: 0, status: 0, cleanse: 0, intercept: 0, move: 0, skip: 0, down: 0 };
const schools = { physical: 0, magic: 0 };
const triggered = new Set();
const skills = new Set();
const summary = rows.map(([name, player, enemy, difficulty = "normal"]) => {
  const results = { player: 0, enemy: 0, tie: 0, limit: 0, total: 0, longest: 0 };
  for (let seed = 1; seed <= samples; seed++) {
    const start = startCombat(player, enemy, { seed });
    assert.ok(start.ok, start.error);
    const completed = simulateCombat(start.state, { enemy: difficulty });
    const { winner, reason, rounds } = completed.result;
    assert.ok(rounds <= completed.rules.maxRounds);
    results[winner ?? "tie"] += 1;
    results.limit += Number(reason === "limit");
    results.total += rounds;
    results.longest = Math.max(results.longest, rounds);
    const lastActions = new Map();
    const actors = new Set();
    const skipped = new Set();
    for (const event of completed.history) {
      if (Object.hasOwn(events, event.type)) events[event.type] += 1;
      if (event.type === "damage" && Object.hasOwn(schools, event.kind)) schools[event.kind] += 1;
      if (event.type === "status") triggered.add(event.effect);
      if (event.type === "skip") skipped.add(event.actor);
      if (event.type !== "action") continue;
      const key = `${event.actor}:${event.skill}`;
      const previous = lastActions.get(key);
      assert.ok(previous === undefined || event.round - previous >= SKILLS[event.skill].cooldown, key);
      assert.ok(!actors.has(`${event.actor}:${event.round}`), "Doble acción en la ronda");
      actors.add(`${event.actor}:${event.round}`);
      lastActions.set(key, event.round);
      skills.add(event.skill);
    }
    for (const unit of completed.units) {
      const total = roleTotals.get(unit.role) ?? { included: 0, neverActed: 0, skipped: 0 };
      total.included += 1;
      total.neverActed += Number(![...actors].some(action => action.startsWith(unit.id + ":")));
      total.skipped += Number(skipped.has(unit.id));
      roleTotals.set(unit.role, total);
    }
  }
  return { Escenario: name, Puntos: `${budgetUsed(player)}–${budgetUsed(enemy)}`, Izquierda: results.player,
    Derecha: results.enemy, Empates: results.tie, Límite: results.limit,
    Media: (results.total / samples).toFixed(1), Máximo: results.longest };
});

console.table(summary);
console.table(Object.fromEntries(roleTotals));
console.log(JSON.stringify({ duels: rows.length * samples, states: [...triggered].sort(), skillsUsed: skills.size, events, schools }, null, 2));
