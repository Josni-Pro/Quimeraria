import { PORTRAIT_PROFILES } from "./portrait-profiles.js";
import { planAnatomy } from "./fusion-bodies.js";

const WIDTH = 640;
const HEIGHT = 512;
const CENTER = WIDTH / 2;
const CACHE_LIMIT = 48;
const imageCache = new Map();

const profileFallback = {
  face: "human",
  colors: ["#806195", "#312039", "#d3a3bc"],
  accent: "#dfb1ef",
  texture: "skin",
  features: ["rune"],
};

const faceForms = {
  human: { temple: 77, cheek: 80, jaw: 48, chin: 367, crown: 164, muzzle: "human", ears: "small" },
  wolf: { temple: 77, cheek: 105, jaw: 43, chin: 392, crown: 167, muzzle: "canine", ears: "point" },
  fox: { temple: 75, cheek: 106, jaw: 35, chin: 391, crown: 177, muzzle: "canine", ears: "high" },
  bear: { temple: 96, cheek: 109, jaw: 70, chin: 390, crown: 151, muzzle: "bear", ears: "round" },
  owl: { temple: 98, cheek: 108, jaw: 70, chin: 391, crown: 157, muzzle: "beak", ears: "tuft" },
  ceratops: { temple: 89, cheek: 99, jaw: 44, chin: 393, crown: 169, muzzle: "beak", ears: "none" },
  raptor: { temple: 77, cheek: 79, jaw: 51, chin: 389, crown: 175, muzzle: "reptile", ears: "tuft" },
  dragon: { temple: 96, cheek: 99, jaw: 52, chin: 388, crown: 166, muzzle: "reptile", ears: "none" },
  elephant: { temple: 94, cheek: 113, jaw: 72, chin: 399, crown: 144, muzzle: "trunk", ears: "broad" },
  octopus: { temple: 88, cheek: 91, jaw: 62, chin: 389, crown: 129, muzzle: "tentacled", ears: "none" },
  salamander: { temple: 91, cheek: 107, jaw: 59, chin: 379, crown: 180, muzzle: "aquatic", ears: "none" },
  shark: { temple: 89, cheek: 109, jaw: 62, chin: 391, crown: 173, muzzle: "shark", ears: "none" },
  rhino: { temple: 91, cheek: 102, jaw: 65, chin: 387, crown: 152, muzzle: "reptile", ears: "round" },
  eagle: { temple: 80, cheek: 97, jaw: 54, chin: 393, crown: 158, muzzle: "beak", ears: "tuft" },
  serpent: { temple: 80, cheek: 97, jaw: 50, chin: 398, crown: 166, muzzle: "reptile", ears: "none" },
  jackal: { temple: 73, cheek: 92, jaw: 37, chin: 389, crown: 166, muzzle: "canine", ears: "high" },
  sphinx: { temple: 80, cheek: 92, jaw: 61, chin: 379, crown: 157, muzzle: "human", ears: "small" },
  fish: { temple: 83, cheek: 95, jaw: 61, chin: 398, crown: 172, muzzle: "aquatic", ears: "none" },
};

const featureNames = {
  antlers: "astas ramificadas", armor: "armadura labrada", book: "grimorio", compass: "brújula",
  crown: "diadema", earTuft: "penachos", eyeMask: "marcas alrededor de los ojos", feathers: "plumas",
  fin: "aletas", flames: "llamas", flower: "flores", frill: "gola ósea", gills: "branquias",
  glasses: "lentes", halo: "aureola", hammer: "martillo", hood: "capucha", horns: "cuernos",
  leaves: "hojas", lightning: "rayos", lyre: "lira", mane: "melena", rune: "runas",
  scales: "escamas", scalesOfJustice: "balanza", shell: "caparazón", staff: "bastón",
  sword: "espada", tentacles: "tentáculos", tusks: "colmillos", vial: "frasco", wings: "alas",
};

function hash(value) {
  let number = 2166136261;
  for (const character of value) {
    number = Math.imul(number ^ character.charCodeAt(0), 16777619);
  }
  return number >>> 0;
}

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function mix(first, second, weight = 0.5) {
  const a = Number.parseInt(first.slice(1), 16);
  const b = Number.parseInt(second.slice(1), 16);
  const component = shift =>
    Math.round((a >> shift & 255) * (1 - weight) + (b >> shift & 255) * weight);
  return "#" + ((component(16) << 16) | (component(8) << 8) | component(0)).toString(16).padStart(6, "0");
}

function profile(id) {
  const value = PORTRAIT_PROFILES[id] ?? profileFallback;
  return { id, ...value };
}

function profileForParent(id, state, fallbackLineage) {
  const parents = state?.fusions?.[id]?.lineage ?? fallbackLineage;
  if (PORTRAIT_PROFILES[id] || fallbackLineage.includes(id)) return [profile(id)];
  return parents.map(profile);
}

export function fusionPortraitSpec(card, state, level = 1) {
  if (!["fusion", "aberration"].includes(card?.category) || typeof card.id !== "string") return null;
  const lineage = card.lineage?.length ? [...new Set(card.lineage)].sort() : [];
  const parentIds = card.parents?.slice().sort() ?? [];
  const first = profileForParent(parentIds[0], state, lineage.slice(0, Math.ceil(lineage.length / 2)));
  const second = profileForParent(parentIds[1], state, lineage.slice(Math.ceil(lineage.length / 2)));
  const groups = [
    first.length ? first : [profile(lineage[0])],
    second.length ? second : [profile(lineage.at(-1))],
  ];
  const pick = (group, salt) => {
    const strong = group.filter(item => item.face !== "human");
    const options = strong.length ? strong : group;
    return options[hash(card.id + salt) % options.length];
  };
  const sides = groups.map((group, index) => pick(group, String(index)));
  if (sides.some(item => item.face === "human") && sides.some(item => item.face !== "human")) {
    const beast = sides.find(item => item.face !== "human");
    const index = sides.findIndex(item => item.face === "human");
    sides[index] = {
      ...sides[index],
      face: beast.face,
      texture: beast.texture,
      colors: beast.colors.map((item, i) => mix(item, sides[index].colors[i], 0.31)),
    };
  }

  const features = groups.flatMap((group, side) =>
    group.flatMap(item => item.features.slice(0, item.id === sides[side].id || group.length === 1 ? 3 : 2)
      .map(key => ({ key, side, id: item.id, accent: item.accent, base: item.colors[0] }))));
  const byKey = new Map();
  for (const feature of features) {
    if (!byKey.has(feature.key) || sides[feature.side].id === feature.id) byKey.set(feature.key, feature);
  }
  const spec = {
    id: card.id,
    seed: hash(card.id),
    level: Number.isInteger(level) ? Math.min(3, Math.max(1, level)) : 1,
    rarity: card.rarity,
    defect: card.category === "aberration" ? card.defect : null,
    generation: card.generation ?? 1,
    groups,
    lineages: lineage,
    sides,
    features: [...byKey.values()],
  };
  return { ...spec, anatomy: planAnatomy(spec) };
}

export function describeFusionPortrait(card, state) {
  const spec = fusionPortraitSpec(card, state);
  if (!spec) return "";
  const traits = spec.groups.map(group => {
    const identity = group.map(item => item.visual).filter(Boolean);
    const feature = group.flatMap(item => item.features.slice(0, 1)).map(id => featureNames[id]).filter(Boolean);
    return [...new Set(identity.length ? identity : feature)].join(" y ");
  });
  return [...new Set(traits.filter(Boolean))].join(" con ");
}

function shape(ctx, outline, fill, stroke, width = 1) {
  ctx.beginPath();
  outline(ctx);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function oval(ctx, x, y, rx, ry, fill, stroke, angle = 0, width = 1) {
  shape(ctx, path => path.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2), fill, stroke, width);
}

function line(ctx, color, width, outline) {
  shape(ctx, outline, null, color, width);
}

function polygon(ctx, points, fill, stroke, width) {
  shape(ctx, path => {
    path.moveTo(...points[0]);
    for (const point of points.slice(1)) path.lineTo(...point);
    path.closePath();
  }, fill, stroke, width);
}

function gradient(ctx, x1, y1, x2, y2, stops) {
  const fill = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [position, color] of stops) fill.addColorStop(position, color);
  return fill;
}

function radial(ctx, x, y, radius, stops) {
  const fill = ctx.createRadialGradient(x, y, 0, x, y, radius);
  for (const [position, color] of stops) fill.addColorStop(position, color);
  return fill;
}

function circle(ctx, x, y, radius, stroke, width) {
  oval(ctx, x, y, radius, radius, null, stroke, 0, width);
}

function background(ctx, spec, random) {
  const left = spec.sides[0].accent;
  const right = spec.sides[1].accent;
  ctx.fillStyle = "#100b1b";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = radial(ctx, 217, 188, 300, [[0, left + "45"], [0.55, left + "0f"], [1, left + "00"]]);
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = radial(ctx, 432, 202, 290, [[0, right + "47"], [0.59, right + "20"], [1, right + "00"]]);
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 180; i += 1) {
    const x = 45 + random() * 550;
    const y = 20 + random() * 430;
    const size = random() ** 2 * 1.7;
    oval(ctx, x, y, Math.max(0.2, size), Math.max(0.2, size), i % 2 ? left + "51" : right + "55");
  }
  const ring = mix(left, right) + "58";
  for (const radius of [175, 183, 210]) {
    circle(ctx, CENTER, 249, radius, ring, radius === 183 ? 1.3 : 0.65);
  }
  ctx.setLineDash([2, 9]);
  circle(ctx, CENTER, 249, 200, ring, 2);
  ctx.setLineDash([]);
  for (let i = 0; i < 16; i += 1) {
    const angle = i * Math.PI / 8;
    const x = CENTER + Math.cos(angle) * 210;
    const y = 249 + Math.sin(angle) * 210;
    polygon(ctx, [[x - 4, y], [x, y - 6], [x + 4, y], [x, y + 6]], "#251931", ring, 0.8);
  }
  if (spec.level > 1) {
    const rays = spec.level === 3 ? 20 : 10;
    for (let i = 0; i < rays; i += 1) {
      const theta = (i * 2 * Math.PI) / rays + spec.level * 0.17;
      const center = 234;
      const outer = 241 + (i % 4) * 9;
      line(ctx, (i % 2 ? left : right) + "5e", 1.1, p => {
        p.moveTo(CENTER + center * Math.cos(theta), 246 + center * Math.sin(theta));
        p.lineTo(CENTER + outer * Math.cos(theta - 0.017), 246 + outer * Math.sin(theta - 0.017));
      });
    }
  }
  if (spec.rarity > 1) {
    const gleam = mix(left, right, 0.35);
    for (let i = 0; i < 15 + spec.rarity * 4; i += 1) {
      const x = 75 + random() * 490;
      const y = 56 + random() * 370;
      const size = 2 + random() * (spec.rarity + 2);
      polygon(ctx, [[x - size, y], [x, y - size * 1.6], [x + size, y], [x, y + size * 1.6]], gleam + "83");
    }
  }
}

function surfaceTexture(ctx, item, random, bounds, amount) {
  const [x, y, width, height] = bounds;
  const light = item.colors[2] + "39";
  const dark = item.colors[1] + "66";
  for (let i = 0; i < amount; i += 1) {
    const px = x + random() * width;
    const py = y + random() * height;
    const length = 1 + random() * 10;
    const s = px < CENTER ? -1 : 1;
    if (item.texture === "scales" || item.texture === "bone") {
      line(ctx, i % 3 ? light : dark, 0.6 + random() * 0.7, path => {
        path.moveTo(px - length / 2, py);
        path.quadraticCurveTo(px, py + length * 0.66, px + length / 2, py);
      });
    } else if (item.texture === "fur" || item.texture === "feathers") {
      line(ctx, i % 3 ? light : dark, 0.5 + random() * 0.9, path => {
        path.moveTo(px, py);
        path.quadraticCurveTo(px + length * 0.55 * s, py + length * 0.33, px + length * s, py + length);
      });
    } else {
      const dot = 0.25 + random() * 1.45;
      oval(ctx, px, py, dot, dot * 0.75, i % 3 ? light : dark);
    }
  }
}

