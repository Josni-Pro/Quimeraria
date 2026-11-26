import { getCard } from "./engine.js";
import { getPortrait } from "./illustrations.js";
import { advanceCombat, DIFFICULTIES, finishCombat } from "./combat/bots.js";
import { ORDERS, SLOTS, TRAINING_RULES } from "./combat/config.js";
import { budgetUsed, clearOrders, issueOrder, startCombat, validateFormation } from "./combat/engine.js";
import { EFFECTS } from "./combat/effects.js";
import { availableCopies, opponentPortraitCard, opponentPortraitState, readTrainingGame, SCOUTS, trainingOpponent, trainingRoster } from "./combat/roster.js";
import { SKILLS } from "./combat/skills.js";
import { playEvents } from "./training-animation.js";
import { createBattleAudio } from "./training-audio.js";
import { AUTOMATIC_GAP } from "./training-playback.js";
import { arenaSide, battleShell, builderFormation, builderShell, detailMarkup, escape, logLines, orderPanel,
  resultView, rosterEntry, unitPanel, updateBudget } from "./training-view.js";

const root = document.querySelector("#training");
const dialog = document.querySelector("#camp-detail");
const detail = document.querySelector("#detail-body");
const instantDialog = document.querySelector("#camp-instant");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
const preferenceKey = "quimeraria:entrenamiento:preferencias:v1";
const pageSize = 14;
const collator = new Intl.Collator("es", { sensitivity: "base" });
const text = value => value.toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");
let settings;
try { settings = JSON.parse(localStorage.getItem(preferenceKey)); } catch { /* Usa los valores de sesión. */ }
const ui = {
  filters: { search: "", generation: "", role: "", cost: "", affinity: "", family: "", available: "", sort: "name" },
  filtersOpen: false, seedOpen: false, page: 0, seed: 1977, scout: "watch", difficulty: "normal",
  slots: Array(TRAINING_RULES.slots).fill(null), selected: 2, speed: [1,2,4].includes(settings?.speed) ? settings.speed : 1,
  quality: ["full","reduced","minimal"].includes(settings?.quality) ? settings.quality : "reduced",
  volume: Number.isFinite(settings?.volume) ? Math.max(0,Math.min(100,settings.volume)) : 28,
  muted: settings?.muted !== false, auto: false, instant: false, elapsed: 0, armed: null, actor: null, detailId: null,
  target: null, busy: false, affinities: []
};
let screen = "builder";
let game = readTrainingGame();
let roster = trainingRoster(game);
let battle = null;
let session = null;
let visualFrames = null;
let message = "";
let opponent = null;
let autoTimer = 0;
let observer;
let resumeOnCancel = false;
const animationQuality = () => reduce.matches ? "minimal" : ui.quality;
const audio = createBattleAudio(() => ui.muted ? 0 : ui.volume);

function savePreferences() {
  const { speed, quality, muted, volume } = ui;
  try { localStorage.setItem(preferenceKey,JSON.stringify({ speed, quality, muted, volume })); }
  catch { /* Las preferencias siguen disponibles en memoria. */ }
}

function portrait(id, side = "player", defer = false) {
  const context = side === "enemy" ? opponentPortraitState() : game;
  const card = side === "enemy" ? opponentPortraitCard(id) : getCard(id, game);
  if (!card) return null;
  return getPortrait(card, context, undefined, { defer }).src;
}

function setDefaults() {
  for (const [id, slot] of [["lobo", 0], ["mamut", 1], ["alquimista", 4]]) {
    const found = roster.find(entry => entry.card.id === id);
    if (found) ui.slots[slot] = found.copies[0];
  }
}
setDefaults();

function freeCopies(entry) {
  const deployed = ui.slots.filter(copy => copy?.profile.cardId === entry.card.id).length;
  return entry.owned - deployed;
}

