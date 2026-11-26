import { applyPlaybackClip, playbackPlan } from "./training-playback.js";

const palette = {
  strike: "#f2c58f", charge: "#ffbc77", slash: "#f5dac4", arrow: "#fadc9e", heavy: "#ffb782",
  arcane: "#d5b3ff", fire: "#ff9e54", water: "#8de4ef", wind: "#a5ecb7", lightning: "#b6d6ff",
  earth: "#e3ae79", divine: "#ffe79e", alchemy: "#d4e88c", poison: "#cb97f8", bite: "#ffb49d", nature: "#d5ee91", heal: "#a7efbc", regen: "#b9e99b",
  guard: "#8fcce2", shield: "#9cc9ff", cleanse: "#eef6be", buff: "#e3db94", move: "#b5d8c6"
};
const physical = new Set(["strike", "charge", "slash", "heavy", "arrow", "bite"]);
const reaching = new Set(["arrow", "lightning", "water", "wind", "arcane", "guard", "move", "fire", "alchemy"]);
const recovery = new Set(["heal", "regen", "cleanse"]);
const protection = new Set(["guard", "shield"]);
const descriptors = { intercept: "Intercepción", cleanse: "Purificación", down: "Incapacitada" };
const initial = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - (1 - t) ** 3;

function card(scene, id) {
  return id ? scene.querySelector(`[data-unit="${CSS.escape(id)}"]`) : null;
}

function point(stage, element) {
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

function drawImpact(ctx, style, to, p, quality, scale = 1) {
  const { x, y } = to;
  const fade = 1 - p;
  const radius = (8 + p * 38) * scale;
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
  } else if (style === "poison" || style === "nature") {
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * .4;
      const dx = Math.cos(angle) * radius * .7, dy = Math.sin(angle) * radius * .55;
      curve(ctx,x + dx * .3,y - p * 10,x + dx,y + dy - p * 14,radius * .28,style === "poison" ? 1.5 : 3);
    }
  } else if (style === "bite") {
    for (const sign of [-1, 1]) {
      const height = (24 - p * 13) * sign * scale;
      stroke(ctx,[[x-radius*.68,y+height],[x-radius*.32,y+height*.42],[x,y+height],[x+radius*.32,y+height*.42],[x+radius*.68,y+height]],2.65);
    }
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
  if (quality === "full") particles(ctx,x,y,p,style === "fire" ? 15 : 9, recovery.has(style) ? 36 : 11);
}

function float(scene, stage, event, duration, motions, quality) {
  const target = card(scene, event.target);
  if (!target) return;
  const location = point(stage,target);
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
  const animation = node.animate(quality === "minimal" ? [
    { opacity: 1 }, { opacity: 1, offset: .72 }, { opacity: 0 }
  ] : [
    { opacity: 0, transform: "translate(-50%, 4px) scale(.88)" },
    { opacity: 1, transform: "translate(-50%, -13px) scale(1.07)", offset: .2 },
    { opacity: 1, transform: "translate(-50%, -26px)", offset: .65 },
    { opacity: 0, transform: "translate(-50%, -43px)" }
  ], { duration, easing: "ease-out" });
  motions.add(animation);
  const clear = () => { node.remove(); motions.delete(animation); };
  animation.finished.then(clear,clear);
}