function wings(ctx, color, base, type) {
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    const outline = p => {
      p.moveTo(54, 371);
      p.bezierCurveTo(99, 234, 198, 224, 253, 113);
      if (type === "feathers") {
        p.bezierCurveTo(278, 117, 275, 159, 246, 194);
        p.bezierCurveTo(281, 162, 284, 183, 258, 225);
        p.bezierCurveTo(279, 210, 266, 249, 233, 274);
        p.bezierCurveTo(260, 253, 235, 301, 204, 321);
        p.bezierCurveTo(231, 310, 204, 350, 175, 361);
        p.bezierCurveTo(196, 356, 164, 386, 82, 410);
      } else {
        p.bezierCurveTo(253, 174, 263, 207, 277, 222);
        p.bezierCurveTo(260, 238, 247, 245, 249, 263);
        p.bezierCurveTo(225, 264, 207, 282, 213, 306);
        p.bezierCurveTo(185, 305, 165, 328, 169, 351);
        p.bezierCurveTo(129, 335, 112, 370, 82, 410);
      }
      p.closePath();
    };
    shape(ctx, outline, gradient(ctx, 30, 360, 241, 134, [[0, "#120d23"], [0.4, base], [1, color + "a9"]]), color + "a8", 1.3);
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 8; i += 1) {
      line(ctx, color + (i % 2 ? "48" : "88"), 0.8, p => {
        p.moveTo(67, 377);
        p.quadraticCurveTo(168 + i * 8, 245 + i * 4, 253, 116 + i * 21);
      });
      if (type === "feathers") {
        line(ctx, color + "6a", 0.9, p => {
          p.moveTo(134 + i * 14, 286 - i * 10);
          p.quadraticCurveTo(196 + i * 5, 291 - i * 6, 199 + i * 8, 369 - i * 23);
        });
      }
    }
    ctx.restore();
    ctx.restore();
  }
}

function tentacles(ctx, color, base) {
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    for (let i = 0; i < 3; i += 1) {
      const ascent = i * 42;
      const outline = p => {
        p.moveTo(59, 395 - ascent);
        p.bezierCurveTo(151, 399 - ascent, 146, 318 - ascent, 215, 302 - ascent);
        p.bezierCurveTo(258, 294 - ascent, 264, 343 - ascent, 232, 347 - ascent);
        p.bezierCurveTo(218, 351 - ascent, 214, 339 - ascent, 228, 334 - ascent);
        p.bezierCurveTo(244, 325 - ascent, 224, 310 - ascent, 206, 325 - ascent);
        p.bezierCurveTo(167, 361 - ascent, 179, 423 - ascent, 75, 434 - ascent);
        p.closePath();
      };
      shape(ctx, outline, gradient(ctx, 65, 399 - ascent, 242, 304 - ascent, [[0, "#171026"], [0.56, base], [1, color]]), color + "bc", 1.1);
      for (let j = 0; j < 7; j += 1) {
        const t = j / 7;
        oval(ctx, 152 + t * 67, 392 - ascent - t * 76, 3.4 - t * 1.8, 2.2 - t * 0.9,
          base, color + "a3", -0.7, 0.8);
      }
    }
    ctx.restore();
  }
}

function frill(ctx, color, base, isFin) {
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    const outline = p => {
      p.moveTo(35, 336);
      p.bezierCurveTo(104, 336, 152, 297, 166, 252);
      p.bezierCurveTo(178, 224, 158, 198, 141, 193);
      p.bezierCurveTo(162, 161, 138, 148, 128, 143);
      p.bezierCurveTo(147, 126, 129, 115, 116, 108);
      p.bezierCurveTo(120, 87, 98, 76, 82, 82);
      p.bezierCurveTo(64, 66, 45, 78, 37, 109);
      p.closePath();
    };
    shape(ctx, outline, gradient(ctx, 36, 262, 173, 157, [[0, "#0e101e"], [0.55, base], [1, color + "c0"]]), color + "ba", 1.7);
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 8; i += 1) {
      line(ctx, color + (i % 2 ? "65" : "98"), isFin ? 1 : 2, p => {
        p.moveTo(57, 205 + i * 12);
        p.bezierCurveTo(126, 207 + i * 10, 165, 133 + i * 8, 177, 106 + i * 24);
      });
    }
    ctx.restore();
    ctx.restore();
  }
}

function branchingHorns(ctx, item, branched) {
  const light = mix(item.accent, "#e6d2bd", 0.6);
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    const outline = p => {
      p.moveTo(66, 198);
      p.bezierCurveTo(141, 178, 141, 111, 170, 69);
      p.bezierCurveTo(181, 52, 197, 49, 199, 49);
      p.bezierCurveTo(179, 73, 179, 98, 175, 125);
      p.bezierCurveTo(171, 175, 133, 210, 95, 218);
      p.closePath();
    };
    if (branched) {
      line(ctx, light, 10, p => {
        p.moveTo(147, 146);
        p.quadraticCurveTo(132, 119, 135, 98);
        p.lineTo(123, 76);
        p.moveTo(159, 133);
        p.quadraticCurveTo(191, 114, 200, 88);
      });
      line(ctx, "#d3c0a3", 4, p => {
        p.moveTo(132, 107);
        p.lineTo(119, 103);
        p.lineTo(105, 92);
        p.moveTo(193, 104);
        p.lineTo(218, 96);
      });
    }
    shape(ctx, outline, gradient(ctx, 70, 206, 180, 108, [[0, item.base], [0.64, light], [1, "#f9e4c4"]]), "#e8d7c48f", 1.15);
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 15; i += 1) {
      const x = 90 + i * 5;
      line(ctx, "#47273b74", 0.8, p => {
        p.moveTo(x, 128 + Math.sin(i / 5) * 42);
        p.quadraticCurveTo(x + 7, 154 + Math.sin(i / 7) * 35, x + 29, 171);
      });
    }
    ctx.restore();
    ctx.restore();
  }
}

function ears(ctx, side, form, item) {
  if (form.ears === "none") return;
  ctx.save();
  ctx.translate(CENTER, 0);
  ctx.scale(side ? 1 : -1, 1);
  const hue = item.colors;
  const outline = p => {
    p.moveTo(47, 210);
    if (form.ears === "small") {
      p.bezierCurveTo(68, 204, 99, 211, 97, 240);
      p.bezierCurveTo(91, 266, 76, 272, 65, 264);
    } else if (form.ears === "broad") {
      p.bezierCurveTo(120, 118, 187, 129, 197, 220);
      p.bezierCurveTo(201, 295, 166, 335, 75, 288);
    } else if (form.ears === "round") {
      p.bezierCurveTo(78, 144, 139, 156, 135, 205);
      p.bezierCurveTo(131, 237, 97, 247, 64, 242);
    } else {
      const height = form.ears === "high" ? 83 : form.ears === "tuft" ? 124 : 106;
      p.bezierCurveTo(57, 178, 100, height + 20, 126, height);
      p.bezierCurveTo(131, height + 30, 147, 191, 104, 241);
    }
    p.closePath();
  };
  shape(ctx, outline, gradient(ctx, 62, 222, 143, 104, [[0, hue[1]], [0.56, hue[0]], [1, hue[2]]]), hue[2] + "9e", 1.4);
  line(ctx, item.accent + "90", 1.5, p => {
    if (form.ears === "small") {
      p.moveTo(78, 248);
      p.quadraticCurveTo(91, 229, 80, 224);
    } else {
      p.moveTo(70, 215);
      p.quadraticCurveTo(101, 205, form.ears === "broad" ? 168 : 117, form.ears === "round" ? 187 : 143);
    }
  });
  ctx.restore();
}

function collar(ctx, spec, random) {
  const first = spec.sides[0].colors;
  const second = spec.sides[1].colors;
  const outline = p => {
    p.moveTo(254, 273);
    p.bezierCurveTo(247, 342, 174, 354, 134, 406);
    p.bezierCurveTo(107, 435, 91, 467, 81, 512);
    p.lineTo(562, 512);
    p.bezierCurveTo(541, 447, 520, 418, 477, 388);
    p.bezierCurveTo(426, 356, 397, 354, 394, 290);
    p.closePath();
  };
  shape(ctx, outline, gradient(ctx, 105, 470, 533, 456, [[0, first[1]], [0.28, first[0]], [0.51, mix(first[1], second[1])], [0.77, second[0]], [1, second[1]]]),
    mix(first[2], second[2]) + "a6", 1.4);
  ctx.save();
  ctx.clip();
  surfaceTexture(ctx, spec.sides[0], random, [80, 276, 240, 235], 195);
  surfaceTexture(ctx, spec.sides[1], random, [320, 276, 240, 235], 195);
  const medallion = mix(spec.sides[0].accent, spec.sides[1].accent);
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    line(ctx, medallion + "b0", 1.6, p => {
      p.moveTo(15, 459);
      p.bezierCurveTo(74, 424, 127, 394, 211, 392);
      p.moveTo(24, 485);
      p.quadraticCurveTo(114, 433, 212, 423);
    });
    for (let i = 0; i < 13; i += 1) {
      const x = i * 14;
      const y = 477 - Math.sin(i / 20 * Math.PI) * 58;
      line(ctx, medallion + "78", 0.85, p => {
        p.moveTo(x, y);
        p.lineTo(x + 2, y - 11);
        p.lineTo(x + 8, y - 17);
      });
    }
    ctx.restore();
  }
  ctx.restore();
}

function faceOutline(left, right) {
  return p => {
    p.moveTo(CENTER, (left.crown + right.crown) / 2 - 4);
    p.bezierCurveTo(CENTER + right.temple * 0.71, right.crown - 16, CENTER + right.temple, 196, CENTER + right.temple, 227);
    p.bezierCurveTo(CENTER + right.temple, 247, CENTER + right.cheek * 0.94, 250, CENTER + right.cheek, 287);
    p.bezierCurveTo(CENTER + right.cheek * 0.91, 316, CENTER + right.jaw, right.chin - 19, CENTER + right.jaw * 0.64, right.chin - 13);
    p.quadraticCurveTo(CENTER + right.jaw * 0.3, right.chin + 2, CENTER, (left.chin + right.chin) / 2);
    p.quadraticCurveTo(CENTER - left.jaw * 0.3, left.chin + 2, CENTER - left.jaw * 0.64, left.chin - 13);
    p.bezierCurveTo(CENTER - left.jaw, left.chin - 19, CENTER - left.cheek * 0.91, 316, CENTER - left.cheek, 287);
    p.bezierCurveTo(CENTER - left.cheek * 0.94, 250, CENTER - left.temple, 247, CENTER - left.temple, 227);
    p.bezierCurveTo(CENTER - left.temple, 196, CENTER - left.temple * 0.71, left.crown - 16, CENTER, (left.crown + right.crown) / 2 - 4);
    p.closePath();
  };
}

function eyes(ctx, spec, forms, options) {
  for (const side of options.eyeLimb ? [1] : [0, 1]) {
    const sign = side === 0 ? -1 : 1;
    const item = spec.sides[side];
    const face = forms[side];
    const accent = item.accent;
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    const well = (item.face === "owl" || item.face === "eagle") ? 29 : 23;
    oval(ctx, 44, 257, well + 13, well + 19, radial(ctx, 45, 261, well + 19, [[0, "#160d24f7"], [0.68, item.colors[1] + "c6"], [1, item.colors[0] + "00"]]));
    line(ctx, item.colors[2] + "ae", 1.55, p => {
      p.moveTo(18, 247);
      p.bezierCurveTo(33, 226, 56, 220, face.temple * 0.86, 244);
      p.moveTo(25, 267);
      p.quadraticCurveTo(45, 285, 68, 266);
    });
    const eye = p => {
      p.moveTo(24, 251);
      p.quadraticCurveTo(48, 231, 72, 247);
      p.quadraticCurveTo(52, 270, 24, 251);
      p.closePath();
    };
    shape(ctx, eye, gradient(ctx, 43, 236, 49, 264, [[0, "#170e24"], [0.54, accent], [1, mix(accent,"#faffed",0.72)]]), "#ead2dbbd", 1.05);
    ctx.save();
    ctx.clip();
    const slit = ["reptile", "shark", "canine"].includes(face.muzzle);
    oval(ctx, 48, 251, slit ? 3.7 : 7, 11, "#0f091b");
    oval(ctx, 51, 246, 2.3, 2.2, "#fcf0f9");
    ctx.restore();
    ctx.restore();
  }
}

