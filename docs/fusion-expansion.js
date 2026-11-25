// Las especies con nombre propio tienen requisitos concretos. Los oficios y
// las adaptaciones se comprueban sobre el concepto del progenitor inmediato.
const SPECIES_FORMS = {
  "anubis+esfinge": {
    key: "aker", family: "mythology", quality: "exceptional", name: "Aker", shape: "horizon-lions",
    idea: "Dos leones unidos por el lomo vigilan los horizontes opuestos en el umbral funerario. Anubis abre el tránsito y la Esfinge aporta el cuerpo leonino y la custodia de la entrada. El disco solar cruza entre las dos cabezas.",
    visual: "Dos cabezas de león miran al este y al oeste desde un lomo unido, con patas de león y un disco solar entre las melenas. Enmarca el guardián en la puerta de la necrópolis.",
    spec: {
      speciesId: "aker", nature: "mythic", anatomy: "quadruped", size: "large", role: "guardian", secondaryRole: "controller",
      culture: "tradición egipcia", features: ["cabezas leoninas opuestas", "disco solar", "patas leoninas"],
      materials: ["arenisca"], capabilities: ["intercept", "slow"], utility: ["protect", "events"]
    }
  },
  "quetzalcoatl+thor": {
    key: "jormungandr", family: "mythology", quality: "exceptional", name: "Jörmungandr", shape: "sea-coil",
    idea: "La serpiente oceánica de la tradición nórdica se ciñe alrededor de una isla hasta alcanzar su propia cola. Conserva el eje serpentiforme de Quetzalcóatl. La tormenta de Thor delata dónde se alzan sus espiras bajo el agua.",
    visual: "Serpiente marina sin patas, de escamas oscuras y cresta corta emplumada. Un anillo del cuerpo rodea un islote y la boca alcanza la punta de su propia cola. Relámpagos lejanos dan escala.",
    spec: {
      speciesId: "jormungandr", nature: "mythic", anatomy: "serpentine", size: "colossal", role: "controller", secondaryRole: "guardian",
      culture: "tradición nórdica", affinities: ["rayo", "agua"], habitat: ["océano"],
      features: ["espiras oceánicas", "mordida sobre la propia cola", "cresta emplumada"],
      materials: ["escamas", "sal"], capabilities: ["slow", "immobilize"], utility: ["protect", "events"]
    }
  },
  "grifo+lobo": {
    key: "simurgh", family: "mythology", quality: "rare", name: "Simurgh", shape: "healing-wing",
    idea: "Ave de la tradición persa con cabeza de cánido, alas de grifo y plumas que guían a viajeros heridos hacia un refugio. El olfato del lobo distingue el rastro de quien se ha separado del grupo.",
    visual: "Ave de gran envergadura con dos alas, dos patas de ave, hocico canino y cola de plumas largas. Desciende junto a un refugio y deja caer una pluma luminosa ante un viajero.",
    spec: {
      speciesId: "simurgh", nature: "mythic", anatomy: "avian", size: "large", intelligence: "sapient",
      role: "healer", secondaryRole: "support", culture: "tradición persa", features: ["rostro canino", "alas de grifo", "pluma luminosa"],
      materials: ["plumas"], tags: ["winged"], capabilities: ["heal", "cleanse"], utility: ["heal", "explore"]
    }
  },
  "ajolote+lobo": {
    key: "ahuizotl", family: "mythology", quality: "rare", name: "Ahuízotl", shape: "river-grip",
    idea: "El guardián acuático de la tradición nahua conserva el hocico del lobo y las branquias del ajolote. Se aferra a las raíces de la orilla con la mano que remata su cola, mientras las cuatro patas maniobran bajo el agua.",
    visual: "Cuerpo canino anfibio bajo, pelaje mojado y branquias externas a ambos lados del hocico. Cuatro patas y una cola larga que termina en una mano prensil sujeta a una raíz sumergida.",
    spec: {
      speciesId: "ahuizotl", nature: "mythic", anatomy: "amphibian", size: "medium", role: "controller",
      culture: "tradición nahua", habitat: ["agua dulce"], affinities: ["agua"], tags: ["amphibious", "canid"],
      materials: ["pelaje húmedo"], features: ["cola rematada en mano", "branquias externas", "hocico canino"],
      capabilities: ["immobilize"], utility: ["survival", "explore"]
    }
  },
  "esfinge+mamut": {
    key: "smilodon", family: "ancestral", quality: "rare", name: "Smilodon", shape: "saber-cat",
    idea: "La Esfinge aporta la base felina y el Mamut, una forma de armamento dental exagerado. La fusión imagina un felino extinto de hombros potentes, cola corta y caninos largos, capaz de inmovilizar la presa antes de usar los dientes.",
    visual: "Felino extinto de cuerpo bajo, hombros fuertes, cuatro patas y cola corta. Destacan dos caninos superiores largos y estrechos, sin trompa. Mostrar el perfil entre hierbas y piedras del Pleistoceno.",
    spec: {
      speciesId: "smilodon", nature: "biological", anatomy: "quadruped", size: "large", intelligence: "animal", role: "striker",
      tags: ["feline", "ancestral"], materials: ["esmalte", "pelaje denso"], features: ["dos caninos de sable", "hombros macizos", "cola corta"],
      capabilities: ["direct", "piercing"], utility: ["survival"]
    }
  },
  "rinoceronte_lanudo+rinoceronte_lanudo": {
    key: "elasmotherium", family: "ancestral", quality: "rare", name: "Elasmotherium", shape: "single-horn",
    idea: "Dos rinocerontes lanudos dan lugar a una forma fabulosa inspirada en el rinocerótido extinto. Su testuz concentra el apoyo de un único cuerno frontal, con cabeza baja y patas largas para cruzar la estepa abierta.",
    visual: "Rinocerótido robusto con un solo cuerno grande sobre la frente, cabeza baja y cuatro patas largas sobre suelo firme. Pelaje marrón moderado y estepa de hierbas secas. Aspecto hipotético dentro de la ficción.",
    spec: {
      speciesId: "elasmotherium", nature: "biological", anatomy: "quadruped", size: "colossal", intelligence: "animal", role: "striker",
      tags: ["ancestral", "burly"], habitat: ["estepa fría"], materials: ["queratina", "pelaje"],
      features: ["cuerno frontal único", "testuz reforzada", "patas largas"], capabilities: ["piercing"], utility: ["survival", "transport"]
    }
  },
  "velociraptor+velociraptor": {
    key: "utahraptor", family: "ancestral", quality: "rare", name: "Utahraptor", shape: "feather-raptor",
    idea: "La fusión de dos raptores imagina al dromeosáurido de talla mayor. Conserva la cola rígida de contrapeso y especializa las garras internas de los pies para agarrarse a un terraplén mientras vigila la ruta.",
    visual: "Raptor emplumado de dos patas con garras internas elevadas, antebrazos plegados con manos, hocico estrecho y cola rígida de equilibrio. Apoyo visible sobre una pendiente terrosa.",
    spec: {
      speciesId: "utahraptor", nature: "biological", anatomy: "reptilian", size: "large", intelligence: "animal", role: "assassin",
      tags: ["reptile", "dinosaur", "stealth", "ancestral"], materials: ["plumas", "queratina"],
      features: ["garras curvas internas", "antebrazos plegados", "cola rígida"], capabilities: ["piercing", "multi"], utility: ["explore", "survival"]
    }
  }
};

