import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { advanceArena, arenaOffers, beginArena, withdrawArena } from "../docs/arena.js";
import { ARENA_RULES } from "../docs/arena-config.js";
import { chooseMaterials, creatureCopies, removeInstances } from "../docs/creature-instances.js";
import { getCard, createGame, fuseCards, loadGame, previewFusion, serializeGame } from "../docs/engine.js";
import { GAME_SECTIONS } from "../docs/game-nav.js";
import { arenaExposure, effectiveStats, HEALTHY, healthFor, healthSummary, normalizeHealth, rollWound, woundFamily } from "../docs/health.js";
import { applyRecovery, assignSpecialist, quoteRecovery, recoveryInventory, specialistSkills, treatmentStaff } from "../docs/recovery.js";
import { trainingRoster, trainingOpponent } from "../docs/combat/roster.js";
import { startCombat } from "../docs/combat/engine.js";
import { finishCombat } from "../docs/combat/bots.js";

const copy = (id,index=0)=>`legacy:${id}:${index}`;
const gameWith = (health={})=>({ ...createGame(), coins:120, health,
  inventory:{lobo:3,mamut:2,alquimista:2,medica:2,herrera:2,obrero:2,ajolote:1,fenix:1} });
const reload = game=>loadGame(serializeGame(game));
const ok = result=>{ assert.ok(result.ok,result.error); return result; };
const squad = [copy("lobo"),copy("mamut"),null,null,copy("alquimista"),null];
const begin = (game,team=squad)=>beginArena(game,arenaOffers(game).board[0].id,team);

test("La migración v6 conserva identificadores y crea estados sanos separados por ejemplar",()=>{
  const initial = { ...gameWith(),version:6,baseCopies:{lobo:[{id:"base-copy-19",packId:"explorador",sequence:19}]} };
  delete initial.health;
  const migrated = loadGame(JSON.stringify(initial));
  assert.equal(migrated.version,7);
  assert.deepEqual(creatureCopies(migrated,"lobo").map(row=>row.id),["base-copy-19",copy("lobo"),copy("lobo",1)]);
  for (const row of recoveryInventory(migrated)) assert.deepEqual(row.health,HEALTHY);
  const damaged = reload({ ...migrated,health:{ [copy("lobo",1)]:{fatigue:43,wound:1,family:"bio"},unknown:{fatigue:60} } });
  assert.deepEqual(healthFor(damaged,copy("lobo")),HEALTHY);
  assert.equal(healthFor(damaged,copy("lobo",1)).fatigue,43);
  assert.equal(damaged.health.unknown,undefined);
});

test("Una pila histórica conserva los ordinales extremos al consumir huecos y al volver a cargar",()=>{
  const initial = { ...gameWith(),inventory:{lobo:24_000} };
  const tail = copy("lobo",23_999);
  const middle = copy("lobo",12_000);
  const chosen = chooseMaterials(initial,["lobo","lobo"],[tail,middle]);
  assert.deepEqual(chosen.map(row=>row.copyId),[tail,middle]);
  const older = reload({ ...initial,...removeInstances(initial,chosen),inventory:{lobo:23_998} });
  assert.deepEqual(older.legacyCopies.lobo,{head:0,removed:[12_000,23_999]});
  assert.equal(chooseMaterials(older,["lobo"],[tail]),null);
  assert.equal(chooseMaterials(older,["lobo"],[middle]),null);
  assert.equal(chooseMaterials(older,["lobo"],[copy("lobo",12_001)])[0].copyId,copy("lobo",12_001));
  const next = chooseMaterials(older,["lobo","lobo"]);
  const after = { ...older,...removeInstances(older,next),inventory:{lobo:23_996} };
  assert.equal(after.legacyCopies.lobo.head,2);
  assert.equal(chooseMaterials(after,["lobo"])[0].copyId,copy("lobo",2));
});

