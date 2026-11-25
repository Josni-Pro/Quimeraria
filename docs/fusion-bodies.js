// Las proporciones son multiplicadores del cuerpo neutral que dibuja fusion-art.js.
const anatomy = (kind, neck, torso, leg, mass, tail, forelimb, hindlimb, wing = null) =>
  ({ kind, neck, torso, leg, mass, tail, forelimb, hindlimb, wing });

const types = {
  human: anatomy("biped", 1.04, 0.87, 1.15, 0.88, "none", "hand", "hoof"),
  wolf: anatomy("quadruped", 1.01, 1.17, 1.03, 0.93, "brush", "paw", "paw"),
  fox: anatomy("quadruped", 1.10, 1.27, 0.91, 0.76, "brush", "paw", "paw"),
  bear: anatomy("quadruped", 0.70, 1.14, 0.84, 1.35, "tuft", "paw", "paw"),
  owl: anatomy("avian", 0.71, 0.87, 0.78, 0.84, "tuft", "talon", "talon", "feather"),
  ceratops: anatomy("quadruped", 0.74, 1.21, 0.82, 1.37, "reptile", "paw", "paw"),
  raptor: anatomy("biped", 1.29, 1.14, 1.28, 0.76, "reptile", "talon", "talon"),
  dragon: anatomy("winged-quadruped", 1.30, 1.24, 0.94, 1.18, "reptile", "talon", "talon", "membrane"),
  elephant: anatomy("quadruped", 0.69, 1.16, 1.13, 1.45, "tuft", "hoof", "hoof"),
  octopus: anatomy("tentacled", 0.68, 0.89, 1.01, 0.87, "none", "none", "none"),
  salamander: anatomy("quadruped", 0.72, 1.34, 0.61, 0.71, "fin", "paw", "paw"),
  shark: anatomy("finned", 0.79, 1.49, 0.69, 1.12, "fin", "flipper", "none"),
  rhino: anatomy("quadruped", 0.76, 1.23, 0.83, 1.26, "reptile", "hoof", "hoof"),
  eagle: anatomy("avian", 0.94, 0.99, 1, 0.88, "tuft", "talon", "talon", "feather"),
  serpent: anatomy("serpentine", 1.34, 1.48, 0.66, 0.92, "coil", "none", "none", "feather"),
  jackal: anatomy("biped", 1.17, 0.92, 1.19, 0.93, "brush", "hand", "paw"),
  sphinx: anatomy("winged-quadruped", 1.09, 1.15, 1, 1.08, "tuft", "paw", "paw", "feather"),
  fish: anatomy("finned", 0.79, 1.39, 0.67, 0.78, "fin", "flipper", "none"),
};

const byCard = {
  anquilosaurio: anatomy("quadruped", 0.63, 1.35, 0.70, 1.45, "reptile", "paw", "paw"),
  atenea: anatomy("biped", 0.99, 0.88, 1.22, 0.92, "none", "hand", "hoof"),
  grifo: anatomy("winged-quadruped", 1.16, 1.17, 1.05, 1.01, "tuft", "talon", "paw", "feather"),
  rinoceronte_lanudo: anatomy("quadruped", 0.69, 1.29, 0.91, 1.43, "tuft", "hoof", "hoof"),
  sirena: anatomy("finned", 1.08, 1.12, 0.69, 0.84, "fin", "hand", "none"),
  thor: anatomy("biped", 0.96, 0.96, 1.17, 1.16, "none", "hand", "hoof"),
};

const quadrupeds = new Set(["quadruped", "winged-quadruped"]);
const nonTerrestrial = new Set(["finned", "serpentine", "tentacled"]);
const featuresOnHead = new Set(["frill", "horns", "antlers", "earTuft", "feathers", "tusks", "crown"]);

function shapeOf(profile) {
  const defaultShape = byCard[profile.id] ?? types[profile.face] ?? types.human;
  return { ...defaultShape, ...profile.anatomy, source: profile.id, face: profile.face };
}

