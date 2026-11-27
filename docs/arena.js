import { createGame, getCard, inspectFusionVariants } from "./engine.js";
import { availableCopies, trainingRoster } from "./combat/roster.js";
import { prepareCombatant } from "./combat/skills.js";
import { budgetUsed, issueOrder, startCombat, validateFormation } from "./combat/engine.js";
import { advanceCombat, finishCombat } from "./combat/bots.js";
import { grantSealedPacks } from "./pack-transactions.js";
import { ARCHETYPES, ARENA_DIFFICULTY, ARENA_HISTORY_LIMIT, ARENA_RANKS, ARENA_RULES, CHAMPIONS, CHALLENGES, ranking } from "./arena-config.js";
import { resolveCondition } from "./health.js";
import { arenaProgress } from "./arena-records.js";

const fail = error => ({ ok:false,error });
const families = Object.keys(ARCHETYPES);
let archive;
const lineages = new Map();

function specimen(path) {
  if (!path.includes("+")) return getCard(path);
  if (lineages.has(path)) return lineages.get(path);
  archive ??= createGame();
  const [first,...rest] = path.split("+");
  let parent = getCard(first);
  for (const id of rest) {
    const { variants } = inspectFusionVariants(archive,parent.id,id);
    if (!variants?.length) return null;
    parent = variants.length > 1 && rest.length === 1 ? variants[1] : variants[0];
    archive.fusions[parent.id] = parent;
  }
  lineages.set(path,parent);
  return parent;
}

export function arenaPortraitState() {
  return archive ??= createGame();
}
export function arenaCard(id) {
  return getCard(id,arenaPortraitState());
}

const rearRole = new Set(["healer","mage","support","marksman","artillery","summoner"]);
export function arenaEnemy(offer) {
  const family = ARCHETYPES[offer.family];
  const result = Array(6).fill(null);
  const proper = offer.difficulty !== "beginner";
  const specialized = offer.kind === "champion" ? CHAMPIONS[offer.key]?.advanced ?? [] : family.fusion;
  const mix = offer.generation === 0 || offer.budget < 5 || !proper ? family.base : [...specialized,...family.base];
  let spent = 0, used = 0;
  for (const key of mix) {
    if (used >= offer.size) break;
    const card = specimen(key);
    if (!card || card.generation > offer.generation) continue;
    const profile = prepareCombatant(card,ARENA_RULES);
    if (spent+profile.cost > offer.budget) continue;
    const allowed = (proper ? [1,0,2,4,3,5] : [0,2,4,1,3,5]).filter(slot=>!result[slot]);
    const slot = proper ? allowed.find(slot => (slot>=3) === rearRole.has(profile.role)) ?? allowed[0] : allowed[0];
    result[slot] = { copyId:`rival:${used}`,profile };
    spent += profile.cost;
    used++;
  }
  return result;
}

function offerFor(kind,key,config,arena,index = 0) {
  return { id:`${arena.serial}:${kind}:${key}`,kind,key,family:config.family,
    name:config.title ?? ARCHETYPES[config.family].name, description:config.description ?? ARCHETYPES[config.family].style,
    budget:config.budget,generation:config.generation ?? 4,size:config.size ?? 6,difficulty:config.difficulty ?? "hard",
    terrain:kind==="champion" ? "campeones" : kind==="challenge" || config.budget>=9 ? "arcana" : "bronce",
    seed:(Math.imul(arena.serial+1,15485863) ^ Math.imul(index+91,32452843))>>>0 };
}

export function arenaOffers(game) {
  const arena = arenaProgress(game);
  const level = ranking(arena.points);
  const base = (arena.serial*3)%families.length;
  const board = ["beginner","normal","hard"].map((difficulty,i) => {
    const family = families[(base+i*3)%families.length];
    return offerFor("ranked",difficulty,{ family,difficulty,budget:Math.min(12,[3,5,7][i]+level) },arena,i);
  });
  const champions = Object.entries(CHAMPIONS).map(([id,champion],i) => ({
    ...offerFor("champion",id,champion,arena,i+3), locked:arena.peak < champion.threshold,
    threshold:champion.threshold, completed:arena.champions.includes(id), pack:champion.pack, bonus:champion.coins
  }));
  const challenges = Object.entries(CHALLENGES).map(([id,challenge],i) => ({
    ...offerFor("challenge",id,{ ...challenge,difficulty:"normal" },arena,i+6),
    completed:arena.challenges.includes(id),pack:challenge.pack
  }));
  return { board,champions,challenges };
}