test("Límites, umbrales, atributos originales y bloqueos se aplican de forma independiente",()=>{
  assert.deepEqual(normalizeHealth({fatigue:-5,wound:-1,family:"bio"}),HEALTHY);
  assert.deepEqual(normalizeHealth({fatigue:999,wound:999,family:"arcane",reserve:999}),{fatigue:100,wound:3,family:"arcane",reserve:6});
  const stats = {vitality:100,strength:100,agility:100,magic:100,defense:100,resistance:100};
  assert.deepEqual(effectiveStats(stats,normalizeHealth({fatigue:24})).stats,stats);
  assert.equal(effectiveStats(stats,normalizeHealth({fatigue:25})).stats.agility,95);
  assert.equal(effectiveStats(stats,normalizeHealth({fatigue:50})).stats.magic,90);
  const effective = effectiveStats(stats,{fatigue:91,wound:2,family:"bio"});
  assert.deepEqual(effective.stats,{vitality:85,strength:70,agility:70,magic:80,defense:100,resistance:100});
  assert.equal(stats.agility,100);
  assert.ok(healthSummary(normalizeHealth({fatigue:99})).available);
  assert.equal(healthSummary(normalizeHealth({fatigue:100})).blocked,"Agotada");
  assert.equal(healthSummary(normalizeHealth({wound:3})).blocked,"Herida grave");
  assert.equal(healthSummary(HEALTHY,true).blocked,"Ocupada en Arena");
});

test("Exposición, incapacidad, regeneración y protección afectan fatiga y heridas reproducibles",()=>{
  const unit = {stats:{resistance:48},hp:180,maxHp:200,metrics:{received:20}};
  const lobo = getCard("lobo");
  const noRisk = arenaExposure(lobo,unit,{actions:6});
  assert.equal(noRisk.chance,0);
  const hurt = { ...unit,hp:0,metrics:{received:225} };
  const exposure = arenaExposure(lobo,hurt,{actions:6,specials:2});
  const briefer = arenaExposure(lobo,hurt,{actions:1});
  const protectedUnit = arenaExposure(lobo,hurt,{actions:6,specials:2,absorbed:160});
  const regenerative = arenaExposure(getCard("ajolote"),hurt,{actions:6,specials:2});
  assert.ok(exposure.fatigue>briefer.fatigue && exposure.fatigue<=22);
  assert.ok(exposure.chance>.5 && exposure.severe>0 && exposure.moderate>0);
  assert.ok(regenerative.chance<exposure.chance && regenerative.fatigue<exposure.fatigue);
  assert.ok(protectedUnit.chance<exposure.chance);
  for (const [random,severity] of [[[0,0],3],[[0,.2],2],[[0,.95],1],[[.99],0]]) {
    assert.equal(rollWound(exposure,()=>random.shift()),severity);
  }
  assert.equal(woundFamily(getCard("lobo")),"bio");
  assert.equal(woundFamily(getCard("thor")),"arcane");
});

test("La Arena liquida consecuencias y recompensas una vez y conserva todas las criaturas",()=>{
  const bench=copy("lobo",1);
  const initial = gameWith({ [bench]:{fatigue:16,wound:1,family:"bio"} });
  const match = ok(begin(initial));
  const turn = ok(advanceArena(match.state,match.active.id,1,[]));
  const resumed = reload(turn.state);
  assert.deepEqual(resumed.health,initial.health);
  const settled = ok(advanceArena(resumed,match.active.id,2,[],true));
  assert.equal(settled.receipt.health.length,3);
  assert.notEqual(new Set(settled.receipt.health.map(row=>row.after.fatigue)).size,1);
  assert.equal(settled.receipt.rested,1);
  assert.equal(healthFor(settled.state,bench).fatigue,10);
  assert.equal(healthFor(settled.state,bench).wound,1);
  assert.deepEqual(settled.state.inventory,initial.inventory);
  assert.deepEqual(reload(settled.state).arena.history[0].health,settled.receipt.health);
  assert.equal(advanceArena(reload(settled.state),match.active.id,2,[],true).ok,false);
});

