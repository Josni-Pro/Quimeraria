import { TRAINING_RULES } from "./combat/config.js";

export const ARENA_RANKS = Object.freeze([
  ["Aprendiz",0,"#c8baa0",0], ["Bronce",200,"#da9865",35], ["Plata",500,"#c5d9e1",55], ["Oro",900,"#fbd47e",80],
  ["Platino",1400,"#97dccb",110], ["Diamante",2000,"#9ecdf9",145], ["Maestro",2800,"#d5a6ef",190],
  ["Leyenda Quimérica",3800,"#f2c0ac",250]
]);
export const ranking = points => ARENA_RANKS.findLastIndex(([,threshold]) => points >= threshold);
export const ARENA_RULES = Object.freeze({ ...TRAINING_RULES, mode:"arena" });
export const ARENA_HISTORY_LIMIT = 18;

export const ARCHETYPES = Object.freeze({
  fortress:{ name:"Fortaleza", symbol:"shield", style:"Guardianes al frente y recuperación desde atrás.",
    base:["mamut","triceratops","obrero","medica","fenix","ajolote"], fusion:["mamut+obrero","fenix+medica"] },
  predators:{ name:"Depredadores", symbol:"fang", style:"Iniciativa alta y ataques a los blancos vulnerables.",
    base:["grifo","velociraptor","zorro","buho","lobo","oso"], fusion:["lobo+velociraptor","buho+zorro"] },
  arcane:{ name:"Concilio Arcano", symbol:"star", style:"Daño elemental, áreas y control desde la retaguardia.",
    base:["mago","dragon","quetzalcoatl","sirena","esfinge","arquitecta"], fusion:["dragon+mago","pulpo+sirena"] },
  primordial:{ name:"Legión Primordial", symbol:"horn", style:"Aguanta en vanguardia y responde con cargas y golpes pesados.",
    base:["mamut","velociraptor","triceratops","megalodon","anquilosaurio","rinoceronte_lanudo"], fusion:["mamut+triceratops","oso+velociraptor"] },
  pantheon:{ name:"Panteón", symbol:"sun", style:"Vanguardia sagrada, silencio y protección estratégica.",
    base:["thor","anubis","atenea","quetzalcoatl","esfinge","fenix"], fusion:["atenea+thor","anubis+esfinge"] },
  guild:{ name:"Gremio de Artesanos", symbol:"hammer", style:"Herramientas, potenciaciones y refuerzos de oficio.",
    base:["herrera","obrero","arquitecta","alquimista","medica","mago"], fusion:["herrera+triceratops","alquimista+mamut"] },
  swarm:{ name:"Enjambre", symbol:"swarm", style:"Muchas acciones de bajo coste y cobertura de ambas filas.",
    base:["lobo","zorro","buho","pulpo","ajolote","velociraptor"], fusion:[] },
  titans:{ name:"Titanes", symbol:"peak", style:"Pocas quimeras avanzadas con potencia concentrada.",
    base:["mamut","dragon","thor","megalodon"], fusion:["mamut+triceratops+oso+anubis+thor","dragon+mago+grifo+sirena+atenea"] },
  saboteurs:{ name:"Saboteadores", symbol:"hook", style:"Ralentizan, silencian y abren brechas al ataque siguiente.",
    base:["pulpo","anubis","esfinge","sirena","velociraptor","mago"], fusion:["pulpo+sirena","abogado+esfinge"] },
  chimeras:{ name:"Quiméricos", symbol:"knot", style:"Reúnen apoyo y daño de distintas familias en dos filas.",
    base:["grifo","medica","alquimista","rinoceronte_lanudo","thor","ajolote"], fusion:["buho+medica","alquimista+lobo","fenix+pulpo"] }
});

export const CHAMPIONS = Object.freeze({
  amber:{ title:"Custodia del Ámbar", family:"primordial", threshold:200, budget:9, pack:"primordial", coins:45,
    advanced:["mamut+triceratops+anquilosaurio","velociraptor+grifo"] },
  eclipse:{ title:"Custodia del Eclipse", family:"arcane", threshold:900, budget:10, pack:"lo-arcano", coins:65,
    advanced:["dragon+mago+grifo+sirena","pulpo+sirena+anubis"] },
  oath:{ title:"Custodia del Juramento", family:"pantheon", threshold:2000, budget:12, pack:"panteon", coins:90,
    advanced:["thor+atenea+quetzalcoatl+fenix+esfinge","anubis+esfinge+oso"] }
});
export const CHALLENGES = Object.freeze({
  roots:{ title:"Raíces del catálogo", description:"Solo cartas base G0.", family:"guild", budget:8, generation:0, size:6, pack:"civilizacion" },
  scarce:{ title:"Seis marcas de bronce", description:"Un máximo de 6 puntos.", family:"swarm", budget:6, generation:4, size:6, pack:"naturaleza" },
  trio:{ title:"El pacto de tres", description:"Solo 3 combatientes y generaciones G0–G3.", family:"saboteurs", budget:8, generation:3, size:3, pack:"profundidades" }
});
export const ARENA_DIFFICULTY = Object.freeze({
  beginner:{ label:"Accesible", gain:23,loss:6,coins:9 },
  normal:{ label:"Equilibrado", gain:38,loss:13,coins:16 },
  hard:{ label:"Desafiante", gain:57,loss:21,coins:24 }
});
