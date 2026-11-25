import { ABILITIES, CARDS, CATEGORIES, ECONOMY, MISSIONS, PACKS, RARITIES, STATS, TRAITS } from "./catalog.js";
import {
  acknowledgeReveal, createEssence, createGame, describeDiscoveredFusion, fuseCards, getCard, getExpeditionSlots, getFusionCopies, getPackOdds, loadGame,
  MAX_GENERATION, openPack, previewExpedition, previewFusion, runExpedition, serializeGame, setAnimationMode, useEssence
} from "./engine.js";
import { assetPortrait, getPortrait, portraitFinish, portraitLevelFor, portraitStatus } from "./illustrations.js";
import { describeFusionPortrait } from "./fusion-art.js";
import { PORTRAIT_PROFILES } from "./portrait-profiles.js";
import { renderAlchemy, renderAberrationDetails, renderEssences } from "./alchemy-ui.js";
import { energyAccent, playRitual } from "./ritual.js";
import { ALCHEMY } from "./game-config.js";
import { FAILURE_FAMILIES } from "./aberration-concepts.js";
import { CONCEPT_LABELS, getCreatureConcept } from "./creature-concepts.js";
import { CAPABILITY_FAMILIES, COMBAT_ROLES, COMBAT_STATS, getCreatureProfiles, MOBILITY_LABELS, UTILITY_FAMILIES } from "./creature-profiles.js";
import { VARIANT_FAMILIES, VARIANT_QUALITY_LABELS } from "./fusion-variants.js";

const SAVE_KEY = "quimeraria:partida:v1";
const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const collator = new Intl.Collator("es-MX");
const app = document.querySelector("#app");
const wallet = document.querySelector("#wallet");
const modal = document.querySelector("#modal");
const modalContent = document.querySelector("#modal-content");
const toast = document.querySelector("#toast");
const tabs = [...document.querySelectorAll("[data-view]")];
const icons = { power: "⚔", guard: "⛨", focus: "✧" };
const sigils = { human: "✺", animal: "❖", extinct: "◈", mythic: "✵", deity: "✷", fusion: "✧", aberration: "◬" };
const preferredOrder = ["alquimista", "lobo", "mamut", "buho", "obrero", "zorro"];
const pages = {
  forja: { title: "Forja de fusión", description: "Combina dos cartas y descubre la quimera que nace de sus rasgos." },
  alquimia: { title: "Alquimia", description: "Recupera linajes de las aberraciones y conviértelos en una nueva fusión." },
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
let alchemySelection = [];
let revealRunning = false;
let revealVisible = false;
let missionId = MISSIONS[0].id;
let team = [];
let view = currentView();
let category = "all";
let collectionMode = "owned";
let collectionGroup = "none";
let query = "";
let toastTimer;
let storageUnavailable = false;
const portraitObserver = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
  for (const { target, isIntersecting } of entries) {
    if (!isIntersecting) continue;
    portraitObserver.unobserve(target);
    requestAnimationFrame(() => paintDeferredPortrait(target));
  }
}, { rootMargin: "140px" }) : null;

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

function paintDeferredPortrait(target) {
  if (!target.isConnected) return;
  const id = target.dataset.deferredPortrait;
  if (state.pendingReveal?.cardId === id && !revealVisible) return;
  const card = getCard(id, state);
  if (!card) return;
  const portrait = getPortrait(card, state);
  target.innerHTML = photo(portrait);
  target.removeAttribute("data-deferred-portrait");
  target.closest(".card")?.classList.toggle("card--fallback", !portrait.src);
}

function observePortraits(root = app) {
  for (const target of root.querySelectorAll("[data-deferred-portrait]")) {
    if (portraitObserver) portraitObserver.observe(target);
    else paintDeferredPortrait(target);
  }
}

function visualTraits(card) {
  if (card.identity?.visual && (card.identity.brief || card.identity.shape !== "classic")) return card.identity.visual;
  if (card.category !== "fusion" && card.category !== "aberration") return PORTRAIT_PROFILES[card.id]?.visual ?? "";
  return describeFusionPortrait(card, state);
}