function filteredRoster() {
  const filters = ui.filters;
  const query = text(filters.search.trim());
  const ordered = {
    name: (a,b) => collator.compare(a.card.name,b.card.name),
    cost: (a,b) => a.profile.cost - b.profile.cost,
    health: (a,b) => b.profile.maxHp - a.profile.maxHp,
    agility: (a,b) => b.profile.stats.agility - a.profile.stats.agility,
    generation: (a,b) => b.profile.generation - a.profile.generation
  };
  return roster.filter(entry => {
    const unit = entry.profile;
    return (!query || text(entry.card.name).includes(query)) &&
      (!filters.generation || unit.generation === Number(filters.generation)) &&
      (!filters.role || [unit.role, unit.secondaryRole].includes(filters.role)) &&
      (!filters.cost || unit.cost === Number(filters.cost)) &&
      (!filters.affinity || unit.affinities.includes(filters.affinity)) &&
      (!filters.family || [unit.basic, unit.main, unit.special].some(key => SKILLS[key].intent === filters.family)) &&
      (filters.available === "free" ? freeCopies(entry) > 0 : filters.available !== "deployed" || freeCopies(entry) < entry.owned);
  }).sort((a,b) => ordered[filters.sort](a,b) || ordered.name(a,b));
}

function showRoster() {
  observer?.disconnect();
  const available = filteredRoster();
  const pages = Math.max(1, Math.ceil(available.length / pageSize));
  ui.page = Math.min(ui.page, pages - 1);
  const visible = available.slice(ui.page * pageSize, (ui.page + 1) * pageSize);
  const list = root.querySelector("#camp-roster");
  list.innerHTML = visible.map(entry => rosterEntry(entry, freeCopies(entry), portrait(entry.card.id, "player", true))).join("")
    || '<p class="tactic">No hay criaturas que coincidan con estos filtros.</p>';
  root.querySelector("#camp-roster-count").textContent = `${available.length} ${available.length === 1 ? "variante disponible" : "variantes disponibles"}`;
  root.querySelector("#camp-pages").innerHTML = pages > 1 ?
    `<button class="icon-btn" data-camp="previous-page" aria-label="Página anterior" ${ui.page ? "" : "disabled"}>‹</button>
      <span>${ui.page + 1} / ${pages}</span>
      <button class="icon-btn" data-camp="next-page" aria-label="Página siguiente" ${ui.page + 1 < pages ? "" : "disabled"}>›</button>` : "";
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      const image = entry.target;
      const src = portrait(image.dataset.portrait);
      if (src) image.src = src;
      observer.unobserve(image);
    }
  });
  for (const image of list.querySelectorAll("[data-portrait]")) observer.observe(image);
}

function showFormation() {
  const used = budgetUsed(ui.slots);
  const view = root.querySelector("#camp-formation");
  view.innerHTML = builderFormation(ui.slots, ui.selected, portrait);
  updateBudget(root.querySelector("#camp-budget"), ui.slots);
  root.querySelector("#camp-remove").disabled = !ui.slots[ui.selected];
  root.querySelector("#camp-start").disabled = !validateFormation(ui.slots, TRAINING_RULES, availableCopies(roster)).ok;
  opponent = trainingOpponent(ui.scout, ui.difficulty, used);
  root.querySelector("#camp-rival-note").textContent = `${SCOUTS[ui.scout].description} ${budgetUsed(opponent)} pts para este ensayo.`;
  root.querySelector("#camp-rival").innerHTML = opponent.filter(Boolean).map(({ profile }) =>
    `<img src="${escape(portrait(profile.cardId, "enemy"))}" alt="${escape(profile.name)}" title="${escape(profile.name)}" loading="lazy">`).join("");
  const instruction = ui.slots[ui.selected] ? "Toca otra plaza para intercambiar." : "Elige una criatura para la plaza marcada.";
  root.querySelector("#camp-formation-hint").textContent = instruction;
  root.querySelector("#camp-feedback").textContent = message;
}

function renderBuilder() {
  ui.affinities = [...new Set(roster.flatMap(entry => entry.profile.affinities))].sort();
  root.innerHTML = builderShell(ui);
  showRoster();
  showFormation();
}

