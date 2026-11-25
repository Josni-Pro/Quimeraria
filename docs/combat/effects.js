import { alive, fraction, random } from "./config.js";

export const EFFECTS = Object.freeze({
  intercept: { name: "Intercepción", icon: "⇥" }, armor: { name: "Defensa elevada", icon: "⬟" },
  regen: { name: "Regeneración", icon: "❋", periodic: "heal" },
  poison: { name: "Veneno", icon: "◇", harmful: true, periodic: "damage" },
  burn: { name: "Quemadura", icon: "♨", harmful: true, periodic: "damage" },
  slow: { name: "Ralentización", icon: "↓", harmful: true },
  stun: { name: "Aturdimiento", icon: "✷", harmful: true },
  silence: { name: "Silencio", icon: "⊘", harmful: true },
  root: { name: "Inmovilización", icon: "⌘", harmful: true },
  expose: { name: "Vulnerabilidad", icon: "◒", harmful: true },
  weaken: { name: "Fuerza reducida", icon: "⌄", harmful: true },
  rally: { name: "Fuerza elevada", icon: "↑" }, haste: { name: "Agilidad elevada", icon: "⇈" },
  insight: { name: "Poder mágico elevado", icon: "✦" },
  guard: { name: "Postura defensiva", icon: "▣" }
});

const buff = (unit, key) => unit.effects[key]?.value ?? 0;

export function stat(unit, key) {
  const [boost, penalty] = {
    strength: ["rally", "weaken"], defense: ["armor", null],
    agility: ["haste", "slow"], magic: ["insight", null]
  }[key] ?? [];
  return Math.max(0, unit.stats[key] + buff(unit, boost) - buff(unit, penalty));
}

export function conditionedDamage(actor, target, effect, rules, sample = .5) {
  const physical = effect.kind === "physical";
  const power = stat(actor, physical ? "strength" : "magic");
  const resistance = stat(target, physical ? "defense" : "resistance") * (1 - (effect.pierce ?? 0));
  const exposed = target.effects.expose ? 1 + rules.exposureBonus : 1;
  const defense = target.effects.guard ? 1 - rules.guardedReduction : 1;
  const offense = actor.effects.guard ? rules.guardedOffense : 1;
  const variation = 1 + (sample - .5) * rules.variance;
  return Math.max(1, Math.round((rules.damageBase + power * rules.damagePerPower) * effect.factor *
    rules.mitigation / (rules.mitigation + resistance) * exposed * defense * offense * variation));
}

export function snapshot(unit) {
  return { id: unit.id, hp: unit.hp, shield: unit.shield, slot: unit.slot,
    effects: Object.keys(unit.effects), cooldowns: { ...unit.cooldowns }, maxHp: unit.maxHp };
}

export function emit(state, type, fields = {}, unit = null) {
  state.events.push({ round: state.round, type, ...fields, ...(unit ? { unit: snapshot(unit) } : {}) });
}

function assignShield(state, actor, target, points) {
  const capacity = Math.floor(target.maxHp * state.rules.shieldCap);
  const amount = Math.max(0, Math.min(capacity - target.shield, Math.round(points)));
  if (!amount) return;
  // Cada aporte caduca por separado y respeta la capacidad del receptor.
  target.shields.push({ source: actor.id, amount, until: state.round + 2 });
  target.shield += amount;
  emit(state, "shield", { actor: actor.id, target: target.id, amount }, target);
}

function recover(state, actor, target, points, periodic = false) {
  if (!alive(target)) return;
  const amount = Math.min(target.maxHp - target.hp, Math.max(0, Math.round(points)));
  if (!amount) return;
  target.hp += amount;
  actor.metrics.healing += amount;
  emit(state, "heal", { actor: actor.id, target: target.id, amount, periodic }, target);
}

function hit(state, actor, target, amount, kind, periodic = false) {
  if (!alive(target)) return;
  let remainder = amount;
  for (const barrier of target.shields) {
    const blocked = Math.min(barrier.amount, remainder);
    if (!blocked) break;
    barrier.amount -= blocked;
    remainder -= blocked;
    target.shield -= blocked;
    const owner = state.units.find(unit => unit.id === barrier.source);
    if (owner) owner.metrics.protection += blocked;
  }
  target.shields = target.shields.filter(barrier => barrier.amount > 0);
  const harm = Math.min(target.hp, remainder);
  target.hp -= harm;
  target.metrics.received += harm;
  actor.metrics.damage += harm;
  emit(state, "damage", { actor: actor.id, target: target.id, amount: harm, absorbed: amount - remainder, kind, periodic }, target);
  if (!alive(target)) {
    emit(state, "down", { actor: actor.id, target: target.id }, target);
  }
}

