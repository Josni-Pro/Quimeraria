import { ABILITIES, CARDS, CATEGORIES, ECONOMY, MISSIONS, PACKS, RARITIES, STATS, TRAITS } from "./catalog.js";
import {
  createGame, fuseCards, getCard, getPackOdds, loadGame, MAX_GENERATION, openPack,
  previewExpedition, previewFusion, runExpedition, serializeGame
} from "./engine.js";
import { assetPortrait, getPortrait, portraitFinish, portraitLevelFor } from "./illustrations.js";
import { describeFusionPortrait } from "./fusion-art.js";
import { PORTRAIT_PROFILES } from "./portrait-profiles.js";

const SAVE_KEY = "quimeraria:partida:v1";
const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const app = document.querySelector("#app");
const wallet = document.querySelector("#wallet");
const modal = document.querySelector("#modal");
const modalContent = document.querySelector("#modal-content");
const toast = document.querySelector("#toast");
const tabs = [...document.querySelectorAll("[data-view]")];
const icons = { power: "⚔", guard: "⛨", focus: "✧" };
const sigils = { human: "✺", animal: "❖", extinct: "◈", mythic: "✵", deity: "✷", fusion: "✧" };
const preferredOrder = ["alquimista", "lobo", "mamut", "buho", "obrero", "zorro"];
const pages = {
  forja: { title: "Forja de fusión", description: "Combina dos cartas y descubre la quimera que nace de sus rasgos." },
  coleccion: { title: "Colección", description: "Consulta tus cartas, sus rasgos y las quimeras que has descubierto." },
  sobres: { title: "Tienda de sobres", description: "Compra sobres con óbolos y encuentra materiales para nuevas fusiones." },
  expediciones: { title: "Expediciones", description: "Forma un equipo, aprovecha sus habilidades y gana óbolos." }
};

let persisted;
try { persisted = localStorage.getItem(SAVE_KEY); } catch { /* The current session still works. */ }
let state = persisted ? loadGame(persisted) : createGame();
let selected = persisted ? [] : preferredOrder.slice(0, 2);
let latestFusion = null;
let lastExpedition = null;
let missionId = MISSIONS[0].id;
let team = [];
let view = currentView();
let category = "all";
let collectionMode = "owned";
let query = "";
let toastTimer;
let storageUnavailable = false;

function escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function currentView() {
  const id = location.hash.slice(1);
  return Object.hasOwn(pages, id) ? id : "forja";
}

function intro(id) {
  const page = pages[id];
  return `<div class="page-intro"><div class="eyebrow"><i aria-hidden="true">✧</i> ${id === "forja" ? "El laboratorio" : "Quimeraria"}</div>
    <h1>${page.title}</h1><p>${page.description}</p></div>`;
}

function photo(portrait, extra = "", loading = "lazy") {
  return portrait.src ? `<img class="portrait-image ${extra}" src="${escape(portrait.src)}" alt="" loading="${loading}" decoding="async" draggable="false">` : "";
}

function resultPortrait(outcome) {
  return getPortrait(outcome.card, state, outcome.portraitLevel ?? portraitLevelFor(outcome.card, state));
}

function visualTraits(card) {
  if (card.category !== "fusion") return PORTRAIT_PROFILES[card.id]?.visual ?? "";
  return describeFusionPortrait(card, state);
}

function badge(card, extra = "") {
  const rarity = RARITIES[card.rarity];
  return `<span class="rarity-badge ${extra}" style="--rarity:${rarity.color}">${rarity.name}</span>`;
}

function traits(card) {
  return card.traits.map(id => `<span>${escape(TRAITS[id].name)}</span>`).join("");
}

function statList(card) {
  return `<div class="result-stats">${Object.entries(STATS).map(([id, stat]) =>
    `<div class="stat"><span class="stat-icon" aria-hidden="true">${icons[id]}</span><span class="stat-name">${stat.name}</span><strong>${card.stats[id]}</strong></div>`
  ).join("")}</div>`;
}

