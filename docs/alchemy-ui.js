import { recentCards, sortCardEntries } from "./card-order.js";
import { getAberrationCopies, getCard, previewEssence } from "./engine.js";
import { ALCHEMY } from "./game-config.js";
import { FAILURE_FAMILIES } from "./aberration-concepts.js";

function escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function normalize(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
}

function name(id, state) {
  return getCard(id, state)?.name ?? id;
}

function counted(ids) {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, count]) => ({ id, count }));
}

function namedChips(entries, state) {
  return `<ul class="alchemy-chips">${entries.map(({ id, count }) =>
    `<li>${escape(name(id, state))}${count > 1 ? ` <span>×${count}</span>` : ""}</li>`
  ).join("")}</ul>`;
}

function provenance(parents, lineage, state) {
  return `<dl class="alchemy-provenance">
    <dt>Progenitores exactos</dt><dd>${namedChips(counted(parents), state)}</dd>
    <dt>Linaje base</dt><dd>${namedChips(counted(lineage), state)}</dd>
  </dl>`;
}

export function renderAberrationDetails({ state, card }) {
  const label = FAILURE_FAMILIES[card.family] ?? FAILURE_FAMILIES.historical;
  const copies = getAberrationCopies(state, card.id);
  const available = state.inventory[card.id] ?? 0;
  return `<p><strong>${escape(label)}</strong> · G${card.generation}</p>
    <p class="alchemy-defect">${escape(card.description)}</p>
    ${provenance(card.parents, card.lineage, state)}
    <p>${available ? `${available} ${available === 1 ? "copia disponible" : "copias disponibles"} para destilar esencia.`
      : "Descubierta · 0 copias disponibles para destilar."}</p>
    ${copies.length ? `<details><summary>Identificadores de las copias</summary><ul>${copies.map(({ id }) => `<li><code>${escape(id)}</code></li>`).join("")}</ul></details>` : ""}`;
}

function aberrationRow(card, count, picked, canAdd, state, cardFace) {
  const id = escape(card.id);
  return `<li class="alchemy-ingredient${picked ? " alchemy-ingredient--picked" : ""}">
    <div class="alchemy-ingredient-main">
      <div class="alchemy-thumbnail">${cardFace(card, { count })}</div>
      <div class="alchemy-ingredient-copy">
        <strong>${escape(card.name)}</strong>
        <span>${count} ${count === 1 ? "copia disponible" : "copias disponibles"}</span>
      </div>
      <div class="alchemy-stepper" role="group" aria-label="${escape(`Copias de ${card.name} para destilar`)}">
        <button type="button" data-action="alchemy-remove" data-id="${id}" aria-label="${escape(`Quitar una copia de ${card.name}`)}" ${picked ? "" : "disabled"}>−</button>
        <span aria-label="${picked} seleccionadas">${picked}</span>
        <button type="button" data-action="alchemy-add" data-id="${id}" aria-label="${escape(`Seleccionar una copia de ${card.name}`)}" ${canAdd ? "" : "disabled"}>+</button>
      </div>
    </div>
    <details class="alchemy-origin">
      <summary>Origen y linaje</summary>
      ${renderAberrationDetails({ state, card })}
    </details>
  </li>`;
}

function essenceSymbol() {
  return '<span class="alchemy-essence-symbol" aria-hidden="true"><i></i></span>';
}

function visibleHistory(state) {
  const entries = state.alchemyHistory ?? [];
  const pending = state.pendingReveal;
  const [latest] = entries;
  const latestIsPending = pending && latest?.cardId === pending.cardId
    && (pending.outcome === "aberration" || pending.kind === "essence");
  return latestIsPending ? entries.slice(1) : entries;
}

function usedEssences(state) {
  const history = visibleHistory(state);
  const used = new Set(history.filter(entry => entry.kind === "recovered").map(entry => entry.essenceId));
  return history.filter(entry => entry.kind === "essence" && used.has(entry.essenceId))
    .map(entry => ({
      id: entry.essenceId, name: "Esencia Quimérica",
      sources: entry.sources ?? [], progenitors: entry.progenitors ?? [], used: true
    }));
}

function essenceRow(essence, state) {
  const count = essence.progenitors.reduce((total, entry) => total + entry.count, 0);
  const unavailable = essence.pairCount === 0;
  return `<li class="alchemy-essence">
    <div class="alchemy-essence-main">
      ${essenceSymbol()}
      <div class="alchemy-essence-copy">
        <strong>${escape(essence.name)}</strong>
        <span>${count} ${count === 1 ? "referencia directa" : "referencias directas"} · ${essence.used ? "Consumida" : unavailable ? "En espera de una pareja compatible" : "Éxito garantizado"}</span>
      </div>
      ${essence.used ? "" : `<button type="button" class="button alchemy-use" data-action="alchemy-use" data-id="${escape(essence.id)}" ${state.pendingReveal || unavailable ? "disabled" : ""}>Utilizar</button>`}
    </div>
    <details class="alchemy-origin">
      <summary>Progenitores registrados</summary>
      ${namedChips(essence.progenitors, state)}
      ${essence.sources.length ? `<p>Obtenida de ${essence.sources.length} aberraciones.</p>` : ""}
    </details>
  </li>`;
}

