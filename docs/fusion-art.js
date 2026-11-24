import { PORTRAIT_PROFILES } from "./portrait-profiles.js";

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
  if (card?.category !== "fusion" || typeof card.id !== "string") return null;
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
    group.flatMap((item, index) => item.features.slice(0, index === 0 ? 3 : 2)
      .map(key => ({ key, side, id: item.id, accent: item.accent, base: item.colors[0] }))));
  const byKey = new Map(features.map(feature => [feature.key, feature]));
  return {
    id: card.id,
    seed: hash(card.id),
    level: Number.isInteger(level) ? Math.min(3, Math.max(1, level)) : 1,
    rarity: card.rarity,
    generation: card.generation ?? 1,
    groups,
    lineages: lineage,
    sides,
    features: [...byKey.values()],
  };
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

function eyes(ctx, spec, forms) {
  for (const side of [0, 1]) {
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

function face(ctx, spec, forms, random) {
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
  eyes(ctx, spec, forms);
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

function paint(ctx, spec) {
  const random = seededRandom(spec.seed);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  background(ctx, spec, random);
  ctx.save();
  let tilt = spec.seed % 2 ? 1 : -1;
  if (spec.level === 3) tilt = -tilt;
  ctx.translate(CENTER, 251);
  ctx.rotate(spec.level === 1 ? 0 : tilt * (spec.level === 2 ? 0.059 : 0.093));
  const size = spec.level === 1 ? 1 : spec.level === 2 ? 1.052 : 1.087;
  ctx.scale(size, size);
  ctx.translate(-CENTER, -251);
  const forms = spec.sides.map(item => faceForms[item.face] ?? faceForms.human);
  const motifs = new Map(spec.features.map(item => [item.key, item]));
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
  detailFinish(ctx, spec, random);
  ctx.restore();

  ctx.fillStyle = gradient(ctx, 0, 368, 0, 512, [[0, "#100b1900"], [0.78, "#100b197d"], [1, "#100b19ce"]]);
  ctx.fillRect(0, 368, WIDTH, 144);
  ctx.fillStyle = radial(ctx, CENTER, 202, 377, [[0, "#07051100"], [0.73, "#07051100"], [1, "#070511ba"]]);
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
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
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return null;
  paint(ctx, spec);
  const image = canvas.toDataURL("image/webp", 0.86);
  if (imageCache.size >= CACHE_LIMIT) imageCache.delete(imageCache.keys().next().value);
  imageCache.set(cacheKey, image);
  return image;
}
