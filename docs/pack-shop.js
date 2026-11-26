import { DEFAULT_CARD_ORDER, sortCardEntries } from "./card-order.js";
import { CATEGORIES, RARITIES } from "./catalog.js";
import { MAX_PACK_PURCHASE, PACK_DISCOUNTS, packArtwork, packDefinition, SHOP_PACKS, shopPack } from "./pack-config.js";
import { getShopPackOdds } from "./pack-rules.js";
import { packStockGroups, quotePackPurchase } from "./pack-transactions.js";

const number = new Intl.NumberFormat("es-MX");
const percentage = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 2 });
const escape = value => String(value ?? "").replace(/[&<>"']/g, letter =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[letter]);
const count = (value, singular, plural = singular + "s") => `${number.format(value)} ${value === 1 ? singular : plural}`;
const money = value => `${number.format(value)} óbolos`;
const spanMoney = value => `<span aria-hidden="true">◈</span> ${number.format(value)}`;
const button = (action, id, label, className = "", extras = "") =>
  `<button type="button" class="button ${className}" data-action="${action}" data-id="${escape(id)}" ${extras}>${label}</button>`;
const shopImage = (pack, attributes = "") =>
  `<img src="${packArtwork(pack)}" alt="" width="768" height="1152" decoding="async" ${attributes}>`;
const groupQuantity = [1, 5, 10];

export function renderCheckoutTotal(state, id, quantity) {
  const quote = quotePackPurchase(state,id,quantity);
  if (!quote.ok) return '<p class="shop-hint">Elige una cantidad entera de 1 a 10.</p>';
  return `<div class="shop-cart"><div><span>${count(quote.cards,"carta")} · ${count(quote.quantity,"sobre")}</span>
      <strong>${spanMoney(quote.final)}</strong></div>
      ${button("pack-review",id,quote.affordable ? "Revisar compra" : "Saldo insuficiente","button--primary",
        !quote.affordable ? "disabled" : "")}</div>`;
}

function stockShelf(state, ui) {
  const batches = packStockGroups(state);
  if (!batches.length && !state.pendingPack) return "";
  const stock = batches.reduce((n,batch) => n + batch.length,0);
  const types = [...new Set(batches.map(batch=>batch[0].packId))];
  const page = Math.min(ui.stockPage ?? 0,Math.max(0,Math.ceil(batches.length/12)-1));
  return `<section class="shop-vault" aria-labelledby="shop-vault-title" id="pack-vault">
    <div class="shop-heading"><div><h2 id="shop-vault-title">Sobres sellados</h2><p>Ábrelos cuando quieras.</p></div><strong>${count(stock,"sobre")}</strong></div>
    ${state.pendingPack ? `<div class="shop-pending"><span>Apertura pendiente</span>${button("pack-resume","","Reanudar","button--primary")}</div>` : ""}
    ${stock ? `<div class="stock-actions stock-mass">
      ${button("pack-mass","*","Abrir todos los sobres","button--primary",state.pendingPack ? "disabled" : "")}
      <details><summary>Abrir todos los de un tipo</summary><div class="stock-actions">${types.map(id =>
        button("pack-mass",id,escape(packDefinition(id).name),"",state.pendingPack ? "disabled" : "")).join("")}</div></details></div>` : ""}
    <div class="shop-stock">${batches.slice(page*12,page*12+12).map(batch => {
      const pack = packDefinition(batch[0].packId);
      const { batchId } = batch[0];
      return `<article class="stock-row ${batchId === ui.batch ? "stock-highlight" : ""}" style="--pack-tone:${pack.color ?? "#bfa979"}">
        ${shopImage(pack,'loading="lazy"')}<div><h3>${escape(pack.name)}</h3><p>${count(batch.length,"sobre")} · ${count(batch.length * pack.slots,"carta")}${batch[0].rulesVersion===1 ? " · Edición anterior" : ""}</p></div>
        <div class="stock-actions">${button("pack-open-one",batchId,"Abrir uno","","")}${batch.length > 1 ? button("pack-open-batch",batchId,"Abrir todos","button--primary") : ""}</div>
      </article>`;
    }).join("")}</div>
    ${batches.length > 12 ? `<div class="stock-actions stock-pages">
      ${button("pack-stock-page",page-1,"Anterior","",""+(page===0 ? "disabled" : ""))}
      <span>${page+1} / ${Math.ceil(batches.length/12)}</span>
      ${button("pack-stock-page",page+1,"Siguiente","",""+((page+1)*12>=batches.length ? "disabled" : ""))}
    </div>` : ""}</section>`;
}

export function renderPackShop(state, ui) {
  const pack = shopPack(ui.id) ?? SHOP_PACKS[0];
  return `<section class="shop-hero">
    <div><p class="shop-kicker">Quimeraria · Mercado del Umbral</p><h1>Tienda de sobres</h1>
      <p>Encuentra progenitores para la Forja entre ocho colecciones.</p></div>
    <a class="shop-wallet" href="#expediciones"><span>Tu saldo</span><strong>${spanMoney(state.coins)}</strong><span>Ganar óbolos</span></a>
  </section>
  ${stockShelf(state,ui)}
  <div class="shop-grid">
    <section class="shop-catalog" id="pack-catalog" aria-labelledby="shop-catalog-title">
      <div class="shop-heading"><h2 id="shop-catalog-title">Elige un sobre</h2></div>
      <div class="shop-gallery">${SHOP_PACKS.map(item => `<button type="button" class="shop-tile ${item.id === pack.id ? "is-picked" : ""}"
        style="--pack-tone:${item.color}" aria-pressed="${item.id === pack.id}" data-action="pack-pick" data-id="${item.id}">
        <div class="shop-tile-art">${shopImage(item,'loading="lazy"')}</div>
        <strong>${escape(item.name)}</strong><span>${count(item.slots,"carta")} <span aria-hidden="true">·</span> ${spanMoney(item.cost)}</span></button>`).join("")}</div>
    </section>
    <section class="shop-counter" id="pack-checkout" aria-labelledby="pack-title" style="--pack-tone:${pack.color}">
      <div class="shop-counter-cover">${shopImage(pack)}
        <div><h2 id="pack-title">${escape(pack.name)}</h2><p>${escape(pack.description)}</p>
          ${button("pack-odds",pack.id,"Contenido y probabilidades","shop-link")}
          ${button("pack-catalog","","Cambiar sobre","shop-link shop-jump")}</div></div>
      <h3>Cantidad</h3>
      <div class="shop-quantities" role="group" aria-label="Paquetes de sobres">${groupQuantity.map(quantity => {
        const quote = quotePackPurchase(state,pack.id,quantity);
        return `<button type="button" class="shop-quantity" aria-pressed="${ui.quantity === quantity}" ${quote.affordable ? "" : "disabled"}
          data-action="pack-quantity" data-id="${quantity}">
          <span class="bundle-count">${quantity}</span><strong>${quantity === 1 ? "sobre" : "sobres"}</strong>
          <span>${count(quote.cards,"carta")}</span><span class="bundle-discount">${quote.discount ? "−" : ""}${quote.discount} %</span>
          <span class="bundle-original">Antes ${spanMoney(quote.original)}</span>
          <span class="bundle-price">${spanMoney(quote.final)}</span><small>Ahorras ${money(quote.saving)}</small></button>`;
      }).join("")}</div>
      <details class="shop-custom" ${ui.custom ? "open" : ""}><summary>Otra cantidad</summary>
        <label>De 1 a ${MAX_PACK_PURCHASE} sobres <input id="pack-custom-quantity" type="number" min="1" max="${MAX_PACK_PURCHASE}" step="1" inputmode="numeric" value="${ui.quantity}"></label>
      </details>
      <div id="pack-cart">${renderCheckoutTotal(state,pack.id,ui.quantity)}</div>
    </section>
  </div><p class="shop-foot"><a href="./pack-lab.html">Diagnóstico de sobres</a></p>`;
}

export function purchaseDetails(quote, sequence, balance) {
  const rows = [
    ["Cantidad", count(quote.quantity,"sobre")], ["Cartas base", number.format(quote.cards)],
    ["Precio sin descuento", money(quote.original)], ["Descuento aplicado", `${quote.discount} % · ${money(quote.saving)} de ahorro`],
    ["Precio final", money(quote.final)], ["Saldo restante", money(quote.remaining)]
  ];
  return `<dl class="shop-receipt">${rows.map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>
    <p>Los sobres se guardarán sellados.</p>
    <div class="modal-actions">${button("close","","Cancelar")}
      ${button("pack-confirm",quote.pack.id,"Confirmar compra","button--primary",
        `data-quantity="${quote.quantity}" data-sequence="${sequence}" data-balance="${balance}" ${quote.affordable ? "" : "disabled"}`)}</div>`;
}

export function openingDetails(quote) {
  return `<dl class="shop-receipt"><div><dt>Sobres almacenados</dt><dd>${number.format(quote.seals.length)}</dd></div>
    ${Object.entries(quote.counts).map(([id,n]) => `<div><dt>${escape(packDefinition(id).name)}</dt><dd>${n}</dd></div>`).join("")}
    <div><dt>Cartas base</dt><dd>${number.format(quote.cards)}</dd></div><div><dt>Cargo adicional</dt><dd>0 óbolos</dd></div></dl>
    <label class="open-mode">Revelación <select id="pack-open-mode"><option value="joint">Conjunta con resumen</option>
      <option value="individual">Sobre por sobre</option></select></label>
    <div class="modal-actions">${button("close","","Cancelar")}
      ${button("pack-mass-confirm","","Confirmar apertura","button--primary")}</div>`;
}

export function oddsDetails(id) {
  const profile = getShopPackOdds(id);
  if (!profile) return "";
  const { pack, groups, rarities, cards } = profile;
  return `<div class="shop-odds"><p>${count(pack.slots,"carta")} G0 · ${money(pack.cost)}. Las posiciones son independientes y se mezclan al abrir.</p>
    ${groups.map(group => `<section class="shop-odds-group"><h3>${group.count} × ${escape(group.label)}</h3>
      <dl class="shop-rarity-list">${group.odds.map((value,index) => `<div><dt>${RARITIES[index].name}</dt><dd>${percentage.format(value)}</dd></div>`).join("")}</dl></section>`).join("")}
    <section class="shop-odds-group"><h3>Al menos una carta de cada rareza</h3><dl class="shop-rarity-list">
    ${rarities.map((value,i) => `<div><dt>${RARITIES[i].name}</dt><dd>${percentage.format(value)}</dd></div>`).join("")}</dl></section>
    <details><summary>Cartas posibles y probabilidad de ver al menos una (${cards.length})</summary>
      <dl class="shop-possible">${cards.map(({ card, chance }) => `<div><dt>${escape(card.name)}</dt><dd>${percentage.format(chance)}</dd></div>`).join("")}</dl></details></div>`;
}

function stageShell(pack, opening, ui, deck) {
  const cover = shopImage(pack);
  return `<section class="pack-stage" id="pack-stage" data-opening="${opening.id}" data-theme="${pack.theme ?? "explorador"}"
      data-motion="${ui.noMotion ? "off" : "on"}" data-phase="ready" style="--pack-tone:${pack.color ?? "#e2bc8a"}">
    <div class="pack-stage-head"><div><p class="shop-kicker">Mesa de apertura</p><h1>${escape(pack.name)}</h1></div>
      ${button("pack-defer","","Guardar y volver","shop-link")}</div>
    <div class="pack-playing-area">
      <div class="pack-wrapper" aria-hidden="true"><div class="pack-wrapper-halo"></div>
        <div class="pack-wrapper-bottom">${cover}</div><div class="pack-wrapper-top">${cover}</div><span class="pack-wrapper-seam"></span></div>
      <canvas class="pack-particles" aria-hidden="true"></canvas>
      <div class="pack-deck">${deck}</div>
    </div>
    <div class="pack-film-controls" aria-label="Animación">
      ${button("pack-speed","","Acelerar apertura","","aria-pressed="+Boolean(ui.fast))}
      ${button("pack-skip","","Omitir animación")}</div>
  </section>`;
}

export function renderPackOpening(state, ui, cardById, portrait) {
  const opening = state.pendingPack;
  const all = opening.packs.flatMap(pack => pack.cards);
  const pack = packDefinition(opening.packs[0].packId);
  const revealed = new Set(opening.revealed);
  if (all.length === revealed.size) return packResult(state,ui,cardById,portrait,all,pack);
  const index = Math.max(0,Math.min(ui.sheet,opening.packs.length-1));
  const current = opening.packs[index].cards;
  const cardToReveal = current.find(card => !revealed.has(card.id)) ?? all.find(card => !revealed.has(card.id));
  const markedPack = packDefinition(opening.packs[index].packId);
  const rare = ui.flip && all.find(entry => entry.id === ui.flip);
  const deck = `<p class="pack-progress">${escape(markedPack.name)} · ${revealed.size} de ${all.length} cartas reveladas</p>
    <div class="pack-fan" style="--card-count:${current.length}">${current.map((entry,i) => {
      if (!revealed.has(entry.id)) return `<button class="pack-back" type="button" style="--slot:${i}"
        aria-label="Revelar carta ${i+1}" data-action="pack-reveal" data-id="${entry.id}"><span aria-hidden="true">✧</span></button>`;
      const card = cardById(entry.cardId);
      return `<button class="pack-face ${ui.flip === entry.id ? "pack-flip" : ""}" type="button" style="--rarity:${RARITIES[card.rarity].color};--slot:${i}"
        data-rare="${card.rarity}" data-action="detail" data-id="${escape(card.id)}"><img src="${escape(portrait(card))}" alt="" width="768" height="768">
        <strong>${escape(card.name)}</strong><small>${RARITIES[card.rarity].name}</small><span class="pack-copy-label">${entry.isNew ? "Descubrimiento" : "Copia adicional"}</span></button>`;
    }).join("")}</div>
    ${rare && revealed.has(rare.id) ? `<p class="pack-sr-status" role="status">${escape(cardById(rare.cardId).name)} revelada.</p>` : ""}
    <div class="pack-deck-actions">
      ${opening.packs.length > 1 ? `<label>Sobre
        <input id="pack-sheet" type="number" min="1" max="${opening.packs.length}" value="${index+1}" inputmode="numeric"
          aria-label="Sobre que estás revelando"> de ${opening.packs.length}</label>
        ${button("pack-sheet-step",index+2,"Siguiente sobre","",index+1>=opening.packs.length ? "disabled" : "")}` : ""}
      ${button("pack-reveal",cardToReveal.id,"Revelar una")}${button("pack-reveal-all","","Revelar todas","button--primary")}</div>`;
  return stageShell(markedPack,opening,{ ...ui, noMotion: ui.skipped || ["skip", "off"].includes(state.settings.animation) },deck);
}

function packResult(state, ui, cardById, portrait, all, pack) {
  const opening = state.pendingPack;
  const grouped = new Map();
  const rarityCounts = RARITIES.map(() => 0);
  const families = new Map();
  for (const entry of all) {
    const card = cardById(entry.cardId);
    const group = grouped.get(card.id) ?? { card, quantity: 0, fresh: false };
    group.quantity++;
    group.fresh ||= entry.isNew;
    grouped.set(card.id,group);
    rarityCounts[card.rarity]++;
    families.set(card.category,(families.get(card.category) ?? 0)+1);
  }
  const discovered = all.filter(entry => entry.isNew).length;
  const highest = rarityCounts.findLastIndex(Boolean);
  const types = new Map();
  for (const receipt of opening.packs) types.set(receipt.packId,(types.get(receipt.packId) ?? 0)+1);
  const next = (state.packStock ?? []).find(seal => seal.batchId === opening.packs[0].batchId);
  const ordered = sortCardEntries([...grouped.values()].filter(({ card }) => ui.filter === "" || String(card.rarity) === ui.filter),DEFAULT_CARD_ORDER);
  const page = Math.min(ui.receiptPage ?? 0,Math.ceil(opening.packs.length/10)-1);
  return `<section class="pack-results" id="pack-results" style="--pack-tone:${pack.color ?? "#d7bc88"}">
      <div class="pack-result-head">${shopImage(pack)}<div><p class="shop-kicker">${types.size === 1 ? escape(pack.name) : "Apertura de varios tipos"}</p><h1>Cartas obtenidas</h1>
      <p>${count(opening.packs.length,"sobre abierto","sobres abiertos")} · ${count(all.length,"carta")}</p></div></div>
      ${types.size > 1 ? `<p class="pack-progress">${[...types].map(([id,n])=>escape(packDefinition(id).name)+" ×"+n).join(" · ")}</p>` : ""}
      <dl class="pack-summary"><div><dt>Cartas</dt><dd>${all.length}</dd></div><div><dt>Descubrimientos</dt><dd>${discovered}</dd></div>
        <div><dt>Copias adicionales</dt><dd>${all.length - discovered}</dd></div>
        <div><dt>Repetidas en esta apertura</dt><dd>${all.length - grouped.size}</dd></div></dl>
      <p class="pack-progress">Mayor rareza obtenida · ${RARITIES[highest].name}</p>
      <div class="pack-distribution"><section><h2>Rarezas</h2><dl class="shop-rarity-list">
        ${rarityCounts.map((value,i) => `<div><dt>${RARITIES[i].name}</dt><dd>${value}</dd></div>`).join("")}</dl></section>
      <section><h2>Familias del catálogo</h2><dl class="shop-rarity-list">${[...families].map(([category,quantity]) =>
          `<div><dt>${escape(CATEGORIES[category]?.name ?? category)}</dt><dd>${quantity}</dd></div>`).join("")}</dl></section></div>
      <div class="pack-result-controls"><label>Rareza <select id="pack-result-filter" aria-label="Filtrar resultados por rareza">
        <option value="">Todas</option>${RARITIES.map((rarity,i) => `<option value="${i}" ${ui.filter === String(i) ? "selected" : ""}>${rarity.name}</option>`).join("")}
      </select></label><div class="stock-actions">
        ${next ? button("pack-next",next.id,"Abrir siguiente","button--primary") : ""}
        ${button("pack-result-leave","sobres","Volver a la tienda")}
        ${button("pack-result-leave","coleccion","Ver inventario")}${button("pack-result-leave","forja","Ir a la Forja")}</div></div>
      <div class="pack-result-grid">${ordered.map(({ card, quantity, fresh }) =>
          `<button type="button" class="pack-result-card" data-action="detail" data-id="${escape(card.id)}" style="--rarity:${RARITIES[card.rarity].color}">
            <img src="${escape(portrait(card))}" alt="" width="768" height="768" loading="lazy">
            <span><strong>${escape(card.name)} ×${quantity}</strong><small>${RARITIES[card.rarity].name}${fresh ? " · Descubrimiento" : ""}</small></span></button>`).join("") ||
          '<p class="shop-hint">No obtuviste cartas de esta rareza.</p>'}</div>
      <details class="pack-receipts" ${ui.showReceipts ? "open" : ""}>
        <summary>Resultados por sobre (${opening.packs.length})</summary>
        ${ui.showReceipts ? `<div class="stock-actions stock-pages">${button("pack-receipt-page",page-1,"Anterior","",page===0 ? "disabled" : "")}
          <span>${page+1} / ${Math.ceil(opening.packs.length/10)}</span>
          ${button("pack-receipt-page",page+1,"Siguiente","",(page+1)*10>=opening.packs.length ? "disabled" : "")}</div>
          <ol start="${page*10+1}">${opening.packs.slice(page*10,page*10+10).map(seal => `<li>
          <strong>${escape(packDefinition(seal.packId).name)}</strong> · ${seal.cards.map(entry=>escape(cardById(entry.cardId).name)).join(", ")}</li>`).join("")}</ol>` : ""}
      </details>
    </section>`;
}
