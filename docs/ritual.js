import { RARITIES, TRAITS } from "./catalog.js";

export const RITUAL_DURATION = { full: 4100, reduced: 650, skip: 0 };

const familyColors = {
  arcano: "#b08cff",
  conocimiento: "#7acaff",
  divino: "#ffcf81",
  elemental: "#f3a875",
  fisico: "#ed927e",
  movilidad: "#97bfff",
  oficio: "#efb78a",
  percepcion: "#95c6e7",
  resistencia: "#c6a487",
  social: "#d3a4ec",
  supervivencia: "#9ed2ad"
};

const categoryColors = {
  human: "#e0b18c",
  animal: "#a8d6a1",
  extinct: "#cda789",
  mythic: "#be9dff",
  deity: "#edc57c",
  fusion: "#b7a5fd"
};

const elementalColors = {
  fuego: "#ff976c",
  oceano: "#71dee3",
  tormenta: "#a8a9ff"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function energyAccent(card) {
  const trait = card?.traits?.[0];
  return elementalColors[trait] ?? familyColors[TRAITS[trait]?.family] ?? categoryColors[card?.category] ?? "#a983e2";
}

function motionMode(requested) {
  if (requested === "skip" || requested === "off") return "skip";
  if (requested === "reduced" || requested === "reduce" || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return "reduced";
  return "full";
}

function materialColor(material, index) {
  if (/^#[0-9a-f]{6}$/i.test(material?.accent ?? "")) return material.accent;
  return index ? "#a586f2" : "#8fe8d5";
}

function ritualFrame(materials, essence) {
  return [0, 1].map(index => {
    const material = essence ? null : materials[index];
    const color = materialColor(material, index);
    const symbol = essence ? "◈" : "✧";
    return `<div class="fusion-ritual__material fusion-ritual__material--${index}" style="--material-color:${color}">
      <div class="fusion-ritual__halo"></div>
      <div class="fusion-ritual__shell">
        ${material?.src ? `<img class="fusion-ritual__portrait" src="${escapeHtml(material.src)}" alt="" loading="eager" draggable="false">`
          : `<span class="fusion-ritual__mark">${symbol}</span>`}
        ${material?.name ? `<span class="fusion-ritual__name">${escapeHtml(material.name)}</span>` : ""}
      </div>
    </div>`;
  }).join("");
}

function waitForOpening(dialog, skip, duration) {
  if (duration === 0) return Promise.resolve();

  return new Promise(resolve => {
    const timer = setTimeout(finish, duration);
    skip.addEventListener("click", finish);
    dialog.addEventListener("cancel", cancel);
    dialog.addEventListener("close", finish);

    function finish() {
      clearTimeout(timer);
      skip.removeEventListener("click", finish);
      dialog.removeEventListener("cancel", cancel);
      dialog.removeEventListener("close", finish);
      resolve();
    }

    function cancel(event) {
      event.preventDefault();
      finish();
    }
  });
}

function waitForDismissal(dialog, button) {
  return new Promise(resolve => {
    dialog.addEventListener("close", resolve, { once: true });
    button.addEventListener("click", () => dialog.close(), { once: true });
  });
}

function revealResult(dialog, result, mode) {
  const heading = dialog.querySelector(".fusion-ritual__title");
  const summary = dialog.querySelector(".fusion-ritual__summary");
  const card = result.card ?? result;
  const rarity = Number.isInteger(card.rarity) ? RARITIES[card.rarity] : null;
  const failed = result.failed === true || card.category === "aberration";
  const stage = dialog.querySelector(".fusion-ritual__stage");
  const skip = dialog.querySelector(".fusion-ritual__skip");
  const next = dialog.querySelector(".fusion-ritual__next");

  dialog.classList.add("fusion-ritual--revealed");
  if (failed) dialog.classList.add("fusion-ritual--unstable");
  if ((card.rarity ?? 0) >= 3) dialog.classList.add("fusion-ritual--brilliant");
  dialog.style.setProperty("--reveal-glow", failed ? "#f27f9e" : rarity?.color ?? "#c69aff");
  dialog.style.setProperty("--reveal-motive", failed ? "#b8cda6" : energyAccent(card));
  dialog.querySelector(".fusion-ritual__label").textContent = failed ? "Aberración formada" : "Fusión completada";
  heading.textContent = result.title;
  summary.textContent = result.summary ?? "";
  skip.hidden = true;
  next.hidden = false;
  stage.removeAttribute("aria-hidden");
  stage.innerHTML = `<div class="fusion-ritual__reveal-sigil" aria-hidden="true"></div>
    <div class="fusion-ritual__reveal-card">${result.html ?? ""}</div>`;
  if (mode === "skip") dialog.classList.add("fusion-ritual--static");
  return next;
}

/**
 * El resultado permanece fuera del DOM hasta que termina la secuencia.
 * La Forja guarda la transacción antes de iniciar esta presentación.
 */
export async function playRitual({ mode, kind = "fusion", materials = [], reveal, onReveal }) {
  const preference = motionMode(mode);
  const entrance = RITUAL_DURATION[preference];
  const essence = kind === "essence";
  const dialog = document.createElement("dialog");
  const focused = document.activeElement;
  if (typeof dialog.showModal !== "function") {
    onReveal?.();
    return;
  }

  dialog.className = `fusion-ritual fusion-ritual--${preference}${essence ? " fusion-ritual--essence" : ""}`;
  dialog.setAttribute("aria-labelledby", "ritual-title");
  dialog.setAttribute("aria-describedby", "ritual-summary");
  dialog.style.setProperty("--ritual-duration", `${entrance}ms`);
  dialog.style.setProperty("--material-primary", materialColor(essence ? null : materials[0], 0));
  dialog.style.setProperty("--material-secondary", materialColor(essence ? null : materials[1], 1));
  dialog.innerHTML = `<header class="fusion-ritual__header">
    <div><p class="fusion-ritual__label">${essence ? "Alquimia" : "Forja de fusión"}</p>
      <h2 class="fusion-ritual__title" id="ritual-title" tabindex="-1">${essence ? "Activando esencia" : "Combinando materiales"}</h2></div>
    <button class="button fusion-ritual__skip" type="button">Saltar animación</button>
  </header>
  <div class="fusion-ritual__stage" aria-hidden="true">
    <div class="fusion-ritual__dial"></div>
    <div class="fusion-ritual__thread fusion-ritual__thread--0"></div>
    <div class="fusion-ritual__thread fusion-ritual__thread--1"></div>
    ${ritualFrame(materials, essence)}
    <div class="fusion-ritual__crucible"><span>✦</span></div>
    <div class="fusion-ritual__flash"></div>
  </div>
  <footer class="fusion-ritual__footer">
    <p class="fusion-ritual__summary" id="ritual-summary"></p>
    <button class="button button--primary fusion-ritual__next" type="button" hidden>Continuar</button>
  </footer>`;

  document.body.append(dialog);
  try {
    dialog.showModal();
    const skip = dialog.querySelector(".fusion-ritual__skip");
    if (entrance > 0) {
      skip.focus();
      await waitForOpening(dialog, skip, entrance);
    }
    if (!dialog.open) {
      onReveal?.();
      return;
    }
    const next = revealResult(dialog, reveal(), preference);
    const dismissed = waitForDismissal(dialog, next);
    onReveal?.();
    dialog.querySelector(".fusion-ritual__title").focus();
    await dismissed;
  } finally {
    if (dialog.open) dialog.close();
    dialog.remove();
    if (focused?.isConnected && !focused.disabled) focused.focus({ preventScroll: true });
  }
}