test("Un abandono vacío no recupera la reserva y uno posterior aplica el desgaste ya confirmado",()=>{
  const bench=copy("lobo",1);
  const initial = gameWith({ [bench]:{fatigue:16,wound:0,family:null} });
  const match = ok(begin(initial));
  const early = ok(withdrawArena(match.state,match.active.id));
  assert.deepEqual(early.state.health,initial.health);
  assert.equal(early.receipt.rested,0);
  const afterRound = ok(advanceArena(match.state,match.active.id,1,[]));
  const withdrawn = ok(withdrawArena(reload(afterRound.state),match.active.id));
  assert.equal(withdrawn.receipt.rested,0);
  assert.ok(healthFor(withdrawn.state,copy("lobo")).fatigue>0);
  assert.equal(healthFor(withdrawn.state,bench).fatigue,16);
});

test("La Arena excluye gravedad y agotamiento. El entrenamiento usa atributos originales incluso en combate activo",()=>{
  const health = { [copy("lobo")]:{fatigue:79,wound:3,family:"bio"},[copy("mamut")]:{fatigue:100,wound:0,family:null} };
  const game = gameWith(health);
  assert.match(begin(game).error,/Herida grave/);
  assert.match(begin(game,[null,copy("mamut"),null,null,null,null]).error,/Agotada/);
  const other = ok(begin(game,[copy("lobo",1),null,null,null,null,null]));
  const occupied = reload(other.state);
  const roster = trainingRoster(occupied);
  const lobo = roster[0].copies[0];
  const arenaLobo = trainingRoster(occupied,ARENA_RULES)[0].copies[0];
  assert.ok(lobo.profile.stats.agility>arenaLobo.profile.stats.agility);
  assert.ok(lobo.profile.maxHp>arenaLobo.profile.maxHp);
  assert.equal(roster[0].copies[1].condition.blocked,"Ocupada en Arena");
  const mock = ok(startCombat([lobo,roster[0].copies[1],null,null,null,null],trainingOpponent("watch","beginner",2),{seed:42}));
  assert.ok(finishCombat(mock.state,"beginner").result);
  assert.deepEqual(occupied.health,health);
});

test("La recuperación conjunta gratuita limpia estados graves sin saldo y excluye a quien combate",()=>{
  const game = gameWith({ [copy("lobo")]:{fatigue:20,wound:1,family:"bio"},[copy("mamut",1)]:{fatigue:100,wound:3,family:"bio"} });
  const active = ok(begin(game)).state;
  const {state,quote}=ok(applyRecovery({...active,coins:0},[copy("lobo"),copy("lobo",1),copy("mamut",1)]));
  assert.equal(quote.rows.length,1);
  assert.equal(quote.skipped,2);
  assert.equal(quote.price,0);
  assert.deepEqual(healthFor(state,copy("mamut",1)),HEALTHY);
  assert.equal(healthFor(state,copy("lobo")).fatigue,20);
  assert.deepEqual(state.arena.active.player,active.arena.active.player);
  assert.deepEqual(reload(state).inventory,state.inventory);
});

test("Medicina y logística dependen de capacidades. Un especialista ocupa una plaza y puede sustituirse",()=>{
  const med = copy("medica");
  const {state}=ok(assignSpecialist(gameWith(),"enfermeria",med));
  assert.ok(specialistSkills(getCard("medica")).some(skill=>skill.area==="enfermeria"));
  assert.ok(!specialistSkills(getCard("ajolote")).some(skill=>skill.area==="enfermeria"));
  assert.ok(specialistSkills(getCard("fenix")).some(skill=>skill.area==="enfermeria"));
  assert.ok(specialistSkills(getCard("herrera")).some(skill=>skill.area==="taller"));
  assert.ok(specialistSkills(getCard("alquimista")).some(skill=>skill.area==="arcana"));
  assert.ok(!assignSpecialist(state,"enfermeria",med).ok);
  const second = ok(assignSpecialist(state,"enfermeria",copy("alquimista"))).state;
  assert.ok(!assignSpecialist(second,"arcana",copy("alquimista")).ok);
  assert.ok(!assignSpecialist(second,"enfermeria",copy("medica",1)).ok);
  const replaced=ok(assignSpecialist(ok(assignSpecialist(second,"enfermeria",med,true)).state,"enfermeria",copy("medica",1))).state;
  const saved = reload(replaced);
  assert.deepEqual(saved.specialists.enfermeria,[copy("alquimista"),copy("medica",1)]);
  assert.equal(treatmentStaff(saved,"enfermeria",recoveryInventory(saved)).length,2);
});