function aquaticMuzzle(ctx, type, stroke, fill, dark) {
  if (type === "shark") {
    shape(ctx, p => {
      p.moveTo(259, 328);
      p.bezierCurveTo(285, 294, 353, 295, 381, 328);
      p.quadraticCurveTo(350, 362, 320, 365);
      p.quadraticCurveTo(291, 362, 259, 328);
      p.closePath();
    }, "#1b1021", stroke, 1.4);
    for (const sign of [-1, 1]) {
      for (let i = 0; i < 5; i += 1) {
        const x = CENTER + sign * (8 + i * 10);
        const y = 306 + i * i * 0.71;
        polygon(ctx, [[x - 4, y], [x + 4, y], [x - sign * 1.6, y + 13]], "#e4e1d3", dark, 0.7);
        if (i < 4) {
          const lower = 361 - i * i;
          polygon(ctx, [[x - 3.8, lower], [x + 3.8, lower], [x + sign * 1.5, lower - 10]], "#d4cdcc", dark, 0.6);
        }
      }
    }
    line(ctx, stroke, 1.05, p => {
      p.moveTo(269, 313);
      p.quadraticCurveTo(321, 274, 371, 312);
    });
    return;
  }
  if (type === "tentacled") {
    for (let offset = -3; offset <= 3; offset += 1) {
      if (offset === 0) continue;
      const x = CENTER + offset * 13;
      shape(ctx, p => {
        p.moveTo(x - 7, 300);
        p.quadraticCurveTo(x + offset * 4, 326, x + offset * 11, 340 + Math.abs(offset) * 4);
        p.quadraticCurveTo(x + offset * 17, 349, x + offset * 12, 366);
        p.quadraticCurveTo(x + offset * 7, 355, x + offset * 5, 352);
        p.quadraticCurveTo(x + offset, 348, x + 7, 300);
        p.closePath();
      }, fill, stroke, 0.9);
    }
  }
  shape(ctx, p => {
    p.moveTo(270, 326);
    p.bezierCurveTo(280, 296, 300, 284, 320, 290);
    p.bezierCurveTo(340, 284, 360, 296, 370, 326);
    p.quadraticCurveTo(320, 363, 270, 326);
    p.closePath();
  }, fill, stroke, 1.05);
  for (const sign of [-1, 1]) {
    oval(ctx, CENTER + sign * 16, 312, 4.2, 2.15, dark, stroke, sign * 0.38, 0.65);
  }
  line(ctx, dark, 2.2, p => {
    p.moveTo(273, 326);
    p.quadraticCurveTo(319, 351, 366, 325);
  });
}

function reptileMuzzle(ctx, stroke, fill, dark) {
  shape(ctx, p => {
    p.moveTo(292, 271);
    p.quadraticCurveTo(319, 256, 347, 271);
    p.bezierCurveTo(349, 286, 346, 302, 364, 323);
    p.quadraticCurveTo(362, 350, 321, 356);
    p.quadraticCurveTo(278, 350, 276, 323);
    p.bezierCurveTo(293, 306, 289, 287, 292, 271);
    p.closePath();
  }, fill, stroke, 1.25);
  for (const sign of [-1, 1]) {
    oval(ctx, CENTER + sign * 22, 314, 7, 3, dark, stroke, sign * 0.55, 0.8);
    polygon(ctx, [[CENTER + sign * 29 - 4, 334], [CENTER + sign * 29 + 4, 334], [CENTER + sign * 30, 347]], "#eddcc8", dark, 0.7);
  }
  line(ctx, dark, 2, p => {
    p.moveTo(278, 328);
    p.quadraticCurveTo(298, 338, 320, 336);
    p.quadraticCurveTo(346, 338, 362, 328);
  });
  line(ctx, stroke, 1.2, p => {
    p.moveTo(321, 278);
    p.lineTo(323, 292);
    p.lineTo(317, 303);
    p.lineTo(320, 318);
  });
}

function muzzle(ctx, forms, spec) {
  const a = forms[0].muzzle;
  const b = forms[1].muzzle;
  const dominant = a === b ? a : a === "human" ? b : b === "human" ? a :
    [a, b].includes("trunk") ? "trunk" : [a, b].includes("beak") ? "beak" :
    [a, b].includes("shark") ? "shark" : spec.seed % 2 ? a : b;
  const light = mix(spec.sides[0].colors[2], spec.sides[1].colors[2]);
  const mid = mix(spec.sides[0].colors[0], spec.sides[1].colors[0]);
  const dark = mix(spec.sides[0].colors[1], spec.sides[1].colors[1]);
  const shading = gradient(ctx, CENTER, 278, CENTER, 371, [[0, light + "96"], [0.44, mid], [1, dark]]);
  if (dominant === "beak") {
    shape(ctx, p => {
      p.moveTo(294, 281);
      p.quadraticCurveTo(320, 254, 346, 281);
      p.bezierCurveTo(346, 293, 342, 310, 319, 343);
      p.bezierCurveTo(314, 330, 300, 320, 304, 309);
      p.quadraticCurveTo(296, 295, 294, 281);
      p.closePath();
    }, gradient(ctx, 298, 281, 340, 324, [[0, light], [0.39, "#d6ad85"], [1, "#472943"]]), light + "9f", 1.4);
    line(ctx, "#f5e3cd84", 1.05, p => {
      p.moveTo(321, 277);
      p.quadraticCurveTo(313, 305, 320, 327);
    });
    return;
  }
  if (dominant === "trunk") {
    shape(ctx, p => {
      p.moveTo(290, 273);
      p.bezierCurveTo(293, 313, 271, 380, 292, 420);
      p.bezierCurveTo(308, 452, 366, 432, 358, 404);
      p.bezierCurveTo(355, 393, 340, 392, 335, 404);
      p.bezierCurveTo(344, 423, 311, 419, 320, 389);
      p.bezierCurveTo(343, 350, 353, 304, 350, 271);
      p.closePath();
    }, shading, light + "a0", 1.35);
    for (let i = 0; i < 10; i += 1) {
      const y = 286 + i * 12;
      line(ctx, light + "73", 0.75, p => {
        p.moveTo(300 - Math.min(i, 5) * 2, y);
        p.quadraticCurveTo(318, y + 6, 344 - Math.min(i, 7) * 2, y);
      });
    }
    return;
  }
  if (dominant === "human") {
    line(ctx, dark + "bd", 1.55, p => {
      p.moveTo(315, 271);
      p.quadraticCurveTo(313, 294, 305, 310);
      p.quadraticCurveTo(320, 321, 333, 310);
      p.moveTo(297, 332);
      p.quadraticCurveTo(312, 326, 321, 332);
      p.quadraticCurveTo(328, 327, 343, 333);
      p.quadraticCurveTo(322, 347, 299, 334);
    });
    line(ctx, light + "96", 1.25, p => {
      p.moveTo(320, 274);
      p.quadraticCurveTo(321, 291, 315, 303);
      p.moveTo(308, 335);
      p.quadraticCurveTo(319, 342, 334, 335);
    });
    return;
  }
  if (dominant === "aquatic" || dominant === "tentacled" || dominant === "shark") {
    aquaticMuzzle(ctx, dominant, light + "b0", shading, dark);
    return;
  }
  if (dominant === "reptile") {
    reptileMuzzle(ctx, light + "b0", shading, dark);
    return;
  }
  const broad = dominant === "bear";
  const edge = broad ? 46 : 34;
  shape(ctx, p => {
    p.moveTo(CENTER - 21, 269);
    p.quadraticCurveTo(CENTER - 11, 260, CENTER + 20, 269);
    p.bezierCurveTo(CENTER + 25, 299, CENTER + edge + 11, 307, CENTER + edge, 336);
    p.quadraticCurveTo(CENTER, 368, CENTER - edge, 335);
    p.bezierCurveTo(CENTER - edge - 10, 307, CENTER - 26, 296, CENTER - 21, 269);
    p.closePath();
  }, shading, light + "68", 1.1);
  const nose = broad ? 22 : 17;
  shape(ctx, p => {
    p.moveTo(CENTER - nose, 308);
    p.quadraticCurveTo(CENTER, 298, CENTER + nose, 308);
    p.quadraticCurveTo(CENTER + nose, 319, CENTER, 327);
    p.quadraticCurveTo(CENTER - nose, 318, CENTER - nose, 308);
    p.closePath();
  }, "#171020", light + "9d", 0.9);
  line(ctx, "#150c1b", 2, p => {
    p.moveTo(CENTER, 326);
    p.lineTo(CENTER, 339);
    p.moveTo(CENTER - edge, 332);
    p.quadraticCurveTo(CENTER, 350, CENTER + edge, 333);
  });
  if (["shark", "reptile", "canine"].includes(dominant) || ["shark", "reptile", "canine"].includes(a === dominant ? b : a)) {
    for (const sign of [-1, 1]) {
      const x = CENTER + sign * (edge - 8);
      polygon(ctx, [[x - 3, 338], [x + 4, 338], [x, 350]], "#e6d8c5", dark, 0.7);
    }
  }
}

function face(ctx, spec, forms, random, options = {}) {
  const first = spec.sides[0].colors;
  const second = spec.sides[1].colors;
  const outline = faceOutline(...forms);
  const fill = gradient(ctx, 214, 238, 425, 247, [[0, first[1]], [0.23, first[0]], [0.47, mix(first[2], first[0], 0.47)], [0.65, second[0]], [1, second[1]]]);
  shape(ctx, outline, fill, mix(first[2], second[2]), 1.7);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = radial(ctx, 307, 225, 161, [[0, "#efcbda42"], [0.54, "#ddc7c213"], [1, "#0b061ad4"]]);
  ctx.fillRect(183, 129, 279, 302);
  surfaceTexture(ctx, spec.sides[0], random, [202, 140, 119, 247], 170);
  surfaceTexture(ctx, spec.sides[1], random, [319, 140, 119, 247], 170);
  const brow = mix(first[2], second[2]);
  line(ctx, brow + "96", 1.4, p => {
    p.moveTo(269, 199);
    p.bezierCurveTo(280, 186, 296, 185, 306, 209);
    p.quadraticCurveTo(313, 224, 320, 236);
    p.quadraticCurveTo(326, 223, 334, 207);
    p.bezierCurveTo(340, 190, 357, 187, 370, 198);
  });
  if (forms.some(form => form.ears === "tuft")) {
    for (let i = 0; i < 21; i += 1) {
      const x = 241 + i * 7.5;
      oval(ctx, x, 208 - Math.sin(i / 20 * Math.PI) * 28, 2.3, 7.5, brow + "69", null, (x - CENTER) / 70);
    }
  }
  ctx.restore();
  eyes(ctx, spec, forms, options);
  muzzle(ctx, forms, spec);
}

function mane(ctx, item) {
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    for (let i = 0; i < 7; i += 1) {
      const y = 229 + i * 16;
      const width = 136 + Math.sin(i / 8 * Math.PI) * 35;
      shape(ctx, p => {
        p.moveTo(63, y - 33);
        p.quadraticCurveTo(width - 14, y - 29, width, y + 9);
        p.quadraticCurveTo(width - 13, y + 5, width - 6, y + 26);
        p.quadraticCurveTo(width - 49, y + 1, 62, y + 31);
        p.closePath();
      }, gradient(ctx, 81, y, width, y, [[0, "#140f22"], [0.64, item.base], [1, item.accent + "a4"]]), item.accent + "64", 0.7);
    }
    ctx.restore();
  }
}