function mergedKind(shapes, wing, seed) {
  const counts = new Map();
  for (const shape of shapes) {
    const kind = quadrupeds.has(shape.kind) ? "quadruped" : shape.kind;
    counts.set(kind, (counts.get(kind) ?? 0) + shape.weight);
  }
  const terrestrial = counts.get("quadruped") ?? 0;
  const avian = counts.get("avian") ?? 0;
  // Las alas se insertan en el torso de un cuadrúpedo si ambos planes tienen peso suficiente.
  if (terrestrial >= 0.26 && wing && (avian >= 0.22 || shapes.some(shape => shape.kind === "winged-quadruped"))) {
    return "winged-quadruped";
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"));
  if (!ranked.length) return "biped";
  const compatible = ranked.filter(([, weight]) => weight === ranked[0][1]);
  if (compatible.length === 1) return compatible[0][0];
  const [first, second] = compatible.map(([kind]) => kind);
  if (first === "avian" && second === "biped") return "avian";
  if (first === "finned" && second === "tentacled") return seed & 2 ? "finned" : "tentacled";
  const land = compatible.find(([kind]) => quadrupeds.has(kind));
  if (land && compatible.some(([kind]) => nonTerrestrial.has(kind))) return "quadruped";
  return compatible[(seed >>> 5) % compatible.length][0];
}

function strongest(shapes, field, accepted = () => true) {
  const options = new Map();
  for (const shape of shapes) {
    const value = shape[field];
    if (value && accepted(value)) options.set(value, (options.get(value) ?? 0) + shape.weight);
  }
  return [...options].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))[0]?.[0];
}

function suitableLimbs(shapes, kind, weight) {
  if (kind === "serpentine" || kind === "tentacled") return ["none", "none"];
  if (kind === "finned") {
    return [strongest(shapes, "forelimb", limb => limb === "hand" || limb === "flipper") ?? "flipper", "none"];
  }
  if (kind === "avian") return ["talon", "talon"];
  if (kind === "biped") {
    const hand = shapes.some(shape => shape.forelimb === "hand" && shape.weight >= 0.16);
    return [hand ? "hand" : "talon", strongest(shapes, "hindlimb", limb => limb !== "none" && limb !== "flipper") ?? "paw"];
  }
  const allowed = limb => limb === "paw" || limb === "hoof" || limb === "talon";
  const land = shapes.filter(shape => quadrupeds.has(shape.kind));
  const mixed = (weight > 0.32 ? shapes : land).sort((a, b) => b.weight - a.weight);
  return [
    strongest(mixed, "forelimb", allowed) ?? "paw",
    strongest(land, "hindlimb", allowed) ?? "paw",
  ];
}

export function planAnatomy(spec) {
  const { seed = 0, groups = [], sides = [], features = [], level = 1 } = spec;
  const parentGroups = groups.length ? groups.filter(group => group.length) : sides.map(side => [side]);
  const shapes = parentGroups.flatMap(group => group.map(profile => ({
    ...shapeOf(profile),
    weight: 1 / (parentGroups.length * group.length)
  })));
  const preferred = features.find(item => item.key === "wings");
  const wing = strongest(shapes.filter(shape => !preferred || shape.source === preferred.id), "wing")
    ?? strongest(shapes, "wing") ?? (preferred ? "feather" : null);
  const kind = mergedKind(shapes, wing, seed);
  const weightOfBody = shapes.reduce((sum, shape) => sum + (shape.kind === kind ? shape.weight : 0), 0);
  const torsoShapes = shapes.filter(shape => shape.kind === kind || quadrupeds.has(kind) && quadrupeds.has(shape.kind));
  const geometry = Object.fromEntries(["neck", "torso", "leg", "mass"].map(key => {
    const shared = shapes.reduce((sum, shape) => sum + shape[key] * shape.weight, 0) || 1;
    const bodyWeight = torsoShapes.reduce((sum, shape) => sum + shape.weight, 0);
    const central = bodyWeight ? torsoShapes.reduce((sum, shape) => sum + shape[key] * shape.weight, 0) / bodyWeight : shared;
    return [key, shared * 0.46 + central * 0.54];
  }));
  const [forelimb, hindlimb] = suitableLimbs(shapes, kind, weightOfBody);
  const tail = kind === "finned" ? "fin" : kind === "serpentine" ? "coil" :
    strongest(shapes, "tail", item => item !== "none" && item !== "coil") ?? "none";
  const gait = ["biped", "avian"].includes(kind) ? "upright" : nonTerrestrial.has(kind) ? "flow" : "stride";
  const variant = (seed >>> 3) % 5;
  const pose = gait === "stride" || kind === "finned" ? "profile" :
    level > 1 && variant === 0 ? "front" : "three-quarter";
  return {
    kind, pose, direction: seed & 1 ? 1 : -1, ...geometry, tail, wing, gait, forelimb, hindlimb,
    crest: features.filter(item => featuresOnHead.has(item.key)).map(item => item.key).slice(0, 3),
    source: torsoShapes.sort((a, b) => b.weight - a.weight)[0]?.source ?? shapes[0]?.source,
    variant
  };
}