test("El tratamiento de pago cotiza compatibilidad, descuento y saldo, y solo confirma una vez",()=>{
  const id=copy("lobo");
  const injured=gameWith({[id]:{fatigue:78,wound:2,family:"bio"}});
  const setup={area:"enfermeria",type:"restore"};
  assert.ok(!quoteRecovery(injured,[id],{...setup,area:"arcana"}).ok);
  const plain=ok(quoteRecovery(injured,[id],setup));
  const helped=ok(assignSpecialist(injured,"enfermeria",copy("medica"))).state;
  const quote=ok(quoteRecovery(helped,[id],setup));
  assert.ok(quote.price<plain.price && quote.saving>0);
  assert.ok(!applyRecovery({...helped,coins:0},[id],setup).ok);
  const expected={revision:quote.revision,price:quote.price,count:quote.rows.length,balance:helped.coins};
  const outcome=ok(applyRecovery(helped,[id],setup,expected));
  assert.equal(outcome.state.coins,helped.coins-quote.price);
  assert.equal(healthFor(outcome.state,id).wound,0);
  assert.ok(healthFor(outcome.state,id).reserve>0);
  assert.ok(!applyRecovery(reload(outcome.state),[id],setup,expected).ok);
  const free=ok(applyRecovery(outcome.state,[id])).state;
  assert.equal(healthFor(free,id).fatigue,0);
  assert.ok(healthFor(free,id).reserve>0);
  const match=ok(begin(free));
  const closed=ok(advanceArena(match.state,match.active.id,1,[],true));
  assert.equal(healthFor(closed.state,id).reserve,undefined);
});

test("La Forja consume la instancia herida exacta, preserva otras copias y rechaza a quien está en Arena",()=>{
  const hurt=copy("lobo",1), remains=copy("lobo",2);
  const game=gameWith({[hurt]:{fatigue:63,wound:2,family:"bio"},[remains]:{fatigue:11,wound:0,family:null}});
  const originals=previewFusion(game,"lobo","alquimista");
  assert.deepEqual(previewFusion(game,"lobo","alquimista",[hurt,copy("alquimista")]),originals);
  const active=ok(begin(game)).state;
  assert.ok(!fuseCards(active,"lobo","alquimista",()=>0,[copy("lobo"),copy("alquimista",1)]).ok);
  const achieved=ok(fuseCards(active,"lobo","alquimista",()=>0,[hurt,copy("alquimista",1)]));
  assert.deepEqual(creatureCopies(achieved.state,"lobo").map(row=>row.id),[copy("lobo"),remains]);
  assert.equal(achieved.state.health[hurt],undefined);
  assert.equal(healthFor(reload(achieved.state),remains).fatigue,11);
  assert.deepEqual(healthFor(achieved.state,creatureCopies(achieved.state,achieved.card.id)[0].id),HEALTHY);
});

test("Las páginas principales montan las mismas ocho rutas con la misma cabecera",()=>{
  assert.deepEqual(GAME_SECTIONS.map(([id])=>id),["forja","alquimia","coleccion","sobres","expediciones","entrenamiento","arena","santuario"]);
  for (const file of ["index","training","arena","sanctuary"]) {
    const html=readFileSync(new URL(`../docs/${file}.html`,import.meta.url),"utf8");
    assert.match(html,/<header id="game-nav"><\/header>/);
    assert.match(html,/href="\.\/game-nav\.css"/);
  }
});