export function renderEssences({ state, includeUsed = false, query = "" }) {
  const allEssences = Object.values(state.essences ?? {});
  if (includeUsed) allEssences.push(...usedEssences(state));
  const term = normalize(query.trim());
  const visible = term ? allEssences.filter(essence => normalize(
    `${essence.name} ${essence.progenitors.map(entry => name(entry.id, state)).join(" ")}`
  ).includes(term)) : allEssences;
  if (!visible.length) {
    return `<p class="alchemy-empty">${term
      ? "No hay esencias con esta búsqueda."
      : "Las esencias que crees en Alquimia aparecerán aquí."}</p>`;
  }
  return `<ul class="alchemy-essence-list">${visible.map(essence => essenceRow(essence, state)).join("")}</ul>`;
}

function historyRow(entry, state) {
  const card = entry.cardId ? getCard(entry.cardId, state) : null;
  const parents = entry.parents ?? card?.parents ?? [];
  const events = {
    aberration: ["Fusión fallida", "◈"],
    essence: ["Esencia creada", "✧"],
    recovered: ["Fusión recuperada", "◇"]
  };
  const [label, symbol] = events[entry.kind];
  return `<li class="alchemy-history-entry" data-kind="${entry.kind}">
    <span class="alchemy-history-icon" aria-hidden="true">${symbol}</span>
    <div class="alchemy-history-copy">
      <span class="alchemy-history-type">${label}</span>
      <strong>${escape(card?.name ?? "Esencia quimérica")}</strong>
      ${parents.length ? `<span>${parents.map(id => escape(name(id, state))).join(" + ")}</span>` : ""}
      ${entry.sources?.length ? `<span>${entry.sources.length} aberraciones destiladas</span>` : ""}
    </div>
    ${card ? `<button type="button" class="link-quiet alchemy-history-link" data-action="detail" data-id="${escape(card.id)}">Ver ficha<span class="sr-only"> de ${escape(card.name)}</span></button>` : ""}
  </li>`;
}

function history(state) {
  const entries = visibleHistory(state).filter(entry =>
    ["aberration", "essence", "recovered"].includes(entry.kind));
  if (!entries.length) return '<p class="alchemy-empty">Las fusiones fallidas y recuperadas se registrarán aquí.</p>';
  return `<ol class="alchemy-history-list">${entries.map(entry => historyRow(entry, state)).join("")}</ol>`;
}

export function renderAlchemy({ state, selection = [], cardFace, order }) {
  const required = ALCHEMY.aberrationsPerEssence;
  const stock = Object.entries(state.inventory).flatMap(([id, owned]) => {
    const card = getCard(id, state);
    const count = owned - Number(state.pendingReveal?.cardId === id);
    return card?.category === "aberration" && count > 0 ? [{ card, count }] : [];
  });
  const total = stock.reduce((sum, item) => sum + item.count, 0);
  const picks = new Map(counted(selection).map(({ id, count }) => [id, count]));
  const ready = selection.length === required;
  const preview = ready ? previewEssence(state, selection) : null;
  const essenceCount = Object.keys(state.essences ?? {}).length;
  const selected = Math.min(selection.length, required);
  return `<section id="alquimia" class="alchemy" aria-label="Taller de Alquimia">
    <div class="alchemy-layout">
      <section class="panel alchemy-stock" aria-labelledby="alchemy-stock-title">
        <div class="alchemy-panel-title"><h3 id="alchemy-stock-title">Aberraciones</h3><span class="count">${total} disponibles</span></div>
        ${total ? '<p>Selecciona las copias que quieras destilar.</p>' : ""}
        ${stock.length ? `<ul class="alchemy-ingredient-list">${sortCardEntries(stock,order,recentCards(state)).map(({ card, count }) => {
          const picked = picks.get(card.id) ?? 0;
          return aberrationRow(card, count, picked, selected < required && picked < count, state, cardFace);
        }).join("")}</ul>` : `<p class="alchemy-empty">Cuando una fusión falle, su aberración quedará disponible aquí.</p>`}
      </section>
      <section class="panel alchemy-workbench" aria-labelledby="alchemy-workbench-title">
        <div class="alchemy-workbench-header">
          ${essenceSymbol()}
          <div><h3 id="alchemy-workbench-title">Destilar esencia</h3><p>Reúne ${required} aberraciones y elige cuáles destilar.</p></div>
        </div>
        <div class="alchemy-progress">
          <label for="alchemy-progress" role="status">${selected} de ${required} seleccionadas</label>
          <progress id="alchemy-progress" value="${selected}" max="${required}"></progress>
        </div>
        ${preview && !preview.ok ? `<p class="alchemy-warning" role="status">${escape(preview.error)}</p>` : ""}
        <div class="alchemy-craft-actions">
          <button type="button" class="button button--primary alchemy-craft" data-action="alchemy-craft" ${preview?.ok && !state.pendingReveal ? "" : "disabled"}>Crear esencia quimérica</button>
          ${selected ? '<button type="button" class="button alchemy-clear" data-action="alchemy-clear">Limpiar selección</button>' : ""}
        </div>
      </section>
      <section class="panel alchemy-essences" aria-labelledby="alchemy-essences-title">
        <div class="alchemy-panel-title"><h3 id="alchemy-essences-title">Esencias disponibles</h3><span class="count">${essenceCount}</span></div>
        <p>Invoca una fusión garantizada por 0 óbolos con dos progenitores al azar.</p>
        ${renderEssences({ state })}
      </section>
    </div>
    <section class="panel alchemy-history" aria-labelledby="alchemy-history-title">
      <h3 id="alchemy-history-title">Historial alquímico</h3>
      ${history(state)}
    </section>
  </section>`;
}
