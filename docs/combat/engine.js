import { alive, fraction, ORDERS, random, TRAINING_RULES } from "./config.js";
import { applyEffect, applyStatus, emit, hasHarmful, initializePassive, moveUnit, snapshot, stat, upkeep } from "./effects.js";
import { SKILLS } from "./skills.js";
import { availableTargets, targetsFor } from "./targeting.js";

const sides = ["player", "enemy"];
const failure = message => ({ ok: false, error: message });
const commands = rules => Object.fromEntries(sides.map(side => [side, { remaining: rules.commandPoints, orders: [] }]));
const validSlot = (slot, rules) => Number.isInteger(slot) && slot >= 0 && slot < rules.slots;
export const budgetUsed = slots => slots.reduce((total, entry) => total + (entry?.profile.cost ?? 0), 0);

export function validateFormation(slots, rules = TRAINING_RULES, available = null) {
  if (!Array.isArray(slots) || slots.length !== rules.slots || !slots.some(Boolean)) {
    return failure("Coloca entre una y seis criaturas.");
  }
  const used = new Set();
  for (const entry of slots.filter(Boolean)) {
    if (!entry.profile?.maxHp || !entry.copyId || (available && available.get(entry.copyId) !== entry.profile.cardId)) {
      return failure("Una de las copias ya no está disponible.");
    }
    if (used.has(entry.copyId)) return failure("Cada copia solo puede ocupar una posición.");
    used.add(entry.copyId);
  }
  if (budgetUsed(slots) > rules.budget) return failure(`El despliegue supera los ${rules.budget} puntos.`);
  return { ok: true };
}

function deploy(slots, side) {
  return slots.flatMap((entry, slot) => entry ? [{
    ...entry.profile, side, slot, id: side + ":" + entry.copyId, hp: entry.profile.maxHp, shield: 0, shields: [],
    cooldowns: {}, effects: {}, hasActed: false, intercepted: false, stunUntil: 0, passiveUsed: false,
    metrics: { damage: 0, received: 0, healing: 0, protection: 0, support: 0, control: 0, skills: 0 }
  }] : []);
}

export function startCombat(player, enemy, { seed = 1, rules = TRAINING_RULES, available = null } = {}) {
  const first = validateFormation(player, rules, available);
  if (!first.ok) return first;
  const second = validateFormation(enemy, rules);
  if (!second.ok) return second;
  const state = { rules, seed: seed >>> 0, initialSeed: seed >>> 0, round: 1, phase: "orders",
    units: [...deploy(player, "player"), ...deploy(enemy, "enemy")], commands: commands(rules),
    events: [], history: [], result: null };
  for (const unit of state.units) initializePassive(state, unit);
  state.history = [...state.events];
  return { ok: true, state };
}

export function canUse(state, unit, key) {
  return alive(unit) && (key === unit.basic || !unit.effects.silence) &&
    (unit.cooldowns[key] ?? 0) <= state.round;
}

function usable(state, unit, key, target = null) {
  const skill = SKILLS[key];
  const pool = availableTargets(state, unit, skill);
  const matches = target ? pool.filter(candidate => candidate.id === target) : pool;
  if (!matches.length) return false;
  if (skill.intent === "heal") return matches.some(candidate => fraction(candidate) < .94 || hasHarmful(candidate) && skill.effects.some(effect => effect.type === "cleanse"));
  if (skill.intent === "cleanse") return matches.some(candidate => hasHarmful(candidate) || fraction(candidate) < .72);
  return true;
}

export function issueOrder(state, side, order) {
  if (state.phase !== "orders" || !sides.includes(side)) return failure("Espera a la próxima ronda.");
  const rule = ORDERS[order.type];
  const command = state.commands[side];
  if (!rule || command.remaining < rule.cost) return failure("No quedan puntos de mando.");
  const actor = state.units.find(unit => unit.id === order.actor && unit.side === side && alive(unit));
  const target = state.units.find(unit => unit.id === order.target && alive(unit));
  if (order.type === "focus") {
    if (!target || target.side === side) return failure("Selecciona un rival en pie.");
    if (command.orders.some(queued => queued.type === "focus")) return failure("Ya hay un blanco marcado.");
  } else {
    if (!actor) return failure("Selecciona una criatura aliada en pie.");
    if (actor.effects.stun) return failure("La criatura está aturdida.");
    if (command.orders.some(queued => queued.actor === actor.id)) return failure("Esa criatura ya tiene una orden.");
    if (order.type === "protect") {
      if (!target || actor.id === target.id || target.side !== side ||
          ![actor.main, actor.special].some(key => SKILLS[key].intent === "guard" && canUse(state, actor, key) && usable(state, actor, key, target.id))) {
        return failure("La criatura necesita una protección disponible y un aliado compatible.");
      }
    }
    if (order.type === "special" && (!canUse(state, actor, actor.special) || !usable(state, actor, actor.special, order.target))) {
      return failure("La habilidad especial está en recarga o requiere otro objetivo.");
    }
    if (order.type === "move") {
      const occupant = state.units.find(unit => alive(unit) && unit.side === side && unit.slot === order.slot);
      if (command.orders.some(queued => queued.type === "move")) return failure("Solo se permite un cambio por ronda.");
      if (!validSlot(order.slot, state.rules) || order.slot === actor.slot || actor.effects.root || occupant?.effects.root) {
        return failure("La posición elegida o sus apoyos impiden el cambio.");
      }
    }
  }
  const entry = { type: order.type, ...(actor ? { actor: actor.id } : {}),
    ...(target ? { target: target.id } : {}), ...(order.type === "move" ? { slot: order.slot } : {}) };
  return { ok: true, state: { ...state, commands: { ...state.commands,
    [side]: { remaining: command.remaining - rule.cost, orders: [...command.orders, entry] } } } };
}

