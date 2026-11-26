const tones = {
  explorador: "#e7bb71", naturaleza: "#bada86", civilizacion: "#f7aa70", primordial: "#ffbe67",
  profundidades: "#97e5f0", arcano: "#c49dfc", panteon: "#fff0ae", quimerico: "#cfa8ff"
};
const rupture = {
  explorador: [-27,-59,-14,19,41,9], naturaleza: [-40,-46,-24,24,35,12],
  civilizacion: [-12,-63,-5,13,42,5], primordial: [-38,-50,-18,38,43,13],
  profundidades: [42,-43,16,-38,32,-12], arcano: [-19,-70,-23,24,44,15],
  panteon: [0,-73,0,0,48,0], quimerico: [-53,-49,-25,47,42,19]
};
const clamp = n => Math.min(1,Math.max(0,n));
const ease = n => 1 - (1 - clamp(n)) ** 3;

function trace(ctx, theme, x, y, i, t) {
  const size = 2 + i % 4;
  const sign = i % 2 ? 1 : -1;
  ctx.save();
  ctx.translate(x,y);
  if (theme === "naturaleza") {
    ctx.rotate(i * .7 + t * 2);
    ctx.beginPath();
    ctx.moveTo(-size * 2,0); ctx.quadraticCurveTo(0,-size * 2,size * 2,0);
    ctx.quadraticCurveTo(0,size * 1.5,-size * 2,0); ctx.fill();
  } else if (theme === "profundidades") {
    ctx.beginPath(); ctx.ellipse(0,0,size * 1.2,size,0,0,Math.PI*2); ctx.stroke();
    ctx.fillRect(-size * .42,-size * .62,1.4,1.4);
  } else if (theme === "civilizacion") {
    ctx.rotate(sign * (i + t));
    ctx.fillRect(0,0,1.4,size * 5);
  } else if (theme === "primordial") {
    ctx.rotate(i + t * 2);
    ctx.beginPath(); ctx.moveTo(-size,0); ctx.lineTo(-1,-size); ctx.lineTo(size,-2); ctx.lineTo(2,size); ctx.closePath(); ctx.fill();
  } else if (theme === "arcano" || theme === "quimerico") {
    if (theme === "quimerico") ctx.strokeStyle = i % 2 ? "#8ce2c9" : "#f3b6e2";
    ctx.rotate(i / 3 + t * sign);
    ctx.strokeRect(-size,-size,size * 2,size * 2);
  } else if (theme === "panteon") {
    ctx.fillRect(0,-size * 3,1.4,size * 6);
    ctx.fillRect(-size,0,size * 2,1.4);
  } else {
    ctx.beginPath(); ctx.arc(0,0,size / 2,0,Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawBurst(ctx, theme, w, h, burst, count) {
  const u = ease(burst);
  const center = { x: w / 2, y: h * .48 };
  const tone = tones[theme] ?? tones.explorador;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = ctx.strokeStyle = tone;
  ctx.lineWidth = 1.45;
  if ((theme === "profundidades" || theme === "arcano" || theme === "panteon" || theme === "quimerico") && burst > 0) {
    ctx.globalAlpha = (1-burst) * .66;
    for (let i = 0; i < 3; i++) {
      const spread = 13 + u * Math.min(w * .36,205);
      ctx.beginPath();
      ctx.ellipse(center.x,center.y,spread + i * 12,11 + u * (i + 1) * (theme === "panteon" ? 23 : 12),0,i * .35,Math.PI*2 - i * .4);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = (1 - burst) * .94;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996;
    const radius = (37 + i % 11 * 14) * u;
    const x = center.x + Math.cos(angle) * radius * (theme === "profundidades" ? .71 : 1.22);
    const y = center.y + Math.sin(angle) * radius * .53 - burst * (["naturaleza","profundidades","panteon"].includes(theme) ? 92 : 43);
    trace(ctx,theme,x,y,i,burst);
  }
  ctx.globalAlpha = 1;
}

export function playPackRupture(stage, { mode, fast, onBreak, onFinish }) {
  const theme = stage.dataset.theme;
  const canvas = stage.querySelector("canvas");
  const area = stage.querySelector(".pack-playing-area");
  const upper = stage.querySelector(".pack-wrapper-top");
  const lower = stage.querySelector(".pack-wrapper-bottom");
  const halo = stage.querySelector(".pack-wrapper-halo");
  const wrap = stage.querySelector(".pack-wrapper");
  const seam = stage.querySelector(".pack-wrapper-seam");
  const ctx = canvas.getContext("2d");
  const reduced = mode === "reduced";
  const duration = reduced ? 790 : 1460;
  let speed = fast ? 2 : 1;
  let frame, previous, time = 0, split = false, stopped = false;
  const scale = Math.min(devicePixelRatio,1.5);
  const [topX,topY,topRoll,bottomX,bottomY,bottomRoll] = rupture[theme] ?? rupture.explorador;
  let width = 0, height = 0;
  const size = new ResizeObserver(entries => {
    const rect = entries[0].contentRect;
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ctx.setTransform(scale,0,0,scale,0,0);
  });
  size.observe(area);
  stage.dataset.phase = "opening";

  function dispose() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    size.disconnect();
    ctx.clearRect(0,0,width,height);
  }

  function finish() {
    if (stopped) return;
    dispose();
    stage.dataset.phase = "ready";
    stage.querySelector(".pack-fan")?.classList.add("pack-fan-arrival");
    onFinish?.();
  }

  function tick(now) {
    time += Math.min(64,now - (previous ?? now)) * speed;
    previous = now;
    const t = clamp(time / duration);
    const enter = ease(t / .37);
    const reveal = ease((t - .47) / .53);
    const floating = Math.sin(t * 15) * (1 - reveal) * (reduced ? 0 : 3.3);
    wrap.style.transform = `translate(-50%,calc(-50% + ${(1 - enter) * 49 + floating}px)) scale(${.73 + enter * .28})`;
    wrap.style.opacity = String(Math.min(enter * 2,1) * (1 - reveal ** 2));
    upper.style.transform = `translate(${reveal * topX}px,${reveal * topY}px) rotate(${reveal * topRoll}deg)`;
    lower.style.transform = `translate(${reveal * bottomX}px,${reveal * bottomY}px) rotate(${reveal * bottomRoll}deg)`;
    halo.style.opacity = String(clamp(1- Math.abs(t-.47)*3.4));
    seam.style.opacity = String(clamp(1- Math.abs(t-.48)*7));
    if (t > .46) {
      if (!split) { split = true; onBreak?.(theme); }
      drawBurst(ctx,theme,width,height,clamp((t-.46)/.52),reduced ? 15 : 38);
    }
    if (t >= 1) finish();
    else frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return { dispose, finish, speed: value => { speed = value; } };
}