function hood(ctx, item) {
  shape(ctx, p => {
    p.moveTo(161, 363);
    p.bezierCurveTo(171, 270, 199, 199, 258, 139);
    p.bezierCurveTo(292, 105, 311, 111, 321, 98);
    p.bezierCurveTo(335, 115, 355, 110, 397, 152);
    p.bezierCurveTo(453, 204, 476, 310, 485, 371);
    p.bezierCurveTo(452, 407, 415, 438, 373, 440);
    p.bezierCurveTo(433, 362, 423, 291, 406, 230);
    p.bezierCurveTo(384, 163, 356, 154, 322, 148);
    p.bezierCurveTo(264, 150, 240, 192, 227, 243);
    p.bezierCurveTo(202, 315, 217, 394, 260, 439);
    p.bezierCurveTo(225, 439, 179, 414, 161, 363);
    p.closePath();
  }, gradient(ctx, 208, 133, 437, 441, [[0, "#21132a"], [0.31, item.base], [0.75, "#34213f"], [1, "#141022"]]), item.accent + "a0", 1.4);
  for (const sign of [-1, 1]) {
    line(ctx, item.accent + "8a", 1.1, p => {
      p.moveTo(CENTER, 128);
      p.bezierCurveTo(CENTER + sign * 103, 145, CENTER + sign * 116, 207, CENTER + sign * 138, 337);
      p.bezierCurveTo(CENTER + sign * 143, 366, CENTER + sign * 112, 402, CENTER + sign * 86, 412);
    });
  }
}

function plumes(ctx, item, count = 10) {
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    for (let i = count; i > 0; i -= 1) {
      const x = 15 + i * 11;
      const y = 158 - Math.sin(i / (count + 1) * Math.PI) * 63 + (i > 7 ? (i - 7) * 9 : 0);
      shape(ctx, p => {
        p.moveTo(12 + i * 6, 211);
        p.bezierCurveTo(x + 19, y + 53, x + 19, y + 9, x + 4, y - 5);
        p.bezierCurveTo(x - 7, y + 16, x - 14, y + 36, 9 + i * 6, 213);
        p.closePath();
      }, gradient(ctx, x + 4, y, 30 + i * 6, 218, [[0, item.accent], [0.32, item.base], [1, "#1c1327"]]), item.accent + "6b", 0.7);
      line(ctx, item.accent + "a1", 0.6, p => {
        p.moveTo(x + 5, y + 1);
        p.quadraticCurveTo(x + 3, y + 45, 13 + i * 6, 210);
      });
    }
    ctx.restore();
  }
}

function flames(ctx, item) {
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    const outline = p => {
      p.moveTo(125, 390);
      p.bezierCurveTo(56, 265, 159, 230, 100, 116);
      p.bezierCurveTo(136, 126, 159, 174, 151, 238);
      p.bezierCurveTo(192, 208, 199, 145, 171, 98);
      p.bezierCurveTo(263, 161, 221, 230, 230, 248);
      p.bezierCurveTo(250, 221, 242, 204, 257, 190);
      p.bezierCurveTo(260, 246, 282, 296, 228, 356);
      p.quadraticCurveTo(200, 380, 125, 390);
      p.closePath();
    };
    shape(ctx, outline, gradient(ctx, 70, 338, 223, 113, [[0, "#171224"], [0.4, item.base + "ba"], [0.66, item.accent + "cd"], [1, "#ffe7bd"]]), item.accent + "a1", 1.3);
    ctx.restore();
  }
}

function lightning(ctx, item) {
  for (const sign of [-1, 1]) {
    const x = CENTER + sign * 171;
    const bolt = p => {
      p.moveTo(x + sign * 15, 95);
      p.lineTo(x - sign * 29, 187);
      p.lineTo(x + sign * 16, 179);
      p.lineTo(x - sign * 13, 254);
      p.lineTo(x + sign * 38, 226);
      p.lineTo(x + sign * 18, 315);
    };
    line(ctx, item.accent + "55", 8, bolt);
    line(ctx, mix(item.accent,"#fff5f2",0.58), 1.7, bolt);
    line(ctx, item.accent + "82", 1.2, p => {
      p.moveTo(x - sign * 16, 214);
      p.lineTo(x + sign * 1, 211);
      p.lineTo(x + sign * 18, 199);
      p.moveTo(x + sign * 31, 258);
      p.lineTo(x + sign * 54, 271);
      p.lineTo(x + sign * 68, 269);
    });
  }
}

function halo(ctx, item) {
  for (const radius of [109, 124]) {
    oval(ctx, CENTER, 149, radius, radius * 0.66, null, item.accent + "9c", 0, radius === 109 ? 1.6 : 0.8);
  }
  for (let i = 0; i < 20; i += 1) {
    const angle = i * Math.PI / 10;
    const distance = 136 + (i % 4 === 0 ? 13 : 0);
    line(ctx, item.accent + "9b", 1.4, p => {
      p.moveTo(CENTER + Math.cos(angle) * 125, 149 + Math.sin(angle) * 83);
      p.lineTo(CENTER + Math.cos(angle) * distance, 149 + Math.sin(angle) * distance * 0.66);
    });
  }
}

function tusks(ctx, item) {
  const light = mix(item.accent, "#f9e8cf", 0.77);
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    shape(ctx, p => {
      p.moveTo(46, 323);
      p.bezierCurveTo(95, 373, 145, 344, 158, 280);
      p.bezierCurveTo(177, 350, 119, 419, 62, 381);
      p.quadraticCurveTo(38, 368, 38, 342);
      p.closePath();
    }, gradient(ctx, 37, 365, 159, 288, [[0, item.base], [0.56, light], [1, "#fff2cf"]]), light, 0.95);
    ctx.restore();
  }
}

function gills(ctx, item, fin) {
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    for (let i = 0; i < 4; i += 1) {
      const y = 268 + i * 14;
      line(ctx, "#25162f", 4.5, p => {
        p.moveTo(66, y - 11);
        p.quadraticCurveTo(94, y - 5, 104 - i * 2, y + 9);
      });
      line(ctx, item.accent + "b7", 1.55, p => {
        p.moveTo(66, y - 13);
        p.quadraticCurveTo(95, y - 7, 105 - i * 2, y + 7);
      });
      if (fin) {
        shape(ctx, p => {
          p.moveTo(98 - i, y + 4);
          p.quadraticCurveTo(126, y - 25, 156 - i * 4, y - 16);
          p.quadraticCurveTo(140, y + 6, 98 - i, y + 9);
          p.closePath();
        }, item.base, item.accent + "b7", 0.9);
      }
    }
    ctx.restore();
  }
}

function armor(ctx, item, shell) {
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(CENTER, 0);
    ctx.scale(sign, 1);
    for (let i = shell ? 4 : 2; i >= 0; i -= 1) {
      const x = 53 + i * 24;
      const y = 438 - Math.sin(i / 5 * Math.PI) * 49;
      const outline = p => {
        p.moveTo(x - 4, y + 18);
        p.quadraticCurveTo(x + 12, y - 27, x + 54, y - 24);
        p.quadraticCurveTo(x + 49, y - 7, x + 70, y + 18);
        p.quadraticCurveTo(x + 48, y + 34, x + 22, y + 39);
        p.closePath();
      };
      shape(ctx, outline, gradient(ctx, x, y - 17, x + 56, y + 35, [[0, item.accent + "f1"], [0.31, item.base], [0.73, "#27203a"], [1, item.accent + "96"]]),
        item.accent + "ba", 1.5);
      line(ctx, item.accent + "a0", 1, p => {
        p.moveTo(x + 4, y + 17);
        p.quadraticCurveTo(x + 26, y - 1, x + 44, y);
        p.lineTo(x + 57, y + 14);
      });
      oval(ctx, x + 44, y + 8, 2.3, 2.3, item.accent);
    }
    ctx.restore();
  }
}

function filigree(ctx, item, kind) {
  if (kind === "glasses") {
    for (const sign of [-1, 1]) {
      oval(ctx, CENTER + sign * 47, 252, 25, 17, item.accent + "18", item.accent + "e0", sign * -0.09, 2.8);
      oval(ctx, CENTER + sign * 47, 252, 22, 14, null, "#fff1d689", sign * -0.09, 0.8);
    }
    line(ctx, item.accent, 2.2, p => {
      p.moveTo(297, 251);
      p.quadraticCurveTo(320, 237, 343, 251);
    });
  } else if (kind === "eyeMask") {
    for (const sign of [-1, 1]) {
      line(ctx, item.accent + "cb", 2.5, p => {
        p.moveTo(CENTER + 23 * sign, 261);
        p.quadraticCurveTo(CENTER + 54 * sign, 295, CENTER + 84 * sign, 257);
      });
    }
  } else {
    const y = kind === "crown" ? 184 : 199;
    if (kind === "crown") {
      polygon(ctx, [[250, y + 2], [257, y - 22], [286, y - 11], [320, y - 39], [354, y - 13], [383, y - 22], [390, y + 2], [320, y + 22]],
        gradient(ctx, 250, y - 4, 390, y + 8, [[0, item.base], [0.51, item.accent], [1, item.base]]), item.accent, 1.2);
    }
    polygon(ctx, [[CENTER, y - 14], [CENTER + 11, y], [CENTER, y + 18], [CENTER - 11, y]],
      "#241a36", item.accent + "ed", 1.8);
    polygon(ctx, [[CENTER, y - 9], [CENTER + 5, y], [CENTER, y + 10], [CENTER - 5, y]],
      item.accent, "#fff3ebc2", 0.7);
  }
}

function sprigs(ctx, item, flower) {
  const sign = item.side === 0 ? -1 : 1;
  ctx.save();
  ctx.translate(CENTER, 0);
  ctx.scale(sign, 1);
  for (let i = 0; i < 7; i += 1) {
    const x = 106 + i * 12;
    const y = 438 - Math.sin(i / 8 * Math.PI) * 31;
    line(ctx, item.accent + "b5", 1.3, p => {
      p.moveTo(x - 14, y + 19);
      p.quadraticCurveTo(x, y - 3, x + 17, y - 12);
    });
    oval(ctx, x, y + 5, 5, 12, item.base, item.accent, 0.83);
    oval(ctx, x + 11, y - 5, 4, 9, item.accent + "ca", item.accent, 1.12);
    if (flower && i % 2 === 0) {
      for (let p = 0; p < 5; p += 1) {
        const angle = p * Math.PI * 2 / 5;
        oval(ctx, x + 17 + Math.cos(angle) * 4, y - 13 + Math.sin(angle) * 4, 3.3, 3.3, item.accent);
      }
      oval(ctx, x + 17, y - 13, 2.3, 2.3, "#f6c985");
    }
  }
  ctx.restore();
}

