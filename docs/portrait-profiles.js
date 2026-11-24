// Un perfil describe las formas que una carta puede aportar a un retrato.
export const PORTRAIT_PROFILES = {
  civil: {
    face: "human", features: ["hood", "leaves"],
    colors: ["#86604c", "#412c37", "#d6a787"], accent: "#83a999", texture: "skin",
    visual: "capucha de viaje y brotes prendidos al hombro",
  },
  obrero: {
    face: "human", features: ["hammer", "armor"],
    colors: ["#a77055", "#542f2d", "#e6b486"], accent: "#e0a05b", texture: "skin",
    visual: "martillo de obra y hombros reforzados",
  },
  alquimista: {
    face: "human", features: ["vial", "glasses", "rune", "hood"],
    colors: ["#8f7664", "#35254f", "#e4b787"], accent: "#65d8c1", texture: "skin",
    visual: "frasco turquesa y lentes de laboratorio",
  },
  mago: {
    face: "human", features: ["staff", "rune", "hood"],
    colors: ["#987387", "#3f2957", "#e9bdb1"], accent: "#b18aff", texture: "skin",
    visual: "báculo de cristal y runas violetas",
  },
  abogado: {
    face: "human", features: ["scalesOfJustice", "book", "glasses"],
    colors: ["#a5785f", "#49353f", "#f0c19c"], accent: "#c3b6e5", texture: "skin",
    visual: "balanza de justicia y libro de leyes",
  },
  medica: {
    face: "human", features: ["vial", "hood", "flower"],
    colors: ["#886556", "#354550", "#d8ad93"], accent: "#a3e2eb", texture: "skin",
    visual: "frasco medicinal y manto aguamarina",
  },
  herrera: {
    face: "human", features: ["hammer", "flames", "armor"],
    colors: ["#99583e", "#47252b", "#da9a70"], accent: "#ff9c5f", texture: "skin",
    visual: "martillo de herrería y brasas de la fragua",
  },
  cartografa: {
    face: "human", features: ["compass", "book", "hood"],
    colors: ["#a97756", "#3c393c", "#ebc094"], accent: "#9cd5aa", texture: "skin",
    visual: "brújula de exploración y cuaderno de mapas",
  },
  musico: {
    face: "human", features: ["lyre", "leaves"],
    colors: ["#ad7759", "#552a4c", "#efbb8d"], accent: "#e8abf0", texture: "skin",
    visual: "lira de viaje y adorno de hojas",
  },
  arquitecta: {
    face: "human", features: ["book", "compass", "glasses"],
    colors: ["#966048", "#494054", "#e1aa85"], accent: "#fddb9a", texture: "skin",
    visual: "cuaderno de planos y brújula de trazado",
  },
  lobo: {
    face: "wolf", features: ["earTuft", "mane"],
    colors: ["#686d87", "#2b2b49", "#cbcbe0"], accent: "#dfc376", texture: "fur",
    visual: "hocico gris, orejas erguidas y pelaje espeso",
  },
  zorro: {
    face: "fox", features: ["earTuft", "eyeMask"],
    colors: ["#b76743", "#522a40", "#f1bd91"], accent: "#ffb771", texture: "fur",
    visual: "hocico afilado, orejas largas y máscara cobriza",
  },
  buho: {
    face: "owl", features: ["feathers", "earTuft", "wings"],
    colors: ["#8a7762", "#40374b", "#ddc3a2"], accent: "#ffd87e", texture: "feathers",
    visual: "plumas en abanico y penachos sobre los ojos",
  },
  oso: {
    face: "bear", features: ["mane", "earTuft"],
    colors: ["#77533f", "#3a282c", "#cda671"], accent: "#e8b080", texture: "fur",
    visual: "hocico ancho y cuello de pelaje castaño",
  },
  pulpo: {
    face: "octopus", features: ["tentacles"],
    colors: ["#9e547c", "#442c58", "#e99bae"], accent: "#95d9d3", texture: "skin",
    visual: "manto redondeado y tentáculos con ventosas",
  },
  ajolote: {
    face: "salamander", features: ["gills", "fin"],
    colors: ["#ad628b", "#633953", "#ffd0ce"], accent: "#fca5c5", texture: "skin",
    visual: "hocico ancho, branquias rosadas y aletas",
  },
  mamut: {
    face: "elephant", features: ["tusks", "mane"],
    colors: ["#84594b", "#3e2d43", "#d9ac86"], accent: "#ead7b6", texture: "fur",
    visual: "trompa, colmillos curvos y pelaje lanudo",
  },
  velociraptor: {
    face: "raptor", features: ["feathers", "scales", "earTuft"],
    colors: ["#6b896b", "#31394d", "#bfd4a0"], accent: "#e8bd78", texture: "feathers",
    visual: "hocico de dinosaurio, penacho y plumas largas",
  },
  triceratops: {
    face: "ceratops", features: ["frill", "horns", "scales"],
    colors: ["#748055", "#38413d", "#c7c893"], accent: "#f3c98c", texture: "scales",
    visual: "gola ósea en abanico y cuernos frontales",
  },
  anquilosaurio: {
    face: "rhino", features: ["armor", "shell", "scales"],
    colors: ["#6c7e78", "#33374b", "#b4c2a4"], accent: "#becf85", texture: "scales",
    visual: "cabeza baja y placas óseas superpuestas",
  },
  megalodon: {
    face: "shark", features: ["fin", "gills"],
    colors: ["#59718a", "#2a3a60", "#bedae3"], accent: "#97e1e1", texture: "skin",
    visual: "mandíbula de tiburón y aleta dorsal",
  },
  rinoceronte_lanudo: {
    face: "rhino", features: ["horns", "mane"],
    colors: ["#867168", "#3a343b", "#d4baa8"], accent: "#d9c2a5", texture: "fur",
    visual: "cuerno largo y cuello de pelo tupido",
  },
  grifo: {
    face: "eagle", features: ["wings", "earTuft", "mane"],
    colors: ["#997351", "#46384b", "#f4d893"], accent: "#ffc887", texture: "feathers",
    visual: "pico de águila, alas y orejas felinas",
  },
  dragon: {
    face: "dragon", features: ["horns", "wings", "scales", "flames"],
    colors: ["#9c484f", "#482344", "#eba36d"], accent: "#ff965f", texture: "scales",
    visual: "cuernos dracónicos y alas membranosas",
  },
  fenix: {
    face: "eagle", features: ["flames", "wings", "feathers"],
    colors: ["#c3674d", "#552341", "#ffe092"], accent: "#ffad61", texture: "feathers",
    visual: "plumas encendidas y alas de fuego",
  },
  esfinge: {
    face: "sphinx", features: ["mane", "crown", "wings"],
    colors: ["#b2875c", "#493759", "#e9c692"], accent: "#e3ad69", texture: "fur",
    visual: "semblante humano, melena leonina y tocado dorado",
  },
  sirena: {
    face: "human", features: ["fin", "gills", "shell"],
    colors: ["#6597a0", "#304360", "#b9dfcf"], accent: "#86ebdc", texture: "scales",
    visual: "rostro humano de piel marina, aletas y branquias",
  },
  quetzalcoatl: {
    face: "serpent", features: ["feathers", "wings", "halo"],
    colors: ["#52977b", "#2e3d50", "#bedd9a"], accent: "#f4ae63", texture: "scales",
    visual: "hocico de serpiente y penacho de plumas verdes",
  },
  anubis: {
    face: "jackal", features: ["crown", "halo", "armor"],
    colors: ["#596080", "#292640", "#b5b3ce"], accent: "#eccc85", texture: "fur",
    visual: "cabeza de chacal, tocado de oro y halo ritual",
  },
  atenea: {
    face: "human", features: ["armor", "sword", "crown"],
    colors: ["#aa7963", "#344368", "#f0c6a7"], accent: "#9ecbfa", texture: "skin",
    visual: "armadura celeste y espada ceremonial",
  },
  thor: {
    face: "human", features: ["hammer", "lightning", "armor", "mane"],
    colors: ["#a97369", "#3f3767", "#f3c2a3"], accent: "#b7aafc", texture: "skin",
    visual: "martillo de trueno y relámpagos violetas",
  },
};