function ability(card, showDescription = false) {
  const skill = ABILITIES[card.ability];
  if (!skill) return "";
  return `<div class="ability"><span aria-hidden="true">✧</span><strong>${escape(skill.name)}</strong><span>+${skill.bonus} ${STATS[skill.stat].name}${showDescription ? ". " + escape(skill.description) : ""}</span></div>`;
}

function cardFace(card, options = {}) {
  const { action, count, slot, compact, picked = 0 } = options;
  const portrait = getPortrait(card, state);
  const finish = portraitFinish(portrait.level);
  const tag = action ? "button" : "div";
  const modifiers = [!portrait.src && "card--fallback", (picked || slot) && "card--selected",
    portrait.kind === "generated" && "card--generated"].filter(Boolean).join(" ");
  const attributes = action ? `type="button" data-action="${action}" data-id="${escape(card.id)}"
    aria-label="${escape(card.name)}, ${RARITIES[card.rarity].name}${count ? `, ${count} copias` : ""}"${action === "choose" || action === "team" ? ` aria-pressed="${picked > 0}"` : ""}` : "";
  return `<${tag} ${attributes} class="card ${modifiers}" data-portrait-level="${portrait.level}">
    <span class="card-art" data-sigil="${sigils[card.category]}" aria-hidden="true">${photo(portrait, "", slot ? "eager" : "lazy")}</span>
    ${badge(card, "card-badge")}
    ${count || picked ? `<span class="card-count ${picked ? "card-pick" : ""}">${picked ? "✓" + (picked > 1 ? picked : "") : "×" + count}</span>` : ""}
    <span class="card-name">${escape(card.name)}</span>
    <span class="card-kind">${CATEGORIES[card.category].singular}${card.generation ? " · G" + card.generation : ""}${finish ? " · " + finish : ""}</span>
    ${slot ? `<span class="card-tags">${traits(card)}</span>` : ""}
    ${compact ? `<span class="micro-stats">${Object.keys(STATS).map(id => `<span aria-label="${STATS[id].name}">${icons[id]}</span>${card.stats[id]}`).join("")}</span>` : ""}
  </${tag}>`;
}

function ingredients() {
  return [0, 1].map(i => {
    const card = getCard(selected[i], state);
    return `<div class="ingredient-col"><span class="ingredient-label">Material ${i === 0 ? "I" : "II"}</span>
      <div class="ingredient-slot">${card ? cardFace(card, { slot: true }) +
        `<button type="button" class="remove-slot" data-action="remove" data-id="${i}" aria-label="Quitar ${escape(card.name)}">×</button>`
        : `<button type="button" class="ingredient-empty" data-action="inventory"><strong aria-hidden="true">+</strong> Elegir carta</button>`}</div></div>`;
  }).join('<div class="ritual" aria-hidden="true">✧</div>');
}

function forgePreview() {
  return selected.length === 2 ? previewFusion(state, ...selected) : null;
}

function renderResult(preview) {
  const outcome = latestFusion ?? (preview?.ok ? preview : null);
  if (!outcome) {
    return `<div class="result result-empty"><div class="result-top"><span class="result-label">✧ &nbsp; Vista previa</span></div>
      <i aria-hidden="true">✧</i><h2>${preview ? "Fusión no disponible" : "Crisol vacío"}</h2>
      <p>${escape(preview?.error ?? "Elige dos cartas de tu colección.")}</p></div>`;
  }
  const card = outcome.card;
  const portrait = resultPortrait(outcome);
  const finish = portraitFinish(portrait.level);
  const illustrationUpgrades = portrait.level > portraitLevelFor(card, state);
  const description = card.art === "arcanolobo" ? "Une el rastreo del lobo con la precisión de la alquimia." : card.description;
  return `<div class="result result--${portrait.kind}" data-portrait-level="${portrait.level}">
    <div class="result-art" aria-hidden="true">${photo(portrait, "", "eager")}</div>
    <div class="result-top"><span class="result-label">✧ &nbsp; ${latestFusion ? "Fusión completada" : "Vista previa de fusión"}</span>${badge(card)}</div>
    ${finish ? `<div class="finish-label">${illustrationUpgrades ? "Desbloquea " : "Ilustración "} ${finish.toLowerCase()}</div>` : ""}
    <h2>${escape(card.name)}</h2><p class="result-description">${escape(description)}</p>
    ${statList(card)}${ability(card)}
    <div class="result-links">
      <button type="button" class="explain" data-action="explain">Ver fórmula y rasgos</button>
      ${portrait.src ? '<button type="button" class="explain" data-action="portrait-result">Ver ilustración</button>' : ""}
    </div>
  </div>`;
}