function toolMotif(ctx, item, position) {
  const [x, y, angle] = position;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const accent = item.accent;
  const metal = gradient(ctx, -26, -50, 24, 34, [[0, accent], [0.44, item.base], [0.7, "#3b2945"], [1, accent]]);
  switch (item.key) {
    case "hammer":
    case "staff":
    case "sword": {
      line(ctx, "#180f22", 9, p => { p.moveTo(0, -49); p.lineTo(0, 133); });
      line(ctx, accent + "e7", 3.2, p => { p.moveTo(0, -49); p.lineTo(0, 130); });
      if (item.key === "hammer") {
        polygon(ctx, [[-32, -66], [-23, -76], [24, -76], [36, -62], [31, -35], [-25, -36], [-35, -47]], metal, accent, 1.5);
        polygon(ctx, [[-20, -60], [-14, -67], [15, -66], [25, -56], [19, -47], [-21, -48]], "#372741", accent + "9c", 0.8);
      } else if (item.key === "sword") {
        polygon(ctx, [[0, -111], [12, -82], [7, 40], [-7, 40], [-12, -82]], metal, accent, 1.4);
        polygon(ctx, [[-24, 42], [-18, 37], [18, 37], [25, 42], [17, 49], [-17, 49]], item.base, accent, 1.4);
      } else {
        polygon(ctx, [[0, -117], [25, -82], [13, -56], [-14, -56], [-26, -83]], metal, accent, 1.6);
        polygon(ctx, [[0, -107], [14, -81], [0, -63], [-14, -83]], "#f1e6ebd7", accent, 1.1);
      }
      break;
    }
    case "vial":
      shape(ctx, p => {
        p.moveTo(-10, -22);
        p.lineTo(-10, -37); p.lineTo(11, -37); p.lineTo(11, -22);
        p.bezierCurveTo(19, -17, 30, -7, 29, 8);
        p.bezierCurveTo(29, 23, 17, 30, 1, 30);
        p.bezierCurveTo(-17, 29, -29, 21, -29, 7);
        p.bezierCurveTo(-29, -5, -20, -17, -10, -22);
        p.closePath();
      }, gradient(ctx, 0, -37, 0, 27, [[0, "#efe1f76b"], [0.57, "#261c32"], [0.6, accent], [1, item.base]]), accent, 1.5);
      ctx.fillStyle = "#a27865"; ctx.fillRect(-11, -45, 23, 10);
      oval(ctx, -14, 8, 2, 3.4, "#fff6e9");
      oval(ctx, 5, 12, 1.8, 2.8, "#fff6e9");
      break;
    case "compass":
      oval(ctx, 0, 0, 25, 25, "#160f25", accent, 2.6);
      oval(ctx, 0, 0, 21, 21, null, accent + "96", 0, 1);
      polygon(ctx, [[-7, 5], [14, -14], [7, 6], [-15, 14]], metal, accent, 1.1);
      circle(ctx, 0, 0, 3, "#f7eee9", 1.1);
      break;
    case "book":
      polygon(ctx, [[-33, -21], [-3, -15], [31, -25], [35, 17], [0, 25], [-32, 19]], "#2a1b34", accent, 1.3);
      polygon(ctx, [[-31, -23], [-2, -18], [29, -26], [30, 11], [1, 20], [-30, 12]], "#f0cda6", accent, 1);
      for (let i = 0; i < 4; i += 1) {
        line(ctx, item.base, 0.9, p => {
          p.moveTo(-23, -16 + i * 6); p.lineTo(-8, -12 + i * 6);
          p.moveTo(7, -12 + i * 6); p.lineTo(25, -16 + i * 6);
        });
      }
      line(ctx, "#6c494e", 1, p => { p.moveTo(-2, -18); p.lineTo(1, 20); });
      break;
    case "scalesOfJustice":
      line(ctx, accent, 2.5, p => {
        p.moveTo(0, -37); p.lineTo(0, 33); p.moveTo(-31, -19); p.lineTo(31, -19);
        p.moveTo(-11, 33); p.lineTo(11, 33);
      });
      for (const sign of [-1, 1]) {
        polygon(ctx, [[sign * 28, -18], [sign * 38, 11], [sign * 18, 11]], "#26192f", accent, 1);
        shape(ctx, p => { p.moveTo(sign * 41, 11); p.quadraticCurveTo(sign * 28, 29, sign * 16, 11); p.closePath(); }, metal, accent, 1.1);
      }
      break;
    case "lyre":
      line(ctx, accent, 4.2, p => {
        p.moveTo(-27, -28);
        p.bezierCurveTo(-18, -27, -24, -14, -23, 4);
        p.bezierCurveTo(-20, 38, 22, 40, 23, 4);
        p.bezierCurveTo(24, -14, 18, -25, 27, -28);
        p.moveTo(-23, -17); p.lineTo(23, -17);
      });
      for (let x = -13; x <= 13; x += 6.5) {
        line(ctx, "#fff0d4", 0.9, p => { p.moveTo(x, -17); p.lineTo(x, 27 - Math.abs(x) * 0.26); });
      }
      break;
  }
  ctx.restore();
}

const back = {
  antlers: (ctx, item) => branchingHorns(ctx, item, true),
  earTuft: (ctx, item) => plumes(ctx, item, 3),
  feathers: (ctx, item) => plumes(ctx, item, 11),
  fin: (ctx, item) => frill(ctx, item.accent, item.base, true),
  flames,
  frill: (ctx, item) => frill(ctx, item.accent, item.base, false),
  halo,
  hood,
  horns: (ctx, item) => branchingHorns(ctx, item, false),
  lightning,
  mane,
  tentacles: (ctx, item) => tentacles(ctx, item.accent, item.base),
  wings: (ctx, item, spec) => wings(ctx, item.accent, item.base,
    spec.groups[item.side].find(parent => parent.id === item.id)?.texture ?? spec.sides[item.side].texture),
};

const front = {
  armor: (ctx, item) => armor(ctx, item, false),
  crown: (ctx, item) => filigree(ctx, item, "crown"),
  eyeMask: (ctx, item) => filigree(ctx, item, "eyeMask"),
  flower: (ctx, item) => sprigs(ctx, item, true),
  gills: (ctx, item) => gills(ctx, item, item.id === "ajolote"),
  glasses: (ctx, item) => filigree(ctx, item, "glasses"),
  leaves: (ctx, item) => sprigs(ctx, item, false),
  rune: (ctx, item) => filigree(ctx, item, "rune"),
  scales: (ctx, item) => {
    for (const sign of [-1, 1]) {
      for (let i = 0; i < 5; i += 1) {
        const x = CENTER + sign * (73 + Math.sin(i / 5 * Math.PI) * 14);
        oval(ctx, x, 283 + i * 7, 5, 3.5, item.base + "a9", item.accent + "a7", sign * 0.72, 0.75);
      }
    }
  },
  shell: (ctx, item) => armor(ctx, item, true),
  tusks,
};

function ornaments(ctx, spec) {
  const figures = spec.features.filter(item => !back[item.key] && !front[item.key]);
  const bySide = [
    figures.filter(item => item.side === 0),
    figures.filter(item => item.side === 1),
  ];
  for (let side = 0; side < bySide.length; side += 1) {
    const sign = side === 0 ? -1 : 1;
    const width = spec.level === 1 ? 141 : spec.level === 2 ? 166 : 174;
    bySide[side].slice(0, 3).forEach((item, index) => {
      const tall = ["hammer", "staff", "sword"].includes(item.key);
      toolMotif(ctx, item, [CENTER + sign * (width + index * 40), tall ? 277 - index * 20 : 349 - index * 68, sign * (0.14 + index * 0.1)]);
    });
  }
}

function detailFinish(ctx, spec, random) {
  if (spec.level === 1) return;
  const accent = mix(spec.sides[0].accent, spec.sides[1].accent);
  const count = spec.level === 2 ? 10 : 24;
  for (let i = 0; i < count; i += 1) {
    const sign = i % 2 ? -1 : 1;
    const x = CENTER + sign * (95 + random() * 145);
    const y = 179 + random() * 213;
    const size = 2 + random() * (spec.level === 2 ? 3 : 5);
    line(ctx, accent + "bb", 0.85, p => {
      p.moveTo(x - size, y);
      p.lineTo(x + size, y);
      p.moveTo(x, y - size * 1.5);
      p.lineTo(x, y + size * 1.5);
    });
    oval(ctx, x, y, 1.4, 1.4, "#fff0e4dd");
  }
  if (spec.level === 3) {
    for (const sign of [-1, 1]) {
      line(ctx, accent + "a8", 1.3, p => {
        p.moveTo(CENTER + sign * 212, 197);
        p.bezierCurveTo(CENTER + sign * 260, 246, CENTER + sign * 192, 335, CENTER + sign * 126, 349);
        p.bezierCurveTo(CENTER + sign * 99, 356, CENTER + sign * 111, 386, CENTER + sign * 71, 414);
      });
    }
  }
}

// Ground planes and the skeleton are separated so wings and limbs can overlap the
// same creature in depth order without loading or combining card image files.
function landscape(ctx, spec, anatomy, random) {
  const aquatic = anatomy.kind === "finned" || anatomy.kind === "tentacled";
  const aerial = anatomy.kind === "avian" || anatomy.kind === "winged-quadruped";
  const tint = mix(spec.sides[0].accent, spec.sides[1].accent);
  const veil = aquatic ? "#75a5b1" : aerial ? "#8c7baf" : "#534067";
  const base = aquatic ? "#12243a" : "#151025";
  const skyline = 320 + (spec.seed % 54);
  for (let layer = 0; layer < 3; layer += 1) {
    const y = skyline + layer * 26;
    const steps = Array.from({ length: 8 }, (_, index) => [index * 92, y + (random() - 0.65) * (60 - layer * 12)]);
    shape(ctx, p => {
      p.moveTo(...steps[0]);
      for (const [x, y] of steps.slice(1)) {
        if (aquatic || aerial) p.quadraticCurveTo(x - 38, y - 13, x, y);
        else p.lineTo(x, y);
      }
      p.lineTo(WIDTH, HEIGHT);
      p.lineTo(0, HEIGHT);
      p.closePath();
    }, gradient(ctx, 0, y - 32, 0, HEIGHT, [[0, veil + "39"], [1, base + "93"]]), tint + "18", 1);
  }
  if (!aerial && !aquatic) {
    oval(ctx, CENTER, 445, 222, 20, radial(ctx, CENTER, 442, 228, [[0, "#0b0715b6"], [1, "#08061300"]]));
    for (let i = 0; i < 22; i += 1) {
      const x = 64 + random() * 520;
      const y = 437 + random() * 63;
      line(ctx, tint + "40", 0.8, p => {
        p.moveTo(x, y);
        p.quadraticCurveTo(x + 7, y - 2, x + 14 + random() * 16, y - 1);
      });
    }
  }
  if (aquatic) {
    for (let i = 0; i < 26; i += 1) {
      const x = 37 + random() * 563;
      const y = 89 + random() * 350;
      const radius = 1.2 + random() ** 3 * 5.6;
      oval(ctx, x, y, radius, radius * 1.13, null, tint + "5b", -0.3, 0.8);
    }
  }
}

function bodyColors(ctx, spec, x1, y1, x2, y2, shadow = false) {
  const [first, second] = spec.sides.map(item => item.colors);
  return gradient(ctx, x1, y1, x2, y2, shadow ? [
    [0, first[1]], [0.45, mix(first[1], second[0], 0.37)], [1, second[1]]
  ] : [
    [0, mix(first[2], first[0], 0.37)], [0.23, first[0]], [0.63, mix(first[0], second[0], 0.66)],
    [0.79, second[0]], [1, mix(first[1], second[1])]
  ]);
}

function anatomicalSurface(ctx, spec, outline, bounds, random, angle = 0) {
  const [x, y, w, h] = bounds;
  const edge = mix(spec.sides[0].colors[2], spec.sides[1].colors[2]);
  shape(ctx, outline, bodyColors(ctx, spec, x, y + h * 0.12, x + w * 0.72, y + h), edge + "bc", 1.55);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = radial(ctx, x + w * 0.29, y + h * 0.32, w * 0.68, [
    [0, edge + "55"], [0.65, edge + "04"], [1, "#0a0719ae"]
  ]);
  ctx.fillRect(x, y, w, h);
  surfaceTexture(ctx, spec.sides[0], random, [x, y, w * 0.57, h], 115 + spec.level * 24);
  surfaceTexture(ctx, spec.sides[1], random, [x + w * 0.47, y, w * 0.53, h], 100 + spec.level * 20);
  for (let i = 0; i < 18; i += 1) {
    const px = x + (0.11 + random() * 0.81) * w;
    const py = y + (0.09 + random() * 0.7) * h;
    line(ctx, edge + "56", 0.7 + random() * 0.9, p => {
      p.moveTo(px, py);
      p.quadraticCurveTo(px + 11, py - 4 + angle, px + 17, py + 3 + angle);
    });
  }
  ctx.restore();
}

