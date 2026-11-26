import { conceptScale } from "./creature-scale.js";

const anatomy = {
  avian:[-1,0,-1,2.8,0,0], quadruped:[1.1,1.25,.3,0,-.7,0], reptilian:[.4,1.05,.9,.65,0,0],
  aquatic:[.55,0,-.4,.7,.45,.45], amphibian:[.1,-.85,-.5,1.5,0,1], cephalopod:[-.65,.55,-.8,1.5,.7,.4],
  serpentine:[.4,.15,-.25,1.25,.8,.35], construct:[.65,.3,1.65,-.45,.1,.7],
  centaur:[.6,1,.65,.6,0,0], hybrid:[.15,.35,.3,.35,.1,.2]
};
const traits = {
  armored:[1.4,0,3.3,-1.15,0,0], burly:[.65,1.75,.35,-.2,0,0], carrier:[.8,.6,.65,-.3,0,0],
  tracker:[0,.45,0,1.75,0,.1], stealth:[-.45,.55,-.55,2.25,0,0], pack:[.15,.65,0,.55,0,0],
  winged:[-.4,0,-.25,2.15,0,0], regeneration:[2.7,-.5,-.3,0,.4,1.2],
  medicine:[.4,-.4,.2,0,1.7,.9], alchemy:[0,-.3,.25,.35,2.5,.5], magic:[0,-.3,-.2,0,2.25,1],
  ritual:[0,0,0,-.05,1.1,1.55], storm:[0,1.65,0,1.4,.3,0], fire:[0,.55,0,0,1.1,.2],
  construction:[.65,1.15,1.65,-.5,0,0], smithing:[.65,2.35,1.65,-.35,0,0], navigation:[0,0,0,1.85,0,.4],
  sound:[0,-.15,0,1.15,1.2,.5], manipulator:[0,.65,0,1.25,.3,0], guardian:[.5,0,1.15,-.35,0,1]
};
const natures = {
  artificial:[.45,0,.65,0,.25,.35], elemental:[0,-.25,-.4,.6,2,1.15], divine:[.35,.55,.1,.4,.15,1.45],
  spiritual:[-.4,0,-.45,.6,.65,2.35], symbiotic:[.9,0,0,.2,.55,.75]
};
const structures = {
  laboratory:[.5,-.25,.3,-.25,3.2,1.45], artillery:[.55,2.5,1,-1.2,1.8,0],
  settlement:[2.5,-.4,2,-2.1,.3,1], workshop:[.7,1.2,1.1,-.45,.55,0], platform:[1.2,.8,1.3,-.65,.2,.55]
};
const signatures = {
  thor:[.7,2.25,.1,.5,-1.55,0], atenea:[0,.5,1.65,.4,-.45,1],
  quetzalcoatl:[0,-.25,-.45,.9,1.9,1], sirena:[.1,-.85,-.45,.3,2.15,1.2],
  dragon:[.2,1.2,.15,2.1,.65,0], lobo:[.6,1.05,.15,.3,-.35,0],
  zorro:[-.55,.2,-.5,1.65,.1,0], buho:[-.75,-.1,-.35,1.65,.35,.25]
};
const anatomySignal = [
  [/coraza|placas|caparazón|escudo|exoesqueleto/, [1.1,0,1.8,-.45,0,0]],
  [/cuerno|colmillo|garras|mandíbulas|martillo/, [.35,1.65,0,.25,0,0]],
  [/reactiv|retorta|runa|grimorio|hechiz|elemental/, [0,-.1,0,0,1.7,.65]],
  [/articulad|tend[oó]n|liger|estabiliz|ala|pluma/, [0,0,0,1.1,0,.2]],
  [/grava|obsidiana|acero|sillar|bronce|piedra/, [.6,.3,1.35,-.4,0,.15]],
  [/diagn[oó]st|cicatriz|recuper|regener|curaci|primeros auxilios/, [1.25,0,0,0,.65,1]],
  [/contrapeso|carga|blindaje|armaz[oó]n|apuntal|sost[eé]n/, [.9,.65,1,-.65,0,0]],
  [/eco|corrientes|afinaci[oó]n|canto|percepci|navega/, [0,0,-.2,1.1,.65,.15]]
];
const interpretation = {
  evolution:[.5,1.15,.25,.55,0,0], ancestral:[1.2,1.25,.7,.1,-.45,.25],
  mythological:[.2,.55,0,.25,1,1], elemental:[0,-.3,-.35,1.2,1.6,1],
  beastkin:[.15,.5,.15,1.1,.1,.15], anthropomorphic:[0,.3,.5,.45,.6,.25]
};

export function profileAdjustments(card, concept) {
  const total = [0,0,0,0,0,0];
  const add = (values, weight = 1) => values?.forEach((value,i) => { total[i] += value*weight; });
  add(anatomy[concept.anatomy]);
  add(natures[concept.nature]);
  add(structures[concept.structure]);
  add(signatures[card.id]);
  add(interpretation[card.family]);
  for(const tag of concept.tags) add(traits[tag],.64);
  const functional = [...concept.features,...concept.tools,...concept.materials,...concept.knowledge].join(" ").toLowerCase();
  for(const [pattern,values] of anatomySignal) if(pattern.test(functional)) add(values);
  const scale = conceptScale(card,concept);
  const mass = Number(scale?.massKg);
  if (mass > 0) total[0] += Math.max(-1.1,Math.min(2.6,Math.log10(mass/35)*.85));
  else if (["huge","colossal"].includes(scale?.category)) total[0] += 1.15;

  const values = card.stats;
  if (values) {
    const average = (values.power + values.guard + values.focus) / 3;
    if (average > 0) add([0,(values.power-average)*.65,(values.guard-average)*.56,
      (values.power-values.guard)*.22,(values.focus-average)*.65,(values.focus-average)*.37]);
  }
  return total.map(value => Math.max(-2.25,Math.min(5.7,value)));
}