function badge(card, extra = "") {
  if (card.category === "aberration") return `<span class="rarity-badge aberration-badge ${extra}">Aberración</span>`;
  const rarity = RARITIES[card.rarity];
  return `<span class="rarity-badge ${extra}" style="--rarity:${rarity.color}">${rarity.name}</span>`;
}

function traits(card) {
  return (card.traits ?? []).map(id => `<span>${escape(TRAITS[id]?.name)}</span>`).join("");
}

function statList(card) {
  if (!card.stats) return "";
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
  const { action, count, slot, compact, eager = false, picked = 0 } = options;
  const portrait = getPortrait(card, state, undefined, { defer: !slot && !eager });
  const finish = portraitFinish(portrait.level);
  const tag = action ? "button" : "div";
  const label = RARITIES[card.rarity]?.name ?? CATEGORIES[card.category].singular;
  const modifiers = [!portrait.src && !portrait.deferred && "card--fallback", (picked || slot) && "card--selected",
    portrait.kind === "generated" && "card--generated", card.category === "aberration" && "card--aberration"].filter(Boolean).join(" ");
  const attributes = action ? `type="button" data-action="${action}" data-id="${escape(card.id)}"
    aria-label="${escape(card.name)}, ${label}${count ? `, ${count} copias` : ""}"${action === "choose" || action === "team" ? ` aria-pressed="${picked > 0}"` : ""}` : "";
  return `<${tag} ${attributes} class="card ${modifiers}" data-portrait-level="${portrait.level}">
    <span class="card-art" data-sigil="${sigils[card.category]}" aria-hidden="true"${portrait.deferred ? ` data-deferred-portrait="${escape(card.id)}"` : ""}>${photo(portrait, "", slot || eager ? "eager" : "lazy")}</span>
    ${badge(card, "card-badge")}
    ${count || picked ? `<span class="card-count ${picked ? "card-pick" : ""}">${picked ? "✓" + (picked > 1 ? picked : "") : "×" + count}</span>` : ""}
    <span class="card-name">${escape(card.name)}</span>
    <span class="card-kind">${CATEGORIES[card.category].singular}${card.generation ? " · G" + card.generation : ""}${finish ? " · " + finish : ""}${card.category === "aberration" ? " · " + (FAILURE_FAMILIES[card.family] ?? FAILURE_FAMILIES.historical) : ""}</span>
    ${slot ? `<span class="card-tags">${traits(card)}</span>` : ""}
    ${compact && card.stats ? `<span class="micro-stats">${Object.keys(STATS).map(id => `<span aria-label="${STATS[id].name}">${icons[id]}</span>${card.stats[id]}`).join("")}</span>` : ""}
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

function renderResult() {
  if (!latestFusion) {
    return `<div class="result result-mystery" aria-label="Resultado oculto">
      <div class="mystery-ring" aria-hidden="true"></div>
      <div class="mystery-card" aria-hidden="true"><span>?</span></div>
      <span class="mystery-label">Resultado sellado</span>
    </div>`;
  }
  const { card } = latestFusion;
  const portrait = resultPortrait(latestFusion);
  const finish = portraitFinish(portrait.level);
  const aberration = card.category === "aberration";
  return `<div class="result result--${portrait.kind} ${aberration ? "result--aberration" : ""}" data-portrait-level="${portrait.level}">
    <div class="result-art" aria-hidden="true">${photo(portrait, "", "eager")}</div>
    <div class="result-top"><span class="result-label">✧ &nbsp; ${aberration ? "Fusión inestable" : "Fusión completada"}</span>${badge(card)}</div>
    ${finish ? `<div class="finish-label">Ilustración ${finish.toLowerCase()}</div>` : ""}
    <h2>${escape(card.name)}</h2><p class="result-description">${escape(card.description)}</p>
    ${statList(card)}${ability(card)}
    <div class="result-links">
      <button type="button" class="explain" data-action="explain">Ver origen y rasgos</button>
      ${portrait.src ? '<button type="button" class="explain" data-action="portrait-result">Ver ilustración</button>' : ""}
      ${aberration ? '<a class="explain" href="#alquimia">Ir a Alquimia</a>' : ""}
    </div>
  </div>`;
}

function isFunctional(card) {
  return Boolean(card?.stats && card.category !== "aberration");
}

function inventory() {
  return Object.entries(state.inventory).map(([id, count]) => ({ card: getCard(id, state), count })).filter(item => item.card);
}

function collectionItems() {
  const owned = inventory();
  if (view === "forja") return owned.filter(({card}) => isFunctional(card));
  if (collectionMode === "owned") return owned;
  if (collectionMode === "discovered") {
    return state.discovered.map(id => ({ card: getCard(id, state), count: state.inventory[id] ?? 0 })).filter(item => item.card);
  }
  const ids = new Set([...CARDS.map(card => card.id), ...state.discovered]);
  return [...ids].map(id => ({ card: getCard(id, state), count: state.inventory[id] ?? 0 })).filter(item => item.card);
}

function normalize(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
}

function cardNames(ids) {
  return ids.map(id => getCard(id, state)?.name ?? id);
}

function speciesName(card, concept = getCreatureConcept(card)) {
  if (concept.speciesId === "humano") return "Humano";
  return concept.speciesName ?? getCard(concept.speciesId, state)?.name ?? card.name;
}

function roleNames(combat) {
  return [combat.role, combat.secondaryRole].map(id => COMBAT_ROLES[id]?.name).filter(Boolean);
}

function interpretationName(card) {
  return VARIANT_FAMILIES[card.family] ?? "Histórica";
}

function collectionGroups(items) {
  const groups = new Map();
  for (const item of items) {
    const { card } = item;
    let label = CATEGORIES[card.category].name;
    let key = card.category;
    if (isFunctional(card) && collectionGroup === "species") {
      const concept = getCreatureConcept(card);
      key = concept.speciesId;
      label = speciesName(card, concept);
    }
    if (card.category === "fusion" && collectionGroup === "combination") {
      key = card.combinationId ?? card.parents.join("+");
      label = cardNames(card.parents).join(" + ");
    }
    if (card.category === "fusion" && collectionGroup === "family") {
      key = card.family ?? "legacy";
      label = interpretationName(card);
    }
    if (card.category === "aberration" && collectionGroup === "family") {
      key = "aberration-" + card.family;
      label = FAILURE_FAMILIES[card.family] ?? FAILURE_FAMILIES.historical;
    }
    if (!groups.has(key)) groups.set(key, { label, items: [] });
    groups.get(key).items.push(item);
  }
  return [...groups.values()].sort((a, b) => collator.compare(a.label, b.label));
}

function collectionGrid() {
  if (category === "essence") return renderEssences({ state, includeUsed: collectionMode !== "owned", query });
  const action = view === "forja" ? "choose" : "detail";
  const search = normalize(query);
  const items = collectionItems().filter(({ card }) => {
    if (category === "normal" && card.generation !== 0) return false;
    if (!["all", "normal"].includes(category) && card.category !== category) return false;
    if (!search) return true;
    const terms = [card.name, ...(card.traits ?? []).map(id => TRAITS[id]?.name)];
    if (view === "coleccion" && isFunctional(card)) {
      terms.push(speciesName(card), ...roleNames(getCreatureProfiles(card).combat));
    }
    if (view === "coleccion" && card.category === "fusion") terms.push(interpretationName(card));
    if (view === "coleccion" && card.category === "aberration") terms.push(FAILURE_FAMILIES[card.family], ...cardNames(card.parents));
    return normalize(terms.join(" ")).includes(search);
  });
  if (!items.length) return '<div class="empty">No hay cartas con estos filtros.</div>';
  const tile = ({ card, count }) => {
    const picked = view === "forja" ? selected.filter(id => id === card.id).length : 0;
    return `<div class="card-tile">${cardFace(card, { action, count, compact: true, picked })}</div>`;
  };
  if (view !== "coleccion" || collectionGroup === "none") return items.map(tile).join("");
  return collectionGroups(items).map(group => `<section class="collection-group">
    <h3>${escape(group.label)}</h3>
    <div class="card-grid">${group.items.map(tile).join("")}</div>
  </section>`).join("");
}

function renderInventory() {
  const total = inventory().reduce((sum, item) => sum + item.count, 0);
  const modeSwitch = view === "coleccion" ? `<div class="filters tabs" aria-label="Vista de colección">
    ${[["owned","En tu inventario"],["discovered","Descubiertas"],["catalog","Catálogo"]].map(([id, name]) =>
      `<button class="tab" data-action="mode" data-id="${id}" aria-pressed="${collectionMode === id}">${name}</button>`).join("")}</div>` : "";
  return `<section id="inventory" class="section" aria-labelledby="inventory-title" tabindex="-1">
    <div class="section-head">
      <div><div class="section-title"><h2 id="inventory-title">${view === "forja" ? "Tu colección" : category === "essence" ? "Esencias quiméricas" : "Cartas"}</h2>
          ${category === "essence" ? "" : `<span class="count">${number.format(view === "coleccion" && collectionMode !== "owned" ? collectionItems().length : total)} cartas</span>`}</div>
        <p class="section-sub">${view === "forja" ? "Selecciona cartas para preparar una fusión." : category === "essence" ? "Consulta las esencias y los materiales que recuperó cada una." : "Selecciona una carta para ver su ficha."}</p></div>
      ${view === "forja" ? '<a class="link-quiet" href="#coleccion">Ver colección →</a>' : ""}
    </div>
    ${modeSwitch}
    <div class="filters"><div class="tabs" aria-label="Filtrar por origen">
      ${[["all","Todas"], ...Object.entries(CATEGORIES).map(([id, item]) => [id, item.name]), ["normal","Cartas base"]].filter(([id]) => view !== "forja" || !["aberration","essence"].includes(id)).map(([id, name]) =>
        `<button class="tab" type="button" data-action="filter" data-id="${id}" aria-pressed="${category === id}">${name}</button>`).join("")}
    </div><input type="search" class="search" id="search" aria-label="${category === "essence" ? "Buscar esencia o progenitor" : view === "coleccion" ? "Buscar carta, rasgo, especie o rol" : "Buscar carta o rasgo"}" placeholder="${category === "essence" ? "Buscar esencia o progenitor…" : view === "coleccion" ? "Buscar en la colección…" : "Buscar carta o rasgo…"}" value="${escape(query)}">
    ${view === "coleccion" && category !== "essence" ? `<label class="group-control">Agrupar por
      <select id="collection-group">
        ${[["none", "Sin agrupar"], ["species", "Especie"], ["family", "Interpretación"], ["combination", "Combinación"]].map(([key, label]) =>
          `<option value="${key}"${collectionGroup === key ? " selected" : ""}>${label}</option>`).join("")}
      </select></label>` : ""}</div>
    <div class="card-grid ${category === "essence" ? "card-grid--essences" : ""}" id="card-grid">${collectionGrid()}</div>
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
        ${preview?.ok ? `<div class="fusion-odds">
          <span><i aria-hidden="true">✦</i> Éxito <strong>${number.format(preview.successRate * 100)} %</strong></span>
          <span><i aria-hidden="true">◬</i> Aberración <strong>${number.format(preview.aberrationRate * 100)} %</strong></span>
        </div>` : ""}
        ${preview && !preview.ok ? `<p>${escape(preview.error)}</p>` : preview?.ok && !preview.affordable ? '<p>Te faltan óbolos. Puedes ganarlos en expediciones.</p>' : ""}
      </div>
    </div>${renderResult()}</section>${renderInventory()}`;
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
  const slots = getExpeditionSlots(state, mission.id);
  const preview = previewExpedition(state, mission.id, team);
  const result = preview.ok ? preview.result : null;
  const summary = lastExpedition ? `<div class="message-box" role="status">${lastExpedition.success ? "Expedición completada" : "Obtuviste una recompensa parcial"}. +${lastExpedition.reward} óbolos${lastExpedition.firstClear ? ` (incluye +${lastExpedition.firstClear} por el primer logro)` : ""}.</div>` : "";
  return `${intro("expediciones")}<div class="mission-layout">
    <aside class="mission-list" aria-label="Elegir expedición">${MISSIONS.map(item => `<button class="mission-choice" type="button" data-action="mission" data-id="${item.id}" aria-pressed="${item.id === missionId}">
      <strong>${escape(item.name)}</strong><span>${item.stat ? STATS[item.stat].name + " · " : ""}${getExpeditionSlots(state, item.id) || "Sin"} carta${getExpeditionSlots(state, item.id) === 1 ? "" : "s"} · ${item.reward} óbolos</span>
    </button>`).join("")}</aside>
    <section class="panel mission-team" aria-labelledby="mission-title">
      <div><h2 id="mission-title">${escape(mission.name)}</h2><p>${escape(mission.description)}</p></div>
      <div class="mission-info"><span class="count">${mission.stat ? STATS[mission.stat].name + " · " : ""}Meta ${mission.threshold}</span>${mission.trait ? `<span class="count">${escape(TRAITS[mission.trait].name)} +${mission.traitBonus} al equipo</span>` : ""}</div>
      ${summary}
      <p>${slots === 0 ? "Recoge minerales por tu cuenta para recuperar óbolos y volver a comprar cartas." : `Forma un equipo de ${slots} carta${slots === 1 ? "" : "s"}. Tus cartas regresan al terminar.`}</p>
      <div class="card-grid">${inventory().filter(({card}) => isFunctional(card)).map(({ card, count }) => cardFace(card, { action: "team", count, compact: true, picked: team.filter(id => id === card.id).length })).join("")}</div>
      <div class="mission-controls">
        <span class="mission-progress">${result ? `Puntuación ${result.score}/${result.threshold} · ${result.success ? "Éxito previsto" : "Recompensa parcial"} · +${result.reward} óbolos` : `Equipo ${team.length}/${slots}`}</span>
        ${result ? '<button class="button" data-action="mission-info">Ver cálculo</button>' : ""}
        <button class="button button--primary" data-action="run" ${result ? "" : "disabled"}>Iniciar expedición</button>
      </div>
    </section></div>`;
}

function render(focus) {
  if ((state.pendingReveal || revealRunning) && !revealVisible) return;
  portraitObserver?.disconnect();
  if (view === "forja") app.innerHTML = renderForge();
  if (view === "coleccion") app.innerHTML = intro(view) + renderInventory();
  if (view === "sobres") app.innerHTML = renderShop();
  if (view === "expediciones") app.innerHTML = renderExpeditions();
  if (view === "alquimia") app.innerHTML = intro(view) + renderAlchemy({ state, selection: alchemySelection, cardFace });
  observePortraits();
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
  observePortraits(modalContent);
  if (!modal.open) modal.showModal();
  modalContent.querySelector(".modal-close").focus();
}

function showRules() {
  showModal("Cómo jugar", `<p>Empiezas con ${Object.keys(createGame().inventory).length} cartas y ${ECONOMY.startingCoins} óbolos.</p>
    <ul>
      <li><strong>Forja.</strong> Combina dos cartas y descubre el resultado tras confirmar. La forja consume óbolos y una copia de cada material.</li>
      <li><strong>Alquimia.</strong> Una fusión fallida produce una aberración. Reúne las aberraciones indicadas en Alquimia y conviértelas en una esencia que fusiona dos de sus progenitores al azar.</li>
      <li><strong>Afinidad.</strong> Suma puntos por orígenes distintos, especialidades complementarias o rasgos emparentados. Dos puntos pueden elevar la rareza media. Algunos pares tienen una fórmula propia.</li>
      <li><strong>Variantes.</strong> Una misma pareja puede originar criaturas distintas. Volver a obtener la misma variante mejora su retrato cuando tiene versiones refinada y magistral.</li>
      <li><strong>Linajes.</strong> Puedes fusionar dos copias de la misma carta, o cruzar quimeras con materiales de linajes distintos. Las quimeras pueden alcanzar la generación ${MAX_GENERATION}.</li>
      <li><strong>Expediciones.</strong> La puntuación combina el atributo de la misión, habilidades y afinidad con el terreno. La Senda siempre te permite ganar óbolos con una carta.</li>
      <li><strong>Sobres.</strong> Cada tipo tiene sus probabilidades y su propia garantía. Los óbolos se consiguen jugando.</li>
    </ul>`);
}

function showSettings() {
  const choices = [["full", "Completa"], ["reduced", "Reducida"], ["off", "Saltar animación"]];
  showModal("Configuración", `<p>Elige cómo se revela una carta después de confirmar la fusión.</p>
    <div class="animation-settings" role="group" aria-label="Animación de fusión">
      ${choices.map(([id, label]) => `<button class="button" type="button" data-action="animation-mode" data-id="${id}" aria-pressed="${state.settings.animation === id}">${label}</button>`).join("")}
    </div>`);
}

function showExplanation(card = latestFusion?.card) {
  if (!card) return;
  const formula = describeDiscoveredFusion(state, card.id);
  if (!formula) {
    showCard(card.id);
    return;
  }
  showModal("Fórmula de fusión", `<p><strong>${escape(card.name)}</strong> · Generación ${card.generation} · Afinidad ${formula.synergy}/3</p>
    <p>${card.parents.map(id => escape(getCard(id, state)?.name ?? id)).join(" + ")}</p>
    ${visualTraits(card) ? `<p><strong>Motivos de los linajes</strong> · ${escape(visualTraits(card))}.</p>` : ""}
    <ul>${formula.explanation.map(line => `<li>${escape(line)}</li>`).join("")}</ul>
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

function detailRows(rows) {
  return `<dl class="creature-details">${rows.filter(([, value]) => value !== undefined && value !== "").map(([label, value]) =>
    `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>`;
}

function copyOrigins(card, count) {
  if (card.category !== "fusion") return "Carta base";
  const labels = { fusion: "Forja", essence: "Esencia quimérica", legacy: "Histórica" };
  const copies = getFusionCopies(state, card.id);
  const totals = new Map();
  for (const { origin } of copies) totals.set(origin, (totals.get(origin) ?? 0) + 1);
  if (count > copies.length) totals.set("legacy", count - copies.length);
  return totals.size ? [...totals].map(([origin, amount]) => `${labels[origin]} ×${amount}`).join(" · ")
    : labels[card.origin] ?? "Histórica";
}

function creatureProfile(card, portrait, count) {
  const concept = getCreatureConcept(card);
  const { combat, utility } = getCreatureProfiles(card);
  return detailRows([
    ["Especie", speciesName(card, concept)],
    ["Interpretación", card.category === "fusion" ? interpretationName(card) : ""],
    ["Generación", card.generation],
    ["Rol", roleNames(combat).join(" / ")],
    ["Origen", copyOrigins(card, count)],
    ["Linaje", card.generation ? cardNames(card.lineage).join(", ") : ""],
    ["Ilustración", portraitStatus(portrait)],
  ]) + `<details class="creature-profile">
    <summary>Perfil estratégico</summary>
    ${detailRows([
      ["Naturaleza", CONCEPT_LABELS.nature[concept.nature]],
      ["Anatomía", CONCEPT_LABELS.anatomy[concept.anatomy]],
      ["Características", concept.features.join(", ")],
      ["Calidad conceptual", card.family === "legacy" ? "" : VARIANT_QUALITY_LABELS[card.quality]],
      ["Movilidad", MOBILITY_LABELS[combat.mobility]],
      ["Afinidades", combat.affinities.join(", ")],
      ["Presupuesto", combat.powerBudget],
      ["Costo de despliegue", combat.deploymentCost],
      ["Capacidades", combat.capabilities.map(id => CAPABILITY_FAMILIES[id]?.name).filter(Boolean).join(", ")],
      ["Utilidad", utility.capabilities.map(id => UTILITY_FAMILIES[id]).filter(Boolean).join(", ")],
      ...Object.entries(combat.stats).map(([id, value]) => [COMBAT_STATS[id], value]),
    ])}
  </details>`;
}

function showCard(id) {
  const card = getCard(id, state);
  if (!card) return;
  const count = state.inventory[id] || 0;
  const portrait = getPortrait(card, state);
  const aberrant = card.category === "aberration";
  showModal(card.name, `<div class="detail-layout">${cardFace(card, { compact: true, eager: true })}
    <div>${aberrant ? "" : `<p>${escape(card.description)}</p>`}${statList(card)}
    <div class="card-tags">${traits(card)}</div><div class="detail-ability">${ability(card, true)}</div>
    <p>${count ? `${count} ${count === 1 ? "copia" : "copias"} en el inventario.` : "Sin copias en el inventario."}</p>
    ${aberrant ? renderAberrationDetails({ state, card }) : card.parents.length ? `<p>Materiales · ${escape(cardNames(card.parents).join(" + "))}</p>` : ""}</div></div>
    ${aberrant ? "" : creatureProfile(card, portrait, count)}
    <div class="modal-actions">
      ${portrait.src ? `<button class="button" data-action="portrait-card" data-id="${escape(id)}">Ver ilustración</button>` : ""}
      ${card.category === "fusion" ? `<button class="button" data-action="formula-card" data-id="${escape(id)}">Ver fórmula</button>` : ""}
      ${count && isFunctional(card) && card.generation < MAX_GENERATION ? `<button class="button button--primary" data-action="use" data-id="${escape(id)}">Llevar a la forja</button>` : ""}
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
  if (!isFunctional(card) || !state.inventory[id]) return;
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
    selected[selected[1] === id ? 0 : 1] = id;
  }
  latestFusion = null;
}

