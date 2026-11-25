// Las expresiones sirven a la interpretación y al arte. Los perfiles de
// combate siguen leyendo sus campos y presupuestos propios.
export const EXPRESSION_LABELS = {
  external: "Rasgo externo", physiology: "Fisiología", sense: "Percepción",
  behavior: "Conducta", knowledge: "Conocimiento", domain: "Dominio",
  power: "Poder", function: "Función cultural"
};

const BASE_EXPRESSIONS = {
  civil: { knowledge: "ajuste a los recursos locales", behavior: "reparte suministros entre vecinos", function: "sostiene comunidades mediante intercambio" },
  obrero: { knowledge: "distribución de peso y apuntalamiento", behavior: "organiza trabajos de refuerzo", function: "estabiliza un paso antes de abrirlo" },
  alquimista: { knowledge: "separa y transforma materiales según sus reacciones", power: "modifica la estructura interna de una sustancia", behavior: "compara cambios de color y densidad" },
  mago: { knowledge: "reglas de inscripción y resonancia", power: "cierra umbrales mediante patrones activos", behavior: "prepara y comprueba inscripciones" },
  abogado: { knowledge: "detecta contradicciones entre cláusulas", behavior: "negocia obligaciones recíprocas", function: "protege pactos y media en disputas" },
  medica: { knowledge: "diagnostica, prioriza y estabiliza lesiones", behavior: "evalúa al paciente antes de moverlo", function: "coordina cuidados" },
  herrera: { knowledge: "controla temperatura, temple y reparto de esfuerzos", behavior: "prueba el metal durante el enfriamiento", function: "repara herramientas de uso común" },
  cartografa: { knowledge: "lee terreno y contrasta rutas", behavior: "registra distancias y corrige desvíos", function: "traduce el relieve a trayectos navegables" },
  musico: { knowledge: "repite intervalos y ritmos reconocibles", sense: "distingue voces y ecos superpuestos", function: "coordina grupos mediante señales" },
  arquitecta: { knowledge: "reparte cargas y adapta apoyos al terreno", behavior: "ensaya módulos antes de abrir un espacio", function: "hace habitable y seguro un refugio" },
  lobo: { external: "hocico y patas corredoras", physiology: "respiración sostenida en carrera", sense: "separa rastros por el olfato", behavior: "releva a su grupo durante el rastreo" },
  zorro: { external: "orejas móviles y cola de contrapeso", physiology: "arranque ágil y giro bajo", sense: "localiza presas ocultas mediante oído y olfato", behavior: "adapta sigilosamente la ruta a cada terreno" },
  buho: { external: "alas y disco facial de plumas", physiology: "borde de las plumas que amortigua el vuelo", sense: "oído direccional y visión nocturna", behavior: "escucha desde un posadero antes de descender" },
  oso: { external: "cuerpo robusto y garras", physiology: "reserva grasa para periodos de escasez", sense: "olfato de largo alcance", behavior: "busca refugio y varía su alimento con la estación" },
  pulpo: { external: "ocho brazos con ventosas y un manto flexible",
    physiology: ["control nervioso distribuido", "tres corazones", "regeneración de brazos", "camuflaje del manto"],
    sense: "las ventosas reconocen contacto y sustancias", behavior: "expulsa tinta al retirarse" },
  ajolote: { external: "penachos branquiales y cola natatoria",
    physiology: ["regenera tejidos", "conserva adaptaciones larvarias acuáticas"],
    sense: "percibe perturbaciones en agua quieta", behavior: "ancla el cuerpo bajo refugios sumergidos" },
  mamut: { external: "trompa prensil y colmillos", physiology: "aislamiento en capas y apoyos para repartir masa", sense: "percibe vibraciones graves", behavior: "abre camino y recuerda corredores estacionales" },
  velociraptor: { external: "cola rígida y garra interna elevada", physiology: "postura de contrapeso para giros rápidos", sense: "sigue el movimiento cerca del suelo", behavior: "busca cobertura para aproximarse sin ruido" },
  triceratops: { external: "gola y cuernos", physiology: "el cuello transmite empujes a hombros y apoyos", sense: "percibe presión a través de sus apoyos", behavior: "encara el peligro y cubre un paso de la manada" },
  anquilosaurio: { external: "osteodermos y maza caudal", physiology: "placas que distribuyen impactos y cola con base reforzada", sense: "detecta vibraciones del suelo", behavior: "gira la cola y protege el flanco bajo" },
  megalodon: { external: "cuerpo fusiforme y mandíbulas serradas", physiology: "nado oceánico de gran inercia", sense: "detecta perturbaciones y rastros químicos", behavior: "recorre bordes profundos siguiendo presas migratorias" },
  rinoceronte_lanudo: { external: "cuerno frontal y pelaje", physiology: "aislamiento espeso y cuello que transmite empujes", sense: "agudo olfato en planicie abierta", behavior: "despeja nieve y pasto con la testuz" },
  grifo: { external: "alas rapaces, garras y cuerpo felino", sense: "lee el movimiento desde grandes alturas", behavior: "vigila cornisas y se orienta por ascendencias", power: "mantiene el vuelo sobre un cuerpo denso" },
  dragon: { external: "escamas y membranas alares", physiology: "la garganta y el pecho aíslan calor", behavior: "custodia territorio y mide intrusiones", power: "modula el aliento de fuego sin perder el equilibrio" },
  fenix: { external: "alas y plumas de ceniza viva", physiology: "recupera su forma después de la combustión", behavior: "vuelve a su nido de cenizas", power: "transmite calor regenerador con precisión" },
  esfinge: { external: "cuerpo leonino y rostro humano", knowledge: "plantea acertijos que revelan decisiones", behavior: "vigila umbrales y anticipa respuestas", function: "pone a prueba a quienes cruzan" },
  sirena: { external: "torso humanoide y cola natatoria", physiology: "adapta la resonancia a la presión del agua", sense: "se orienta por ecos", power: "modula corrientes de sonido mediante la voz" },
  atenea: { domain: "sabiduría práctica, estrategia defensiva y artesanía", power: "protege al grupo con una defensa deliberada", knowledge: "anticipa rutas y enseña técnicas", function: "tutela la ciudad y el trabajo especializado" },
  quetzalcoatl: { external: "serpiente emplumada como forma sagrada", domain: "viento en su aspecto de Ehécatl y conocimiento civilizador", power: "ordena corrientes para abrir paso", function: "vincula el conocimiento con la vida comunitaria" },
  anubis: { external: "rostro de cánido y figura humana", domain: "custodia funeraria y acompañamiento de los difuntos", knowledge: "prepara los ritos del tránsito", function: "asiste en el pesaje del corazón en el juicio funerario" },
  thor: { external: "figura erguida y martillo Mjölnir", domain: "trueno y protección frente a fuerzas hostiles", power: "desvía fuerzas mediante la tormenta", function: "protege a dioses y comunidades" }
};

