import { bodyScale } from "./creature-scale.js";
import { expressionOf } from "./creature-identity.js";

export const VOCATIONS = {
  "oficios civiles": ["Guía de asentamientos", "logistics", "organiza suministros y domestica monturas de carga", "fardos y marcas de ruta", ["supply","transport","events"]],
  construcción: ["Apuntalador de campaña", "guardian", "estabiliza túneles y levanta pasos de emergencia", "puntales plegables", ["craft","protect"]],
  alquimia: ["Destilador de campo", "mage", "separa reactivos mediante señales de su organismo", "retorta y filtros de cobre", ["craft","research"]],
  "magia rúnica": ["Grabador de umbrales", "mage", "inscribe runas para cerrar accesos peligrosos", "placas rúnicas y punzón", ["research","events"]],
  abogacía: ["Mediador de fronteras", "controller", "registra acuerdos y reconoce cuándo se rompe una cláusula", "sellos de cera y escrituras", ["events","protect"]],
  medicina: ["Socorrista de campo", "healer", "diagnostica lesiones y estabiliza heridos", "vendas y frascos dosificadores", ["heal","survival"]],
  herrería: ["Forjador de campaña", "fighter", "templa herramientas y fabrica refuerzos para el viaje", "tenazas y placas templadas", ["craft","protect"]],
  cartografía: ["Trazador de parajes", "logistics", "dibuja rutas según las señales físicas del terreno", "brújula y mapas plegables", ["explore","logistics"]],
  música: ["Director de señales", "support", "coordina a su grupo mediante intervalos reconocibles a distancia", "resonadores de madera", ["support","events"]],
  arquitectura: ["Diseñador de refugios", "logistics", "proyecta cobijos según la carga y el terreno", "compás y planos de ensamblaje", ["craft","logistics","protect"]]
};

const DIVINE_FORMS = {
  "atenea+thor": ["Égida del Trueno", "citadel", "guardian", "construct", "Una ciudadela articulada lleva el escudo de Atenea como tejado. El martillo de Thor atrae rayos hacia sus contrafuertes y protege a quienes se cobijan dentro.", ["égida abovedada", "columnas pararrayos"], ["intercept","shield"], ["protect","logistics"]],
  "anubis+thor": ["Custodio del Último Relámpago", "ritual", "controller", "humanoid", "Un juez con rostro de chacal sostiene la balanza funeraria. Un martillo de trueno ilumina el nombre del difunto en cada platillo y abre el paso al más allá.", ["rostro de chacal", "balanza iluminada"], ["silence","slow"], ["events","protect"]],
  "anubis+atenea": ["Tribunal de las Dos Puertas", "construct", "guardian", "construct", "Un umbral viviente reconoce y acompaña a las almas mediante el rito de Anubis. Internamente compara sus señales como el guardián que participa en el pesaje. Con la previsión de Atenea ajusta las dos hojas de su égida para abrir un paso protegido y cerrar el que conduce al peligro.", ["dintel de perfil de chacal", "dos vanos bajo una égida articulada"], ["shield","intercept"], ["events","protect"]],
  "atenea+quetzalcoatl": ["Tejedora del Viento", "wind-loom", "logistics", "serpentine", "Una serpiente emplumada recoge corrientes del ámbito de Ehécatl. Con la estrategia defensiva y la artesanía de Atenea entreteje esos flujos en un collar vivo de plumas que desvía el viento. Deja corredores en calma por los que viajan personas y saberes entre asentamientos.", ["collar de plumas en forma de égida", "corrientes entretejidas"], ["protect"], ["craft","explore"]],
  "mamut+thor": ["Cordillera Errante", "transmuted", "guardian", "quadruped", "Un mamut acumula relámpagos en los colmillos mientras su pelaje helado desvía sus descargas al suelo. Su huella abre corredores entre ventiscas.", ["colmillos pararrayos", "pelaje helado"], ["protect","resist"], ["explore","protect"]],
  "dragon+thor": ["Draco de la Tormenta Coronada", "wyvern", "artillery", "reptilian", "Las membranas del dragón conducen los rayos de Thor hacia su garganta de brasas. Su figura alterna fuego y fulgor bajo la tormenta.", ["alas conductoras", "garganta de brasas"], ["area","periodic"], ["protect","explore"]],
};

const DIVINE_SCALES = {
  "atenea+thor": bodyScale("colossal", 13, 16, null, null, 0, "arco transitable para adultos bajo la égida",
    "Protege a una comunidad bajo piedra articulada sostenida por la tormenta."),
  "anubis+atenea": bodyScale("huge", 4.4, 4, 7200, null, 0, "dos puertas de altura humana y un visitante junto al dintel",
    "La estructura alberga dos pasos separados y abre el tránsito protegido."),
  "atenea+quetzalcoatl": bodyScale("large", null, 5.2, 140, null, 0, "un viajero y una entrada de 2 m en el mismo plano",
    "Conserva un cuerpo serpentiforme largo, estrecho y aéreo. El área que protege se extiende por el viento."),
  "anubis+thor": bodyScale("human", 1.9, null, 95, null, 20, "una escalera y las hojas de una puerta funeraria",
    "El guía puede acompañar a pie a quienes atraviesan el umbral."),
  "mamut+thor": bodyScale("huge", 3.3, 5.4, 5600, null, 0, "rocas y huellas en la cornisa",
    "Conserva la talla del mamut. La tormenta se conduce por sus colmillos."),
  "dragon+thor": bodyScale("huge", 3.5, 11, 4600, 16, 0, "rocas al pie de una ladera",
    "Conserva la escala del dragón y deriva la descarga alar hacia la garganta.")
};