function teamPick(id) {
  const copies = team.filter(item => item === id).length;
  const slots = getExpeditionSlots(state, missionId);
  if (slots === 0 || !isFunctional(getCard(id, state))) return;
  if (copies >= state.inventory[id]) team.splice(team.lastIndexOf(id), 1);
  else if (team.length < slots) team.push(id);
  else team[slots - 1] = id;
  lastExpedition = null;
}

function reconcileSelections() {
  for (const list of [selected, team, alchemySelection]) {
    const counts = new Map();
    const valid = list.filter(id => {
      const count = (counts.get(id) || 0) + 1;
      counts.set(id, count);
      return count <= (state.inventory[id] || 0);
    });
    list.splice(0, list.length, ...valid);
  }
}

function refreshSave() {
  if (storageUnavailable) return;
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved && saved !== persisted) {
      state = loadGame(saved);
      persisted = saved;
      reconcileSelections();
    }
  } catch {
    storageUnavailable = true;
  }
}

async function transact(update, completed = () => {}, { repaint = true, durable = false } = {}) {
  const perform = () => {
    refreshSave();
    const outcome = update(state);
    if (!outcome.ok) {
      if (repaint) render();
      showToast(outcome.error);
      return outcome;
    }
    if (!storageUnavailable) {
      try {
        const serialized = serializeGame(outcome.state);
        localStorage.setItem(SAVE_KEY, serialized);
        persisted = serialized;
      } catch { storageUnavailable = true; }
    }
    if (storageUnavailable && durable) {
      const error = "El navegador impide guardar cambios. Activa el almacenamiento para continuar en la forja.";
      showToast(error);
      return { ok: false, error };
    }
    state = outcome.state;
    completed(outcome);
    reconcileSelections();
    if (repaint) render();
    if (storageUnavailable) showToast("El progreso de esta sesión quedará en memoria.");
    return outcome;
  };
  return navigator.locks?.request ? navigator.locks.request(SAVE_KEY, perform) : perform();
}

