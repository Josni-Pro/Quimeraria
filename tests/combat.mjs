import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CARDS } from "../docs/catalog.js";
import { createGame, getCard, loadGame, serializeGame } from "../docs/engine.js";
import { advanceCombat, planBot, simulateCombat } from "../docs/combat/bots.js";
import { TRAINING_RULES } from "../docs/combat/config.js";
import { applyEffect, applyStatus, conditionedDamage, upkeep } from "../docs/combat/effects.js";
import { budgetUsed, canUse, issueOrder, resolveRound, startCombat, validateFormation } from "../docs/combat/engine.js";
import { availableCopies, trainingOpponent, trainingRoster } from "../docs/combat/roster.js";
import { prepareCombatant, SKILLS } from "../docs/combat/skills.js";
import { availableTargets } from "../docs/combat/targeting.js";

const team = (...ids) => Array.from({ length: 6 }, (_, i) => ids[i] ?
  { copyId: ids[i] + ":" + i, profile: prepareCombatant(getCard(ids[i])) } : null);
const battle = (player, enemy, options) => {
  const started = startCombat(player, enemy, options);
  assert.ok(started.ok, started.error);
  return started.state;
};

test("Despliegue de 12 puntos, plazas, inventario y exclusión de aberraciones", () => {
  const foe = team("mamut");
  assert.equal(budgetUsed(team("lobo","mamut","buho","medica","pulpo","ajolote")), 6);
  assert.equal(startCombat(team(), foe).ok, false);
  assert.equal(startCombat([...team("lobo"), null], foe).ok, false);
  const duplicate = team("mamut");
  duplicate[1] = duplicate[0];
  assert.match(validateFormation(duplicate).error, /una posición/);
  const costly = team("lobo","oso","buho");
  costly.forEach(entry => { if (entry) entry.profile.cost = 6; });
  assert.match(validateFormation(costly).error, /12/);
  assert.equal(prepareCombatant({ id:"bad", category:"aberration", stats:null }), null);
  const game = createGame();
  const roster = trainingRoster(game);
  const wolf = roster.find(entry => entry.card.id === "lobo").copies[0];
  assert.equal(startCombat([wolf,null,null,null,null,null], foe,{ available:availableCopies(roster) }).ok,true);
  assert.equal(startCombat(team("lobo"), foe, { available:availableCopies(roster) }).ok,false);
});

test("La vanguardia cubre su columna y una plaza libre abre un blanco alcanzable", () => {
  const state = battle(team(null, "lobo", "buho"), team("mamut",null,null,"medica",null,"pulpo"));
  const wolf = state.units.find(unit => unit.cardId === "lobo");
  const owl = state.units.find(unit => unit.cardId === "buho");
  const names = units => new Set(units.map(unit => unit.cardId));
  assert.deepEqual(names(availableTargets(state,wolf,SKILLS.strike)),new Set(["mamut","pulpo"]));
  assert.deepEqual(names(availableTargets(state,owl,SKILLS.strike)),new Set(["mamut","medica","pulpo"]));
  assert.deepEqual(names(availableTargets(state,wolf,SKILLS.bolt)),new Set(["mamut","medica","pulpo"]));
  state.units.find(unit => unit.cardId === "mamut").hp = 0;
  assert.ok(availableTargets(state,wolf,SKILLS.strike).some(unit => unit.cardId === "medica"));
});