const INSTITUTIONS = {
  arquitectura: {
    key: "counterfort-archive", name: "Archivo de Contrafuertes", quality: "rare", shape: "walking-archive",
    role: "logistics", secondaryRole: "guardian", size: "colossal",
    idea: "Dos escuelas de arquitectura reúnen sus planos en un archivo que anda. El primer método reparte la carga entre contrafuertes telescópicos. El segundo usa los cajones de maquetas para calcular una pasarela sobre terreno inestable.",
    visual: "Archivo de piedra con cuatro apoyos articulados, cajones de maquetas visibles y, en el frente, una pasarela plegable que se extiende sobre un hueco. Las vigas transmiten la carga a los apoyos.",
    materials: ["piedra", "roble", "bronce"], tools: ["maquetas", "plomada"], structure: "archivo móvil",
    features: ["apoyos telescópicos", "cajones de modelos", "pasarela plegable"], utility: ["craft", "logistics", "protect"]
  },
  abogacía: {
    key: "civic-table", name: "Mesa de Pactos", quality: "rare", shape: "civic-table",
    role: "controller", secondaryRole: "guardian", size: "medium",
    idea: "Dos escuelas de derecho se vuelven una mesa viviente con dos manos articuladas. Una sella el compromiso y la otra vuelve la tablilla para comprobar la reciprocidad. El acuerdo abre un paso en lugar de invocar a un juez.",
    visual: "Mesa baja de encina sostenida por cuatro apoyos, con dos brazos de madera bajo el tablero. Un brazo ofrece una tablilla sin letras y el otro sostiene un sello sobre cera.",
    materials: ["encina", "cera"], tools: ["sello", "tablillas"], structure: "mesa de mediación",
    features: ["brazos de madera", "tablero reversible", "sellos de cera"], utility: ["events", "protect"]
  }
};

