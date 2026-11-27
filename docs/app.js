import { mountGameNavigation } from "./game-nav.js";
import { PRESENTATION_KEY as soundKey, SAVE_KEY } from "./save-store.js";
import { activeCopies, chooseMaterials, creatureCopies } from "./creature-instances.js";
import { healthFor, healthSummary } from "./health.js";
import { conditionLabel, healthDetails } from "./health-ui.js";
import { CARD_ORDERS, readCardOrder, recentCards, sortCardEntries, writeCardOrder } from "./card-order.js";
import { ABILITIES, CARDS, CATEGORIES, ECONOMY, MISSIONS, RARITIES, STATS, TRAITS } from "./catalog.js";
import {
  acknowledgeReveal, createEssence, createGame, describeDiscoveredFusion, fuseCards, getCard, getExpeditionSlots, getFusionCopies, loadGame,
  MAX_GENERATION, previewExpedition, previewFusion, runExpedition, serializeGame, setAnimationMode, useEssence
} from "./engine.js";
import { getPortrait, portraitFinish, portraitLevelFor, portraitStatus } from "./illustrations.js";
import { describeFusionPortrait } from "./fusion-art.js";
import { PORTRAIT_PROFILES } from "./portrait-profiles.js";
import { renderAlchemy, renderAberrationDetails, renderEssences } from "./alchemy-ui.js";
import { energyAccent, playRitual } from "./ritual.js";
import { ALCHEMY } from "./game-config.js";
import { FAILURE_FAMILIES } from "./aberration-concepts.js";
import { CONCEPT_LABELS, getCreatureConcept } from "./creature-concepts.js";
import { CAPABILITY_FAMILIES, COMBAT_ROLES, COMBAT_STATS, getCreatureProfiles, MOBILITY_LABELS, UTILITY_FAMILIES } from "./creature-profiles.js";
import { VARIANT_FAMILIES, VARIANT_QUALITY_LABELS } from "./fusion-variants.js";

import { oddsDetails, openingDetails, purchaseDetails, renderCheckoutTotal, renderPackOpening, renderPackShop } from "./pack-shop.js";
import { playPackRupture } from "./pack-visuals.js";
import { acknowledgePackOpening, getBaseCopies, purchasePackBatch, quotePackOpening, quotePackPurchase, revealPackCards, startPackOpening } from "./pack-transactions.js";
import { packDefinition } from "./pack-config.js";
import { createBattleAudio } from "./training-audio.js";

const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const collator = new Intl.Collator("es-MX");
const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const modalContent = document.querySelector("#modal-content");
const toast = document.querySelector("#toast");
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
let chosenCopies = [];
let latestFusion = null;
let lastExpedition = null;
let alchemySelection = [];
let revealRunning = false;
let revealVisible = false;
let missionId = MISSIONS[0].id;
let team = [];
let view = currentView();
const nav = mountGameNavigation({ section:view,coins:state.coins,onSettings:showSettings,onWallet:showRules });
let category = "all";
let collectionMode = "owned";
let collectionGroup = "none";
let query = "";
const filterKey = "quimeraria:filtros-cartas:v1";
function storedFilters() {
  try { return JSON.parse(sessionStorage.getItem(filterKey)) ?? {}; }
  catch { return {}; }
}
const filtersByView = storedFilters();
({category,query} = filtersByView[view] ?? { category,query });
function saveSectionFilters() {
  filtersByView[view] = { category,query };
  try { sessionStorage.setItem(filterKey,JSON.stringify(filtersByView)); } catch { /* Sesión sin persistencia. */ }
}
let order = readCardOrder();
let toastTimer;
let storageUnavailable = false;
const shop = { id: "explorador", quantity: 1, custom: false, batch: null, sheet: 0, filter: "",
  flip: null, away: false, fast: false, skipped: false, animatedId: null };