function bodyWing(ctx, spec, x, y, dx, dy, kind, inset = false, invert = false) {
  const item = spec.sides[inset ? 1 : 0];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dx, invert ? -dy : dy);
  const outline = p => {
    p.moveTo(-8, 17);
    p.bezierCurveTo(27, -58, 98, -95, 197, -150);
    if (kind === "feather") {
      p.bezierCurveTo(195, -111, 169, -78, 149, -55);
      p.bezierCurveTo(184, -77, 172, -47, 126, -20);
      p.bezierCurveTo(152, -32, 137, -4, 101, 12);
      p.bezierCurveTo(125, 0, 117, 23, 74, 36);
      p.bezierCurveTo(89, 27, 81, 50, 46, 56);
      p.quadraticCurveTo(8, 60, -8, 17);
    } else {
      p.bezierCurveTo(191, -115, 173, -99, 175, -66);
      p.bezierCurveTo(148, -76, 133, -28, 143, -20);
      p.bezierCurveTo(121, -36, 97, 0, 95, 18);
      p.bezierCurveTo(78, 3, 57, 34, 58, 46);
      p.quadraticCurveTo(26, 24, -8, 17);
    }
    p.closePath();
  };
  const edge = mix(item.colors[2], item.accent, 0.5);
  shape(ctx, outline, gradient(ctx, 4, 37, 170, -145, [
    [0, item.colors[1]], [0.51, item.colors[0]], [1, inset ? item.colors[0] : edge]
  ]), edge + (inset ? "76" : "cc"), inset ? 1.1 : 1.7);
  ctx.save();
  ctx.clip();
  for (let i = 0; i < (kind === "feather" ? 14 : 5); i += 1) {
    line(ctx, edge + (i % 2 ? "7d" : "4f"), i % 3 === 0 ? 1.28 : 0.85, p => {
      const step = kind === "feather" ? 14 : 35;
      p.moveTo(-1 + i * 2, 18);
      p.bezierCurveTo(33 + i * 2, -39 + i * 9, 95 + i * 5, -78 + i * 9, 201 - i * 8, -149 + i * step);
    });
  }
  ctx.restore();
  ctx.restore();
}

function connectiveLimb(ctx, spec, start, knee, end, thickness, foot, near, inverted = false) {
  const [x, y] = start;
  const [kx, ky] = knee;
  const [fx, fy] = end;
  const direction = inverted ? 1 : -1;
  const edge = mix(spec.sides[near ? 0 : 1].colors[2], spec.sides[0].accent, 0.24);
  const width = thickness;
  const pad = foot === "hoof" ? 9 : foot === "talon" ? 17 : foot === "flipper" ? 19 : 13;
  shape(ctx, p => {
    p.moveTo(x - width, y - 6);
    p.bezierCurveTo(x - width, y + 25, kx - width * 0.81, ky - 10, kx - width * 0.64, ky);
    p.quadraticCurveTo(fx - width * 0.40, fy - 24, fx + pad * direction, fy - 8);
    p.quadraticCurveTo(fx + (pad + 5) * direction, fy + 1, fx + pad * direction, fy + 3);
    p.quadraticCurveTo(fx, fy + 6, fx + width * 0.43, fy + 2);
    p.quadraticCurveTo(fx + 12, fy - 19, kx + width * 0.65, ky + 3);
    p.bezierCurveTo(kx + width * 0.83, ky - 14, x + width * 0.63, y + 25, x + width, y - 4);
    p.closePath();
  }, bodyColors(ctx, spec, x - width, y, fx + width, fy + 18, !near), edge + (near ? "a1" : "64"), near ? 1.35 : 0.9);
  if (foot === "paw" || foot === "talon" || foot === "hoof") {
    const toes = foot === "hoof" ? 2 : 3;
    for (let i = 0; i < toes; i += 1) {
      const dx = (3 + i * 4.7) * direction;
      line(ctx, edge + "c3", foot === "talon" ? 1.4 : 0.75, p => {
        p.moveTo(fx + dx + 3, fy - 5);
        p.quadraticCurveTo(fx + dx, fy - 1, fx + dx + direction * 1.5, fy + 3);
      });
    }
  }
}

function animalTail(ctx, spec, x, y, type, axis, length = 1) {
  if (type === "none") return;
  const reach = Math.min(122, 98 * length);
  const tip = type === "fin" ? 43 : type === "brush" || type === "tuft" ? 26 : 11;
  const item = spec.sides[1];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(axis, 1);
  const outline = p => {
    p.moveTo(-18, -9);
    p.bezierCurveTo(31, -17, 72, -38, reach, -73);
    if (type === "fin") {
      p.quadraticCurveTo(reach - 7, -97, reach + 18, -124);
      p.quadraticCurveTo(reach + 13, -89, reach - tip * 0.14, -63);
      p.quadraticCurveTo(reach + 20, -65, reach + 32, -42);
      p.quadraticCurveTo(reach + 2, -42, reach - tip * 0.68, -56);
    } else {
      p.quadraticCurveTo(reach + tip * 0.38, -98, reach - 2, -97);
      p.bezierCurveTo(reach + 4, -74, reach - tip, -39, reach - 50, -22);
    }
    p.bezierCurveTo(60, -11, 29, 6, -17, 12);
    p.closePath();
  };
  shape(ctx, outline, gradient(ctx, 0, 5, reach, -82, [
    [0, item.colors[1]], [0.41, item.colors[0]], [0.83, item.colors[0]], [1, item.colors[2]],
  ]), item.colors[2] + "9b", 1.35);
  line(ctx, item.accent + "75", 1.05, p => {
    p.moveTo(0, -3);
    p.bezierCurveTo(reach * 0.51, -27, reach * 0.84, -52, reach, -79);
  });
  ctx.restore();
}

function tentacleTail(ctx, item, x, y, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  const tips = [[135, -89], [106, -121], [138, -42]];
  for (const [index, [endX, endY]] of tips.entries()) {
    const y = 7 - index * 8;
    const outline = p => {
      p.moveTo(-11, y - 11);
      p.bezierCurveTo(30, y - 21, endX + 16, endY + 88, endX, endY + 26);
      p.bezierCurveTo(endX - 10, endY - 3, endX + 5, endY - 17, endX + 13, endY - 17);
      p.quadraticCurveTo(endX + 3, endY + 6, endX + 13, endY + 30);
      p.bezierCurveTo(endX + 36, endY + 110, 37, y + 4, -11, y + 6);
      p.closePath();
    };
    shape(ctx, outline, gradient(ctx, 2, y, endX, endY, [[0, "#291631"], [0.52, item.base], [1, item.accent]]), item.accent + "98", 1.3);
    for (let i = 0; i < 6; i += 1) {
      const t = (i + 1) / 9;
      oval(ctx, endX * t + 9, y * (1 - t) + (endY + 63) * t,
        3.1 - t, 2.15 - t * 0.6, item.accent + "8f", "#371d4596", -0.29, 0.8);
    }
  }
  ctx.restore();
}

function armOrFin(ctx, spec, x, y, sign, kind, armLength = 1, gripping = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sign * armLength, armLength);
  if (kind === "flipper") {
    shape(ctx, p => {
      p.moveTo(-6, -16);
      p.bezierCurveTo(43, -18, 77, 6, 102, 45);
      p.bezierCurveTo(71, 55, 55, 25, 40, 35);
      p.quadraticCurveTo(25, 37, 2, 12);
      p.closePath();
    }, bodyColors(ctx, spec, 0, -14, 87, 40), spec.sides[sign === 1 ? 1 : 0].accent + "94", 1.45);
    line(ctx, spec.sides[sign === 1 ? 1 : 0].accent + "80", 0.9, p => {
      p.moveTo(16, -4);
      p.quadraticCurveTo(52, 9, 91, 39);
    });
  } else {
    const item = spec.sides[sign === 1 ? 1 : 0];
    const gripY = gripping ? 18 : 66;
    shape(ctx, p => {
      p.moveTo(-8, -15);
      p.bezierCurveTo(19, -12, 34, 17, 39, 28);
      p.quadraticCurveTo(52, gripping ? 10 : 40, 62, gripY);
      p.quadraticCurveTo(76, gripY - 6, 78, gripY + 1);
      p.quadraticCurveTo(82, gripY + 11, 64, gripY + 15);
      p.quadraticCurveTo(47, gripY + 14, 39, gripY + 7);
      p.quadraticCurveTo(32, gripY + 6, 20, 42);
      p.quadraticCurveTo(14, 24, -8, 10);
      p.closePath();
    }, bodyColors(ctx, spec, 0, -14, 72, 71), item.colors[2] + "9f", 1.3);
    if (gripping || kind === "hand") {
      for (let i = 0; i < 3; i += 1) {
        line(ctx, item.colors[1], 0.85, p => {
          p.moveTo(67 + i * 4, gripY + 1);
          p.lineTo(66 + i * 4, gripY + 10);
        });
      }
    }
  }
  ctx.restore();
}

function compactHead(ctx, spec, forms, motifs, random, x, y, sx, sy, tilt, options = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(sx, sy);
  ctx.translate(-CENTER, -255);
  const keys = ["halo", "hood", "mane", "antlers", "horns", "feathers", "earTuft", "frill"];
  for (const key of keys) {
    if (motifs.has(key)) back[key](ctx, motifs.get(key), spec);
  }
  ears(ctx, 0, forms[0], spec.sides[0]);
  ears(ctx, 1, forms[1], spec.sides[1]);
  face(ctx, spec, forms, random, options);
  for (const key of ["scales", "eyeMask", "gills", "tusks", "crown", "rune", "glasses"]) {
    if (motifs.has(key)) front[key](ctx, motifs.get(key), spec);
  }
  if (options.eyeLimb) {
    ctx.save();
    ctx.translate(279, 250);
    ctx.rotate(-1.69);
    armOrFin(ctx, spec, 0, 0, 1, "hand", 0.91);
    ctx.restore();
  }
  ctx.restore();
}

function torsoWard(ctx, spec, motifs, x, y, angle = 0, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size, size);
  ctx.translate(-CENTER, -402);
  for (const item of ["armor", "shell", "leaves", "flower"]) {
    if (motifs.has(item)) front[item](ctx, motifs.get(item), spec);
  }
  ctx.restore();
}

function instruments(ctx, spec, x, y, size, embed = false) {
  const handheld = spec.features.filter(item => !back[item.key] && !front[item.key]);
  if (!handheld.length && !embed) return;
  const fallback = { key: "hammer", side: 0, accent: "#f3b785", base: "#674777" };
  const tools = handheld.length ? handheld : [fallback];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  for (const [index, item] of tools.slice(0, 3).entries()) {
    const sign = item.side === 0 ? -1 : 1;
    const long = ["hammer", "staff", "sword"].includes(item.key);
    const px = embed ? index * 34 - 28 : sign * (62 + (index % 2) * 49);
    const py = embed ? -4 + index * 21 : (long ? -35 : 8) + index * 24;
    toolMotif(ctx, item, [px, py, embed ? Math.PI * (0.36 + index * 0.19) : sign * 0.17]);
  }
  if (embed) {
    const tint = "#e4a7e4";
    for (let i = 0; i < 3; i += 1) {
      oval(ctx, -15 + i * 11, 3 - i * 4, 31 + i * 6, 19 + i * 3, null, tint + "ad", 0.71 + i * 0.17, 1.4);
    }
  }
  ctx.restore();
}

