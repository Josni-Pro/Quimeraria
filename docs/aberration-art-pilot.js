// Pinturas definitivas asociadas a la variante, nunca a la copia individual.
export const ABERRATION_PILOT = [
  { parents: ["lobo", "zorro"], key: "axis-lock", asset: "aberraciones/piloto/paso-en-espejo",
    direction: "Un cuadrúpedo conserva el hombro del lobo y la cola de zorro. Una articulación posterior intenta apoyar dos pies en direcciones opuestas. Los apoyos útiles y las huellas muestran dónde se detiene." },
  { parents: ["pulpo", "sirena"], key: "sensory-loop", asset: "aberraciones/piloto/eco-de-retorno",
    direction: "El torso cantor y el manto de ventosas son continuos. Ondas que rebotan hacia las ventosas cierran los brazos, que se detienen antes de impulsar la criatura." },
  { parents: ["arquitecta", "triceratops"], key: "load-bind", asset: "aberraciones/piloto/contrafuerte-empotrado",
    direction: "Un puntal integrado une los dos lados de una articulación del Tricerátops. La pata que carga el peso y la marca de arrastre evidencian el fallo de apoyo." },
  { parents: ["fenix", "sirena"], key: "phase-bleed", asset: "aberraciones/piloto/marea-que-se-apaga",
    direction: "Alas de brasa y aleta de agua forman un eje continuo. Las gotas escapan por la transición y la aleta pierde el borde con el que debería impulsar el cuerpo." },
  { parents: ["herrera", "zorro"], key: "blocked-craft", asset: "aberraciones/piloto/mordaza-sin-alcance",
    direction: "La mandíbula del Zorro lleva una cabeza de martillo lateral que bloquea el giro. Las patas no pueden acercar la pieza al hocico. La herrería conserva escala animal." },
  { parents: ["atenea", "quetzalcoatl"], key: "domain-knot", asset: "aberraciones/piloto/egida-a-contraviento",
    direction: "Una égida de plumas y bronce se pliega en la primera curva de la serpiente. Los dos flujos regresan hacia la cresta y el sendero conserva turbulencia." },
  { parents: ["ajolote", "zorro"], key: "interrupted", asset: "aberraciones/piloto/ribera-a-medias",
    direction: "Un cuerpo continuo conserva el frente vulpino y una transición de piel larvaria. Las patas traseras quedan encerradas en una aleta que no termina de abrirse." },
  { parents: ["fusion(alquimista+mamut)", "obrero"], key: "overgrowth", asset: "aberraciones/piloto/puntales-saturados",
    direction: "El Crisomamut y el Obrero aportan transmutación y apuntalamiento. Puntales minerales repetidos ocupan el recorrido de un hombro, con una pata detenida a poca altura." }
];

export function aberrationId(parents, key) {
  return `aberration(${[...parents].sort().join("+")};${key})`;
}

const paintings = new Map(ABERRATION_PILOT.map(entry => [aberrationId(entry.parents, entry.key), entry]));

export function aberrationPainting(id) {
  return paintings.get(id);
}