export function clearOrders(state, side = "player") {
  return { ...state, commands: { ...state.commands, [side]: { remaining: state.rules.commandPoints, orders: [] } } };
}

function chooseAction(state, actor, difficulty) {
  const orders = state.commands[actor.side].orders;
  const focus = orders.find(order => order.type === "focus")?.target;
  const explicit = orders.find(order => order.actor === actor.id);
  const keys = [actor.special, actor.main, actor.basic].filter(key => canUse(state, actor, key));
  const choices = keys.flatMap(key => {
    const skill = SKILLS[key];
    const attack = ["offense", "control"].includes(skill.intent);
    const requested = explicit?.type === "special" && key === actor.special ||
      explicit?.type === "protect" && skill.intent === "guard";
    const preference = requested && explicit.target ? explicit.target : attack ? focus : null;
    const targets = targetsFor(state, actor, skill, preference, difficulty);
    if (!targets.length || !usable(state, actor, key, targets[0].id)) return [];
    const target = targets[0];
    const critical = skill.intent === "heal" && fraction(target) < .38;
    const value = {
      offense: key === actor.basic ? 4 : 17,
      control: 19 + Number(!hasHarmful(target)) * 8,
      heal: 18 + (1 - fraction(target)) * 38,
      cleanse: 19 + Number(hasHarmful(target)) * 23,
      guard: (target.shield > target.maxHp * .16 ? 3 : 21) + Number(target.role === "healer") * 8,
      buff: skill.effects.some(effect => target.effects[effect.id]) ? 5 : 24
    }[skill.intent];
    const honorsOrder = requested && (!explicit.target || target.id === explicit.target);
    const priority = (critical ? 120 : 0) + (honorsOrder ? 200 : 0) + value + (key === actor.special ? 4 : 0)
      + (attack && target.id === focus ? 6 : 0) + (attack && difficulty === "hard" && target.effects.expose ? 8 : 0)
      - (difficulty === "beginner" && key === actor.special && !critical ? 11 : 0);
    return [{ skill, targets, priority }];
  });
  return choices.sort((a, b) => b.priority - a.priority)[0];
}

function resultIfFinished(state, limit = false) {
  const player = state.units.some(unit => unit.side === "player" && alive(unit));
  const enemy = state.units.some(unit => unit.side === "enemy" && alive(unit));
  if (player && enemy && !limit) return false;
  const winner = player === enemy ? null : player ? "player" : "enemy";
  state.result = { winner, reason: limit && player && enemy ? "limit" : "incapacitation", rounds: state.round };
  state.phase = "finished";
  emit(state, "result", state.result);
  return true;
}

export function resolveRound(previous, difficulty = "normal", playerDifficulty = "normal") {
  if (previous.phase !== "orders") return previous;
  const state = {
    ...previous, events: [], units: structuredClone(previous.units)
  };
  emit(state, "round");
  if (!resultIfFinished(state)) {
    for (const side of sides) for (const order of state.commands[side].orders) {
      emit(state, "order", { side, order: order.type, actor: order.actor, target: order.target, slot: order.slot });
      const actor = state.units.find(unit => unit.id === order.actor);
      if (!alive(actor) || actor.effects.stun) continue;
      if (order.type === "defend") applyStatus(state, actor, actor, { id: "guard" });
      if (order.type === "move") {
        const other = state.units.find(unit => alive(unit) && unit.side === side && unit.slot === order.slot);
        if (!actor.effects.root && !other?.effects.root) moveUnit(state, actor, order.slot, other);
      }
    }
    const initiative = state.units.filter(alive).map(unit => ({ unit, tie: random(state) }));
    initiative.sort((a, b) => stat(b.unit, "agility") - stat(a.unit, "agility") || a.tie - b.tie);
    emit(state, "initiative", { order: initiative.map(({ unit }) => unit.id) });
    for (const { unit } of initiative) {
      if (!alive(unit)) continue;
      if (unit.effects.stun) {
        unit.hasActed = true;
        emit(state, "skip", { actor: unit.id, effect: "stun" }, unit);
        continue;
      }
      const action = chooseAction(state, unit, unit.side === "enemy" ? difficulty : playerDifficulty);
      unit.hasActed = true;
      if (!action) continue;
      const { skill, targets } = action;
      const special = skill.id === unit.special;
      if (skill.cooldown) {
        unit.cooldowns[skill.id] = state.round + skill.cooldown;
        unit.metrics.skills += 1;
      }
      emit(state, "action", { actor: unit.id, skill: skill.id, targets: targets.map(target => target.id), special }, unit);
      for (const target of targets) for (const effect of skill.effects) applyEffect(state, unit, target, effect);
      if (resultIfFinished(state)) break;
    }
  }
  if (!state.result && !resultIfFinished(state, state.round >= state.rules.maxRounds)) {
    state.round += 1;
    state.commands = commands(state.rules);
    upkeep(state);
    resultIfFinished(state);
  }
  state.history = [...previous.history, ...state.events];
  return state;
}

export function squadResults(state, side) {
  return state.units.filter(unit => unit.side === side).map(unit => ({
    ...snapshot(unit), name: unit.name, role: unit.role, metrics: { ...unit.metrics }
  }));
}