function quadruped(ctx, spec, anatomy, forms, motifs, random, defect) {
  const torso = 215 * anatomy.torso;
  const mass = 63 * anatomy.mass;
  const x = 347;
  const y = 273 - (anatomy.leg - 1) * 48 + (anatomy.variant - 2) * 2.75;
  const frontX = x - torso * 0.31;
  const hindX = x + torso * 0.36;
  const neck = 58 * anatomy.neck;
  const head = [frontX - neck * 0.68, y - mass * 0.58 - neck * 0.51];
  const feet = 427 - (anatomy.variant === 3 ? 14 : 0);
  const stride = [-25, 17, 1, 32, -14][anatomy.variant];
  if (anatomy.wing || defect === "broken-wings") {
    bodyWing(ctx, spec, frontX + 8, y - mass * 0.37, -0.79, 0.94,
      anatomy.wing ?? "membrane", true, defect === "broken-wings");
  }
  if (motifs.has("tentacles")) tentacleTail(ctx, motifs.get("tentacles"), hindX + 7, y + 9, 0.83);
  else animalTail(ctx, spec, hindX + 19, y + 3, anatomy.tail, 1, 1 + anatomy.leg * 0.1);
  if (defect !== "one-sided") {
    connectiveLimb(ctx, spec, [frontX - 12, y + mass * 0.24], [frontX - 22, y + mass * 0.96],
      [frontX - 35 + stride * 0.45, feet - 12], 15 * anatomy.mass, anatomy.forelimb, false);
    connectiveLimb(ctx, spec, [hindX - 8, y + mass * 0.29], [hindX + 22, y + mass * 0.92],
      [hindX + 26 - stride * 0.49, feet - 14], 16 * anatomy.mass, anatomy.hindlimb, false);
  }

  anatomicalSurface(ctx, spec, p => {
    p.moveTo(head[0] - 1, head[1] + 19);
    p.bezierCurveTo(head[0] + 37, head[1] - 15, frontX + 5, y - 51, frontX + 31, y - mass * 0.65);
    p.bezierCurveTo(frontX + torso * 0.36, y - mass * 0.84, hindX - 25, y - mass * 0.5, hindX + 8, y - mass * 0.42);
    p.bezierCurveTo(hindX + 57, y - mass * 0.13, hindX + 29, y + mass * 0.74, hindX - 10, y + mass * 0.75);
    p.bezierCurveTo(x + 8, y + mass * 0.82, frontX + 21, y + mass * 0.3, frontX - 7, y + mass * 0.61);
    p.quadraticCurveTo(frontX - 43, y + mass * 0.48, head[0] - 2, head[1] + 26);
    p.closePath();
  }, [head[0] - 20, head[1] - 33, hindX - head[0] + 79, y - head[1] + mass + 52], random);
  if (anatomy.wing || defect === "broken-wings") {
    bodyWing(ctx, spec, defect === "broken-wings" ? hindX + 6 : frontX + 1, y - mass * 0.42, 1.07, 1.09, anatomy.wing ?? "membrane");
  }
  const nearFore = defect === "one-sided" ? hindX - 14 : frontX + 8;
  connectiveLimb(ctx, spec, [nearFore, y + mass * 0.31], [nearFore + 9, y + mass * 1.00],
    [nearFore + 8 - stride * 0.5, feet], 17 * anatomy.mass, anatomy.forelimb, true);
  connectiveLimb(ctx, spec, [hindX + 8, y + mass * 0.29], [hindX - 10, y + mass * 1.05],
    [hindX + 30 + stride * 0.5, feet - 2], 19 * anatomy.mass, anatomy.hindlimb, true);
  if (defect === "one-sided") {
    for (let i = 0; i < 3; i += 1) {
      connectiveLimb(ctx, spec, [hindX + 1 + i * 10, y + 8], [hindX + 26 + i * 15, y + 39 - i * 3],
        [hindX + 44 + i * 18, feet - 47 - i * 14], 10, anatomy.hindlimb, i === 2, true);
    }
  }
  torsoWard(ctx, spec, motifs, x + 1, y + 32, -0.21, 0.56);
  instruments(ctx, spec, x - 46, y + 25, 0.72, defect === "embedded");
  const headScale = anatomy.pose === "profile" ? 0.62 : 0.68;
  compactHead(ctx, spec, forms, motifs, random, ...head, headScale, 0.64, -0.16,
    { eyeLimb: defect === "ocular" });
  if (defect === "split-head") {
    compactHead(ctx, spec, forms, motifs, random, hindX + 15, y - 7,
      headScale * 0.76, 0.56, Math.PI * 0.74);
  }
}

function biped(ctx, spec, anatomy, forms, motifs, random, defect) {
  const x = CENTER + 18;
  const y = 273;
  const mass = anatomy.mass;
  if (anatomy.wing || defect === "broken-wings") {
    const twist = defect === "broken-wings";
    bodyWing(ctx, spec, x - 23, y - 3, twist ? 1.16 : -1.02, 1.05, anatomy.wing ?? "feather", true, twist);
    bodyWing(ctx, spec, x + 20, y + 3, 1.07, 1.1, anatomy.wing ?? "feather");
  }
  if (motifs.has("tentacles")) tentacleTail(ctx, motifs.get("tentacles"), x + 25, y + 64, 0.94);
  else if (anatomy.tail !== "none") animalTail(ctx, spec, x + 31, y + 72, anatomy.tail, 1, 1.03);
  if (defect !== "one-sided") {
    connectiveLimb(ctx, spec, [x - 19, y + 58], [x - 27, y + 106], [x - 42, 443],
      18 * mass, anatomy.hindlimb, false);
    if (anatomy.kind !== "avian") armOrFin(ctx, spec, x - 36 * mass, y - 23, -1, anatomy.forelimb, 0.96, true);
  }
  connectiveLimb(ctx, spec, [x + 21, y + 55], [x + 37, y + 105], [x + 41, 445],
    19 * mass, anatomy.hindlimb, true, true);

  anatomicalSurface(ctx, spec, p => {
    p.moveTo(x - 19, 211);
    p.bezierCurveTo(x - 15, 247, x - 79 * mass, 227, x - 58 * mass, 285);
    p.bezierCurveTo(x - 38, 317, x - 55 * mass, 356, x - 28, 366);
    p.quadraticCurveTo(x + 11, 376, x + 38, 360);
    p.bezierCurveTo(x + 53 * mass, 283, x + 72 * mass, 257, x + 41 * mass, 248);
    p.quadraticCurveTo(x + 20, 238, x + 18, 211);
    p.closePath();
  }, [x - 92 * mass, 209, 174 * mass, 176], random);
  torsoWard(ctx, spec, motifs, x, y + 28, 0, 0.52);
  if (defect === "one-sided") {
    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.translate(x + 32, y - 23 + i * 24);
      ctx.rotate(-0.43 + i * 0.38);
      armOrFin(ctx, spec, 0, 0, 1, anatomy.forelimb, 0.9, i % 2 === 1);
      ctx.restore();
    }
  } else if (anatomy.kind !== "avian") {
    armOrFin(ctx, spec, x + 36 * mass, y - 18, 1, anatomy.forelimb, 1.05, true);
  }
  instruments(ctx, spec, x, y + 28, 1, defect === "embedded");
  compactHead(ctx, spec, forms, motifs, random, x, y - 72, 0.72, 0.63,
    anatomy.pose === "front" ? 0 : -0.065, { eyeLimb: defect === "ocular" });
  if (defect === "split-head") compactHead(ctx, spec, forms, motifs, random, x + 37, y + 21, 0.52, 0.58, 2.07);
}

function swimmer(ctx, spec, anatomy, forms, motifs, random, defect) {
  const x = 324;
  const y = 245;
  const mass = anatomy.mass;
  const stretch = anatomy.torso;
  const head = [211 - (stretch - 1) * 35, 222];
  const tail = 94 * stretch;
  if (motifs.has("tentacles")) tentacleTail(ctx, motifs.get("tentacles"), x + tail - 13, y + 13, 1.02);
  else animalTail(ctx, spec, x + tail, y + 9, "fin", 1, 1.23);
  if (anatomy.wing || defect === "broken-wings") {
    bodyWing(ctx, spec, x - 40, y + 6, -0.73, 0.84, anatomy.wing ?? "membrane", true, defect === "broken-wings");
    bodyWing(ctx, spec, x - 32, y - 7, 0.91, 1.03, anatomy.wing ?? "membrane");
  }
  anatomicalSurface(ctx, spec, p => {
    p.moveTo(head[0] - 17, head[1] - 25);
    p.bezierCurveTo(head[0] + 55, y - 81 * mass, x + 55, y - 42 * mass, x + tail + 33, y + 7);
    p.quadraticCurveTo(x + tail + 24, y + 17, x + tail + 27, y + 28);
    p.bezierCurveTo(x + 87, y + 61 * mass, x + 31, y + 59 * mass, x - 20, y + 63 * mass);
    p.bezierCurveTo(head[0] - 13, y + 58 * mass, head[0] - 20, y + 38, head[0] - 17, head[1] - 25);
    p.closePath();
  }, [head[0] - 45, 135, x + tail - head[0] + 100, 243], random);
  const fins = defect === "one-sided" ? [1, 1, 1, 1] : [-1, 1];
  for (const [i, sign] of fins.entries()) {
    const extra = defect === "one-sided" ? i : 0;
    const hand = anatomy.forelimb === "hand";
    armOrFin(ctx, spec, x - sign * (hand ? 56 : 20) + extra * 26, y + (hand ? 8 : 24) + extra * 9, sign,
      hand ? "hand" : "flipper", (sign === 1 ? 1.15 : 0.71) - extra * 0.05, hand);
  }
  torsoWard(ctx, spec, motifs, x + 21, y + 29, -0.21, 0.52);
  instruments(ctx, spec, x - 14, y + 53, 0.77, defect === "embedded");
  compactHead(ctx, spec, forms, motifs, random, ...head, 0.65, 0.59, -0.14, { eyeLimb: defect === "ocular" });
  if (defect === "split-head") compactHead(ctx, spec, forms, motifs, random, x + 59, y + 22, 0.54, 0.47, -2.64);
}

