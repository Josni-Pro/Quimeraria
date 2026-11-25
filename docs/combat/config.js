import { PROFILE_RULES } from "../creature-profiles.js";

export const TRAINING_RULES = Object.freeze({
  budget: 12, slots: 6, commandPoints: 2, maxRounds: 30,
  deployment: Object.freeze([...PROFILE_RULES.deploymentByGeneration.slice(0, 4), 6]),
  healthBase: 44, healthPerVitality: 2.2, damageBase: 8, damagePerPower: .52,
  mitigation: 65, variance: .10, shieldCap: .36, interceptShare: .48, stunImmunity: 2,
  guardedReduction: .32, guardedOffense: .72, exposureBonus: .22,
  terrain: "patio", mode: "training"
});

export const SLOTS = Object.freeze([
  "Vanguardia izquierda", "Vanguardia central", "Vanguardia derecha",
  "Retaguardia izquierda", "Retaguardia central", "Retaguardia derecha"
]);

export const ORDERS = Object.freeze({
  focus: { name: "Concentrar", description: "Prioriza un blanco alcanzable. La curación crítica conserva prioridad.", icon: "⌖", cost: 1 },
  protect: { name: "Proteger", description: "Prioriza una protección sobre un aliado con una habilidad disponible.", icon: "◈", cost: 1 },
  special: { name: "Especial", description: "Ordena la habilidad especial si sigue disponible al actuar.", icon: "✧", cost: 1 },
  move: { name: "Reposicionar", description: "Intercambia posiciones o avanza a un hueco antes de la iniciativa.", icon: "⇄", cost: 1 },
  defend: { name: "Defender", description: "Reduce el daño recibido durante la ronda a cambio de potencia ofensiva.", icon: "⬟", cost: 1 }
});

export function random(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

export const alive = unit => Boolean(unit && unit.hp > 0);
export const front = unit => unit.slot < 3;
export const column = unit => unit.slot % 3;
export const fraction = unit => unit.hp / unit.maxHp;
