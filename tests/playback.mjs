import assert from "node:assert/strict";
import { test } from "node:test";
import { getCard } from "../docs/engine.js";
import { duelPressure, TRAINING_RULES } from "../docs/combat/config.js";
import { advanceCombat, finishCombat } from "../docs/combat/bots.js";
import { issueOrder, startCombat } from "../docs/combat/engine.js";
import { prepareCombatant } from "../docs/combat/skills.js";
import { applyPlaybackClip, playbackPlan } from "../docs/training-playback.js";

const team = (...ids) => Array.from({ length:6 },(_,slot) => ids[slot] ?
  { copyId: String(slot), profile:prepareCombatant(getCard(ids[slot])) } : null);

test("La preparación se solapa y los impactos, intercambios y efectos de ronda mantienen su orden", () => {
  const action = (actor,skill,special = false) => ({ type:"action", actor, skill, special });
  const moves = [{ type:"move",actor:"a",swapWith:"b",unit:{} },{ type:"move",actor:"b",unit:{} }];
  const strike = action("a","strike");
  const hit = { type:"damage",unit:{ hp:56 } };
  const second = action("b","fire",true);
  const shield = { type:"shield",unit:{ shield:11 } };
  const upkeep = [{ type:"heal",periodic:true,unit:{} },{ type:"damage",periodic:true,unit:{} },{ type:"down",unit:{} }];
  const events = [...moves,strike,hit,second,shield,...upkeep];
  for (const quality of ["full","reduced","minimal"]) {
    const clips = playbackPlan(events,quality);
    assert.equal(clips.length,4);
    assert.deepEqual(clips[0].changes,moves);
    assert.deepEqual(clips[3].changes,upkeep);
    assert.ok(clips[1].end > clips[2].start);
    assert.ok(clips[2].end-clips[2].start > clips[1].end-clips[1].start);
    assert.ok(clips.every((clip,i) => i === 0 || clip.impact >= clips[i-1].impact));
    const replayed = [];
    clips.forEach(clip => applyPlaybackClip(clip,changes => replayed.push(...changes)));
    assert.deepEqual(replayed,events);
  }
});

test("La resolución instantánea usa las políticas automáticas y respeta la orden ya emitida", () => {
  const result = startCombat(team("lobo","mamut","pulpo",null,"medica"), team("dragon","thor",null,"fenix"),{ seed:1977 });
  assert.ok(result.ok);
  const queued = issueOrder(result.state,"player",{ type:"move",actor:"player:0",slot:1 });
  assert.ok(queued.ok);
  for (const difficulty of ["beginner","normal","hard"]) {
    let manual = queued.state;
    while (!manual.result) manual = advanceCombat(manual,difficulty);
    const fast = finishCombat(queued.state,difficulty);
    assert.deepEqual(fast,manual);
    assert.ok(fast.history.some(event => event.type === "order" && event.side === "player" && event.slot === 1));
    assert.equal(fast.history.filter(event => event.type === "order" && event.side === "player").length,1);
  }
});

test("La presión deja intactas las primeras siete rondas y se limita para ambos equipos", () => {
  const expected = { damage:1,recovery:1 };
  assert.deepEqual(duelPressure(7,TRAINING_RULES),expected);
  assert.deepEqual(duelPressure(30,{}),expected);
  const maximum = duelPressure(30,TRAINING_RULES);
  assert.equal(maximum.damage,1.44);
  assert.ok(Math.abs(maximum.recovery-.67) < 1e-10);
  assert.deepEqual(duelPressure(17,TRAINING_RULES),maximum);
});