function materialForRitual(id) {
  const card = getCard(id, state);
  if (!card) return {};
  return { name: card.name, src: getPortrait(card, state).src, accent: energyAccent(card) };
}

async function revealPending() {
  const pending = state.pendingReveal;
  if (!pending || revealRunning) return;
  revealRunning = true;
  revealVisible = false;
  const card = getCard(pending.cardId, state);
  const reveal = () => {
    const failed = card.category === "aberration";
    return {
      title: card.name,
      summary: failed ? card.description : pending.kind === "essence" ? "Los linajes recuperados formaron una carta nueva." : card.description,
      html: cardFace(card, { compact: true, eager: true }),
      rarity: card.rarity,
      category: card.category,
      traits: card.traits,
      failed
    };
  };
  const expose = () => {
    revealVisible = true;
    latestFusion = { card, portraitLevel: pending.portraitLevel };
    selected = [];
    render();
  };
  try {
    await playRitual({
      mode: state.settings.animation === "off" ? "skip" : state.settings.animation,
      kind: pending.kind,
      materials: pending.kind === "fusion" ? pending.parents.map(materialForRitual) : [],
      reveal,
      onReveal: expose
    });
  } catch {
    expose();
    showCard(card.id);
  }
  await transact(game => game.pendingReveal?.id === pending.id
    ? acknowledgeReveal(game, pending.id) : { ok: true, state: game }, undefined, { repaint: false, durable: true });
  revealRunning = false;
  if (!state.pendingReveal) {
    revealVisible = false;
    render();
  }
}