function recognizedForm(a, b, variant) {
  const form = SPECIES_FORMS[[a.id, b.id].sort().join("+")];
  if (!form) return null;
  return variant(form.key, form.family, form.quality, form.shape, form.name, form.idea, form.spec, form.visual);
}

function institution(ac, bc, variant) {
  if (!ac.profession || ac.profession !== bc.profession || !Object.hasOwn(INSTITUTIONS, ac.profession)) return null;
  const entry = INSTITUTIONS[ac.profession];
  const { role, secondaryRole, size, materials, tools, structure, features, utility } = entry;
  // Los dos progenitores deben ejercer la misma disciplina. Los híbridos
  // pueden aportar esa disciplina si todavía la conservan en su ficha.
  return variant(entry.key, "construct", entry.quality, entry.shape, entry.name, entry.idea, {
    nature: "artificial", anatomy: "construct", profession: ac.profession, intelligence: "sapient",
    role, secondaryRole, size, materials, tools, structure, features, utility
  }, entry.visual);
}

function pairedFounders(a, b, variant) {
  if (a.id === "atenea" && b.id === "atenea") {
    return variant("hundred-pieces", "divine", "exceptional", "warboard", "Estratega de las Cien Piezas",
      "Dos talleres de Atenea combinan el tejido y la estrategia. Un autómata de bronce despliega una égida horizontal como tablero, mientras piezas unidas por hilos reproducen el terreno y señalan una salida segura.",
      { nature: "divine", anatomy: "construct", size: "large", role: "support", secondaryRole: "controller",
        materials: ["bronce", "hilo"], structure: "tablero táctico", tools: ["piezas articuladas", "égida horizontal"],
        features: ["tablero sobre el pecho", "hilos tensados", "manos de telar"],
        capabilities: ["empower", "slow"], utility: ["explore", "protect", "events"] },
      "Autómata de bronce con manos móviles y égida horizontal abierta. Los hilos tensados mueven pequeñas piezas sobre un relieve del terreno en el lugar que ocupa el pecho.");
  }
  if (a.id === "esfinge" && b.id === "esfinge") {
    return variant("echo-trial", "evolution", "uncommon", "echo-gate", "Esfinge del Eco",
      "Una Esfinge de dos gargantas coordinadas hace resonar el acertijo entre arcos de piedra. El viajero escucha el eco del paso viable en vez de luchar con el guardián.",
      { nature: "mythic", anatomy: "quadruped", size: "large", role: "controller",
        materials: ["arenisca", "pelaje"], structure: "umbral resonante", tags: ["feline", "ritual"],
        features: ["rostro humano", "gargantas resonantes", "arcos de oído"],
        capabilities: ["slow"], utility: ["events", "protect"] },
      "Un solo cuerpo de león con cara humana, melena baja y dos membranas visibles en la garganta, entre arcos de arenisca que dirigen el sonido hacia el paso.");
  }
  return null;
}