function inventory() {
  return Object.entries(state.inventory).map(([id, count]) => ({ card: getCard(id, state), count })).filter(item => item.card);
}

function collectionItems() {
  const owned = inventory();
  if (view !== "coleccion" || collectionMode === "owned") return owned;
  if (collectionMode === "discovered") {
    return state.discovered.map(id => ({ card: getCard(id, state), count: state.inventory[id] ?? 0 })).filter(item => item.card);
  }
  return CARDS.map(base => ({ card: getCard(base.id, state), count: state.inventory[base.id] ?? 0 }));
}

function normalize(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
}

function collectionGrid() {
  const action = view === "forja" ? "choose" : "detail";
  const items = collectionItems().filter(({ card }) => {
    if (category !== "all" && card.category !== category) return false;
    return !query || normalize(`${card.name} ${card.traits.map(id => TRAITS[id].name).join(" ")}`).includes(normalize(query));
  });
  if (!items.length) return '<div class="empty">No hay cartas con estos filtros.</div>';
  return items.map(({ card, count }) => {
    const picked = view === "forja" ? selected.filter(id => id === card.id).length : 0;
    return `<div class="card-tile">${cardFace(card, { action, count, compact: true, picked })}</div>`;
  }).join("");
}

function renderInventory() {
  const total = inventory().reduce((sum, item) => sum + item.count, 0);
  const modeSwitch = view === "coleccion" ? `<div class="filters tabs" aria-label="Vista de colección">
    ${[["owned","En tu inventario"],["discovered","Descubiertas"],["catalog","Catálogo base"]].map(([id, name]) =>
      `<button class="tab" data-action="mode" data-id="${id}" aria-pressed="${collectionMode === id}">${name}</button>`).join("")}</div>` : "";
  return `<section id="inventory" class="section" aria-labelledby="inventory-title" tabindex="-1">
    <div class="section-head">
      <div><div class="section-title"><h2 id="inventory-title">${view === "forja" ? "Tu colección" : "Cartas"}</h2>
          <span class="count">${number.format(view === "coleccion" && collectionMode !== "owned" ? collectionItems().length : total)} cartas</span></div>
        <p class="section-sub">${view === "forja" ? "Selecciona cartas para preparar una fusión." : "Selecciona una carta para ver su ficha."}</p></div>
      ${view === "forja" ? '<a class="link-quiet" href="#coleccion">Ver colección →</a>' : ""}
    </div>
    ${modeSwitch}
    <div class="filters"><div class="tabs" aria-label="Filtrar por origen">
      ${[["all","Todas"], ...Object.entries(CATEGORIES).map(([id, item]) => [id, item.name])].filter(([id]) => id !== "fusion" || view !== "coleccion" || collectionMode !== "catalog").map(([id, name]) =>
        `<button class="tab" type="button" data-action="filter" data-id="${id}" aria-pressed="${category === id}">${name}</button>`).join("")}
    </div><input type="search" class="search" id="search" aria-label="Buscar carta o rasgo" placeholder="Buscar carta o rasgo…" value="${escape(query)}"></div>
    <div class="card-grid" id="card-grid">${collectionGrid()}</div>
  </section>`;
}