test("Daños físicos y mágicos responden a sus atributos, cobertura, riesgo y perforación", () => {
  const state = battle(team("lobo"),team("mamut"));
  const [actor,target] = state.units;
  const physical = { kind:"physical",factor:1 };
  const magic = { kind:"magic",factor:1 };
  const base = conditionedDamage(actor,target,physical,state.rules);
  const arcane = conditionedDamage(actor,target,magic,state.rules);
  target.stats.defense += 300;
  assert.ok(conditionedDamage(actor,target,physical,state.rules) < base);
  assert.equal(conditionedDamage(actor,target,magic,state.rules),arcane);
  target.stats.resistance += 300;
  assert.ok(conditionedDamage(actor,target,magic,state.rules) < arcane);
  const mitigated = conditionedDamage(actor,target,physical,state.rules);
  assert.ok(conditionedDamage(actor,target,{...physical,pierce:.5},state.rules) > mitigated);
  target.effects.expose = {};
  assert.ok(conditionedDamage(actor,target,physical,state.rules) >= mitigated);
  actor.effects.guard = {};
  target.effects.guard = {};
  assert.ok(conditionedDamage(actor,target,physical,state.rules) < mitigated);
});

test("Escudo con tope, interposición de un golpe y curación de bajas reales", () => {
  const state = battle(team("mamut","medica"),team("oso"));
  const [guard, protectedUnit, foe] = state.units;
  for (let i=0;i<6;i++) applyEffect(state,guard,protectedUnit,{type:"shield",factor:10});
  assert.equal(protectedUnit.shield,Math.floor(protectedUnit.maxHp * state.rules.shieldCap));
  applyStatus(state,guard,protectedUnit,{id:"intercept",duration:2});
  const strike = {type:"damage",kind:"physical",factor:2};
  applyEffect(state,foe,protectedUnit,strike);
  applyEffect(state,foe,protectedUnit,strike);
  assert.equal(state.events.filter(event=>event.type==="intercept").length,1);
  assert.ok(guard.metrics.protection > 0);
  const before = guard.hp;
  applyEffect(state,protectedUnit,guard,{type:"heal",factor:1});
  assert.ok(guard.hp > before && guard.hp <= guard.maxHp);
  const full = guard.maxHp;
  guard.hp = full;
  const healing = protectedUnit.metrics.healing;
  applyEffect(state,protectedUnit,guard,{type:"heal",factor:10});
  assert.equal(protectedUnit.metrics.healing, healing);
});

test("Duración, purificación, periodicidad y resistencia a aturdimiento", () => {
  const state = battle(team("medica"),team("thor"));
  const [victim,source] = state.units;
  victim.hp = 70;
  applyStatus(state,source,victim,{id:"burn",duration:2,value:5});
  applyStatus(state,source,victim,{id:"burn",duration:2,value:3});
  for (const round of [2,3,4]) { state.round=round; upkeep(state); }
  assert.equal(victim.hp,60);
  assert.equal(victim.effects.burn,undefined);
  applyStatus(state,source,victim,{id:"root",duration:2});
  applyStatus(state,source,victim,{id:"stun",duration:1});
  assert.ok(victim.effects.stun);
  applyEffect(state,victim,victim,{type:"cleanse"});
  assert.equal(victim.effects.root,undefined);
  assert.equal(victim.effects.stun,undefined);
  applyStatus(state,source,victim,{id:"stun",duration:1});
  assert.equal(victim.effects.stun,undefined);
  state.round += 3;
  applyStatus(state,source,victim,{id:"stun",duration:1});
  assert.ok(victim.effects.stun);
});

test("Órdenes cuestan mando, reposicionan, respetan enfriamiento y se reinician", () => {
  let state = battle(team("mamut","lobo",null,null,"medica"),team("triceratops","buho"));
  const guard = state.units[0], medic = state.units[2], enemy = state.units.at(-1);
  const protective = issueOrder(state,"player",{type:"protect",actor:guard.id,target:medic.id});
  assert.equal(protective.ok,true);
  const move = issueOrder(protective.state,"player",{type:"move",actor:medic.id,slot:5});
  assert.ok(move.ok, move.error);
  assert.equal(issueOrder(move.state,"player",{type:"focus",target:enemy.id}).ok,false);
  const resolved = resolveRound(move.state);
  assert.equal(resolved.units.find(unit=>unit.id===medic.id).slot,5);
  assert.ok(resolved.events.some(event=>event.type==="action" && event.actor===guard.id && event.targets.includes(medic.id)));
  assert.equal(resolved.commands.player.remaining,2);
  state = battle(team("thor","lobo"),team("mamut","pulpo"));
  const actor=state.units[0];
  const special=issueOrder(state,"player",{type:"special",actor:actor.id});
  assert.ok(special.ok);
  const next=resolveRound(special.state);
  const current=next.units.find(unit=>unit.id===actor.id);
  assert.ok(next.events.some(event=>event.type==="action" && event.special && event.actor===actor.id));
  assert.equal(canUse(next,current,current.special),false);
  assert.equal(issueOrder(next,"player",{type:"special",actor:current.id}).ok,false);
  applyStatus(next,current,current,{id:"root",duration:2});
  assert.equal(issueOrder(next,"player",{type:"move",actor:current.id,slot:4}).ok,false);
});

