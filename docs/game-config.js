const SUCCESS_PERCENT_BY_GENERATION = Object.freeze({ 1: 95, 2: 95, 3: 95, 4: 95 });

export const ALCHEMY = Object.freeze({
  successPercentByGeneration: SUCCESS_PERCENT_BY_GENERATION,
  get successPercent() { return this.successPercentByGeneration[1]; },
  get successRate() { return this.successPercent / 100; },
  get aberrationRate() { return (100 - this.successPercent) / 100; },
  aberrationsPerEssence: 5,
  maxGeneration: 4,
  historyLimit: 120,
});

export function fusionRates(generation) {
  const successPercent = ALCHEMY.successPercentByGeneration[generation];
  return { successRate: successPercent / 100, aberrationRate: (100 - successPercent) / 100 };
}

export const ANIMATION_MODES = Object.freeze(["full", "reduced", "off"]);

export const ABERRATION_DEFECTS = {
  miembro_ocular: {
    name: "Órbita andante",
    description: "Una extremidad ocupa la órbita y se dobla al intentar mirar. Nunca llega al suelo para sostener el cuerpo.",
  },
  alas_invertidas: {
    name: "Aleteo inverso",
    description: "Las alas nacen bajo el cuerpo, con las plumas hacia dentro. Cada aleteo empuja a la criatura contra el suelo.",
    traits: ["vuelo"],
  },
  cabezas_opuestas: {
    name: "Cuello de contramarcha",
    description: "Dos cabezas dirigen la misma columna hacia rumbos opuestos. Cada intento de avanzar bloquea el siguiente movimiento.",
  },
  extremidades_unilaterales: {
    name: "Paso ladeado",
    description: "Todas las extremidades nacen del mismo costado. Su peso cae donde no tiene ningún apoyo.",
  },
  enjambre_trabado: {
    name: "Enjambre anudado",
    description: "Sus extremidades se enlazan a través de un único punto de apoyo. Cuando tira de una, las demás quedan inmovilizadas.",
    traits: ["anfibio", "agilidad", "manada", "oceano", "arremetida"],
  },
  objeto_incrustado: {
    name: "Eje atravesado",
    description: "Un objeto rígido atraviesa el eje que une todas sus articulaciones. La pieza las mantiene fijas en direcciones incompatibles.",
    traits: ["forja", "autoridad", "erudicion", "magia", "tormenta", "canto", "alquimia"],
  },
  energia_plegada: {
    name: "Pulso plegado",
    description: "Sus dos núcleos de energía se pliegan uno dentro del otro y descargan en oposición. Ninguno consigue sostener la estructura.",
    traits: ["alquimia", "fuego", "magia", "oceano", "presagio", "tormenta", "regeneracion"],
  },
};