function place(id) {
  const entry = roster.find(row => row.card.id === id);
  if (!entry) return;
  const used = new Set(ui.slots.map(copy => copy?.copyId));
  const copy = entry.copies.find(candidate => !used.has(candidate.copyId));
  if (!copy) return;
  const destination = ui.slots[ui.selected] ? ui.slots.indexOf(null) : ui.selected;
  if (destination < 0) {
    message = "La formación está llena. Retira una criatura para colocar otra.";
    showFormation();
    return;
  }
  ui.slots[destination] = copy;
  ui.selected = destination;
  message = "";
  showFormation();
  showRoster();
}

function selectSlot(index) {
  if (index === ui.selected && ui.slots[index]) {
    const entry = ui.slots[index];
    showDetails(entry.profile);
    return;
  }
  if (ui.slots[ui.selected] && index !== ui.selected) {
    [ui.slots[index], ui.slots[ui.selected]] = [ui.slots[ui.selected], ui.slots[index]];
  }
  ui.selected = index;
  showFormation();
  root.querySelector(`[data-slot="${index}"]`)?.focus({ preventScroll: true });
}

function showDetails(unit, side = "player") {
  detail.innerHTML = detailMarkup(unit, portrait(unit.cardId, side));
  if (!dialog.open) dialog.showModal();
}

function syncRoster() {
  game = readTrainingGame();
  roster = trainingRoster(game);
  const latest = new Map(roster.flatMap(entry => entry.copies.map(copy => [copy.copyId, copy])));
  const old = ui.slots.filter(Boolean).length;
  ui.slots = ui.slots.map(copy => latest.get(copy?.copyId) ?? null);
  if (old > ui.slots.filter(Boolean).length) message = "El inventario cambió. Revisa las plazas que quedaron libres.";
}

function interrupt() {
  clearTimeout(autoTimer);
  audio.stop();
  session?.abort();
  session = null;
  ui.auto = false;
  ui.busy = false;
  ui.armed = null;
  observer?.disconnect();
}

function begin() {
  interrupt();
  syncRoster();
  opponent = trainingOpponent(ui.scout, ui.difficulty, budgetUsed(ui.slots));
  const result = startCombat(ui.slots, opponent, { seed: ui.seed, available: availableCopies(roster) });
  if (!result.ok) {
    message = result.error;
    screen = "builder";
    renderBuilder();
    return;
  }
  battle = result.state;
  ui.elapsed = 0;
  ui.instant = false;
  session = new AbortController();
  screen = "battle";
  ui.actor = battle.units.find(unit => unit.side === "player")?.id;
  ui.detailId = ui.actor;
  ui.target = null;
  message = "";
  renderBattle();
  window.scrollTo(0,0);
}

function returnToBuilder() {
  interrupt();
  audio.suspend();
  battle = null;
  screen = "builder";
  message = "";
  syncRoster();
  renderBuilder();
  window.scrollTo(0,0);
}

function renderBattle() {
  root.innerHTML = battleShell(battle, ui, portrait);
  root.querySelector("#scene").dataset.quality = animationQuality();
  updateBattlePanels();
}

function updateBattlePanels() {
  const actor = battle.units.find(unit => unit.id === ui.detailId);
  root.querySelector("#camp-unit-panel").innerHTML = unitPanel(battle, actor);
  root.querySelector("#order-points").textContent = `◈ ${battle.commands.player.remaining} / ${battle.rules.commandPoints}`;
  root.querySelector("#order-list").innerHTML = orderPanel(battle, ui);
  root.querySelector("#order-note").textContent = message || "Selecciona una criatura para darle una orden.";
  root.querySelector("#camp-log").innerHTML = logLines(battle.history, battle.units);
  root.querySelector("#arena-round").textContent = battle.round;
  root.querySelector("#duel-pressure").hidden = battle.round < (battle.rules.pressure?.starts ?? Infinity);
  root.querySelector("#scene").dataset.phase = ui.busy ? "playing" : "planning";
  root.querySelector('[data-camp="next"]').disabled = ui.busy || ui.auto;
  const automatic = root.querySelector('[data-camp="auto"]');
  automatic.textContent = ui.auto ? "Pausar al acabar la ronda" : "Automático";
  automatic.setAttribute("aria-pressed", String(ui.auto));
  for (const element of root.querySelectorAll("[data-unit]")) {
    element.classList.toggle("is-selected", element.dataset.unit === ui.actor);
    element.classList.toggle("is-focused", element.dataset.unit === ui.target);
  }
}

