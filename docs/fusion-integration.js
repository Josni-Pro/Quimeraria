import { expressionOf } from "./creature-identity.js";
import { bodyScale } from "./creature-scale.js";

const AQUATIC = new Set(["aquatic", "amphibian", "cephalopod"]);

const CLASSICS = {
  "ajolote+zorro": {
    shape: "river-fox",
    physicalForm: "quadruped",
    scale: bodyScale("small", 0.38, 1.05, 6.5, null, 0, "juncos y piedras vistos a ras de la orilla",
      "El cuerpo conserva la talla de un zorro. La aleta alarga la punta de la cola."),
    description: "Un zorro anfibio se orienta por oído y olfato en la orilla. Bajo el agua recoge las orejas, abre los penachos branquiales adheridos al cuello y usa la misma cola, aplanada, para nadar. El tejido del linaje de Ajolote regenera los bordes de esa aleta.",
    visual: "Un solo cuadrúpedo de talla de zorro con branquias externas en el cuello, apoyos semipalmeados y una cola vulpina que termina en aleta. Piedras y juncos a escala de la orilla."
  },
  "pulpo+sirena": {
    shape: "reef-octopus",
    physicalForm: "cephalopod",
    scale: bodyScale("medium", null, 1.4, 30, null, 0, "algas cortas y una grieta del arrecife",
      "El manto compacto permite explorar grietas pequeñas con los brazos."),
    description: "Un torso marino pequeño continúa directamente en un manto cefalópodo con ocho brazos. La voz de sirena se transmite desde el pecho hacia las ventosas y les permite reconocer el contorno de una cueva en oscuridad.",
    visual: "Un cuerpo continuo con rostro marino y un manto bajo del que nacen ocho brazos. El pecho emite pulsos de orientación. Sin cola de pez en esta forma, que se desplaza por el sustrato."
  }
};

export function classicForm(card, parents) {
  const form = CLASSICS[parents.map(parent => parent.id).sort().join("+")];
  if (!form) return { shape: "classic", description: card.description, visual: null, spec: {} };
  return { ...form, spec: { integration: form.description, scale: form.scale, physicalForm: form.physicalForm } };
}

const REEFS = {
  "pulpo+sirena": {
    description: "Un torso cantor, una cola natatoria y brazos con ventosas nacen del mismo manto. Una red nerviosa coordina las ventosas con los pulsos de la voz y distribuye oxígeno mediante un tejido circulatorio compartido. Los brazos se anclan mientras la cola gobierna el rumbo y cambia el camuflaje del conjunto.",
    visual: "Un torso humanoide, dos brazos palmeados y una cola natatoria continua. Los brazos con ventosas crecen alrededor de la cintura y siguen el patrón de camuflaje del mismo cuerpo. Una cabeza y una sola corriente de nado.",
    contributions: {
      pulpo: { type: "physiology", trait: "control nervioso distribuido del manto", action: "el manto coordina brazos y cambia de color con los pulsos del torso" },
      sirena: { type: "power", trait: "voz resonante y propulsión de la cola", action: "marca el ritmo que gobierna propulsión y anclaje" }
    },
    scale: bodyScale("medium", null, 2.05, 88, null, 0, "algas, coral y una grieta transitable para un buzo",
      "El manto conserva proporciones de sirena a escala de buceo.")
  },
  "ajolote+sirena": {
    description: "Una forma colonial acuática de cuerpo anfibio mantiene en la piel pólipos branquiales con conductos compartidos. El Ajolote renueva ese tejido cuando se lesiona. La aleta y la resonancia de la Sirena llevan agua oxigenada a los pólipos mientras todo el cuerpo se orienta por ecos.",
    visual: "Morfología anfibia baja con un rostro de ajolote, branquias externas en el cuello y crestas branquiales menores sobre los flancos. La cola se ensancha en una aleta continua que impulsa el agua.",
    contributions: {
      ajolote: { type: "physiology", trait: "branquias y renovación de tejidos", action: "mantiene los canales de los pólipos en la misma piel" },
      sirena: { type: "power", trait: "resonancia y aleta propulsora", action: "renueva el agua de los pólipos y orienta el cuerpo" }
    },
    scale: bodyScale("medium", null, 1.5, 29, null, 0, "piedras y plantas bajas de un manantial",
      "La aleta alargada añade longitud y un cuerpo ligero mantiene la forma anfibia.")
  }
};

