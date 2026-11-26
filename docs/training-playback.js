import { SKILLS } from "./combat/skills.js";

export const AUTOMATIC_GAP = 115;
const tier = { basic: 237, main: 325, special: 505, secondary: 157 };
const transitions = new Set(["damage", "heal", "shield", "status", "cleanse", "down", "intercept", "move"]);

export function playbackPlan(events, quality) {
  const groups = [];
  let action = null;
  let secondary = null;
  for (const event of events) {
    if (event.type === "action") {
      action = { action: event, changes: [] };
      groups.push(action);
      secondary = null;
    } else if (action && transitions.has(event.type) && !event.periodic) {
      action.changes.push(event);
    } else {
      action = null;
      if (!event.unit && event.type !== "intercept") continue;
      // Cada intercambio se aplica antes de preparar el próximo movimiento o ataque.
      if (event.type === "move") {
        const previous = groups.at(-1);
        if (previous?.changes.at(-1)?.swapWith === event.actor) previous.changes.push(event);
        else groups.push({ action: null, changes: [event], move: true });
        secondary = null;
      } else {
        if (!secondary) {
          secondary = { action: null, changes: [] };
          groups.push(secondary);
        }
        secondary.changes.push(event);
      }
    }
  }

  let start = 0;
  return groups.map(group => {
    const skill = group.action && SKILLS[group.action.skill];
    const kind = skill ? group.action.special ? "special" : skill.cooldown ? "main" : "basic" : "secondary";
    const visual = group.move || group.changes.some(event => transitions.has(event.type) || event.type === "skip");
    const duration = !skill && !visual ? 0 : tier[kind] * ({ full: 1, reduced: .92, minimal: .66 }[quality] ?? 1);
    const impact = start + duration * (skill ? .48 : .26);
    const clip = { ...group, skill, kind, start, impact, end: start + duration };
    // La siguiente preparación puede empezar en la cola de la anterior. Los impactos mantienen su orden.
    start += duration - (skill ? Math.min(61, duration * .22) : 0);
    return clip;
  });
}

export function applyPlaybackClip(clip, apply) {
  apply(clip.action ? [clip.action, ...clip.changes] : clip.changes);
}
