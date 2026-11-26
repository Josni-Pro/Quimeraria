import { COMBAT_ROLES, COMBAT_STATS } from "./creature-profiles.js";
import { ORDERS, SLOTS, TRAINING_RULES } from "./combat/config.js";
import { DIFFICULTIES } from "./combat/bots.js";
import { EFFECTS } from "./combat/effects.js";
import { budgetUsed, canUse, squadResults } from "./combat/engine.js";
import { SCOUTS } from "./combat/roster.js";
import { SKILLS } from "./combat/skills.js";

export const escape = value => String(value ?? "").replace(/[&<>"']/g, letter =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[letter]);
const roles = profile => [profile.role, profile.secondaryRole].filter(Boolean).map(id => COMBAT_ROLES[id].name).join(" / ");
const button = (id, label, css = "", options = "") => `<button type="button" data-camp="${id}" class="camp-btn ${css}" ${options}>${label}</button>`;
const choice = (values, selected) => values.map(([id, name]) =>
  `<option value="${escape(id)}"${String(id) === String(selected) ? " selected" : ""}>${escape(name)}</option>`).join("");
const field = (label, id, options, selected) =>
  `<label class="field-label">${label}<select class="camp-select" id="${id}">${choice(options, selected)}</select></label>`;
const rank = name => `<div class="rank">${name}</div>`;

export function builderShell(model) {
  const roleList = Object.entries(COMBAT_ROLES).map(([id, info]) => [id, info.name]);
  return `<header class="mast">
      <div><p class="eyebrow">Santuario del Umbral</p><h1>Campo de entrenamiento</h1><p>Prepara tu escuadra y pon a prueba su forma de luchar.</p></div>
      <span class="safe-tag">◇ Práctica sin costo</span>
    </header>
    <div class="build-grid">
      <section class="camp-panel collection-panel" aria-labelledby="camp-roster-title">
        <div class="panel-head"><h2 id="camp-roster-title">Tu colección</h2><p id="camp-roster-count"></p></div>
        <div class="filters-wrap"><label class="field-label" for="camp-search">Buscar criatura</label>
          <input class="camp-input" type="search" id="camp-search" value="${escape(model.filters.search)}" placeholder="Nombre de la criatura">
          <details class="camp-details" ${model.filtersOpen ? "open" : ""}><summary>Filtros y orden</summary>
            <div class="filters">
              ${field("Generación", "camp-generation", [["", "Todas"], ...[0,1,2,3,4].map(value => [value, "G" + value])], model.filters.generation)}
              ${field("Rol", "camp-role", [["", "Todos"], ...roleList], model.filters.role)}
              ${field("Costo", "camp-cost", [["", "Todos"], ...[1,2,3,4,6].map(value => [value, value + " pts"])], model.filters.cost)}
              ${field("Afinidad", "camp-affinity", [["", "Todas"], ...model.affinities.map(id => [id, id])], model.filters.affinity)}
              ${field("Familia", "camp-family", [["", "Todas"], ["offense","Ofensiva"], ["guard","Protección"], ["heal","Curación"], ["cleanse","Purificación"], ["buff","Potenciación"], ["control","Control"]], model.filters.family)}
              ${field("Disponibilidad", "camp-available", [["", "Todas"], ["free","Copias libres"], ["deployed","En escuadra"]], model.filters.available)}
              ${field("Ordenar por", "camp-sort", [["name","Nombre"], ["cost","Costo"], ["health","Vitalidad"], ["agility","Agilidad"], ["generation","Generación"]], model.filters.sort)}
            </div>
          </details>
        </div>
        <div class="roster" id="camp-roster"></div><div class="roster-pages" id="camp-pages"></div>
      </section>
      <section class="camp-panel formation" aria-labelledby="camp-formation-title">
        <div class="formation-head"><div><p class="eyebrow">Despliegue</p><h2 id="camp-formation-title">Tu formación</h2></div><div id="camp-budget"></div></div>
        <div class="formation-board"><div class="formation-slots" id="camp-formation"></div></div>
        <div class="foot-actions"><span id="camp-formation-hint">Selecciona una plaza o intercambia dos.</span>
        ${button("remove", "Quitar criatura", "quiet", 'id="camp-remove"')}</div>
      </section>
      <section class="camp-panel rival" aria-labelledby="camp-rival-title">
        <p class="eyebrow">Oposición</p><h2 id="camp-rival-title">Escuadra rival</h2>
        ${field("Dificultad", "camp-difficulty", Object.entries(DIFFICULTIES), model.difficulty)}
        ${field("Formación rival", "camp-scout", Object.entries(SCOUTS).map(([id, info]) => [id, info.name]), model.scout)}
        <p class="rival-note" id="camp-rival-note"></p><div class="rival-squad" id="camp-rival"></div>
        ${button("start", "Iniciar combate", "gold", 'id="camp-start"')}
        <p class="camp-feedback" id="camp-feedback" role="status"></p>
        <details class="camp-details seed" ${model.seedOpen ? "open" : ""}><summary>Semilla del encuentro</summary>
          <label class="field-label">Número reproducible<input id="camp-seed" class="camp-input" type="number" min="0" max="4294967295" value="${model.seed}"></label>
        </details>
      </section>
    </div>`;
}

export function unitCard(unit, art, options = {}) {
  const attrs = options.attrs ?? "";
  if (!unit) {
    return `<button type="button" class="empty-slot${options.selected ? " is-selected" : ""}" ${attrs} aria-label="${escape(options.label)}"><span aria-hidden="true">+</span> ${options.inBattle ? "Plaza libre" : "Vacía"}</button>`;
  }
  const hp = options.inBattle ? unit.hp : unit.maxHp;
  const shield = unit.shield ?? 0;
  const effects = Object.keys(unit.effects ?? {});
  const roleText = roles(unit);
  return `<button type="button" class="unit-card${options.selected ? " is-selected" : ""}${options.focused ? " is-focused" : ""}${hp <= 0 ? " down" : ""}"
    data-name="${escape(unit.name)}" aria-label="${escape([unit.name, options.label, options.inBattle ? hp + " de " + unit.maxHp + " de vitalidad" : roleText].filter(Boolean).join(", "))}" ${attrs}>
    <div class="unit-fig">${art ? `<img src="${escape(art)}" alt="" decoding="async">` : ""}<span class="unit-badge">${options.inBattle ? "G" + unit.generation : "◈ " + unit.cost}</span></div>
    <div class="unit-copy"><strong>${escape(unit.name)}</strong>
    ${options.inBattle ? `<div class="life-track" aria-hidden="true"><div class="life-fill" style="width:${hp / unit.maxHp * 100}%"></div><div class="shield-fill" style="width:${shield / unit.maxHp * 100}%"></div></div>
    <div class="vitals"><span class="hp-text">${hp}/${unit.maxHp}${shield ? " · ⬟ " + shield : ""}</span><span class="unit-states" title="${escape(effects.map(id => EFFECTS[id].name).join(", "))}">${effects.slice(0, 3).map(id => EFFECTS[id].icon).join(" ")}</span></div>`
      : `<small>G${unit.generation} · ${escape(COMBAT_ROLES[unit.role].name)}</small>`}</div>
  </button>`;
}

export function builderFormation(slots, selected, portrait) {
  const cards = slots.map((entry, index) => unitCard(entry?.profile, entry ? portrait(entry.profile.cardId) : null,
    { attrs: `data-slot="${index}"`, selected: index === selected, label: SLOTS[index] }));
  return rank("Vanguardia") + cards.slice(0,3).join("") + rank("Retaguardia") + cards.slice(3).join("");
}

export function updateBudget(element, slots) {
  const used = budgetUsed(slots);
  element.innerHTML = `<div class="budget ${used > TRAINING_RULES.budget ? "over" : ""}"><b>${used} / ${TRAINING_RULES.budget}</b><span>${TRAINING_RULES.budget - used} puntos libres</span></div>`;
}

export function rosterEntry(entry, free, portrait) {
  const { profile, card } = entry;
  return `<div class="roster-row"><button type="button" class="roster-pick" data-pick="${escape(card.id)}" ${free > 0 ? "" : "disabled"}>
      <img class="roster-img" ${portrait ? `src="${escape(portrait)}"` : `data-portrait="${escape(card.id)}"`} alt="" loading="lazy" decoding="async">
      <span><strong>${escape(card.name)}</strong><small>G${profile.generation} · ${escape(roles(profile))}</small><small>VIT ${profile.stats.vitality} · AGI ${profile.stats.agility} · ${free} libres</small></span>
      <span class="cost">◈ ${profile.cost}</span></button>
    <button type="button" class="icon-btn" data-details="${escape(card.id)}" aria-label="Ficha de ${escape(card.name)}">ⓘ</button></div>`;
}

export function arenaSide(state, side, selection, portrait) {
  const units = state.units.filter(unit => unit.side === side);
  const cards = SLOTS.map((label, slot) => {
    const found = units.find(unit => unit.slot === slot && unit.hp > 0) ?? units.find(unit => unit.slot === slot);
    return unitCard(found, found ? portrait(found.cardId, side) : null, { inBattle: true,
      selected: selection.actor === found?.id, focused: selection.target === found?.id,
      label, attrs: found ? `data-unit="${escape(found.id)}" data-cell="${slot}"` : `data-battle-slot="${slot}" data-side="${side}"` });
  });
  const name = side === "player" ? "Tu formación" : SCOUTS[selection.scout].name;
  return `<div class="arena-group ${side}" role="group" aria-label="${escape(name)}">
    <h2 class="mobile-side-name">${escape(name)}</h2>
    ${rank("Vanguardia")}${cards.slice(0,3).join("")}${rank("Retaguardia")}${cards.slice(3).join("")}</div>`;
}

export function battleShell(state, model, portrait) {
  return `<header class="combat-head"><div class="combat-title"><p class="eyebrow">Santuario del Umbral</p><h1>Ensayo de combate</h1></div>
    <div class="round-hud"><div class="combat-round"><span>Ronda</span> <b id="arena-round">${state.round}</b><small> / ${state.rules.maxRounds}</small></div><span id="duel-pressure" hidden>Presión del duelo</span></div></header>
    <section class="scene" id="scene" aria-label="Campo de combate" data-quality="${model.quality}" style="--pace:${1 / model.speed}">
      <div class="side-names"><span>Tu formación</span><span class="versus" aria-label="Contra">VS</span><span>${escape(SCOUTS[model.scout].name)}</span></div>
      <div class="arena-layout">${arenaSide(state, "player", model, portrait)}${arenaSide(state, "enemy", model, portrait)}</div>
      <canvas class="scene-canvas" aria-hidden="true"></canvas><div class="scene-floats" aria-hidden="true"></div>
      <div class="scene-caption" hidden><span></span><strong></strong></div>
    </section>
    <div class="combat-controls">
      <div class="transport">${button("next", "Avanzar ronda", "gold")}${button("auto", model.auto ? "Pausar al acabar la ronda" : "Automático")}
      ${button("instant", "Resolver combate", "quiet")}</div>
      <div class="preferences">
        ${field("Velocidad", "camp-speed", [[1,"1×"],[2,"2×"],[4,"4×"]], model.speed)}
        <details class="combat-settings"><summary>Ajustes</summary><div class="settings-popover">
        ${field("Calidad gráfica", "camp-quality", [["full","Alta"],["reduced","Equilibrada"],["minimal","Reducida"]], model.quality)}
        <label class="field-label sound-volume">Volumen <input id="camp-volume" type="range" min="0" max="100" value="${model.volume}"></label>
        ${button("mute",model.muted ? "Activar sonido" : "Silenciar","quiet",`aria-pressed="${model.muted}"`)}
        </div></details>
      </div>
    </div>
    <div class="combat-info">
      <section class="camp-panel orders" aria-label="Órdenes">
        <div class="order-head"><h2>Órdenes</h2><span id="order-points"></span></div>
        <div id="order-list"></div><p class="tactic" id="order-note" role="status"></p>
      </section>
      <section class="camp-panel combat-detail" id="camp-unit-panel" aria-label="Detalle de criatura"></section>
      <details class="camp-panel log battle-log"><summary>Crónica de la ronda</summary><ol class="log-lines" id="camp-log"></ol></details>
    </div>
    <div class="battle-exit">${button("reset", "Reiniciar", "quiet")}${button("exit", "Volver a formación", "quiet")}</div>`;
}

export function orderPanel(state, model) {
  const command = state.commands.player;
  const actor = state.units.find(unit => unit.id === model.actor && unit.side === "player" && unit.hp > 0);
  const actorOccupied = !actor || actor.effects.stun || command.orders.some(entry => entry.actor === actor.id);
  const unavailable = {
    focus: command.orders.some(entry => entry.type === "focus"),
    protect: !actor || ![actor.main, actor.special].some(key => SKILLS[key].intent === "guard" && canUse(state, actor, key)),
    move: actor?.effects.root || command.orders.some(entry => entry.type === "move"),
    special: !actor || !canUse(state, actor, actor.special)
  };
  const options = Object.entries(ORDERS).map(([key, order]) => {
    const disabled = model.busy || !command.remaining || key !== "focus" && actorOccupied || unavailable[key];
    return button("order", order.icon + " " + order.name, model.armed === key ? "armed" : "",
      `data-order="${key}" title="${escape(order.description)}" ${disabled ? "disabled" : ""}`);
  });
  return `<div class="order-list">${options.join("")}${command.orders.length ?
    button("clear", "Limpiar", "quiet", model.busy ? "disabled" : "") : ""}</div>
    ${command.orders.length ? `<p class="tactic">${command.orders.map(order => ORDERS[order.type].name).join(" · ")}</p>` : ""}`;
}

const labels = { initiative: "Iniciativa", action: "Habilidad", damage: "Daño", heal: "Curación", shield: "Escudo",
  intercept: "Intercepción", status: "Estado", cleanse: "Purificación", down: "Incapacitación",
  order: "Orden", move: "Posición", skip: "Turno perdido" };

export function eventText(event, names) {
  const name = id => names.get(id) ?? "Escuadra";
  if (event.type === "initiative") return "Iniciativa · " + event.order.map(name).join(" › ");
  if (event.type === "action") {
    return name(event.actor) + " · " + SKILLS[event.skill].name + " → " + event.targets.map(name).join(", ");
  }
  if (event.type === "order") return (event.side === "enemy" ? "Rival" : "Tu formación") + " · " + ORDERS[event.order].name;
  if (event.type === "status") return name(event.target) + " · " + EFFECTS[event.effect].name;
  if (event.type === "down" || event.type === "cleanse") return name(event.target) + " · " + labels[event.type];
  if (event.type === "damage" && event.absorbed) return name(event.target) + " · " + event.amount + " de daño · ⬟ " + event.absorbed;
  if (typeof event.amount === "number") return name(event.target) + " · " + labels[event.type] + " " + event.amount;
  return name(event.actor) + " · " + (labels[event.type] ?? "");
}

export function logLines(events, units, limit = 9) {
  const names = new Map(units.map(unit => [unit.id, unit.name]));
  return events.filter(event => labels[event.type]).slice(-limit).reverse().map(event =>
    `<li><span class="log-round" aria-label="Ronda ${event.round}">R${event.round}</span> ${escape(eventText(event, names))}</li>`).join("") || "<li>La ronda está preparada.</li>";
}

function skillLine(state, unit, key) {
  const skill = SKILLS[key];
  const rounds = Math.max(0, (unit.cooldowns[key] ?? 0) - state.round);
  const label = !unit.hp ? "Incapacitada" : rounds ? rounds + " r de recarga" : canUse(state, unit, key) ? "Disponible" : "Silencio";
  return `<div class="skill-line"><span title="${escape(skill.description)}">${escape(skill.name)}</span><span>${label}</span></div>`;
}

export function unitPanel(state, unit) {
  if (!unit) return "<h2>Criatura</h2><p class='small'>Selecciona un retrato para consultar sus capacidades.</p>";
  return `<h2>${escape(unit.name)}</h2><p class="small">${escape(roles(unit))} · ${unit.hp}/${unit.maxHp} VIT${unit.shield ? " · ⬟ " + unit.shield : ""}</p>
    ${[unit.basic, unit.main, unit.special].map(key => skillLine(state, unit, key)).join("")}
    <div class="effect-tags">${Object.keys(unit.effects).map(id => `<span>${EFFECTS[id].icon} ${EFFECTS[id].name}</span>`).join("")}</div>
    ${button("unit-details", "Ficha completa", "quiet", `data-id="${escape(unit.id)}"`)}`;
}

export function detailMarkup(unit, portrait) {
  const effects = Object.entries(unit.effects ?? {});
  return `<div class="detail-top">${portrait ? `<img src="${escape(portrait)}" alt="">` : ""}
    <div><h2 id="detail-title">${escape(unit.name)}</h2><p>G${unit.generation} · ${escape(roles(unit))} · ◈ ${unit.cost}</p><p>${escape(unit.motif)}</p></div>
    <button class="icon-btn" data-camp="close-detail" aria-label="Cerrar ficha">✕</button></div>
    <div class="stats-grid">${Object.entries(COMBAT_STATS).map(([id, label]) => `<div><b>${unit.stats[id]}</b>${label}</div>`).join("")}</div>
    ${[["Básica", unit.basic], ["Principal", unit.main], ["Especial", unit.special]].map(([label, id]) => {
      const skill = SKILLS[id];
      return `<div class="detail-skill"><strong>${label} · ${skill.name}</strong>
        <p>${skill.description}${skill.cooldown ? " · Recarga " + skill.cooldown + " rondas" : ""}</p></div>`;
    }).join("")}
    <div class="detail-skill"><strong>Pasiva · ${escape(unit.passive.name)}</strong><p>${escape(unit.passive.description)}</p></div>
    ${effects.length ? `<div class="detail-skill"><strong>Estados activos</strong><p>${effects.map(([id, info]) =>
      `${EFFECTS[id].icon} ${EFFECTS[id].name} · vence en R${info.until}`).join(" / ")}</p></div>` : ""}`;
}

const columns = [["damage","Daño"],["received","Recibido"],["healing","Curación"],["protection","Protección"],["support","Apoyo"],["control","Control"],["skills","Habilidades"]];
export function resultView(state, model) {
  const { result } = state;
  const heading = result.winner === "player" ? "Victoria" : result.winner === "enemy" ? "Derrota" : "Empate";
  const bySide = ["player","enemy"].map(side => [side, squadResults(state, side)]);
  const survivors = side => side.filter(unit => unit.hp > 0).length;
  const totals = bySide[0][1].reduce((total,unit) => {
    for (const key of ["damage","healing","protection","control"]) total[key] = (total[key] ?? 0) + unit.metrics[key];
    return total;
  },{});
  const duration = model.elapsed / 1000;
  const time = duration < 1 ? " < 1 s activo" : Math.floor(duration / 60) + ":" + String(Math.floor(duration % 60)).padStart(2,"0") + " activo";
  return `<header class="results" data-result="${result.winner ?? "draw"}">
      <div class="result-emblem" aria-hidden="true"><span>${result.winner === "player" ? "✧" : result.winner === "enemy" ? "◈" : "◇"}</span></div>
      <p class="eyebrow">Santuario del Umbral</p><h1 tabindex="-1">${heading}</h1>
      <p>${result.rounds} ${result.rounds === 1 ? "ronda" : "rondas"} · ${escape(time)} · ${result.reason === "limit" ? "Límite de rondas" : "Encuentro concluido"}</p>
      <div class="result-actions">${button("reset", "Repetir", "gold")}${button("exit", "Cambiar formación", "quiet")}${button("export", "Exportar crónica", "quiet")}</div>
    </header>
    <dl class="result-summary">${[["damage","Daño"],["healing","Curación"],["protection","Protección"],["control","Control"]].map(([key,name]) =>
      `<div><dt>${name} de tu escuadra</dt><dd>${totals[key]}</dd></div>`).join("")}</dl>
    ${bySide.map(([side, units]) => `<section class="camp-panel result-sheet">
      <h2>${side === "player" ? "Tu escuadra" : escape(SCOUTS[model.scout].name)}</h2>
      <p class="rival-note">${survivors(units)} en pie · ${units.length - survivors(units)} incapacitadas</p>
      <table class="result-table"><thead><tr><th>Criatura</th>${columns.map(([, name]) => `<th>${name}</th>`).join("")}</tr></thead>
      <tbody>${units.map(unit => `<tr><td>${escape(unit.name)}<small>${escape(COMBAT_ROLES[unit.role].name)} · ${unit.hp ? unit.hp + " VIT" : "Incapacitada"}</small></td>
        ${columns.map(([key,name]) => `<td data-label="${name}">${unit.metrics[key]}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`).join("")}
    <details class="camp-panel log"><summary>Consultar la crónica</summary><ol class="log-lines">${logLines(state.history, state.units, Infinity)}</ol></details>`;
}