const DIVINE_ACTIONS = {
  "atenea+thor": {
    atenea: "planifica una retirada bajo la cobertura móvil de la ciudadela",
    thor: "atrae y conduce la descarga por las columnas hasta el suelo"
  },
  "anubis+atenea": {
    anubis: "reconoce y acompaña a quienes llegan al umbral funerario",
    atenea: "protege las rutas mediante la disposición deliberada de ambas puertas"
  },
  "atenea+quetzalcoatl": {
    atenea: "dispone las corrientes como una defensa que protege las rutas",
    quetzalcoatl: "ordena el viento para abrir el intercambio entre comunidades"
  },
  "anubis+thor": {
    anubis: "participa en el pesaje y acompaña al difunto",
    thor: "ilumina el tránsito y protege el umbral con el trueno"
  },
  "mamut+thor": {
    mamut: "aísla el cuerpo y abre un corredor con su peso",
    thor: "conduce la descarga de la tormenta por los colmillos"
  },
  "dragon+thor": {
    dragon: "regula el calor en la garganta y sostiene el vuelo",
    thor: "carga las alas y desvía la descarga hacia el aliento"
  }
};

export function divineOption(a, b, ac, bc, variant) {
  const pair = [a.id, b.id].sort().join("+");
  const data = DIVINE_FORMS[pair];
  if (data) {
    const [name, shape, role, anatomy, description, features, capabilities, utility] = data;
    const flying = shape === "wind-loom" || shape === "wyvern";
    return variant("divine-manifest", "divine", "exceptional", shape, name, description, {
      role, anatomy, nature:"divine", features, capabilities, utility, tags: flying ? ["winged"] : [],
      intelligence:"sapient", materials: ["bronce"], tools: anatomy === "humanoid" ? ["balanza","martillo"] : [],
      scale: DIVINE_SCALES[pair], integration: description,
      contributions: {
        [a.id]: { ...expressionOf(ac, "divine"), action: DIVINE_ACTIONS[pair][a.id] },
        [b.id]: { ...expressionOf(bc, "divine"), action: DIVINE_ACTIONS[pair][b.id] }
      }
    });
  }
  if (a.id === "abogado" && b.id === "anubis") {
    return variant("divine", "divine", "exceptional", "ritual", "Oráculo del Voto · Abogado",
      "Un juez con rostro de chacal pesa sellos de cera en una balanza funeraria. Lee los pactos del difunto antes de abrir el paso.", {
        nature:"divine", anatomy:"humanoid", role:"controller", secondaryRole:"guardian",
        features:["rostro de chacal","balanza funeraria"], tools:["sellos de cera"], capabilities:["silence"], utility:["events","protect"]
      });
  }
  return null;
}

const RECOGNIZED = {
  "buho+dragon": ["fenix", "Las plumas del búho recogen las brasas del dragón. Al apagarse, el ave vuelve a alzar el vuelo desde su propio nido de cenizas."],
  "musico+pulpo": ["sirena", "Los brazos del pulpo afinan un órgano resonante aprendido del músico. El cuerpo adopta la cola y la voz que distinguen a la sirena."],
};

const WILD_FORMS = {
  "oso+oso": ["oso_cavernario", "ancestral", "Oso cavernario", "Un oso de frente alta y hombros macizos, inspirado en el úrsido extinto. Ensancha con las garras la entrada del refugio que ocupa la manada.", "quadruped", "guardian", ["frente alta","garras excavadoras"], ["protect","survival"], "cave-bear"],
  "anubis+lobo": ["cerbero", "mythology", "Cerbero", "El olfato del lobo se reparte entre tres hocicos. La autoridad funeraria de Anubis liga al sabueso a una sola tarea: identificar a quien intenta salir del inframundo.", "quadruped", "guardian", ["tres cabezas","collar funerario"], ["events","protect"], "cerberus"],
  "megalodon+pulpo": ["kraken", "mythology", "Kraken", "La masa del Megalodón sostiene el manto del Pulpo y sus brazos capaces de rodear cascos. Un anillo de ventosas se dibuja bajo cada ola.", "cephalopod", "controller", ["manto colosal","ventosas de anclaje"], ["protect","survival"], "colossal"],
  "buho+velociraptor": ["wyvern", "mythology", "Wyvern", "Las alas silenciosas del Búho se articulan donde el Velociraptor tenía los brazos. Tiene dos patas con garras y una cola larga para girar al descender.", "reptilian", "assassin", ["dos patas con garras","membranas alares","cola de contrapeso"], ["explore","survival"], "wyvern"]
};

export function additionalSpecies(a, b, getSpecies, getConcept, variant) {
  const key = [a.id,b.id].sort().join("+");
  const result = [];
  const recognized = RECOGNIZED[key];
  if (recognized) {
    const [id, description] = recognized;
    const base = getSpecies(id);
    result.push(variant(id, "convergence", "rare", "convergent", base.name, description,
      { ...getConcept(base), speciesId:id, final:base.art }));
  }
  const wild = WILD_FORMS[key];
  if (wild) {
    const [id,family,name,description,anatomy,role,features,utility,shape] = wild;
    result.push(variant(id.replaceAll("_","-"), family, "rare", shape, name, description, {
      speciesId:id, nature:family === "ancestral" ? "biological" : "mythic",
      anatomy, role, size:id === "kraken" ? "colossal" : "large", intelligence:"animal", features, utility,
      tags: shape === "wyvern" ? ["winged"] : []
    }));
  }
  return result;
}
