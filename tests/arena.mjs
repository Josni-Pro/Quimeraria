import assert from "node:assert/strict";
import { test } from "node:test";
import { CARDS } from "../docs/catalog.js";
import { createGame, getCard, inspectFusionVariants, loadGame, serializeGame } from "../docs/engine.js";
import { CARD_ORDERS, DEFAULT_CARD_ORDER, recentCards, sortCardEntries } from "../docs/card-order.js";
import { COMBAT_STATS, PROFILE_VERSION, getCreatureProfiles } from "../docs/creature-profiles.js";
import { ARENA_RANKS, ranking } from "../docs/arena-config.js";
import { arenaProgress } from "../docs/arena-records.js";
import { advanceArena, arenaEnemy, arenaOffers, beginArena, recoverArena, rewardQuote, withdrawArena } from "../docs/arena.js";
import { budgetUsed } from "../docs/combat/engine.js";
import { prepareCombatant } from "../docs/combat/skills.js";
import { grantSealedPacks, quotePackOpening, revealPackCards, startPackOpening } from "../docs/pack-transactions.js";
import { getShopPackOdds, rollShopPack } from "../docs/pack-rules.js";
import { seededRng } from "../docs/pack-diagnostics.js";

const reload = s => loadGame(serializeGame(s));
const success = result => { assert.ok(result.ok,result.error); return result; };
const starter = ["lobo","mamut",null,null,"alquimista",null];
const championTeam = ["fenix","triceratops","dragon","velociraptor","anubis","mamut"];
const challengeTeam = ["dragon","atenea","quetzalcoatl","grifo","pulpo","mamut"];
function gameAt(points = 0) {
  return reload({ ...createGame(), arena:{ ...arenaProgress({}),points,peak:points },
    inventory:Object.fromEntries(CARDS.map(card=>[card.id,3])) });
}
const copies = team => team.map(id=>id ? `legacy:${id}:0` : null);

test("Orden predeterminado por rareza, generación y nombre; criterios alternativos estables", () => {
  const base = CARDS.map(card=>({ card:getCard(card.id),count:card.id==="lobo" ? 7 : 1 }));
  const higher = { ...base.find(row=>row.card.id==="mago").card,id:"variante", name:"Zeta",generation:2 };
  const all = [{card:higher,count:2},...base];
  const sorted = sortCardEntries(all,DEFAULT_CARD_ORDER);
  assert.equal(sorted[0].card.rarity,4);
  assert.equal(sorted.find(row=>row.card.rarity===2).card.id,"variante");
  assert.equal(sortCardEntries(all,{by:"count",direction:"desc"})[0].card.id,"lobo");
  const ascending = sortCardEntries(all,{by:"agility",direction:"asc"});
  const agility = ascending.map(row=>getCreatureProfiles(row.card).combat.stats.agility);
  assert.deepEqual(agility,[...agility].sort((a,b)=>a-b));
  const recent = recentCards({ ...createGame(),history:[{ cardId:"mamut" }],baseCopies:{ lobo:[{ id:"base-copy-7" }] },
    fusionCopies:{ variante:[{ id:"copy-9" }] } });
  assert.equal(sortCardEntries(all,{by:"recent",direction:"desc"},recent)[0].card.id,"variante");
  assert.equal(all.length,32);
  assert.ok(Object.keys(COMBAT_STATS).every(attr=>CARD_ORDERS[attr]));
});

