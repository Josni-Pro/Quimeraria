import { SKILLS } from "./combat/skills.js";

const palette = {
  strike: "#f2c58f", charge: "#ffbc77", slash: "#f5dac4", arrow: "#fadc9e", heavy: "#ffb782",
  arcane: "#d5b3ff", fire: "#ff9e54", water: "#8de4ef", wind: "#a5ecb7", lightning: "#b6d6ff",
  earth: "#e3ae79", divine: "#ffe79e", alchemy: "#d4e88c", heal: "#a7efbc", regen: "#b9e99b",
  guard: "#8fcce2", shield: "#9cc9ff", cleanse: "#eef6be", buff: "#e3db94", move: "#b5d8c6"
};
const physical = new Set(["strike", "charge", "slash", "heavy", "arrow"]);
const reaching = new Set(["arrow", "lightning", "water", "wind", "arcane", "guard", "move", "fire", "alchemy"]);
const recovery = new Set(["heal", "regen", "cleanse"]);
const protection = new Set(["guard", "shield"]);
const descriptors = { intercept: "Intercepción", cleanse: "Purificación", down: "Incapacitada" };
const initial = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - (1 - t) ** 3;

function card(scene, id) {
  return id ? scene.querySelector(`[data-unit="${CSS.escape(id)}"]`) : null;
}

function point(scene, element) {
  const stage = scene.getBoundingClientRect();
  const at = element?.getBoundingClientRect();
  return at ? { x: at.left + at.width / 2 - stage.left, y: at.top + at.height * .43 - stage.top }
    : { x: stage.width / 2, y: stage.height * .5 };
}

function stroke(ctx, points, width = 2) {
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x,y], index) => index ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.stroke();
}

function ellipse(ctx, x, y, rx, ry, width = 2, start = 0, end = Math.PI * 2) {
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, start, end);
  ctx.stroke();
}

function curve(ctx, x, y, endX, endY, arc, width) {
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.quadraticCurveTo((x + endX) / 2, (y + endY) / 2 + arc, endX, endY);
  ctx.stroke();
}

function particles(ctx, x, y, fade, max, motion) {
  for (let i = 0; i < max; i++) {
    const angle = i * 2.39996;
    const radius = (12 + i % 7 * 4) * ease(fade);
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    const h = y + dy - fade * motion;
    const size = i % 3 === 0 ? 3 : 1.6;
    ctx.fillRect(x + dx, h, size, size * 2);
  }
}

function drawPath(ctx, style, from, to, t) {
  const x = initial(from.x, to.x, t);
  const y = initial(from.y, to.y, t);
  if (style === "lightning") {
    const zig = Array.from({ length: 9 }, (_, i) => [initial(from.x, to.x, i / 8 * t),
      initial(from.y, to.y, i / 8 * t) + (i % 2 === 1 ? -8 : 8) * Math.sin(i)]);
    stroke(ctx, zig, 4);
    ctx.strokeStyle = "#fff4d2";
    stroke(ctx, zig, 1.3);
  } else if (style === "arrow") {
    const back = Math.max(0, t - .24);
    stroke(ctx, [[initial(from.x, to.x, back), initial(from.y, to.y, back)], [x,y]], 3);
    ellipse(ctx, x, y, 3.8, 3, 1.6);
  } else if (style === "water" || style === "wind") {
    for (let i = 0; i < 3; i++) curve(ctx, from.x, from.y + i * 5, x, y + i * 4, -23 - i * 9, 1.8);
  } else if (style === "fire" || style === "alchemy") {
    curve(ctx, from.x, from.y, x, y, -22, 4);
    particles(ctx, x, y, t, 9, 14);
  } else {
    curve(ctx, from.x, from.y, x, y, style === "guard" ? 24 : -14, style === "charge" ? 5 : 2.2);
  }
}