function renderForge() {
  const preview = forgePreview();
  return `${intro("forja")}<section class="forge" aria-label="Mesa de fusión">
    <div class="forge-left">
      <div class="forge-title"><span aria-hidden="true">⚗</span> Mesa de fusión</div>
      <div class="ingredient-row">${ingredients()}</div>
      <div class="forge-footer">
        <button class="button button--primary button--forge" type="button" data-action="fuse" ${preview?.ok && preview.affordable ? "" : "disabled"}>
          <span aria-hidden="true">✦</span> Fusionar cartas ${preview?.ok ? `<span class="button-price"><span aria-hidden="true">◈</span> ${preview.cost} <span class="sr-only">óbolos</span></span>` : ""}
        </button>
        <p>${preview?.ok && !preview.affordable ? "Te faltan óbolos. Puedes ganarlos en expediciones." : "La fusión consume los dos materiales."}</p>
      </div>
    </div>${renderResult(preview)}</section>${renderInventory()}`;
}

function oddsList(odds) {
  return odds.map((value, i) => `<span>${RARITIES[i].name} <strong>${number.format(value)}%</strong></span>`).join("");
}

function renderShop() {
  return `${intro("sobres")}<div class="pack-grid">
    ${PACKS.map(pack => {
      const odds = getPackOdds(state, pack.id);
      return `<article class="panel pack">
        <div class="pack-art" aria-hidden="true">${photo({ src: assetPortrait("sobre-" + pack.art) })}</div>
        <div><h2>${escape(pack.name)}</h2><p>${escape(pack.description)}</p></div>
        <span class="pack-small">${pack.slots} cartas por sobre</span>
        ${odds.ok ? `<details><summary>Probabilidades y garantía</summary>
          <div class="odds">${oddsList(odds.odds)}</div>
          ${odds.guaranteedOdds ? `<p>Garantía de ${RARITIES[pack.pityRarity].name.toLowerCase()} o superior. ${odds.pityActive
            ? "Se activa en este sobre si las primeras cartas quedan por debajo."
            : `Se activa dentro de ${odds.remaining} compra${odds.remaining === 1 ? "" : "s"} si antes no consigues esa rareza.`}</p>
            ${odds.pityActive ? `<div class="odds">${oddsList(odds.guaranteedOdds)}</div>` : ""}` : ""}</details>` : ""}
        <button class="button button--primary" data-action="buy" data-id="${pack.id}" ${!odds.ok || state.coins < pack.cost ? "disabled" : ""}>
          ${state.coins < pack.cost ? "Óbolos insuficientes" : "Comprar sobre"} <span aria-hidden="true">◈</span> ${pack.cost}</button>
      </article>`;
    }).join("")}</div><p class="pack-note">Las probabilidades normales corresponden a cada carta. Los duplicados se conservan para que puedas probar nuevas fusiones. Gana óbolos en <a class="link-quiet" href="#expediciones">expediciones →</a></p>`;
}

function renderExpeditions() {
  const mission = MISSIONS.find(item => item.id === missionId);
  const preview = previewExpedition(state, mission.id, team);
  const result = preview.ok ? preview.result : null;
  const summary = lastExpedition ? `<div class="message-box" role="status">${lastExpedition.success ? "Expedición completada" : "Obtuviste una recompensa parcial"}. +${lastExpedition.reward} óbolos${lastExpedition.firstClear ? ` (incluye +${lastExpedition.firstClear} por el primer logro)` : ""}.</div>` : "";
  return `${intro("expediciones")}<div class="mission-layout">
    <aside class="mission-list" aria-label="Elegir expedición">${MISSIONS.map(item => `<button class="mission-choice" type="button" data-action="mission" data-id="${item.id}" aria-pressed="${item.id === missionId}">
      <strong>${escape(item.name)}</strong><span>${item.stat ? STATS[item.stat].name + " · " : ""}${item.slots} carta${item.slots === 1 ? "" : "s"} · ${item.reward} óbolos</span>
    </button>`).join("")}</aside>
    <section class="panel mission-team" aria-labelledby="mission-title">
      <div><h2 id="mission-title">${escape(mission.name)}</h2><p>${escape(mission.description)}</p></div>
      <div class="mission-info"><span class="count">${mission.stat ? STATS[mission.stat].name + " · " : ""}Meta ${mission.threshold}</span>${mission.trait ? `<span class="count">${escape(TRAITS[mission.trait].name)} +${mission.traitBonus} al equipo</span>` : ""}</div>
      ${summary}
      <p>Forma un equipo de ${mission.slots} carta${mission.slots === 1 ? "" : "s"}. Tus cartas regresan al terminar.</p>
      <div class="card-grid">${inventory().map(({ card, count }) => cardFace(card, { action: "team", count, compact: true, picked: team.filter(id => id === card.id).length })).join("")}</div>
      <div class="mission-controls">
        <span class="mission-progress">${result ? `Puntuación ${result.score}/${result.threshold} · ${result.success ? "Éxito previsto" : "Recompensa parcial"} · +${result.reward} óbolos` : `Equipo ${team.length}/${mission.slots}`}</span>
        ${result ? '<button class="button" data-action="mission-info">Ver cálculo</button>' : ""}
        <button class="button button--primary" data-action="run" ${result ? "" : "disabled"}>Iniciar expedición</button>
      </div>
    </section></div>`;
}