let packMotion;
let pendingStockIds;
function soundPreferences() {
  try {
    return JSON.parse(localStorage.getItem(soundKey)) ?? {};
  } catch { return {}; }
}
const shopSound = createBattleAudio(() => {
  const settings = soundPreferences();
  return settings.muted === false && Number.isFinite(settings.volume) ? Math.max(0, Math.min(100, settings.volume)) : 0;
});

function setPackSound(changes) {
  try { localStorage.setItem(soundKey,JSON.stringify({ ...soundPreferences(), ...changes })); }
  catch { showToast("El navegador impide guardar el sonido."); }
}
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

function ingredients(materials) {
  const occupied = activeCopies(state);
  return [0, 1].map(i => {
    const card = getCard(selected[i], state);
    const copies = card ? creatureCopies(state,card.id) : [];
    const picked = chosenCopies[i] ?? materials?.[i]?.copyId;
    const other = chosenCopies[1-i] ?? materials?.[1-i]?.copyId;
    const options = copies.map(({id},index)=>{
      const record = healthFor(state,id);
      const unavailable = occupied.has(id) || id===other;
      return `<option value="${escape(id)}" ${id===picked ? "selected" : ""} ${unavailable ? "disabled" : ""}>Ejemplar ${index+1} · ${occupied.has(id) ? "En Arena" : conditionLabel(record)}</option>`;
    }).join("");
    return `<div class="ingredient-col"><span class="ingredient-label">Material ${i === 0 ? "I" : "II"}</span>
      <div class="ingredient-slot">${card ? cardFace(card, { slot: true }) +
        `<button type="button" class="remove-slot" data-action="remove" data-id="${i}" aria-label="Quitar ${escape(card.name)}">×</button>`
        : `<button type="button" class="ingredient-empty" data-action="inventory"><strong aria-hidden="true">+</strong> Elegir carta</button>`}</div>
      ${copies.length ? `<label class="forge-copy">Ejemplar del material ${i+1}<select aria-label="Ejemplar del material ${i+1}" data-material-copy="${i}">
        ${copies.some(copy=>copy.id===picked) ? "" : '<option value="">Elegir ejemplar</option>'}${options}</select></label>` : ""}</div>`;
  }).join('<div class="ritual" aria-hidden="true">✧</div>');
}

