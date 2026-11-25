import { alive, column, fraction, front } from "./config.js";
import { hasHarmful } from "./effects.js";

export function availableTargets(state, actor, skill) {
  if (!alive(actor)) return [];
  const allies = state.units.filter(unit => alive(unit) && unit.side === actor.side);
  if (skill.target === "self") return [actor];
  if (skill.target === "ally") return allies;
  if (skill.target === "allyOther") return allies.filter(unit => unit.id !== actor.id);
  const enemies = state.units.filter(unit => alive(unit) && unit.side !== actor.side);
  if (skill.target !== "melee" || actor.mobility === "aerial") return enemies;
  const screen = new Set(enemies.filter(front).map(column));
  const accessible = enemies.filter(unit => front(unit) || !screen.has(column(unit)));
  const nearest = Math.min(...accessible.map(unit => Math.abs(column(unit) - column(actor))));
  return accessible.filter(unit => Math.abs(column(unit) - column(actor)) === nearest);
}

export function targetsFor(state, actor, skill, preferred, difficulty = "normal") {
  const available = availableTargets(state, actor, skill);
  if (!available.length) return [];
  if (preferred && available.some(unit => unit.id === preferred)) {
    available.sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred));
  } else if (["heal", "cleanse"].includes(skill.intent)) {
    const purifies = skill.effects.some(effect => effect.type === "cleanse");
    available.sort((a, b) => (purifies ? Number(hasHarmful(b)) - Number(hasHarmful(a)) : 0) ||
      fraction(a) - fraction(b) || b.hp - a.hp);
  } else if (skill.intent === "guard") {
    available.sort((a, b) => Number(b.role === "healer") - Number(a.role === "healer") ||
      fraction(a) - fraction(b) || Number(front(b)) - Number(front(a)));
  } else if (skill.intent === "buff") {
    const magic = skill.effects.some(effect => effect.id === "insight");
    available.sort((a, b) => b.stats[magic ? "magic" : "strength"] - a.stats[magic ? "magic" : "strength"]);
  } else if (difficulty !== "beginner") {
    const score = unit => (unit.effects.expose ? 35 : 0) + (1 - fraction(unit)) * 70 +
      (difficulty === "hard" && ["healer", "support"].includes(unit.role) ? 18 : 0) - unit.shield * .28;
    available.sort((a, b) => score(b) - score(a) || a.slot - b.slot);
  } else {
    available.sort((a, b) => a.slot - b.slot);
  }
  if (skill.target !== "area") return available.slice(0, 1);
  const [primary, ...rest] = available;
  return [primary, ...rest.sort((a, b) => Math.abs(column(primary) - column(a)) - Math.abs(column(primary) - column(b)))].slice(0, 3);
}
