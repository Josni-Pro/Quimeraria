import { ARCHETYPES, ARENA_HISTORY_LIMIT, ARENA_RANKS, CHALLENGES, CHAMPIONS, ranking } from "./arena-config.js";
import { packDefinition } from "./pack-config.js";

const natural = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function arenaProgress(game) {
  return game.arena ?? {
    points:0, peak:0, serial:0, wins:0, losses:0, draws:0, streak:0, bestStreak:0,
    champions:[], challenges:[], promotions:[], history:[], active:null,
    rewards:{ coins:0, packs:0 }
  };
}

export function restoreArena(saved) {
  if (!saved || typeof saved !== "object") return {};
  const points = natural(saved.points);
  const peak = Math.max(points,natural(saved.peak));
  const known = (items, definitions) => Array.isArray(items) ? [...new Set(items.filter(id => Object.hasOwn(definitions,id)))] : [];
  const active = saved.active;
  const validTeam = slots => Array.isArray(slots) && slots.length === 6 &&
    slots.every(unit => unit === null || typeof unit?.copyId === "string" && typeof unit.profile?.cardId === "string" &&
      Number.isFinite(unit.profile.maxHp) && Number.isFinite(unit.profile.cost));
  // El encuentro activo acota la retransmisión a treinta rondas y conserva perfiles cerrados.
  const activeMatch = typeof active?.id === "string" && validTeam(active.player) && validTeam(active.enemy) &&
    Array.isArray(active.turns) && active.turns.length <= 30 &&
    active.turns.every(turn => Array.isArray(turn) && turn.length <= 2) &&
    Object.hasOwn(ARCHETYPES,active.offer?.family) && ["beginner","normal","hard"].includes(active.offer.difficulty)
      ? active : null;
  const history = Array.isArray(saved.history) ? saved.history.filter(entry => typeof entry?.name === "string" &&
    ["win","loss","draw","withdraw"].includes(entry.outcome)).slice(0,ARENA_HISTORY_LIMIT)
    .map(entry => ({ ...entry, packs:Array.isArray(entry.packs) ? entry.packs.filter(packDefinition) : [] })) : [];
  return { arena:{ points,peak,serial:natural(saved.serial),wins:natural(saved.wins),
    losses:natural(saved.losses),draws:natural(saved.draws),streak:natural(saved.streak),
    bestStreak:Math.max(natural(saved.streak),natural(saved.bestStreak)),
    champions:known(saved.champions,CHAMPIONS),challenges:known(saved.challenges,CHALLENGES),
    promotions:Array.from({ length:Math.min(ranking(peak),ARENA_RANKS.length-1) },(_,i)=>i+1),
    history,
    active:activeMatch,rewards:{ coins:natural(saved.rewards?.coins),packs:natural(saved.rewards?.packs) } } };
}