test("La iniciativa usa agilidad, y cada criatura completa como máximo una acción principal", () => {
  const state=battle(team("mamut","velociraptor"),team("buho","pulpo"));
  const result=resolveRound(state);
  const initiative=result.events.find(event=>event.type==="initiative").order;
  assert.equal(initiative.length,4);
  const agility=initiative.map(id=>state.units.find(unit=>unit.id===id).stats.agility);
  assert.deepEqual(agility,[...agility].sort((first,second)=>second-first));
  const actors=result.events.filter(event=>event.type==="action").map(event=>event.actor);
  assert.equal(actors.length,new Set(actors).size);
  assert.equal(result.round,2);
  assert.equal(state.round,1);
});

test("Victoria, derrota y empate al límite producen un resultado explícito", () => {
  const first=team("thor");
  const second=team("civil");
  assert.equal(simulateCombat(battle(first,second,{seed:12})).result.winner,"player");
  assert.equal(simulateCombat(battle(second,first,{seed:12})).result.winner,"enemy");
  const rules={...TRAINING_RULES,maxRounds:1};
  const result=simulateCombat(battle(team("mamut"),team("mamut"),{rules})).result;
  assert.deepEqual(result,{winner:null,reason:"limit",rounds:1});
});

test("Los bots usan la misma economía de mando y el resultado se reproduce por semilla", () => {
  const initial=battle(team("mamut","lobo","buho",null,"medica","alquimista"),trainingOpponent("tide","hard",10),{seed:8});
  assert.equal(planBot(initial,"beginner"),initial);
  const normal=planBot(initial,"normal");
  const expert=planBot(initial,"hard");
  assert.ok(normal.commands.enemy.orders.length <= 1);
  assert.ok(expert.commands.enemy.orders.length > 0 && expert.commands.enemy.orders.length <= 2);
  for (const difficulty of ["beginner","normal","hard"]) {
    const first=simulateCombat(initial,{enemy:difficulty});
    const again=simulateCombat(initial,{enemy:difficulty});
    assert.deepEqual(first,again);
    assert.ok(first.result && first.result.rounds <= 30);
    assert.deepEqual(advanceCombat(initial,difficulty), resolveRound(planBot(initial,difficulty),difficulty));
  }
});

test("Las cartas históricas se adaptan y el entrenamiento deja idéntico el guardado", () => {
  const path = new URL("./fixtures/quimeraria-v1-portraits.json", import.meta.url);
  const game = loadGame(readFileSync(path,"utf8"));
  const before=serializeGame(game);
  const roster=trainingRoster(game);
  const historic=roster.find(entry=>entry.profile.generation > 0);
  assert.ok(historic && historic.profile.basic && historic.profile.main && historic.profile.special && historic.profile.passive);
  const initial=battle([historic.copies[0], null,null,null,null,null],team("grifo"),{available:availableCopies(roster)});
  const result=simulateCombat(initial);
  assert.ok(result.result);
  assert.equal(serializeGame(game),before);
  assert.ok(!Object.hasOwn(result,"inventory") && !Object.hasOwn(result,"coins"));
  for(const raw of CARDS) assert.ok(prepareCombatant(getCard(raw.id)));
});