function order(type, additions = {}) {
  const result = issueOrder(battle, "player", { type, actor: type === "focus" ? undefined : ui.actor, ...additions });
  if (result.ok) {
    battle = result.state;
    message = `${ORDERS[type].name} preparada para esta ronda.`;
    ui.armed = null;
  } else message = result.error;
  updateBattlePanels();
}

function arm(key) {
  if (key === "defend") { order(key); return; }
  if (key === "focus" && ui.target) { order(key, { target: ui.target }); return; }
  if (key === "special") {
    const actor = battle.units.find(unit => unit.id === ui.actor);
    const skill = SKILLS[actor.special];
    if (["self","melee","reach","area"].includes(skill.target)) {
      order(key, { ...(skill.target !== "self" && ui.target ? { target: ui.target } : {}) });
      return;
    }
  }
  if (ui.armed === key) {
    ui.armed = null;
    message = "Selección cancelada.";
  } else {
    ui.armed = key;
    message = key === "focus" ? "Toca el retrato del rival que quieres marcar." :
      key === "move" ? "Toca la plaza aliada de destino." : "Toca al aliado que recibirá la orden.";
  }
  updateBattlePanels();
}

function chooseUnit(id) {
  const unit = battle.units.find(value => value.id === id);
  if (!unit) return;
  ui.detailId = id;
  if (ui.busy || unit.hp <= 0) {
    updateBattlePanels();
    return;
  }
  if (ui.armed === "move" && unit.side === "player") order("move", { slot: unit.slot });
  else if ((ui.armed === "protect" || ui.armed === "special") && unit.side === "player") order(ui.armed, { target: id });
  else if (ui.armed === "focus" && unit.side === "enemy") {
    ui.target = id;
    order("focus", { target: id });
  } else {
    if (unit.side === "player") ui.actor = id;
    else ui.target = id;
    updateBattlePanels();
  }
}

function updatePortrait(unit) {
  const element = root.querySelector(`[data-unit="${CSS.escape(unit.id)}"]`);
  if (!element) return;
  const { hp, maxHp, shield, effects } = unit;
  element.classList.toggle("down", !hp);
  element.querySelector(".life-fill").style.width = `${hp/maxHp*100}%`;
  element.querySelector(".shield-fill").style.width = `${shield/maxHp*100}%`;
  element.querySelector(".hp-text").textContent = `${hp}/${maxHp}${shield ? " · ⬟ " + shield : ""}`;
  element.setAttribute("aria-label",`${unit.name}, ${SLOTS[unit.slot]}, ${hp} de ${maxHp} de vitalidad`);
  const tag = element.querySelector(".unit-states");
  tag.textContent = effects.slice(0,3).map(id => EFFECTS[id].icon).join(" ");
  tag.title = effects.map(id => EFFECTS[id].name).join(", ");
}

function applyFrames(events) {
  const changed = new Map();
  for (const event of events) {
    if (!event.unit) continue;
    const frame = { ...visualFrames.get(event.unit.id), ...event.unit };
    visualFrames.set(frame.id, frame);
    changed.set(frame.id,frame);
  }
  if (events.some(event => event.type === "move")) {
    const layout = root.querySelector(".arena-layout");
    const animated = !ui.instant && animationQuality() === "full";
    const previous = animated && new Map([...layout.querySelectorAll("[data-unit]")].map(node => [node.dataset.unit, node.getBoundingClientRect()]));
    const visual = { ...battle, units: [...visualFrames.values()].map(frame => ({
      ...frame, effects: Array.isArray(frame.effects) ? Object.fromEntries(frame.effects.map(key => [key, {}])) : frame.effects
    })) };
    layout.innerHTML = ["player", "enemy"].map(side => arenaSide(visual, side, ui, portrait)).join("");
    if (previous) for (const node of layout.querySelectorAll("[data-unit]")) {
      const before = previous.get(node.dataset.unit);
      if (!before) continue;
      const after = node.getBoundingClientRect();
      const x = before.left - after.left;
      const y = before.top - after.top;
      if (x || y) node.animate([{ transform: `translate(${x}px,${y}px)` }, { transform: "translate(0,0)" }],
        { duration: 135 / ui.speed, easing: "ease-out" });
    }
  } else for (const frame of changed.values()) updatePortrait(frame);
}