function render(focus) {
  app.innerHTML = view === "forja" ? renderForge() : view === "coleccion" ? intro(view) + renderInventory() : view === "sobres" ? renderShop() : renderExpeditions();
  wallet.textContent = number.format(state.coins);
  for (const tab of tabs) {
    if (tab.dataset.view === view) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  if (focus?.action) [...app.querySelectorAll("[data-action]")].find(item => item.dataset.action === focus.action && item.dataset.id === focus.id)?.focus({ preventScroll: true });
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toastTimer = setTimeout(() => { toast.textContent = ""; }, 4000);
}

function showModal(title, body) {
  modalContent.innerHTML = `<div class="modal-inner"><button class="help-button modal-close" aria-label="Cerrar" data-action="close">×</button>
    <h2 id="modal-title">${escape(title)}</h2>${body}</div>`;
  if (!modal.open) modal.showModal();
  modalContent.querySelector(".modal-close").focus();
}

function showRules() {
  showModal("Cómo jugar", `<p>Empiezas con ${Object.keys(createGame().inventory).length} cartas y ${ECONOMY.startingCoins} óbolos.</p>
    <ul>
      <li><strong>Forja.</strong> Elige dos cartas de cualquier origen. El orden da el mismo resultado. Confirma para gastar óbolos y una copia de cada material.</li>
      <li><strong>Afinidad.</strong> Suma puntos por orígenes distintos, especialidades complementarias o rasgos emparentados. Dos puntos pueden elevar la rareza media. Algunos pares tienen una fórmula propia.</li>
      <li><strong>Ilustraciones.</strong> Cada pareja crea su propio retrato. Repite una fórmula para desbloquear las versiones refinada y magistral. Las mejoras son visuales.</li>
      <li><strong>Poder.</strong> La rareza fija el total de atributos. La distribución depende de los materiales y la habilidad. Una quimera puede llegar hasta la generación ${MAX_GENERATION} y debe combinar linajes sin repetir.</li>
      <li><strong>Expediciones.</strong> La puntuación combina el atributo de la misión, habilidades y afinidad con el terreno. La Senda siempre te permite ganar óbolos con una carta.</li>
      <li><strong>Sobres.</strong> Cada tipo tiene sus probabilidades y su propia garantía. Los óbolos se consiguen jugando.</li>
    </ul>`);
}

function showExplanation() {
  const outcome = latestFusion ?? forgePreview();
  if (!outcome?.ok) return;
  const card = outcome.card;
  showModal("Fórmula de fusión", `<p><strong>${escape(card.name)}</strong> · Generación ${card.generation} · Afinidad ${outcome.synergy}/3</p>
    <p>${card.parents.map(id => escape(getCard(id, state)?.name ?? id)).join(" + ")}</p>
    ${visualTraits(card) ? `<p><strong>Motivos de los linajes</strong> · ${escape(visualTraits(card))}.</p>` : ""}
    <ul>${outcome.explanation.map(line => `<li>${escape(line)}</li>`).join("")}</ul>
    ${statList(card)}<div class="card-tags">${traits(card)}</div>`);
}

function showPortrait(card, portrait = getPortrait(card, state)) {
  if (!portrait.src) return;
  const finish = portraitFinish(portrait.level);
  showModal(card.name, `<div class="portrait-view" data-portrait-level="${portrait.level}">
    <img src="${escape(portrait.src)}" alt="${escape(visualTraits(card) || card.name)}">
  </div>${finish ? `<p>Ilustración ${finish.toLowerCase()}</p>` : ""}
  ${card.parents.length ? `<p>${card.parents.map(id => escape(getCard(id, state)?.name ?? id)).join(" + ")}</p>` : ""}`);
}

function showCard(id) {
  const card = getCard(id, state);
  if (!card) return;
  const count = state.inventory[id] || 0;
  const portrait = getPortrait(card, state);
  showModal(card.name, `<div class="detail-layout">${cardFace(card, { compact: true })}
    <div><p>${escape(card.description)}</p>${statList(card)}
    <div class="card-tags">${traits(card)}</div><div class="detail-ability">${ability(card, true)}</div>
    <p>${count ? `Copias en inventario: ${count}` : "Sin copias en el inventario."}</p>
    ${card.parents?.length ? `<p>Materiales: ${card.parents.map(parent => escape(getCard(parent, state)?.name ?? parent)).join(" + ")}.</p>` : ""}</div></div>
    <div class="modal-actions">
      ${portrait.src ? `<button class="button" data-action="portrait-card" data-id="${escape(id)}">Ver ilustración</button>` : ""}
      ${count && card.generation < MAX_GENERATION ? `<button class="button button--primary" data-action="use" data-id="${escape(id)}">Llevar a la forja</button>` : ""}
    </div>`);
}

function showMissionCalculation() {
  const preview = previewExpedition(state, missionId, team);
  if (!preview.ok) return;
  const { result, mission } = preview;
  showModal("Cálculo de la expedición", `<p>${escape(mission.name)} · ${result.score}/${result.threshold}</p>
    <ul>${result.lines.map(line => `<li><strong>${escape(line.name)}</strong> · ${line.base} puntos${line.bonus ? ` + ${line.bonus} por ${escape(line.ability)}` : ""}</li>`).join("")}
    ${result.traitBonus ? `<li>+${result.traitBonus} por ${escape(TRAITS[mission.trait].name)}.</li>` : ""}</ul>
    <p>Recompensa de ${result.reward} óbolos${result.firstClear ? ` con ${result.firstClear} de primer logro` : ""}.</p>`);
}

function choose(id) {
  const card = getCard(id, state);
  if (!card || !state.inventory[id]) return;
  if (card.generation >= MAX_GENERATION) {
    showToast("Esta quimera alcanzó su límite de fusión.");
    return;
  }
  const copies = selected.filter(item => item === id).length;
  if (copies >= state.inventory[id]) {
    selected.splice(selected.lastIndexOf(id), 1);
  } else if (selected.length < 2) {
    selected.push(id);
  } else {
    selected[1] = id;
  }
  latestFusion = null;
}

function teamPick(id) {
  const copies = team.filter(item => item === id).length;
  const slots = MISSIONS.find(item => item.id === missionId).slots;
  if (copies >= state.inventory[id]) team.splice(team.lastIndexOf(id), 1);
  else if (team.length < slots) team.push(id);
  else team[slots - 1] = id;
  lastExpedition = null;
}

function reconcileSelections() {
  for (const list of [selected, team]) {
    const counts = new Map();
    const valid = list.filter(id => {
      const count = (counts.get(id) || 0) + 1;
      counts.set(id, count);
      return count <= (state.inventory[id] || 0);
    });
    list.splice(0, list.length, ...valid);
  }
}

async function transact(update, completed) {
  const perform = () => {
    if (!storageUnavailable) {
      try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved && saved !== persisted) {
          state = loadGame(saved);
          persisted = saved;
          reconcileSelections();
        }
      } catch { storageUnavailable = true; }
    }
    const outcome = update(state);
    if (!outcome.ok) {
      render();
      showToast(outcome.error);
      return;
    }
    state = outcome.state;
    if (!storageUnavailable) {
      try {
        persisted = serializeGame(state);
        localStorage.setItem(SAVE_KEY, persisted);
      } catch { storageUnavailable = true; }
    }
    completed(outcome);
    reconcileSelections();
    render();
    if (storageUnavailable) showToast("La partida se mantendrá abierta en esta sesión. El navegador impide guardarla.");
  };
  if (navigator.locks?.request) await navigator.locks.request(SAVE_KEY, perform);
  else perform();
}