export function rewardQuote(offer, playerBudget, opponentBudget) {
  const { gain,loss,coins } = ARENA_DIFFICULTY[offer.difficulty];
  const advantage = Math.max(0, playerBudget-opponentBudget);
  const handicap = Math.max(0, opponentBudget-playerBudget);
  return { gain:Math.max(6,gain-advantage*4)+Math.min(12,handicap*3), loss,
    coins:Math.max(3,coins-advantage*2)+Math.min(8,handicap*2) };
}

export function validateArenaTeam(slots, offer, available) {
  const ruled = validateFormation(slots,{ ...ARENA_RULES,budget: offer.kind==="challenge" ? offer.budget : ARENA_RULES.budget },available);
  if (!ruled.ok) return ruled;
  const unavailable = slots.find(entry=>entry?.condition && !entry.condition.available);
  if (unavailable) return fail(unavailable.profile.name+" · "+unavailable.condition.blocked+". Visita el Santuario.");
  if(slots.filter(Boolean).length > offer.size) return fail(`Este encuentro admite hasta ${offer.size} criaturas.`);
  if(slots.some(unit => unit?.profile.generation > offer.generation)) return fail(`Generación máxima G${offer.generation}.`);
  return ruled;
}

function matchRules(offer) {
  return { ...ARENA_RULES, terrain:offer.terrain, budget:offer.kind==="challenge" ? offer.budget : ARENA_RULES.budget };
}

export function beginArena(game, offerId, copyIds) {
  const arena = arenaProgress(game);
  if (arena.active) return fail("Ya tienes un encuentro en curso.");
  const offers = arenaOffers(game);
  const offer = [...offers.board,...offers.champions,...offers.challenges].find(item=>item.id===offerId);
  if (!offer || offer.locked) return fail("Este adversario ya cambió o todavía está cerrado.");
  if (!Array.isArray(copyIds) || copyIds.length !== 6) return fail("Revisa las seis plazas de la escuadra.");
  const roster = trainingRoster(game,ARENA_RULES);
  const byId = new Map(roster.flatMap(entry => entry.copies.map(copy=>[copy.copyId,copy])));
  const player = copyIds.map(id=>id ? byId.get(id) : null);
  if (copyIds.some((id,i)=>id && !player[i])) return fail("Una de tus copias ya no está disponible.");
  const validation = validateArenaTeam(player,offer,availableCopies(roster));
  if (!validation.ok) return validation;
  const enemy = arenaEnemy(offer);
  const start = startCombat(player,enemy,{ seed:offer.seed,rules:matchRules(offer) });
  if(!start.ok) return start;
  const active = { id:offer.id, offer, player, enemy, seed:offer.seed, rules:matchRules(offer), turns:[] };
  return { ok:true,state:{ ...game, arena:{ ...arena,active } }, battle:start.state, active };
}

function withOrders(state, orders) {
  if (!Array.isArray(orders) || orders.length>state.rules.commandPoints) return fail("Órdenes inválidas.");
  let current = state;
  for(const order of orders){
    const next = issueOrder(current,"player",order);
    if (!next.ok) return next;
    current = next.state;
  }
  return { ok:true,state:current };
}

export function recoverArena(active) {
  if(!active) return null;
  const result = startCombat(active.player,active.enemy,{ seed:active.seed,rules:active.rules ?? matchRules(active.offer) });
  if(!result.ok) return null;
  let battle = result.state;
  for(const orders of active.turns){
    if(battle.result) return null;
    const queued = withOrders(battle,orders);
    if(!queued.ok) return null;
    battle = advanceCombat(queued.state,active.offer.difficulty);
  }
  return battle;
}