function coil(ctx, spec, anatomy, forms, motifs, random, defect) {
  const isTentacled = anatomy.kind === "tentacled";
  const x = CENTER + (isTentacled ? 0 : 5);
  const y = 214 - (anatomy.neck - 1) * 54;
  const mass = anatomy.mass;
  const edge = mix(spec.sides[0].accent, spec.sides[1].accent);
  if (anatomy.wing || defect === "broken-wings") {
    bodyWing(ctx, spec, x - 20, y + 32, -0.91, 1.06, anatomy.wing ?? "feather", true, defect === "broken-wings");
    bodyWing(ctx, spec, x + 16, y + 32, 1.04, 1.05, anatomy.wing ?? "feather");
  }
  if (isTentacled) {
    const reach = 122 + Math.floor(spec.seed % 22);
    for (const sign of defect === "one-sided" ? [1, 1] : [-1, 1]) {
      for (let i = 0; i < 4; i += 1) {
        const endX = x + (reach + i * 23) * sign;
        const endY = 370 - i * 27 + (sign === -1 ? 16 : 0);
        const startX = x + (11 + i * 14) * sign;
        const startY = 277 + i * 9;
        const flare = 31 - i * 3;
        const outline = p => {
          p.moveTo(startX - sign * flare, startY);
          p.bezierCurveTo(startX - sign * 14, startY + 73, endX - sign * 40, endY + 94, endX, endY + 39);
          p.bezierCurveTo(endX + sign * 33, endY - 2, endX + sign * 24, endY - 27, endX + sign * 9, endY - 39);
          p.bezierCurveTo(endX + sign * 24, endY + 2, endX - sign * 6, endY + 21, endX - sign * 18, endY + 27);
          p.bezierCurveTo(endX - sign * 48, endY + 37, startX + sign * 40, startY + 31, startX + sign * flare, startY);
          p.closePath();
        };
        shape(ctx, outline, bodyColors(ctx, spec, startX, startY, endX, endY + 64), edge + "a0", 1.3);
        for (let j = 0; j < 7; j += 1) {
          const t = j / 8;
          oval(ctx, startX + sign * 14 + (endX - startX - sign * 19) * t,
            startY + (endY + 24 - startY) * t + Math.sin(t * Math.PI) * 39,
            3.6 - t * 1.9, 2.1 - t, edge + "65", edge + "8b", sign * -0.46, 0.66);
        }
      }
    }
  } else {
    const base = [x - 12, y + 45];
    const wiggle = (spec.seed % 45) - 22;
    const outline = p => {
      p.moveTo(base[0] - 30 * mass, base[1] - 12);
      p.bezierCurveTo(x - 58, y + 140, x + 103, y + 82, x + 95, y + 143);
      p.bezierCurveTo(x + 87, y + 218, x - 103, y + 158, x - 136, y + 193);
      p.bezierCurveTo(x - 187, y + 256, x + 189, y + 249, x + 192 + wiggle, y + 121);
      p.bezierCurveTo(x + 207, y + 181, x + 174, y + 232, x + 71, y + 241);
      p.bezierCurveTo(x - 134, y + 271, x - 226, y + 225, x - 166, y + 175);
      p.bezierCurveTo(x - 113, y + 134, x + 48, y + 173, x + 53, y + 135);
      p.bezierCurveTo(x + 61, y + 110, x - 104, y + 153, base[0] - 30 * mass, base[1] - 12);
      p.closePath();
    };
    anatomicalSurface(ctx, spec, outline, [x - 227, y + 27, 445, 235], random);
    line(ctx, edge + "95", 1.3, p => {
      p.moveTo(x - 10, y + 71);
      p.bezierCurveTo(x + 2, y + 137, x + 123, y + 114, x + 69, y + 165);
      p.bezierCurveTo(x + 6, y + 206, x - 119, y + 164, x - 148, y + 201);
    });
    if (defect === "one-sided") {
      for (let i = 0; i < 4; i += 1) {
        armOrFin(ctx, spec, x + 32, y + 50 + i * 26, 1, "hand", 0.9, false);
      }
    }
  }
  anatomicalSurface(ctx, spec, p => {
    p.moveTo(x - 67 * mass, y - 29);
    p.bezierCurveTo(x - 89 * mass, y + 8, x - 65 * mass, y + 75, x - 25 * mass, y + 85);
    p.quadraticCurveTo(x + 37 * mass, y + 105, x + 65 * mass, y + 72);
    p.bezierCurveTo(x + 88 * mass, y + 29, x + 63 * mass, y - 18, x + 56 * mass, y - 35);
    p.closePath();
  }, [x - 90 * mass, y - 44, 181 * mass, 144], random);
  torsoWard(ctx, spec, motifs, x, y + 65, 0, 0.57);
  instruments(ctx, spec, x, y + 67, 0.79, defect === "embedded");
  compactHead(ctx, spec, forms, motifs, random, x, y - 9, 0.73, 0.60, 0.035, { eyeLimb: defect === "ocular" });
  if (defect === "split-head") compactHead(ctx, spec, forms, motifs, random, x - 49, y + 66, 0.52, 0.47, -2.10);
}

const defectForms = {
  miembro_ocular: "ocular",
  alas_invertidas: "broken-wings",
  cabezas_opuestas: "split-head",
  extremidades_unilaterales: "one-sided",
  enjambre_trabado: "trapped",
  objeto_incrustado: "embedded",
  energia_plegada: "folded",
};

function unstableAtmosphere(ctx, spec, random) {
  const [first, second] = spec.sides.map(side => side.accent);
  const flare = mix("#ee6fb7", first, 0.26);
  const points = [[47, 109], [167, 128], [153, 158], [231, 140], [213, 194], [332, 183],
    [313, 229], [452, 198], [434, 288], [503, 263], [527, 304], [617, 290]];
  for (let i = 0; i < 3; i += 1) {
    line(ctx, flare + ["18", "45", "c9"][i], [19, 5, 1.35][i], p => {
      p.moveTo(...points[0]);
      for (const [x, y] of points.slice(1)) p.lineTo(x, y);
    });
  }
  for (let i = 0; i < 28; i += 1) {
    const x = 74 + random() * 510;
    const y = 63 + random() * 350;
    const radius = 3 + random() ** 3 * 13;
    polygon(ctx, [[x - radius, y - radius * 0.44], [x + radius * 0.2, y - radius],
      [x + radius, y + radius * 0.76], [x + radius * 0.18, y + radius * 0.39]],
      i % 2 ? first + "46" : second + "65", "#f4a9db65", 0.7);
  }
}

function obstruction(ctx, spec, anatomy) {
  const center = anatomy.kind === "finned" ? 336 : 326;
  const tint = mix(spec.sides[1].accent, "#c975b4", 0.56);
  // El enjambre ectópico sale de la misma cavidad y se cierra sobre las patas.
  for (let i = 0; i < 7; i += 1) {
    const direction = i < 5 ? 1 : -1;
    const start = center + (i - 3.5) * 11;
    const spread = i * 10 + 27;
    const y = 309 + i * 6;
    shape(ctx, p => {
      p.moveTo(start, y);
      p.bezierCurveTo(start + direction * spread, y - 45, center + direction * 111, 415, center + direction * 76, 432);
      p.bezierCurveTo(center + direction * 16, 459, center - direction * 41, 418, center - direction * 38, 385);
      p.quadraticCurveTo(center - direction * 18, 437, center + direction * 55, 417);
      p.bezierCurveTo(center + direction * 82, 405, start + direction * spread * 0.34, y + 11, start - 5, y + 7);
      p.closePath();
    }, bodyColors(ctx, spec, start, y, center + direction * 65, 423), tint + "c2", 1.37);
  }
}

function crossSections(ctx, spec, draw) {
  const tint = mix(spec.sides[0].accent, "#f0a4de", 0.66);
  const panels = [
    { from: 23, size: 190, shift: -37, lift: 4, angle: -0.12 },
    { from: 214, size: 67, shift: 61, lift: -5, angle: 0.26 },
    { from: 282, size: 230, shift: -11, lift: 8, angle: -0.07 },
  ];
  for (const panel of panels) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, panel.from, WIDTH, panel.size);
    ctx.clip();
    ctx.translate(panel.shift + CENTER, 254 + panel.lift);
    ctx.rotate(panel.angle);
    ctx.translate(-CENTER, -254);
    draw();
    ctx.restore();
  }
  for (const y of [214, 282]) {
    line(ctx, tint + "4f", 6, p => {
      p.moveTo(112, y - 3);
      p.lineTo(235, y + 6);
      p.lineTo(393, y - 2);
      p.lineTo(520, y + 4);
    });
    line(ctx, tint + "ec", 1.2, p => {
      p.moveTo(136, y - 2);
      p.lineTo(241, y + 4);
      p.lineTo(416, y - 4);
      p.lineTo(516, y + 3);
    });
  }
}

function animalComposition(ctx, spec, anatomy, forms, motifs, defect) {
  const draw = () => {
    const random = seededRandom(spec.seed ^ 0xe1a4ab37);
    ctx.save();
    if (anatomy.direction === 1 && anatomy.kind !== "biped" && anatomy.kind !== "avian") {
      ctx.translate(WIDTH, 0);
      ctx.scale(-1, 1);
    }
    for (const key of ["lightning", "flames"]) {
      if (motifs.has(key)) back[key](ctx, motifs.get(key), spec);
    }
    if (anatomy.kind === "quadruped" || anatomy.kind === "winged-quadruped") {
      quadruped(ctx, spec, anatomy, forms, motifs, random, defect);
    } else if (anatomy.kind === "finned") {
      swimmer(ctx, spec, anatomy, forms, motifs, random, defect);
    } else if (anatomy.kind === "serpentine" || anatomy.kind === "tentacled") {
      coil(ctx, spec, anatomy, forms, motifs, random, defect);
    } else {
      biped(ctx, spec, anatomy, forms, motifs, random, defect);
    }
    if (defect === "trapped") obstruction(ctx, spec, anatomy);
    ctx.restore();
  };
  if (defect === "folded") crossSections(ctx, spec, draw);
  else draw();
}

function bust(ctx, spec, forms, motifs, random) {
  for (const key of ["halo", "lightning", "flames", "wings", "tentacles", "fin", "frill", "hood", "mane"]) {
    if (motifs.has(key)) back[key](ctx, motifs.get(key), spec);
  }
  collar(ctx, spec, random);
  for (const key of ["antlers", "horns", "feathers", "earTuft"]) {
    if (motifs.has(key)) back[key](ctx, motifs.get(key), spec);
  }
  ears(ctx, 0, forms[0], spec.sides[0]);
  ears(ctx, 1, forms[1], spec.sides[1]);
  face(ctx, spec, forms, random);
  for (const key of ["armor", "shell", "leaves", "flower", "scales", "eyeMask", "gills", "tusks", "crown", "rune", "glasses"]) {
    if (motifs.has(key)) front[key](ctx, motifs.get(key), spec);
  }
  ornaments(ctx, spec);
}

function paint(ctx, spec) {
  const random = seededRandom(spec.seed);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  background(ctx, spec, random);
  const anatomy = spec.anatomy;
  const defect = defectForms[spec.defect];
  const fullBody = anatomy.kind !== "biped" || anatomy.variant !== 0 || defect;
  if (fullBody) landscape(ctx, spec, anatomy, random);
  if (defect) unstableAtmosphere(ctx, spec, random);
  ctx.save();
  let tilt = spec.seed % 2 ? 1 : -1;
  if (spec.level === 3) tilt = -tilt;
  ctx.translate(CENTER, 251);
  ctx.rotate(spec.level === 1 ? 0 : tilt * (spec.level === 2 ? 0.044 : 0.068));
  const size = spec.level === 1 ? 1 : spec.level === 2 ? 1.042 : 1.058;
  ctx.scale(size, size);
  ctx.translate(-CENTER, -251);
  const forms = spec.sides.map(item => faceForms[item.face] ?? faceForms.human);
  const motifs = new Map(spec.features.map(item => [item.key, item]));
  if (fullBody) animalComposition(ctx, spec, anatomy, forms, motifs, defect);
  else bust(ctx, spec, forms, motifs, random);
  detailFinish(ctx, spec, random);
  ctx.restore();

  const shade = fullBody ? "#100b19a0" : "#100b19ce";
  ctx.fillStyle = gradient(ctx, 0, 388, 0, 512, [[0, "#100b1900"], [0.73, "#100b1952"], [1, shade]]);
  ctx.fillRect(0, 388, WIDTH, 124);
  ctx.fillStyle = radial(ctx, CENTER, 202, 393, [[0, "#07051100"], [0.70, "#07051100"], [1, "#070511bf"]]);
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function paintSpec(canvas, spec, width, height) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return false;
  ctx.save();
  ctx.scale(width / WIDTH, height / HEIGHT);
  paint(ctx, spec);
  ctx.restore();
  return true;
}

export function paintFusionPortrait(canvas, card, state, level = 1, width = WIDTH, height = HEIGHT) {
  const spec = fusionPortraitSpec(card, state, level);
  return spec ? paintSpec(canvas, spec, width, height) : false;
}

export function renderFusionPortrait(card, state, level = 1) {
  const spec = fusionPortraitSpec(card, state, level);
  if (!spec || typeof document === "undefined") return null;
  const cacheKey = spec.id + ":" + spec.level;
  if (imageCache.has(cacheKey)) {
    const stored = imageCache.get(cacheKey);
    imageCache.delete(cacheKey);
    imageCache.set(cacheKey, stored);
    return stored;
  }
  const canvas = document.createElement("canvas");
  if (!paintSpec(canvas, spec, WIDTH, HEIGHT)) return null;
  const image = canvas.toDataURL("image/webp", 0.86);
  if (imageCache.size >= CACHE_LIMIT) imageCache.delete(imageCache.keys().next().value);
  imageCache.set(cacheKey, image);
  return image;
}