async function runRitual(update, button) {
  button.disabled = true;
  const outcome = await transact(update, undefined, { repaint: false, durable: true });
  if (outcome.ok || state.pendingReveal) await revealPending();
  else render();
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
  if (revealRunning && action !== "close") return;
  if (state.pendingReveal && !revealRunning && action !== "close") {
    void revealPending();
    return;
  }
  const focus = { action, id };
  switch (action) {
    case "rules": showRules(); break;
    case "settings": showSettings(); break;
    case "animation-mode":
      await transact(game => setAnimationMode(game, id));
      showSettings();
      break;
    case "close": modal.close(); break;
    case "inventory": scrollToInventory(); break;
    case "explain":
      if (latestFusion) showCard(latestFusion.card.id);
      break;
    case "formula-card": showExplanation(getCard(id, state)); break;
    case "portrait-result": {
      if (latestFusion) showPortrait(latestFusion.card, resultPortrait(latestFusion));
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
      if (selected.filter(cardId => cardId === id).length < state.inventory[id]) choose(id);
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
      const materials = selected.slice();
      await runRitual(game => fuseCards(game, ...materials), button);
      break;
    }
    case "alchemy-add":
      if (alchemySelection.length < ALCHEMY.aberrationsPerEssence &&
          getCard(id, state)?.category === "aberration" &&
          alchemySelection.filter(cardId => cardId === id).length < (state.inventory[id] || 0)) alchemySelection.push(id);
      render(focus);
      break;
    case "alchemy-remove": {
      const index = alchemySelection.lastIndexOf(id);
      if (index >= 0) alchemySelection.splice(index, 1);
      render(focus);
      break;
    }
    case "alchemy-clear":
      alchemySelection = [];
      render();
      break;
    case "alchemy-craft": {
      const materials = alchemySelection.slice();
      button.disabled = true;
      const outcome = await transact(game => createEssence(game, materials), () => {
        alchemySelection = [];
        showToast("Esencia quimérica creada.");
      }, { durable: true });
      if (!outcome.ok) render();
      break;
    }
    case "alchemy-use":
      await runRitual(game => useEssence(game, id), button);
      break;
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
  if (revealRunning || state.pendingReveal) return;
  if (event.target.id === "search") query = event.target.value.trim();
  else if (event.target.id === "collection-group") collectionGroup = event.target.value;
  else return;
  const grid = document.querySelector("#card-grid");
  if (grid) {
    portraitObserver?.disconnect();
    grid.innerHTML = collectionGrid();
    observePortraits(grid);
  }
});

window.addEventListener("hashchange", changeView);
window.addEventListener("storage", event => {
  if (event.key !== SAVE_KEY || !event.newValue || event.newValue === persisted) return;
  state = loadGame(event.newValue);
  persisted = event.newValue;
  reconcileSelections();
  if (state.pendingReveal && !revealRunning) void revealPending();
  else render();
});

if (state.pendingReveal) {
  app.innerHTML = `${intro("forja")}<section class="result result-mystery" aria-label="Resultado oculto">
    <div class="mystery-card" aria-hidden="true"><span>?</span></div><span class="mystery-label">Revelación pendiente</span>
  </section>`;
  void revealPending();
} else render();