const MYTHOLOGY = {
  atenea: {
    tradition: "griega", symbols: ["égida", "olivo"], associatedAnimals: ["búho"],
    manifestations: ["defensa de un paso", "planificación de una defensa", "protección del trabajo de la ciudad"]
  },
  quetzalcoatl: {
    tradition: "nahua, con antecedentes mesoamericanos", symbols: ["plumas de quetzal", "máscara de viento de Ehécatl"],
    associatedAnimals: ["serpiente emplumada"], manifestations: ["ordenación del viento", "guía y transmisión de conocimiento"]
  },
  anubis: {
    tradition: "egipcia", symbols: ["equipo funerario", "balanza del pesaje"], associatedAnimals: ["chacal u otro cánido negro"],
    manifestations: ["custodia de una necrópolis", "acompañamiento de un alma", "preparación del tránsito funerario"]
  },
  thor: {
    tradition: "nórdica", symbols: ["Mjölnir"], associatedAnimals: ["cabras del carro"],
    manifestations: ["trueno protector", "barrera frente a la tormenta", "defensa de un paso"]
  }
};

export function baseIdentity(card, concept) {
  const expressions = Object.entries(BASE_EXPRESSIONS[card.id] ?? {})
    .flatMap(([type, traits]) => [traits].flat().map(trait => ({ type, trait })));
  if (!expressions.length) {
    if (concept.features.length) expressions.push({ type: "external", trait: concept.features[0] });
    if (concept.knowledge.length) expressions.push({ type: "knowledge", trait: concept.knowledge[0] });
  }
  return {
    expressions,
    ...(MYTHOLOGY[card.id] ? { mythology: MYTHOLOGY[card.id] } : {})
  };
}

const preferences = {
  classic: ["physiology", "knowledge", "sense", "external"],
  symbiosis: ["physiology", "sense", "behavior", "power"],
  element: ["power", "knowledge", "physiology", "sense", "behavior"],
  divine: ["domain", "function", "power"],
  profession: ["knowledge", "sense", "behavior"],
  morphology: ["external", "physiology", "behavior"]
};

export function expressionOf(concept, family) {
  const expressions = concept.depth.expressions;
  const order = preferences[family] ?? preferences.morphology;
  return order.map(type => expressions.find(entry => entry.type === type)).find(Boolean)
    ?? expressions[0]
    ?? { type: "external", trait: concept.features[0] ?? "plan corporal" };
}

export function integratedIdentity(parents, family, spec) {
  const group = ["kin", "anthropomorphic", "carrier"].includes(family) ? "profession" : family;
  const contributions = parents.map(({ card, concept }) => {
    const contribution = spec.contributions?.[card.id];
    return {
      parentId: card.id, name: card.name, ...expressionOf(concept, group), ...contribution
    };
  });
  const expressions = contributions.map(({ type, trait }) => ({ type, trait }));
  // Una expresión narrativa seleccionada por progenitor inmediato. Los
  // límites de herencia que surten efectos en perfiles quedan separados.
  return { expressions, contributions, integration: spec.integration ?? "" };
}