function adaptedFauna(parents, variant) {
  // Una función necesita dos aportes diferentes: orientación o escucha por
  // un lado y un cuerpo terrestre con capacidad estructural por el otro.
  const carrier = parents.find(({ concept }) => concept.anatomy === "quadruped" &&
    !concept.profession && ["large", "colossal"].includes(concept.size) && concept.tags.includes("carrier") &&
    (concept.tags.includes("armored") || concept.tags.includes("ancestral")));
  if (!carrier) return null;
  const guide = parents.find(parent => parent !== carrier);
  if (guide.card.id === carrier.card.id || guide.concept.profession || guide.concept.size === "colossal") return null;
  const tracking = guide.concept.anatomy === "quadruped" && guide.concept.tags.includes("tracker");
  const listening = guide.concept.anatomy === "avian" && guide.concept.tags.includes("stealth");
  if (!tracking && !listening) return null;

  const carrierFeature = carrier.concept.features[0] ?? "apoyos reforzados";
  const bodySource = carrier.card.identity?.bodySource ?? carrier.card.lineage[0];
  const inherited = guide.concept.features[0] ?? (tracking ? "olfato" : "escucha silenciosa");
  if (tracking) {
    const relays = guide.concept.tags.includes("pack");
    const form = relays ? "Rastreador de Coraza" : "Acechador de Sotavento";
    const signs = relays
      ? "las cámaras nasales separan rastros superpuestos para que el grupo mantenga la misma senda"
      : "la criatura cierra una cámara nasal al viento y sigue un rastro fino sin levantar polvo";
    return variant("scent-vanguard", "adaptation", "uncommon", "scent-beacons", `${form} · ${carrier.card.name}`,
      `${carrier.card.name} aporta ${carrierFeature} y el apoyo para abrir camino. El linaje de ${guide.card.name} añade ${inherited}; ${signs}.`,
      { nature: "biological", anatomy: "quadruped", size: carrier.concept.size, bodySource,
        role: "guardian", secondaryRole: relays ? "logistics" : "assassin", tags: ["tracker", "carrier"],
        materials: [carrier.concept.materials[0] ?? "hueso"],
        features: [carrierFeature, "cámaras nasales", inherited], capabilities: ["intercept"], utility: ["explore", "transport"] },
      `Cuerpo terrestre de ${carrier.card.name}, cuatro patas con apoyo y ${carrierFeature}. El hocico de ${guide.card.name} incorpora cámaras nasales visibles sobre un rastro en el suelo.`);
  }
  return variant("night-ridge", "adaptation", "uncommon", "night-disc", `Vigía de Escucha · ${carrier.card.name}`,
    `La silueta de ${carrier.card.name} conserva ${carrierFeature}. Un disco de plumas del linaje de ${guide.card.name} conduce sonidos hacia dos cámaras laterales. El guardián detecta pasos desde tierra sin volar.`,
    { nature: "biological", anatomy: "quadruped", size: carrier.concept.size, bodySource,
      role: "controller", secondaryRole: "guardian", features: [carrierFeature, "disco acústico de plumas", "cámaras laterales"],
      materials: ["hueso", "plumas"], capabilities: ["slow"], utility: ["explore", "protect"] },
    `Animal terrestre de cuatro patas con ${carrierFeature}. Enmarca el hocico un disco de plumas asimétrico que orienta la escucha al pasar junto a un obstáculo.`);
}

function convergence(parents, getSpecies, getConcept, variant) {
  const plumed = parents.find(({ concept }) => concept.anatomy === "avian" &&
    concept.tags.includes("bird") && concept.tags.includes("winged"));
  const feline = parents.find(({ concept }) => concept.tags.includes("feline") && concept.anatomy === "quadruped");
  const griffin = parents.find(({ concept }) => concept.speciesId === "grifo");
  const strategist = parents.find(({ concept }) => concept.nature === "divine" && concept.knowledge.includes("estrategia"));
  let speciesId, idea;
  if (plumed && feline && plumed !== feline && !griffin) {
    speciesId = "grifo";
    idea = `Las alas y las garras rapaces de ${plumed.card.name} se estabilizan en el cuerpo leonino de ${feline.card.name}. El resultado guarda cornisas con la forma reconocible del Grifo.`;
  } else if (griffin && strategist && griffin !== strategist) {
    speciesId = "esfinge";
    idea = `La forma leonina de ${griffin.card.name} pierde las alas, adopta el rostro humano y aplica la sabiduría de ${strategist.card.name} para juzgar a los viajeros con acertijos.`;
  }
  // La convergencia suma un linaje nuevo. No sirve como vuelta a una especie
  // que ya fue uno de los ancestros base de la misma carta.
  if (!speciesId || parents.some(({ card }) => card.lineage.includes(speciesId))) return null;

  const base = getSpecies(speciesId);
  const native = getConcept(base);
  return variant(speciesId, "convergence", "rare", "convergent", base.name, idea,
    { ...native, speciesId, final: base.art },
    `Reutilizar la representación de ${base.name}. ${idea}`);
}

export function expansionOptions(a, b, ac, bc, getSpecies, getConcept, variant) {
  const parents = [{ card: a, concept: ac }, { card: b, concept: bc }];
  return [
    adaptedFauna(parents, variant),
    institution(ac, bc, variant),
    pairedFounders(a, b, variant),
    recognizedForm(a, b, variant),
    convergence(parents, getSpecies, getConcept, variant)
  ].filter(Boolean);
}
