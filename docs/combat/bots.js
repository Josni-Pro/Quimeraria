import { alive, fraction, front } from "./config.js";
import { canUse, issueOrder, resolveRound } from "./engine.js";
import { SKILLS } from "./skills.js";
import { availableTargets } from "./targeting.js";

export const DIFFICULTIES = Object.freeze({
  beginner: "Principiante", normal: "Normal", hard: "Difícil"
});

export function planBot(state, difficulty = "normal", side = "enemy") {
  if (state.phase !== "orders" || difficulty === "beginner") return state;
  const allies = state.units.filter(unit => unit.side === side && alive(unit));
  const enemies = state.units.filter(unit => unit.side !== side && alive(unit));
  const tactics = [];
  const vulnerable = [...allies].sort((a, b) => fraction(a) - fraction(b))[0];
  const targets = [...enemies].sort((a, b) => (fraction(a) - fraction(b)) +
    (difficulty === "hard" ? (Number(b.role === "healer") - Number(a.role === "healer")) * .32 : 0));
  const focus = targets.find(target => allies.some(unit =>
    [unit.basic, unit.main, unit.special].some(key => canUse(state, unit, key) &&
      ["offense", "control"].includes(SKILLS[key].intent) && availableTargets(state, unit, SKILLS[key]).includes(target))
  ));
  const protector = allies.find(unit => unit !== vulnerable && [unit.main, unit.special].some(key =>
    SKILLS[key].intent === "guard" && canUse(state, unit, key) && availableTargets(state, unit, SKILLS[key]).includes(vulnerable)));
  if (protector && fraction(vulnerable) < .58) tactics.push({ type: "protect", actor: protector.id, target: vulnerable.id });
  if (difficulty === "hard") {
    const caster = allies.find(unit => !tactics.some(order => order.actor === unit.id) && canUse(state, unit, unit.special) &&
      ["offense", "control"].includes(SKILLS[unit.special].intent) && availableTargets(state, unit, SKILLS[unit.special]).includes(focus));
    if (caster) tactics.push({ type: "special", actor: caster.id, target: focus.id });
  }
  if (focus) tactics.push({ type: "focus", target: focus.id });
  if (vulnerable && front(vulnerable) && fraction(vulnerable) < .36) tactics.push({ type: "defend", actor: vulnerable.id });
  let planned = state;
  for (const tactic of tactics) {
    const next = issueOrder(planned, side, tactic);
    if (next.ok) planned = next.state;
    if (!planned.commands[side].remaining || difficulty === "normal" && planned !== state) break;
  }
  return planned;
}

export function advanceCombat(state, difficulty) {
  return resolveRound(planBot(state, difficulty), difficulty);
}

export function simulateCombat(start, { player = "normal", enemy = "normal" } = {}) {
  let state = start;
  while (state.phase === "orders") {
    state = resolveRound(planBot(planBot(state, player, "player"), enemy), enemy, player);
  }
  return state;
}