async function nextRound() {
  if (screen !== "battle" || ui.busy || !session) return;
  const token = session;
  const since = performance.now();
  ui.busy = true;
  ui.armed = null;
  message = "Resolviendo la ronda.";
  updateBattlePanels();
  const next = advanceCombat(battle, ui.difficulty);
  visualFrames = new Map(battle.units.map(unit => [unit.id, unit]));
  await playEvents(root.querySelector("#scene"), next.events,
    { speed: () => ui.speed, quality: animationQuality, skip: () => ui.instant,
      signal: token.signal, sound: audio.play }, applyFrames);
  if (session !== token || token.signal.aborted) return;
  battle = next;
  ui.elapsed += performance.now() - since;
  ui.busy = false;
  message = "";
  if (battle.result) { showResult(); return; }
  if (ui.instant) { resolveInstantly(); return; }
  if (!battle.units.some(unit => unit.id === ui.actor && unit.hp > 0)) {
    ui.actor = battle.units.find(unit => unit.side === "player" && unit.hp > 0)?.id;
  }
  if (!battle.units.some(unit => unit.id === ui.target && unit.hp > 0)) ui.target = null;
  updateBattlePanels();
  if (ui.auto) autoTimer = setTimeout(nextRound, AUTOMATIC_GAP / ui.speed);
}

function showResult() {
  interrupt();
  screen = "result";
  if (instantDialog.open) instantDialog.close("cancel");
  root.innerHTML = resultView(battle,ui);
  if (!ui.instant) audio.play(battle.result.winner === "player" ? "victory" : battle.result.winner === "enemy" ? "defeat" : "draw");
  window.scrollTo(0,0);
  root.querySelector(".results h1").focus({ preventScroll: true });
}

function resolveInstantly() {
  const since = performance.now();
  battle = finishCombat(battle,ui.difficulty);
  ui.elapsed += performance.now() - since;
  showResult();
}