const SHORE_ORGANS = {
  ajolote: ["láminas branquiales de renovación rápida", "las láminas detectan agua y regeneran la superficie cuando se daña"],
  pulpo: ["manto de ventosas sensoriales", "las ventosas registran presión y contacto con el fondo"],
  sirena: ["cámara resonante que se contrae con el agua", "la cámara devuelve ecos que revelan huecos sumergidos"],
  megalodon: ["poros sensibles al movimiento", "los poros detectan desplazamientos del agua junto a la orilla"]
};

function shoreForm(land, water, aquaticConcept, terrestrialConcept, variant) {
  const [organ, functionInWater] = SHORE_ORGANS[aquaticConcept.speciesId] ??
    ["tejido acuático irrigado", "el tejido recibe la presión del agua a través de sus pliegues"];
  const integration = `Un órgano de linaje ${water.name} reviste la cámara húmeda del cuerpo de ${land.name} con ${organ}. En la orilla, ${functionInWater}. El portador mueve y oxigena el órgano con su propia circulación y recibe señales para escoger un paso seguro.`;
  const legNote = terrestrialConcept.anatomy === "quadruped" ? "Las cuatro patas se apoyan con claridad." : "Los apoyos se ajustan al plan corporal del portador.";
  return variant("shore-carrier", "symbiosis", "uncommon", "shore-carrier", `Vigía de Dos Orillas · ${land.name}`, integration,
    { anatomy: terrestrialConcept.anatomy, bodySource: land.identity?.bodySource ?? land.lineage[0], nature: "symbiotic", role: "logistics", secondaryRole: "controller",
      features: ["cámara húmeda protegida"], tags: ["symbiosis", "amphibious"],
      capabilities: ["empower", "slow"], utility: ["explore", "protect"], integration,
      scale: { ...terrestrialConcept.scale, rationale: "Conserva la talla del portador y modifica el tejido bajo la piel." },
      contributions: {
        [water.id]: { ...expressionOf(aquaticConcept, "symbiosis"), action: functionInWater },
        [land.id]: { ...expressionOf(terrestrialConcept, "symbiosis"), action: "sostiene, irriga y transporta el órgano como parte de su cuerpo" }
      } },
    `Cuerpo de ${land.name} con una cámara orgánica bajo la piel y ${organ} en contacto con el agua. ${legNote} Mostrar circulación y presión a través del tejido, sin otro animal completo dentro.`);
}

export function symbioticForm(a, b, ac, bc, variant) {
  const firstAquatic = AQUATIC.has(ac.anatomy), secondAquatic = AQUATIC.has(bc.anatomy);
  if (firstAquatic !== secondAquatic) return firstAquatic ? shoreForm(b, a, ac, bc, variant) : shoreForm(a, b, bc, ac, variant);
  if (firstAquatic && secondAquatic) {
    const reef = REEFS[[a.id, b.id].sort().join("+")];
    const integration = reef?.description ??
      `La colonia asienta tejidos de ${b.name} sobre el manto de ${a.name}. Los canales del manto llevan nutrientes hacia los módulos sensoriales y estos cierran o abren el flujo al detectar obstáculos. El tejido y los módulos se orientan y nadan como una sola unidad.`;
    return variant("reef-colony", "symbiosis", "uncommon", "symbiotic", `Colonia de ${a.name} y ${b.name}`, integration,
      { anatomy: ac.anatomy === bc.anatomy ? ac.anatomy : "aquatic", nature: "symbiotic", role: "controller",
        tags: ["aquatic", "symbiosis"], features: ["anillos sensoriales"], capabilities: ["slow"], utility: ["survival", "protect"],
        integration, contributions: reef?.contributions ?? {
          [a.id]: { action: "nutre los módulos y regula el flujo del manto" },
          [b.id]: { action: "detecta obstáculos y controla el paso de agua" }
        }, scale: reef?.scale },
      reef?.visual ?? "Una envoltura continua con unidades sensoriales adheridas a canales visibles. Mostrar cómo dirigen el mismo desplazamiento.");
  }
  const integration = `Un cuerpo de apoyo del linaje de ${a.name} mantiene órganos del linaje de ${b.name} bajo sus tejidos. Un circuito de presión alimenta esos órganos y recibe avisos de carga que sincronizan los apoyos cuando ambos linajes se refugian. El pacto es visible en un organismo compartido.`;
  return variant("symbiosis", "symbiosis", "uncommon", "symbiotic", `Pacto de ${a.name} y ${b.name}`, integration,
    { anatomy: ac.anatomy === bc.anatomy ? ac.anatomy : "hybrid", nature: "symbiotic", role: "support", secondaryRole: "controller",
      features: ["órganos de enlace"], tags: ["symbiosis"], capabilities: ["empower", "slow"], utility: ["explore", "protect"], integration,
      contributions: {
        [a.id]: { action: "mantiene el circuito de presión y da sostén a los órganos" },
        [b.id]: { action: "registra la carga y alerta a los apoyos cuando cambia el terreno" }
      } });
}