function secondaryVisual(event) {
  if (event.type === "heal") return "regen";
  if (event.type === "damage") return event.kind === "burn" ? "fire" : event.kind === "poison" ? "poison" : "strike";
  if (event.type === "shield" || event.effect === "guard") return "shield";
  if (event.type === "skip" || event.effect === "stun") return "lightning";
  if (event.type === "move") return "move";
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

function visuals(scene, stage, clip) {
  if (clip.skill) {
    const actor = card(scene,clip.action.actor);
    const targets = clip.action.targets.map(id => card(scene,id)).filter(Boolean);
    const from = point(stage,actor);
    const to = targets.map(target => point(stage,target));
    const visual = clip.changes.some(event => event.effect === "poison") ? "bite" :
      clip.skill.id === "immobilize" ? "nature" : clip.skill.visual;
    return { actor, targets, from, to: to.length ? to : [from], visual };
  }
  const byTarget = new Map();
  for (const event of clip.changes) {
    const visual = secondaryVisual(event);
    const target = card(scene,event.target ?? event.actor);
    if (visual && target) byTarget.set(target,{ visual, to: point(stage,target) });
  }
  return { visuals: [...byTarget.values()].slice(0,6), targets: [] };
}

function animateBody(actor, track, quality, duration) {
  if (!actor || quality !== "full" || track.targets[0] === actor) return null;
  const first = track.to[0];
  const from = track.from;
  const length = Math.hypot(first.x - from.x, first.y - from.y) || 1;
  const force = { strike: 9, slash: 13, bite: 11, heavy: 14, charge: 18, arrow: 4 }[track.visual] ?? 5;
  const x = (first.x - from.x) / length * force;
  const y = (first.y - from.y) / length * force;
  const motion = actor.animate([
    { transform:"translate(0,0)" },
    { transform:`translate(${-x*.31}px,${-y*.31}px) scale(.985)`, offset:.26, easing:"cubic-bezier(.65,.03,.32,1)" },
    { transform:`translate(${x}px,${y}px) scale(1.025)`, offset:.49, easing:"cubic-bezier(.15,.52,.22,1)" },
    { transform:"translate(0,0)" }
  ], { duration });
  motion.pause();
  return motion;
}

function drawClip(ctx, clip, current, quality) {
  const { track, start, end, impact, skill } = clip;
  if (!track) return;
  const local = (current - start) / (end - start || 1);
  const landed = current >= impact;
  const after = (current - impact) / (end - impact || 1);
  ctx.lineCap = "round";
  if (!skill) {
    if (landed) for (const { visual, to } of track.visuals) {
      ctx.strokeStyle = ctx.fillStyle = palette[visual];
      ctx.shadowBlur = 0;
      drawImpact(ctx,visual,to,after,"reduced",.74);
    }
    return;
  }
  const { visual, from, to } = track;
  ctx.strokeStyle = ctx.fillStyle = palette[visual];
  ctx.shadowColor = palette[visual];
  ctx.shadowBlur = quality === "full" ? 12 : 3;
  if (!landed && local > .1 && reaching.has(visual)) {
    ctx.globalAlpha = .91;
    for (const target of to) drawPath(ctx,visual,from,target,ease(Math.min(1,(local-.10)/.38)));
  }
  if (!landed && clip.action.special && quality !== "minimal") {
    ctx.globalAlpha = Math.min(.48,local*.9);
    ellipse(ctx,from.x,from.y,13+local*35,7+local*11,1.4,local*4,Math.PI*1.85+local);
  }
  if (landed) for (const target of to) drawImpact(ctx,visual,target,Math.min(1,after),quality,clip.action.special ? 1.23 : 1);
  if (landed && !protection.has(visual) && clip.shields.length) {
    ctx.strokeStyle = palette.shield;
    for (const target of clip.shields) drawImpact(ctx,"shield",target,after,"reduced",.86);
  }
  if (landed && after < .45) for (const event of clip.intercepts) {
    ctx.strokeStyle = palette.guard;
    ctx.globalAlpha = (1 - after / .45) * .87;
    drawPath(ctx,"guard",event.from,event.to,1);
  }
}

export function playEvents(scene, events, options, apply) {
  const canvas = scene.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const caption = scene.querySelector(".scene-caption");
  const captionActor = caption.querySelector("span");
  const captionSkill = caption.querySelector("strong");
  const signal = options.signal;
  const clips = playbackPlan(events, options.quality());
  const motions = new Set();
  const active = [];
  let starting = 0, landing = 0, frame, previous, current = 0, visible = true;
  let stage = scene.getBoundingClientRect();
  const size = new ResizeObserver(() => { stage = scene.getBoundingClientRect(); });
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; },{ rootMargin:"30px" });
  visibility.observe(scene);
  size.observe(scene);
  const cleanup = clip => {
    clip.motion?.cancel();
    clip.track?.actor?.classList.remove("active");
    for (const target of clip.track?.targets ?? []) target.classList.remove("hitting");
  };
  return new Promise(resolve => {
    function stop() {
      cancelAnimationFrame(frame);
      visibility.disconnect();
      size.disconnect();
      signal.removeEventListener("abort", stop);
      active.forEach(cleanup);
      for (const motion of motions) motion.cancel();
      ctx.clearRect(0,0,canvas.width,canvas.height);
      caption.hidden = true;
      delete scene.dataset.vfx;
      delete scene.dataset.impact;
      delete scene.dataset.impactSkill;
      delete scene.dataset.impactEvents;
      delete scene.dataset.special;
      resolve();
    }

    function tick(now) {
      if (signal.aborted) { stop(); return; }
      if (options.skip()) {
        for (; landing < clips.length; landing++) applyPlaybackClip(clips[landing],apply);
        stop();
        return;
      }
      // Si el navegador suspendió rAF, se conserva el orden y se evita un salto de varias acciones.
      current += Math.min(54,now - (previous ?? now)) * options.speed();
      previous = now;
      const quality = options.quality();
      for (; starting < clips.length && clips[starting].start <= current; starting++) {
        const clip = clips[starting];
        clip.track = visible ? visuals(scene,stage,clip) : null;
        clip.intercepts = [];
        clip.shields = [];
        if (!clip.end && !clip.skill) continue;
        active.push(clip);
        if (!clip.skill || !clip.track) continue;
        clip.track.actor?.classList.add("active");
        if (clip.track.actor) captionActor.textContent = clip.track.actor.dataset.name;
        captionSkill.textContent = clip.skill.name;
        caption.hidden = false;
        caption.classList.toggle("special",clip.action.special);
        scene.dataset.vfx = clip.track.visual;
        scene.dataset.special = String(clip.action.special);
        clip.motion = animateBody(clip.track.actor,clip.track,quality,clip.end-clip.start);
      }
      for (; landing < clips.length && clips[landing].impact <= current; landing++) {
        const clip = clips[landing];
        applyPlaybackClip(clip,apply);
        if (!visible || !clip.track) continue;
        if (clip.skill) {
          scene.dataset.impact = clip.track.visual;
          scene.dataset.impactSkill = clip.skill.id;
          scene.dataset.impactEvents = [...new Set(clip.changes.map(event => event.type))].join(" ");
          options.sound?.(clip.skill.intent === "guard" ? "shield" : clip.track.visual);
        }
        for (const event of floatingChanges(clip.changes)) {
          float(scene,stage,event,Math.max(165,(clip.end-clip.impact)*1.46/options.speed()),motions,quality);
        }
        for (const event of clip.changes) {
          const target = card(scene,event.target);
          if (event.type === "damage" && target && !target.classList.contains("hitting")) {
            target.classList.add("hitting");
            if (quality === "full") {
              const direction = target.closest(".player") ? -3 : 3;
              const rebound = target.querySelector(".unit-fig").animate([
                { transform:"translateX(0)", filter:"brightness(1.28)" },
                { transform:`translateX(${direction}px)`, filter:"brightness(1.06)", offset:.24 },
                { transform:"translateX(0)", filter:"brightness(1)" }
              ], { duration:139/options.speed(), easing:"ease-out" });
              motions.add(rebound);
              rebound.finished.then(() => motions.delete(rebound),() => motions.delete(rebound));
            }
          }
          if (event.type === "shield" && target) clip.shields.push(point(stage,target));
          if (event.type === "intercept" && target && clip.intercepts.length < 2) {
            clip.intercepts.push({ from:point(stage,card(scene,event.actor)), to:point(stage,target) });
          }
        }
      }
      while (active.length && active[0].end <= current) cleanup(active.shift());
      if (visible && quality !== "minimal") {
        const scale = Math.min(devicePixelRatio || 1,quality === "full" ? 1.55 : 1.25);
        const width = Math.round(stage.width*scale), height = Math.round(stage.height*scale);
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        ctx.setTransform(scale,0,0,scale,0,0);
        ctx.clearRect(0,0,stage.width,stage.height);
        for (const clip of active) drawClip(ctx,clip,current,quality);
      } else if (canvas.width > 1) { canvas.width = 1; }
      for (const clip of active) if (clip.motion) clip.motion.currentTime = current-clip.start;
      if (landing >= clips.length && !active.length) stop();
      else frame = requestAnimationFrame(tick);
    }
    signal.addEventListener("abort",stop,{ once:true });
    if (signal.aborted) stop();
    else frame = requestAnimationFrame(tick);
  });
}