function exportReport() {
  const url = URL.createObjectURL(new Blob([JSON.stringify({
    seed: battle.initialSeed, difficulty: ui.difficulty, difficultyName: DIFFICULTIES[ui.difficulty], rival: ui.scout,
    deployment: Object.fromEntries([["player", ui.slots], ["enemy", opponent]].map(([side, slots]) =>
      [side, slots.map(entry => entry ? { copyId: entry.copyId, cardId: entry.profile.cardId } : null)])),
    formations: battle.units.map(({ id, cardId, side, name, metrics }) => ({ id, cardId, side, name, metrics })),
    result: battle.result, events: battle.history
  }, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "quimeraria-entrenamiento.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

root.addEventListener("click", event => {
  const el = event.target.closest("button");
  if (!el) return;
  if (el.dataset.pick) { place(el.dataset.pick); return; }
  if (el.dataset.details) {
    const entry = roster.find(row => row.card.id === el.dataset.details);
    if (entry) showDetails(entry.profile);
    return;
  }
  if (el.dataset.slot !== undefined) { selectSlot(Number(el.dataset.slot)); return; }
  if (el.dataset.unit) { chooseUnit(el.dataset.unit); return; }
  if (el.dataset.battleSlot !== undefined) {
    if (!ui.busy && ui.armed === "move" && el.dataset.side === "player") order("move", { slot: Number(el.dataset.battleSlot) });
    return;
  }
  switch (el.dataset.camp) {
    case "remove":
      ui.slots[ui.selected] = null;
      message = "";
      showFormation();
      showRoster();
      break;
    case "previous-page":
    case "next-page":
      ui.page += el.dataset.camp === "previous-page" ? -1 : 1;
      showRoster();
      root.querySelector("#camp-roster").scrollTop = 0;
      break;
    case "start":
    case "reset":
      begin();
      break;
    case "exit":
      returnToBuilder();
      break;
    case "next":
      audio.unlock();
      nextRound();
      break;
    case "auto":
      audio.unlock();
      ui.auto = !ui.auto;
      if (ui.auto) nextRound();
      else clearTimeout(autoTimer);
      updateBattlePanels();
      break;
    case "instant":
      resumeOnCancel = ui.auto;
      ui.auto = false;
      clearTimeout(autoTimer);
      updateBattlePanels();
      instantDialog.returnValue = "cancel";
      instantDialog.showModal();
      break;
    case "mute":
      ui.muted = !ui.muted;
      if (ui.muted) audio.stop();
      else audio.unlock();
      el.setAttribute("aria-pressed",String(ui.muted));
      el.textContent = ui.muted ? "Activar sonido" : "Silenciar";
      savePreferences();
      break;
    case "order":
      if (!ui.busy) arm(el.dataset.order);
      break;
    case "clear":
      battle = clearOrders(battle);
      ui.armed = null;
      message = "";
      updateBattlePanels();
      break;
    case "unit-details": {
      const unit = battle.units.find(value => value.id === el.dataset.id);
      if (unit) showDetails(unit, unit.side);
      break;
    }
    case "export":
      exportReport();
      break;
  }
});

function updateFilter(event) {
  const id = event.target.id.replace("camp-", "");
  if (Object.hasOwn(ui.filters, id)) {
    ui.filters[id] = event.target.value;
    ui.page = 0;
    showRoster();
  }
}

root.addEventListener("input", event => {
  if (event.target.id === "camp-search") updateFilter(event);
});
root.addEventListener("change", event => {
  const id = event.target.id.replace("camp-", "");
  if (id !== "search") updateFilter(event);
  if (id === "difficulty" || id === "scout") {
    ui[id] = event.target.value;
    showFormation();
  }
  if (id === "seed") ui.seed = Number(event.target.value) >>> 0;
  if (id === "speed") {
    ui.speed = Number(event.target.value);
    root.querySelector("#scene").style.setProperty("--pace", 1 / ui.speed);
    savePreferences();
  }
  if (id === "quality") {
    ui.quality = event.target.value;
    root.querySelector("#scene").dataset.quality = animationQuality();
    savePreferences();
  }
});
root.addEventListener("input",event => {
  if (event.target.id !== "camp-volume") return;
  ui.volume = Number(event.target.value);
  if (ui.volume === 0) audio.stop();
  else audio.unlock();
  savePreferences();
});
instantDialog.addEventListener("close",() => {
  if (screen !== "battle") return;
  if (instantDialog.returnValue === "resolve") {
    ui.instant = true;
    if (!ui.busy) resolveInstantly();
  } else if (resumeOnCancel) {
    ui.auto = true;
    updateBattlePanels();
    nextRound();
  }
});
root.addEventListener("toggle", event => {
  if (event.target.parentElement?.classList.contains("filters-wrap")) ui.filtersOpen = event.target.open;
  if (event.target.classList.contains("seed")) ui.seedOpen = event.target.open;
}, true);
dialog.addEventListener("click", event => {
  if (event.target.closest('[data-camp="close-detail"]') || event.target === dialog) dialog.close();
});
window.addEventListener("storage", event => {
  if (event.key === "quimeraria:partida:v1" && screen === "builder") {
    syncRoster();
    renderBuilder();
  }
});
window.addEventListener("pagehide",() => { interrupt(); audio.suspend(); });
window.addEventListener("pageshow", event => {
  if (event.persisted && screen === "battle") returnToBuilder();
});
reduce.addEventListener("change", () => {
  const scene = root.querySelector("#scene");
  if (scene) scene.dataset.quality = animationQuality();
});
renderBuilder();