function drawImpact(ctx, style, to, p, quality) {
  const { x, y } = to;
  const fade = 1 - p;
  const radius = 9 + p * 36;
  ctx.globalAlpha = fade * .92;
  if (recovery.has(style)) {
    for (let i = 0; i < 5; i++) {
      const row = y + 12 - p * (29 + i * 6);
      const at = x + (i - 2) * 12;
      stroke(ctx, [[at - 3, row], [at + 3, row]], 1.5);
      stroke(ctx, [[at, row - 3], [at, row + 3]], 1.5);
    }
    ellipse(ctx,x,y+16,radius * .78,5 + p * 7,2);
    if (style === "cleanse") ellipse(ctx,x,y-8,radius * .58,radius * .68,1.2);
  } else if (protection.has(style)) {
    stroke(ctx, [[x, y-radius], [x+radius*.78,y-radius*.5], [x+radius*.64,y+radius*.45],
      [x,y+radius], [x-radius*.64,y+radius*.45], [x-radius*.78,y-radius*.5], [x,y-radius]], 2.8);
    ellipse(ctx,x,y+18,radius,7 + p * 6,1.6);
  } else if (style === "fire") {
    for (let i = -2; i <= 2; i++) curve(ctx, x + i*7, y+12, x + i*(8+6*p), y-18-p*22, radius*.18, 2.6);
  } else if (style === "water" || style === "wind") {
    for (let i = 0; i < 3; i++) ellipse(ctx,x,y+i*4,radius+i*6,radius*(.38+i*.11),2, i*.6, Math.PI * 1.75);
  } else if (style === "lightning") {
    stroke(ctx,[[x-13,y-28],[x-3,y-11],[x+9,y-16],[x-4,y+10],[x+16,y+8]],3.5);
    ellipse(ctx,x,y+10,radius,9,1.8);
  } else if (style === "divine" || style === "buff" || style === "arcane") {
    const r = radius * .76;
    stroke(ctx,[[x,y-r],[x+r*.83,y],[x,y+r],[x-r*.83,y],[x,y-r]],2);
    ellipse(ctx,x,y,r+7,r+4,1.25);
    stroke(ctx,[[x-r*.4,y],[x+r*.4,y]],1.5);
  } else if (style === "alchemy") {
    for (const [dx,dy] of [[-16,-8],[12,-13],[7,12],[-12,15]]) ellipse(ctx,x+dx,y+dy-p*12,radius*.23,radius*.28,1.8);
  } else if (style === "earth") {
    for (let i = -2; i <= 2; i++) stroke(ctx,[[x+i*9,y+20],[x+i*13,y+10],[x+i*15,y-2-p*17]],2.5);
  } else if (style === "slash" || style === "strike") {
    for (let i = 0; i < (style === "slash" ? 2 : 1); i++) curve(ctx,x-radius,y-radius*.42+i*9,x+radius,y+radius*.3+i*9,-17,3.7);
  } else {
    ellipse(ctx,x,y,radius,radius*.68,3.2);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      stroke(ctx, [[x + Math.cos(angle) * radius*.4,y+Math.sin(angle)*radius*.4],
        [x+Math.cos(angle)*radius,y+Math.sin(angle)*radius]],2);
    }
  }
  if (quality === "full") particles(ctx,x,y,p,style === "fire" ? 22 : 13, recovery.has(style) ? 36 : 11);
}

function float(scene, event, duration) {
  const target = card(scene, event.target);
  if (!target) return;
  const location = point(scene,target);
  const type = event.type;
  const number = ["damage", "heal", "shield"].includes(type);
  if (!number && !descriptors[type]) return;
  const node = document.createElement("span");
  node.className = "float-number " + (number ? type : "state");
  node.textContent = type === "damage" ? (event.amount ? "−" + event.amount : "⬟ " + event.absorbed)
    : type === "heal" ? "+" + event.amount : type === "shield" ? "⬟ " + event.amount : descriptors[type];
  node.style.left = `${location.x}px`;
  node.style.top = `${location.y}px`;
  scene.querySelector(".scene-floats").append(node);
  const animation = node.animate([
    { opacity: 0, transform: "translate(-50%, 4px) scale(.88)" },
    { opacity: 1, transform: "translate(-50%, -13px) scale(1.07)", offset: .2 },
    { opacity: 1, transform: "translate(-50%, -26px)", offset: .65 },
    { opacity: 0, transform: "translate(-50%, -43px)" }
  ], { duration, easing: "ease-out" });
  animation.finished.then(() => node.remove(), () => node.remove());
}

function eventGroups(events) {
  const groups = [];
  let active = null;
  for (const event of events) {
    if (event.type === "action") {
      active = { action: event, changes: [] };
      groups.push(active);
    } else if (active && ["damage","heal","shield","status","cleanse","down","intercept","move"].includes(event.type) && !event.periodic) {
      active.changes.push(event);
    } else {
      active = null;
      const previous = groups.at(-1);
      if (event.type === "move" && previous?.changes.at(-1)?.swapWith === event.actor && !previous.action) {
        previous.changes.push(event);
      } else if (event.unit || event.type === "intercept") groups.push({ action: null, changes: [event] });
    }
  }
  return groups;
}

function supplemental(event) {
  if (event.type === "heal") return "regen";
  if (event.type === "damage") return event.kind === "burn" ? "fire" : "alchemy";
  if (event.type === "move") return "move";
  if (event.type === "status" && event.effect === "guard") return "shield";
  return null;
}

function floatingChanges(changes) {
  const shown = new Map();
  const numeric = ["damage","heal","shield"];
  for (const event of changes) {
    if (!numeric.includes(event.type) && !descriptors[event.type]) continue;
    const previous = shown.get(event.target);
    if (!previous || numeric.includes(event.type) && !numeric.includes(previous.type)) shown.set(event.target,event);
    else if (previous.type === event.type && typeof event.amount === "number") {
      shown.set(event.target, { ...event, amount: previous.amount + event.amount,
        absorbed: (previous.absorbed ?? 0) + (event.absorbed ?? 0) });
    }
  }
  return shown.values();
}