function battleCondition(game,active,battle,completed) {
  const rounds = battle?.result?.rounds ?? active.turns.length;
  if (!rounds || !battle) return { state:game,changes:[],rested:0 };
  const activity = new Map();
  for (const event of battle.history) {
    const id = event.type === "action" ? event.actor : event.type === "damage" ? event.target : null;
    if (!id?.startsWith("player:")) continue;
    const work = activity.get(id) ?? { actions:0,specials:0,absorbed:0 };
    if (event.type==="action") { work.actions++; work.specials += Number(event.special); }
    else work.absorbed += event.absorbed ?? 0;
    activity.set(id,work);
  }
  const units = new Map(battle.units.map(unit=>[unit.id,unit]));
  const participants = active.player.filter(Boolean).map(entry=>{
    const unit = units.get("player:"+entry.copyId);
    return { copyId:entry.copyId,cardId:entry.profile.cardId,unit,activity:activity.get(unit.id) };
  });
  let seed = (battle.seed ^ active.seed ^ 0x9e3779b9)>>>0;
  const rng = () => (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
  return resolveCondition(game,{ participants,rounds,completed,hardship:active.offer.kind==="champion" ? 2 :
    active.offer.difficulty==="hard" ? 1 : 0,rng,cardFor:id=>getCard(id,game) });
}

function settle(game, arena, active, battle, outcome) {
  const win = outcome==="win";
  const loss = outcome==="loss" || outcome==="withdraw";
  const offer = active.offer;
  const { gain,loss: deduction,coins } = rewardQuote(offer,budgetUsed(active.player),budgetUsed(active.enemy));
  const points = Math.max(0,arena.points+(win ? gain : loss ? -deduction : 0));
  const peak = Math.max(points,arena.peak);
  const ranks = Array.from({ length:Math.max(0,ranking(peak)-ranking(arena.peak)) },(_,i)=>ranking(arena.peak)+i+1);
  const firstChampion = win && offer.kind==="champion" && !arena.champions.includes(offer.key);
  const firstChallenge = win && offer.kind==="challenge" && !arena.challenges.includes(offer.key);
  const seals = firstChampion ? [CHAMPIONS[offer.key].pack] : firstChallenge ? [CHALLENGES[offer.key].pack] : [];
  const payment = (win ? coins : 0)+(firstChampion ? CHAMPIONS[offer.key].coins : 0)+ranks.reduce((n,id)=>n+ARENA_RANKS[id][3],0);
  const recovery = battleCondition(game,active,battle,outcome!=="withdraw");
  let next = { ...recovery.state, coins:game.coins+payment };
  for(const pack of seals) next = grantSealedPacks(next,pack,1).state;
  const receipt = { id:active.id, name:offer.name, family:offer.family, kind:offer.kind, difficulty:offer.difficulty,
    outcome, delta:points-arena.points, points, coins:payment, packs:seals,ranks,
    champion:firstChampion, challenge:firstChallenge, rounds:battle?.result?.rounds ?? (active.turns.length || 0),
    team:active.player.map(entry=>entry?.profile.name ?? null),health:recovery.changes,rested:recovery.rested };
  const streak = win ? arena.streak+1 : 0;
  next.arena = { ...arena,active:null,points,peak,serial:arena.serial+1,
    wins:arena.wins+Number(win),losses:arena.losses+Number(loss),draws:arena.draws+Number(outcome==="draw"),
    streak,bestStreak:Math.max(streak,arena.bestStreak),
    champions:firstChampion ? [...arena.champions,offer.key] : arena.champions,
    challenges:firstChallenge ? [...arena.challenges,offer.key] : arena.challenges,
    promotions:[...arena.promotions,...ranks],history:[receipt,...arena.history].slice(0,ARENA_HISTORY_LIMIT),
    rewards:{ coins:arena.rewards.coins+payment,packs:arena.rewards.packs+seals.length } };
  return { ok:true,state:next,battle,receipt };
}

export function advanceArena(game, matchId, expectedRound, orders, instant = false) {
  const arena = arenaProgress(game);
  const active = arena.active;
  if (!active || active.id!==matchId) return fail("Este encuentro ya se cerró.");
  const battle = recoverArena(active);
  if (!battle || battle.result || battle.round!==expectedRound) return fail("La ronda ya se resolvió. Reanuda el encuentro.");
  const queued = withOrders(battle,orders);
  if (!queued.ok) return queued;
  const resolved = instant ? finishCombat(queued.state,active.offer.difficulty) : advanceCombat(queued.state,active.offer.difficulty);
  if (resolved.result) return settle(game,arena,active,resolved,
    resolved.result.winner==="player" ? "win" : resolved.result.winner==="enemy" ? "loss" : "draw");
  return { ok:true,state:{ ...game,arena:{ ...arena,active:{ ...active,turns:[...active.turns,orders] } } },battle:resolved };
}

export function withdrawArena(game,id) {
  const arena = arenaProgress(game);
  if (!arena.active || arena.active.id!==id) return fail("Este encuentro ya se cerró.");
  return settle(game,arena,arena.active,recoverArena(arena.active),"withdraw");
}