function forgePreview() {
  return selected.length === 2 ? previewFusion(state, ...selected, chosenCopies) : null;
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

function sortControls(context = "card") {
  return `<div class="sort-controls"><label>Orden
    <select id="${context}-order">${Object.entries(CARD_ORDERS).map(([id,name]) =>
      `<option value="${id}" ${order.by === id ? "selected" : ""}>${name}</option>`).join("")}</select></label>
    <label>Dirección <select id="${context}-direction"><option value="desc" ${order.direction === "desc" ? "selected" : ""}>Descendente</option>
      <option value="asc" ${order.direction === "asc" ? "selected" : ""}>Ascendente</option></select></label></div>`;
}
function ordered(items) {
  return sortCardEntries(items,order,recentCards(state));
}

function collectionGrid() {
  if (category === "essence") return renderEssences({ state, includeUsed: collectionMode !== "owned", query });
  const action = view === "forja" ? "choose" : "detail";
  const search = normalize(query);
  const items = ordered(collectionItems().filter(({ card }) => {
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
  }));
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
      </select></label>` : ""}${category === "essence" ? "" : sortControls()}</div>
    <div class="card-grid ${category === "essence" ? "card-grid--essences" : ""}" id="card-grid">${collectionGrid()}</div>
  </section>`;
}

function renderForge() {
  const preview = forgePreview();
  const materials = chooseMaterials(state,selected,chosenCopies);
  const hurt = materials?.filter(({copyId})=>healthSummary(healthFor(state,copyId)).needsCare) ?? [];
  return `${intro("forja")}<section class="forge" aria-label="Mesa de fusión">
    <div class="forge-left">
      <div class="forge-title"><span aria-hidden="true">⚗</span> Mesa de fusión</div>
      <div class="ingredient-row">${ingredients(materials)}</div>
      <div class="forge-footer">
        ${hurt.length ? `<p class="forge-health-warning" role="status">${hurt.map(({cardId})=>escape(getCard(cardId,state).name)).join(" y ")} presenta desgaste o heridas. La Forja consumirá los ejemplares seleccionados con las probabilidades habituales.</p>` : ""}
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

function renderShop() {
  if (!state.pendingPack || shop.away) return renderPackShop(state,shop);
  return renderPackOpening(state,shop,id => getCard(id,state),card => getPortrait(card,state).src);
}

function animatePendingPack() {
  const stage = app.querySelector("#pack-stage");
  const pending = state.pendingPack;
  if (!stage || !pending || shop.animatedId === pending.id) return;
  shop.animatedId = pending.id;
  if (["skip", "off"].includes(state.settings.animation) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  packMotion = playPackRupture(stage,{
    mode: state.settings.animation,
    fast: shop.fast,
    onBreak: theme => shopSound.play(({ profundidades:"water", arcano:"magic", quimerico:"alchemy",
      panteon:"divine", primordial:"heavy", naturaleza:"nature", civilizacion:"slash" })[theme] ?? "arrow")
  });
}

function focusShop(id) {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ block:"start", behavior: "instant" });
  element.querySelector("button, input, select")?.focus({ preventScroll:true });
}

function resetOpening() {
  shop.sheet = 0;
  shop.receiptPage = 0;
  shop.showReceipts = false;
  shop.filter = "";
  shop.flip = null;
  shop.skipped = false;
  shop.away = false;
}

async function openSavedPacks(button, ids, previous = null, mode = "individual") {
  button.disabled = true;
  shopSound.unlock();
  const outcome = await transact(game => {
    const available = previous ? acknowledgePackOpening(game,previous) : { ok:true,state:game };
    if (!available.ok) return available;
    const started = startPackOpening(available.state,ids,Math.random,mode);
    return started.ok && mode === "joint" ? revealPackCards(started.state,started.opening.id) : started;
  },resetOpening,{ durable:true });
  if (outcome.ok) focusShop(mode === "joint" ? "pack-results" : "pack-stage");
}

async function exposePack(button, id) {
  const openingId = state.pendingPack?.id;
  button.disabled = true;
  shopSound.unlock();
  await transact(game => revealPackCards(game,openingId,id ? [id] : null), outcome => {
    shop.flip = id;
    const picks = outcome.state.pendingPack.packs.flatMap(pack => pack.cards);
    const card = id && picks.find(entry => entry.id === id);
    shopSound.play(card && getCard(card.cardId,state)?.rarity >= 3 ? "magic" : card?.isNew ? "heal" : "arrow");
  },{ durable:true });
  const next = app.querySelector(id ? '[data-action="pack-reveal"]' : '[data-action="pack-result-leave"]');
  next?.focus({ preventScroll:true });
}

function expeditionChoices() {
  return ordered(inventory().filter(({card})=>isFunctional(card) && normalize(card.name).includes(normalize(query))))
    .map(({card,count})=>cardFace(card,{ action:"team",count,compact:true,picked:team.filter(id=>id===card.id).length }))
    .join("") || '<div class="empty">No hay cartas con este filtro.</div>';
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
      ${sortControls("expedition")}<input type="search" id="expedition-search" class="search" aria-label="Buscar criatura para expedición" placeholder="Buscar criatura" value="${escape(query)}">
      <div class="card-grid" id="expedition-cards">${expeditionChoices()}</div>
      <div class="mission-controls">
        <span class="mission-progress">${result ? `Puntuación ${result.score}/${result.threshold} · ${result.success ? "Éxito previsto" : "Recompensa parcial"} · +${result.reward} óbolos` : `Equipo ${team.length}/${slots}`}</span>
        ${result ? '<button class="button" data-action="mission-info">Ver cálculo</button>' : ""}
        <button class="button button--primary" data-action="run" ${result ? "" : "disabled"}>Iniciar expedición</button>
      </div>
    </section></div>`;
}

function render(focus) {
  nav.update(view,state.coins);
  if ((state.pendingReveal || revealRunning) && !revealVisible) return;
  portraitObserver?.disconnect();
  packMotion?.dispose();
  packMotion = null;
  if (view === "forja") app.innerHTML = renderForge();
  if (view === "coleccion") app.innerHTML = intro(view) + renderInventory();
  if (view === "sobres") {
    app.innerHTML = renderShop();
    animatePendingPack();
  }
  if (view === "expediciones") app.innerHTML = renderExpeditions();
  if (view === "alquimia") app.innerHTML = intro(view) + renderAlchemy({ state, selection: alchemySelection, cardFace, order });
  observePortraits();
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
  const sound = soundPreferences();
  showModal("Configuración", `<p>Animaciones de apertura y fusión</p>
    <div class="animation-settings" role="group" aria-label="Animaciones de apertura y fusión">
      ${choices.map(([id, label]) => `<button class="button" type="button" data-action="animation-mode" data-id="${id}" aria-pressed="${state.settings.animation === id}">${label}</button>`).join("")}
    </div>
    ${view === "sobres" ? `<div class="animation-settings shop-sound">
      <button type="button" class="button" data-action="pack-mute" aria-pressed="${sound.muted !== false}">${sound.muted === false ? "Silenciar" : "Activar sonido"}</button>
      <label>Volumen <input id="pack-volume" type="range" min="0" max="100" value="${Number.isFinite(sound.volume) ? sound.volume : 28}"></label>
    </div>` : ""}`);
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
  const copies = getBaseCopies(state,id);
  const aberrant = card.category === "aberration";
  const owned = view==="forja" || (view==="coleccion" && collectionMode==="owned");
  const occupied = activeCopies(state);
  const health = !aberrant && owned && count ? creatureCopies(state,id) : [];
  showModal(card.name, `<div class="detail-layout">${cardFace(card, { compact: true, eager: true })}
    <div>${aberrant ? "" : `<p>${escape(card.description)}</p>`}${statList(card)}
    <div class="card-tags">${traits(card)}</div><div class="detail-ability">${ability(card, true)}</div>
    <p>${count ? `${count} ${count === 1 ? "copia" : "copias"} en el inventario.` : "Sin copias en el inventario."}</p>
    ${aberrant ? renderAberrationDetails({ state, card }) : card.parents.length ? `<p>Materiales · ${escape(cardNames(card.parents).join(" + "))}</p>` : ""}</div></div>
    ${aberrant ? "" : creatureProfile(card, portrait, count)}
    ${health.length ? `<details class="creature-profile" open><summary>Salud de los ejemplares (${health.length})</summary>
      <label class="forge-copy">Ejemplar <select id="card-health-copy" data-card="${escape(id)}">${health.map(({id},index)=>`<option value="${escape(id)}">Ejemplar ${index+1} · ${conditionLabel(healthFor(state,id))}</option>`).join("")}</select></label>
      <div id="card-health-details">${healthDetails(healthFor(state,health[0].id),healthSummary(healthFor(state,health[0].id),occupied.has(health[0].id)),getCreatureProfiles(card).combat.stats,{ link:health[0].id })}</div>
    </details>` : ""}
    ${copies.length ? `<details class="creature-profile"><summary>Ejemplares de sobres (${copies.length})</summary>
      <ul class="pack-instance-list">${copies.map(copy => `<li>${escape(copy.id)} · ${escape(packDefinition(copy.packId).name)}</li>`).join("")}</ul></details>` : ""}
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
    const slot = selected.lastIndexOf(id);
    selected.splice(slot,1);
    chosenCopies.splice(slot,1);
  } else if (selected.length < 2) {
    chosenCopies[selected.length] = "";
    selected.push(id);
  } else {
    const slot = selected[1] === id ? 0 : 1;
    selected[slot] = id;
    chosenCopies[slot] = "";
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
    if (list===selected && valid.length!==list.length) chosenCopies=[];
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
      const error = "El navegador impide guardar cambios. Activa el almacenamiento para continuar.";
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
    chosenCopies = [];
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
    saveSectionFilters();
    view = destination;
    ({ category,query } = filtersByView[view] ?? { category:"all",query:"" });
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
      chosenCopies.splice(Number(id),1);
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
      saveSectionFilters();
      render(focus);
      break;
    case "mode":
      collectionMode = id;
      render(focus);
      break;
    case "fuse": {
      const materials = selected.slice();
      const copies = chooseMaterials(state,materials,chosenCopies)?.map(item=>item.copyId);
      if (copies) await runRitual(game => fuseCards(game, ...materials, Math.random, copies), button);
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
    case "pack-pick":
      shopSound.unlock();
      shopSound.play("arrow");
      shop.id = id;
      render(focus);
      if (matchMedia("(max-width: 720px)").matches) focusShop("pack-checkout");
      break;
    case "pack-quantity":
      shop.quantity = Number(id);
      render(focus);
      break;
    case "pack-catalog": focusShop("pack-catalog"); break;
    case "pack-odds": showModal(packDefinition(id).name,oddsDetails(id)); break;
    case "pack-review": {
      refreshSave();
      const quote = quotePackPurchase(state,id,shop.quantity);
      if (!quote.ok || !quote.affordable) { render(); break; }
      shopSound.unlock();
      showModal(quote.pack.name,purchaseDetails(quote,state.sequence,state.coins));
      break;
    }
    case "pack-confirm": {
      button.disabled = true;
      shopSound.unlock();
      const outcome = await transact(
        game => game.coins === Number(button.dataset.balance)
          ? purchasePackBatch(game,id,Number(button.dataset.quantity),Number(button.dataset.sequence))
          : { ok:false, error:"El saldo cambió. Revisa la compra antes de confirmar." },
        result => {
          shop.batch = result.batchId;
          shop.away = Boolean(state.pendingPack);
          modal.close();
          shopSound.play("shield");
          showToast("Compra guardada. Los sobres siguen sellados.");
        },{ durable:true });
      if (outcome.ok) focusShop("pack-vault");
      else modal.close();
      break;
    }
    case "pack-mute": {
      const muted = soundPreferences().muted === false;
      setPackSound({ muted, volume: soundPreferences().volume ?? 28 });
      if (muted) shopSound.suspend();
      else shopSound.unlock();
      showSettings();
      break;
    }
    case "pack-mass": {
      pendingStockIds = (state.packStock ?? []).filter(seal => id==="*" || seal.packId===id).map(seal=>seal.id);
      const quote = quotePackOpening(state,pendingStockIds);
      if (quote.ok) showModal("Abrir sobres almacenados",openingDetails(quote));
      break;
    }
    case "pack-mass-confirm": {
      const mode = document.querySelector("#pack-open-mode").value;
      const ids = pendingStockIds;
      modal.close();
      await openSavedPacks(button,ids,null,mode);
      break;
    }
    case "pack-stock-page": shop.stockPage = Number(id); render(); focusShop("pack-vault"); break;
    case "pack-receipt-page": shop.receiptPage = Number(id); render(focus); break;
    case "pack-sheet-step": shop.sheet = Number(id)-1; shop.flip = null; render(); break;
    case "pack-open-one":
    case "pack-open-batch": {
      const batch = (state.packStock ?? []).filter(pack => pack.batchId === id);
      const ids = (action === "pack-open-one" ? batch.slice(0,1) : batch).map(pack => pack.id);
      await openSavedPacks(button,ids);
      break;
    }
    case "pack-speed":
      shop.fast = !shop.fast;
      packMotion?.speed(shop.fast ? 2 : 1);
      button.setAttribute("aria-pressed",String(shop.fast));
      button.textContent = shop.fast ? "Volver a velocidad normal" : "Acelerar apertura";
      break;
    case "pack-skip":
      shop.skipped = true;
      packMotion?.finish();
      break;
    case "pack-reveal": await exposePack(button,id); break;
    case "pack-reveal-all": await exposePack(button); break;
    case "pack-defer":
      shop.away = true;
      render();
      focusShop("pack-vault");
      break;
    case "pack-resume":
      shop.away = false;
      render();
      focusShop("pack-stage");
      break;
    case "pack-next":
      await openSavedPacks(button,[id],state.pendingPack?.id);
      break;
    case "pack-result-leave": {
      const opening = state.pendingPack?.id;
      const outcome = await transact(game => acknowledgePackOpening(game,opening),resetOpening,{ durable:true });
      if (outcome.ok) {
        location.hash = id;
        changeView();
        window.scrollTo({ top: 0 });
      }
      break;
    }
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

app.addEventListener("toggle", event => {
  if (event.target.classList.contains("shop-custom")) shop.custom = event.target.open;
  if (event.target.classList.contains("pack-receipts") && event.target.open !== Boolean(shop.showReceipts)) {
    shop.showReceipts = event.target.open;
    if (shop.showReceipts) render();
  }
},true);
modal.addEventListener("input",event => {
  if (event.target.id !== "pack-volume") return;
  setPackSound({ volume:event.target.valueAsNumber });
  if (event.target.valueAsNumber === 0) shopSound.stop();
});
modal.addEventListener("change",event=>{
  const field = event.target;
  if (field.id!=="card-health-copy") return;
  const record = healthFor(state,field.value);
  const status = healthSummary(record,activeCopies(state).has(field.value));
  modal.querySelector("#card-health-details").innerHTML = healthDetails(record,status,
    getCreatureProfiles(getCard(field.dataset.card,state)).combat.stats,{ link:field.value });
});

app.addEventListener("change", event => {
  if (event.target.dataset.materialCopy!==undefined) {
    const slot = Number(event.target.dataset.materialCopy);
    chosenCopies[slot] = event.target.value;
    render();
    app.querySelector(`[data-material-copy="${slot}"]`)?.focus({ preventScroll:true });
    return;
  }
  if (/^(card|expedition)-(order|direction)$/.test(event.target.id)) {
    const field = event.target.id.endsWith("-order") ? "by" : "direction";
    order = { ...order, [field]:event.target.value };
    writeCardOrder(order);
  } else if (event.target.id === "pack-sheet") { shop.sheet = Math.max(0,(event.target.valueAsNumber || 1)-1); shop.flip = null; }
  else if (event.target.id === "pack-result-filter") shop.filter = event.target.value;
  else return;
  const id = event.target.id;
  render();
  document.getElementById(id)?.focus({ preventScroll:true });
});

app.addEventListener("input", event => {
  if (revealRunning || state.pendingReveal) return;
  if (event.target.id === "expedition-search") {
    query = event.target.value.trim();
    saveSectionFilters();
    const grid = document.querySelector("#expedition-cards");
    portraitObserver?.disconnect();
    grid.innerHTML = expeditionChoices();
    observePortraits(grid);
    return;
  }
  if (event.target.id === "pack-custom-quantity") {
    shop.quantity = event.target.valueAsNumber;
    app.querySelector("#pack-cart").innerHTML = renderCheckoutTotal(state,shop.id,shop.quantity);
    for (const preset of app.querySelectorAll(".shop-quantity")) preset.setAttribute("aria-pressed",String(Number(preset.dataset.id) === shop.quantity));
    return;
  }
  if (event.target.id === "search") { query = event.target.value.trim(); saveSectionFilters(); }
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