function scrollToInventory() {
  const inventorySection = document.querySelector("#inventory");
  inventorySection?.focus({ preventScroll: true });
  inventorySection?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
}

function changeView() {
  const destination = currentView();
  if (destination !== view) {
    view = destination;
    category = "all";
    query = "";
    render();
    window.scrollTo({ top: 0 });
  }
}

document.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const { action, id } = button.dataset;
  const focus = { action, id };
  switch (action) {
    case "rules": showRules(); break;
    case "close": modal.close(); break;
    case "inventory": scrollToInventory(); break;
    case "explain": showExplanation(); break;
    case "portrait-result": {
      const outcome = latestFusion ?? forgePreview();
      if (outcome?.ok) showPortrait(outcome.card, resultPortrait(outcome));
      break;
    }
    case "portrait-card": {
      const card = getCard(id, state);
      if (card) showPortrait(card);
      break;
    }
    case "detail": showCard(id); break;
    case "mission-info": showMissionCalculation(); break;
    case "choose":
      choose(id);
      render(focus);
      break;
    case "remove":
      selected.splice(Number(id), 1);
      latestFusion = null;
      render();
      document.querySelector(".ingredient-empty")?.focus({ preventScroll: true });
      break;
    case "use":
      modal.close();
      if (!selected.includes(id)) choose(id);
      location.hash = "forja";
      changeView();
      render();
      window.scrollTo({ top: 0 });
      break;
    case "filter":
      category = id;
      render(focus);
      break;
    case "mode":
      collectionMode = id;
      category = "all";
      query = "";
      render(focus);
      break;
    case "fuse": {
      button.disabled = true;
      const materials = selected.slice();
      await transact(game => fuseCards(game, ...materials), outcome => {
        latestFusion = outcome;
        selected = [];
        showToast(`${outcome.card.name} se añadió a tu colección.`);
      });
      if (latestFusion) document.querySelector(".result .explain")?.focus({ preventScroll: true });
      break;
    }
    case "buy":
      button.disabled = true;
      await transact(game => openPack(game, id), outcome => {
        showModal("Cartas del sobre", `<p>${escape(outcome.pack.name)} · ${outcome.cards.length} cartas nuevas en tu inventario${outcome.pityTriggered ? " · Se activó la garantía" : ""}.</p>
          <div class="card-grid">${outcome.cards.map(card => cardFace(card, { compact: true })).join("")}</div>
          <div class="modal-actions"><button class="button button--primary" data-action="close">Continuar</button><a class="button" href="#coleccion" data-action="close">Ver colección</a></div>`);
      });
      break;
    case "mission":
      missionId = id;
      team = [];
      lastExpedition = null;
      render(focus);
      break;
    case "team":
      teamPick(id);
      render(focus);
      break;
    case "run": {
      const expedition = missionId;
      const cards = team.slice();
      await transact(game => runExpedition(game, expedition, cards), outcome => { lastExpedition = outcome.result; });
      document.querySelector('[data-action="run"]')?.focus({ preventScroll: true });
      break;
    }
  }
});

app.addEventListener("input", event => {
  if (event.target.id !== "search") return;
  query = event.target.value.trim();
  const grid = document.querySelector("#card-grid");
  if (grid) grid.innerHTML = collectionGrid();
});

window.addEventListener("hashchange", changeView);
window.addEventListener("storage", event => {
  if (event.key !== SAVE_KEY || !event.newValue || event.newValue === persisted) return;
  state = loadGame(event.newValue);
  persisted = event.newValue;
  reconcileSelections();
  render();
});

render();