export async function playEvents(scene, events, options, apply) {
  const canvas = scene.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const caption = scene.querySelector(".scene-caption");
  const signal = options.signal;
  for (const { action, changes } of eventGroups(events)) {
    if (signal.aborted) break;
    const velocity = options.speed();
    const quality = options.quality();
    const skill = action ? SKILLS[action.skill] : null;
    const visual = skill?.visual ?? supplemental(changes[0]);
    if (quality === "minimal" || !visual) {
      apply(action ? [action, ...changes] : changes);
      continue;
    }
    const actor = card(scene, action?.actor ?? changes[0].actor);
    const targets = action?.targets ?? [changes[0].target ?? changes[0].actor];
    const targetNodes = targets.map(id => card(scene,id)).filter(Boolean);
    const from = point(scene,actor);
    const to = targetNodes.map(element => point(scene,element));
    if (!to.length) to.push(from);
    const duration = (action ? action.special ? 730 : 510 : 300) / velocity * (quality === "reduced" ? .76 : 1);
    const size = scene.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 1.7);
    if (canvas.width !== Math.round(size.width * scale) || canvas.height !== Math.round(size.height * scale)) {
      canvas.width = Math.round(size.width * scale);
      canvas.height = Math.round(size.height * scale);
    }
    ctx.setTransform(scale,0,0,scale,0,0);
    scene.dataset.vfx = visual;
    if (action) {
      caption.textContent = skill.name;
      caption.hidden = false;
      caption.classList.toggle("special", action.special);
    }
    actor?.classList.add("active");
    if (quality === "full" && actor && targetNodes[0] !== actor) {
      const range = physical.has(visual) && visual !== "arrow" ? 22 : 6;
      const length = Math.hypot(to[0].x - from.x, to[0].y - from.y) || 1;
      const x = (to[0].x - from.x) / length * range;
      const y = (to[0].y - from.y) / length * range;
      actor.animate([
        { transform: "translate(0,0)" }, { transform: `translate(${-x*.22}px,${-y*.22}px) scale(.99)`, offset: .19 },
        { transform: `translate(${x}px,${y}px) scale(1.04)`, offset: .43 }, { transform: "translate(0,0)" }
      ], { duration, easing: "cubic-bezier(.23,.58,.28,1)" });
    }

    await new Promise(resolve => {
      let frame;
      let first;
      let impacted = false;
      function stop() {
        cancelAnimationFrame(frame);
        signal.removeEventListener("abort", stop);
        resolve();
      }
      function draw(now) {
        first ??= now;
        const t = Math.min(1,(now-first)/duration);
        const color = palette[visual];
        ctx.clearRect(0,0,size.width,size.height);
        ctx.strokeStyle = ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = quality === "full" ? 10 : 3;
        ctx.lineCap = "round";
        if (t > .15 && t < .65 && reaching.has(visual)) {
          ctx.globalAlpha = Math.min(.92,(t-.15)*4);
          for (const destination of to) drawPath(ctx,visual,from,destination,ease(Math.min(1,(t-.15)/.33)));
        }
        if (t >= .43) {
          if (!impacted) {
            impacted = true;
            scene.dataset.impact = visual;
            apply(action ? [action, ...changes] : changes);
            for (const event of changes.filter(item => item.type === "intercept").slice(0,1)) {
              const protector = card(scene,event.actor);
              const victim = card(scene,event.target);
              if (protector && victim) {
                ctx.globalAlpha = .88; ctx.strokeStyle = palette.guard;
                drawPath(ctx,"guard",point(scene,protector),point(scene,victim),1);
                protector.animate([{ boxShadow:"0 0 22px #8fcce2" }, { boxShadow:"0 0 2px transparent" }],
                  { duration: duration*.66, easing:"ease-out" });
              }
            }
            for (const event of floatingChanges(changes)) float(scene,event,duration*.72);
            for (const target of targetNodes) {
              if (physical.has(visual) || skill?.intent === "control" || skill?.intent === "offense") {
                target.classList.add("hitting");
                if (quality === "full") target.animate([{ filter:"brightness(1.35)" },{ filter:"brightness(.87)" },{ filter:"brightness(1)" }],
                  { duration:duration*.46, easing:"ease-out" });
              }
            }
          }
          for (const destination of to) drawImpact(ctx,visual,destination,(t-.43)/.57,quality);
        }
        if (t >= 1 || signal.aborted) stop();
        else frame = requestAnimationFrame(draw);
      }
      signal.addEventListener("abort",stop,{ once:true });
      frame = requestAnimationFrame(draw);
    });
    actor?.classList.remove("active");
    for (const element of targetNodes) element.classList.remove("hitting");
    ctx.clearRect(0,0,size.width,size.height);
    caption.hidden = true;
    delete scene.dataset.vfx;
    delete scene.dataset.impact;
  }
}