const ELEMENTAL_FORMS = {
  "pulpo+sirena": {
    description: "Una sola corriente de agua se curva en manto con brazos y acaba en una aleta de sirena. Las ondulaciones de la voz gobiernan el impulso y los vórtices de los brazos se autorregulan como un sistema nervioso distribuido. El remolino central recompone todo el cuerpo.",
    visual: "Flujo acuático continuo. Brazos curvados y aleta en la misma envoltura. El núcleo es un remolino interno que reúne la corriente.",
    contributions: {
      pulpo: { type: "physiology", trait: "control distribuido de los brazos", action: "mantiene vórtices independientes dentro de una sola corriente" },
      sirena: { type: "power", trait: "resonancia marina que dirige la cola", action: "da cadencia común a las ondulaciones de propulsión" }
    }
  },
  "fenix+sirena": {
    description: "La voz de Sirena da ritmo al fuego regenerador de Fénix. Un torso de brasa abre alas y afina la misma llama hacia una cola ondulante que se apaga y vuelve a prender en cada impulso. El núcleo recoge esa energía durante el cambio de forma.",
    visual: "Alas y cola de una figura de brasa interconectadas por el mismo flujo térmico. Sin un ave separada nadando junto a una sirena."
  },
  "dragon+obrero": {
    description: "El Dragón dosifica su fuego dentro de un torso mineral. El saber del Obrero transforma escamas y extremidades en arcos de descarga que apuntalan el terreno al posarse. El núcleo conserva ese calor mientras los apoyos lo conducen al suelo.",
    visual: "Una sola figura de lava con cabeza dracónica definida, placas y patas que forman arcos resistentes. El brillo térmico une garganta, tórax y apoyos."
  }
};

export function elementalForm(a, b, ac, bc, element, classic, variant) {
  const form = ELEMENTAL_FORMS[[a.id, b.id].sort().join("+")];
  const source = ac.affinities[0] === element ? a : b;
  const vessel = source === a ? b : a;
  const synthesis = expressionOf(source === a ? ac : bc, "element");
  const control = expressionOf(vessel === a ? ac : bc, "element");
  const integration = form?.description ??
    `Una envoltura continua de ${element} adopta una interpretación del cuerpo de ${vessel.name}. Conserva de ${source.name} la afinidad que mantiene el flujo. El aporte de ${vessel.name} (${control.trait}) organiza cómo se mueve el conjunto; el núcleo actúa como órgano dentro de ese mismo flujo.`;
  return variant("elemental", "element", "rare", "elemental", `Foco de ${element} · ${classic.name}`, integration,
    { nature: "elemental", anatomy: "construct", role: "mage", secondaryRole: "controller",
      affinities: [element], features: ["núcleo de cohesión"], tags: ["magic"],
      materials: [element], capabilities: ["area", "weaken"], utility: ["events", "research"], integration,
      contributions: form?.contributions ?? {
        [source.id]: { ...synthesis, action: "sostiene el flujo elemental y recompone la envoltura" },
        [vessel.id]: { ...control, action: "da al flujo su ritmo y función" }
      },
      scale: bodyScale("medium", 1.25, 2.35, null, null, 0, "vegetación o vanos próximos al mismo plano",
        "El elemento mantiene una envoltura local. Un núcleo activo reúne la forma.") },
    form?.visual ?? "Una silueta completa hecha del elemento. Los rasgos y funciones se expresan en el contorno y el movimiento. El núcleo pertenece al cuerpo.");
}