test("Los perfiles activos conservan presupuesto exacto y especializan HP e iniciativa", () => {
  const mammoth = prepareCombatant(getCard("mamut"));
  const owl = prepareCombatant(getCard("buho"));
  assert.ok(mammoth.maxHp > owl.maxHp+70);
  assert.ok(owl.stats.agility > mammoth.stats.agility+30);
  assert.equal(getCreatureProfiles(getCard("mamut")).combat.version,PROFILE_VERSION);
  const group = inspectFusionVariants(createGame(),"alquimista","mamut").variants;
  for(const card of group) {
    const p = getCreatureProfiles(card).combat;
    assert.equal(Object.values(p.stats).reduce((sum,n)=>sum+n,0),p.powerBudget);
    assert.deepEqual(getCreatureProfiles(structuredClone(card)),getCreatureProfiles(card));
  }
  assert.ok(new Set(group.map(c=>JSON.stringify(getCreatureProfiles(c).combat.stats))).size >= 6);
  const legacy = group[0];
  const saved = reload({ ...createGame(),version:5,fusions:{ [legacy.id]:{ ...legacy, combat:{ version:1,
    stats:Object.fromEntries(Object.keys(COMBAT_STATS).map(stat=>[stat,41])) } } } });
  assert.equal(saved.fusions[legacy.id].historicalCombat.stats.vitality,41);
  assert.equal(getCreatureProfiles(saved.fusions[legacy.id]).combat.version,PROFILE_VERSION);
  assert.deepEqual(saved.fusions[legacy.id].lineage,legacy.lineage);
});

test("Probabilidades míticas efectivas y plaza premium sin carta undécima", () => {
  for (const [id,min,max] of [["explorador",.01,.02],["naturaleza",.005,.02],["civilizacion",.005,.02],["primordial",.01,.03],
    ["profundidades",.01,.03],["lo-arcano",.06,.10],["panteon",.12,.15],["quimerico",.18,.22]]) {
    const p = getShopPackOdds(id).rarities[4];
    assert.ok(p>=min && p<=max,id);
  }
  const rng = seededRng(105);
  for(let i=0;i<3000;i++){
    const cards = rollShopPack("quimerico",rng);
    assert.equal(cards.length,10);
    assert.ok(cards.some(id=>getCard(id).rarity>=2));
  }
});

test("Aperturas persistentes globales y por tipo con más de cien sellos, incluidos históricos", () => {
  let state = createGame();
  for(let i=0;i<14;i++) state = grantSealedPacks(state,i<6 ? "quimerico" : i<12 ? "esencial" : "panteon",10).state;
  state = { ...state,pity:{ esencial:3 } };
  const unit = state.packStock.filter(seal=>seal.packId==="panteon");
  const quote = success(quotePackOpening(state,unit.map(seal=>seal.id)));
  assert.equal(quote.cards,140);
  const partial = success(startPackOpening(state,unit.map(seal=>seal.id),seededRng(80)));
  const after = success(revealPackCards(partial.state,partial.opening.id)).state;
  assert.equal(after.packStock.length,120);
  const rest = reload({...after,pendingPack:null});
  const selection = rest.packStock.map(seal=>seal.id);
  const opened = success(startPackOpening(rest,selection,seededRng(7),"joint"));
  const resumed = reload(opened.state);
  assert.deepEqual(resumed.pendingPack,opened.opening);
  assert.equal(resumed.coins,state.coins);
  const earned = success(revealPackCards(resumed,opened.opening.id)).state;
  assert.equal(earned.stats.packs,140);
  assert.equal(earned.coins,state.coins);
  assert.deepEqual(earned.history[0].byType,{ quimerico:60,esencial:60 });
  assert.equal(Object.values(earned.baseCopies).flat().length,920);
  assert.ok(!revealPackCards(reload(earned),opened.opening.id).ok);
});

test("Los sellos de la tienda anterior conservan su tabla de probabilidades tras migrar", () => {
  const raw = grantSealedPacks(createGame(),"quimerico",2).state;
  const v5 = { ...raw,version:5,packStock:raw.packStock.map(({rulesVersion,...seal})=>seal) };
  const saved = reload(v5);
  assert.equal(saved.packStock[0].rulesVersion,1);
  const older = success(startPackOpening(saved,[saved.packStock[0].id],()=>0));
  assert.ok(older.opening.packs[0].cards.every(entry=>getCard(entry.cardId).rarity<2));
  const now = success(startPackOpening(raw,[raw.packStock[0].id],()=>0));
  assert.ok(now.opening.packs[0].cards.some(entry=>getCard(entry.cardId).rarity>=2));
});