export function applyStatus(state, actor, target, effect) {
  const { id, value = 0, duration = 1 } = effect;
  if (id === "stun" && (target.stunUntil > state.round || target.hasActed || !alive(target))) return;
  const previous = target.effects[id];
  const until = state.round + duration + Number(Boolean(EFFECTS[id].periodic));
  // Un estado se renueva sin multiplicar su intensidad.
  if (previous && previous.value > value && previous.until >= until) return;
  const credited = previous && previous.value > value ? previous : { source: actor.id, value };
  target.effects[id] = { ...credited, until: Math.max(previous?.until ?? 0, until) };
  if (id === "stun") target.stunUntil = state.round + 1 + state.rules.stunImmunity;
  if (previous?.value === value && previous.until >= until) return;
  if (EFFECTS[id].harmful) actor.metrics.control += 1;
  else if (actor !== target) actor.metrics.support += 1;
  emit(state, "status", { actor: actor.id, target: target.id, effect: id, until }, target);
}

export function moveUnit(state, actor, slot, other = null) {
  const previous = actor.slot;
  actor.slot = slot;
  if (other) {
    other.slot = previous;
    emit(state, "move", { actor: other.id, from: slot, to: previous, swapWith: actor.id }, other);
  }
  emit(state, "move", { actor: actor.id, from: previous, to: slot }, actor);
}

export function applyEffect(state, actor, target, effect) {
  if (!alive(target)) return;
  if (effect.type === "damage") {
    const amount = conditionedDamage(actor, target, effect, state.rules, random(state));
    const protector = state.units.find(unit => unit.id === target.effects.intercept?.source);
    if (alive(protector) && protector !== target && !protector.intercepted && !protector.effects.stun && amount > 1) {
      const split = Math.max(1, Math.round(amount * state.rules.interceptShare));
      protector.intercepted = true;
      protector.metrics.protection += split;
      emit(state, "intercept", { actor: protector.id, target: target.id, amount: split });
      hit(state, actor, protector, split, effect.kind);
      hit(state, actor, target, amount - split, effect.kind);
    } else {
      hit(state, actor, target, amount, effect.kind);
    }
  } else if (effect.type === "heal") {
    recover(state, actor, target, (9 + stat(actor, "magic") * .46) * effect.factor);
  } else if (effect.type === "shield") {
    assignShield(state, actor, target, (7 + stat(actor, "defense") * .44) * effect.factor);
  } else if (effect.type === "status") {
    applyStatus(state, actor, target, effect);
  } else if (effect.type === "cleanse") {
    const removed = Object.keys(target.effects).filter(id => EFFECTS[id].harmful);
    for (const id of removed) delete target.effects[id];
    if (removed.length) {
      actor.metrics.support += removed.length;
      emit(state, "cleanse", { actor: actor.id, target: target.id, effects: removed }, target);
    }
  } else if (effect.type === "retreat" && target.slot < 3 && !target.effects.root &&
      !state.units.some(unit => alive(unit) && unit.side === target.side && unit.slot === target.slot + 3)) {
    moveUnit(state, target, target.slot + 3);
  }
}

export function upkeep(state) {
  for (const unit of state.units) {
    unit.hasActed = false;
    unit.intercepted = false;
    const previousShield = unit.shield;
    unit.shields = unit.shields.filter(barrier => barrier.until > state.round);
    unit.shield = unit.shields.reduce((sum, barrier) => sum + barrier.amount, 0);
    const expired = Object.keys(unit.effects).filter(id => unit.effects[id].until <= state.round);
    for (const id of expired) delete unit.effects[id];
    if (expired.length || previousShield !== unit.shield) emit(state, "expire", { target: unit.id, effects: expired }, unit);
  }
  for (const unit of state.units) {
    if (!alive(unit)) continue;
    for (const [id, effect] of Object.entries(unit.effects)) {
      const owner = state.units.find(actor => actor.id === effect.source) ?? unit;
      if (EFFECTS[id].periodic === "damage") hit(state, owner, unit, effect.value, id, true);
      if (EFFECTS[id].periodic === "heal") recover(state, owner, unit, effect.value, true);
    }
    if (alive(unit) && unit.passive.trigger === "renew" && !unit.passiveUsed && fraction(unit) < .55) {
      unit.passiveUsed = true;
      recover(state, unit, unit, 6, true);
    }
  }
}

export function initializePassive(state, unit) {
  switch (unit.passive.trigger) {
    case "shell":
      assignShield(state, unit, unit, unit.maxHp * .12);
      break;
    case "pack":
      if (state.units.some(ally => ally.side === unit.side &&
        (Math.floor(ally.slot / 3) === Math.floor(unit.slot / 3) && Math.abs(ally.slot - unit.slot) === 1 ||
          Math.abs(ally.slot - unit.slot) === 3))) {
        applyStatus(state, unit, unit, { id: "haste", duration: 2, value: 8 });
      }
      break;
    case "strategy":
      applyStatus(state, unit, unit, { id: "insight", duration: 2, value: 8 });
      break;
    case "brace":
      applyStatus(state, unit, unit, { id: "armor", value: 6 });
      break;
  }
}

export const hasHarmful = unit => Object.keys(unit.effects).some(id => EFFECTS[id].harmful);