test("La oferta permanece al recargar y cubre los diez arquetipos con presupuestos legítimos", () => {
  assert.deepEqual(ARENA_RANKS.map(r=>r[1]),[0,200,500,900,1400,2000,2800,3800]);
  const result = new Set();
  for(let serial=0;serial<10;serial++){
    const game = gameAt(1500);
    game.arena.serial = serial;
    const offers = arenaOffers(game);
    assert.deepEqual(arenaOffers(reload(game)),offers);
    for(const offer of [...offers.board,...offers.champions,...offers.challenges]){
      result.add(offer.family);
      const enemy = arenaEnemy(offer);
      assert.ok(budgetUsed(enemy)>0 && budgetUsed(enemy)<=offer.budget);
      assert.ok(enemy.filter(Boolean).length<=offer.size);
      assert.ok(enemy.filter(Boolean).every(entry=>entry.profile.generation<=offer.generation));
    }
  }
  assert.equal(result.size,10);
  const [easy,,hard] = arenaOffers(gameAt()).board;
  assert.ok(rewardQuote(hard,6,6).gain>rewardQuote(easy,6,6).gain);
  assert.ok(rewardQuote(easy,12,3).gain<rewardQuote(easy,3,3).gain);
});

test("La partida de Arena reconstruye rondas y liquida ascenso una sola vez", () => {
  const game = gameAt(190);
  const offer = arenaOffers(game).board[0];
  const began = success(beginArena(game,offer.id,copies(starter)));
  const first = success(advanceArena(began.state,began.active.id,1,[]));
  assert.equal(first.battle.round,2);
  const resumed = reload(first.state);
  assert.deepEqual(recoverArena(resumed.arena.active),first.battle);
  assert.ok(!advanceArena(resumed,began.active.id,1,[]).ok);
  const won = success(advanceArena(resumed,began.active.id,2,[],true));
  assert.equal(won.receipt.outcome,"win");
  assert.equal(ranking(won.state.arena.points),1);
  assert.deepEqual(won.receipt.ranks,[1]);
  assert.equal(won.state.coins-game.coins,44);
  assert.deepEqual(won.state.discovered,game.discovered);
  assert.deepEqual(won.state.inventory,game.inventory);
  assert.ok(!advanceArena(reload(won.state),began.active.id,2,[],true).ok);
  assert.notDeepEqual(arenaOffers(won.state).board,arenaOffers(game).board);
});

test("Los campeones y desafíos entregan un sobre inicial y abandonar cuenta como derrota", () => {
  for(const [points,kind,i,team,pack] of [[200,"champions",0,championTeam,"primordial"],[0,"challenges",1,challengeTeam,"naturaleza"]]){
    let game = gameAt(points);
    const offer = arenaOffers(game)[kind][i];
    const began = success(beginArena(game,offer.id,copies(team)));
    const win = success(advanceArena(began.state,began.active.id,1,[],true));
    assert.equal(win.receipt.outcome,"win");
    assert.deepEqual(win.receipt.packs,[pack]);
    assert.equal(win.state.packStock[0].paid,0);
    const once = reload(win.state);
    assert.equal(arenaOffers(once)[kind][i].completed,true);
    assert.ok(!advanceArena(once,began.active.id,1,[],true).ok);
  }
  const base = gameAt();
  const locked = arenaOffers(base).champions[0];
  assert.ok(!beginArena(base,locked.id,copies(starter)).ok);
  const trio = arenaOffers(base).challenges[2];
  assert.ok(!beginArena(base,trio.id,copies(challengeTeam)).ok);
  const entry = success(beginArena(base,arenaOffers(base).board[0].id,copies(starter)));
  const closed = success(withdrawArena(entry.state,entry.active.id));
  assert.equal(closed.state.arena.points,0);
  assert.equal(closed.state.arena.losses,1);
  assert.equal(closed.state.coins,base.coins);
  assert.ok(!withdrawArena(closed.state,entry.active.id).ok);
});
