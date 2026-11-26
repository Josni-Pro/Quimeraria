import { CARDS, RARITIES } from "./catalog.js";
import { CARD_PACK_TAGS, PACK_TAGS, SHOP_PACKS } from "./pack-config.js";
import { simulatePacks } from "./pack-diagnostics.js";
import { getShopPackOdds } from "./pack-rules.js";
import { oddsDetails } from "./pack-shop.js";
import { quotePackPurchase } from "./pack-transactions.js";

const form = document.querySelector("#pack-lab-form");
const pick = form.elements.pack;
const results = document.querySelector("#lab-result");
const number = new Intl.NumberFormat("es-MX",{ maximumFractionDigits:2 });
const percent = new Intl.NumberFormat("es-MX",{ style:"percent", maximumFractionDigits:2 });
pick.innerHTML = SHOP_PACKS.map(pack => `<option value="${pack.id}">${pack.name}</option>`).join("");
document.querySelector("#lab-tags").innerHTML = CARDS.map(card =>
  `<div><dt>${card.name}</dt><dd>${CARD_PACK_TAGS[card.id].map(tag => PACK_TAGS[tag]).join(", ")}</dd></div>`).join("");

function show() {
  const selected = getShopPackOdds(pick.value);
  const quotes = [1,5,10].map(n => quotePackPurchase({ coins:0 },pick.value,n));
  document.querySelector("#lab-odds").innerHTML = oddsDetails(pick.value) + `<p>Coste efectivo por carta · ${quotes.map(quote => `
    ${quote.quantity} sobre${quote.quantity === 1 ? "" : "s"} · ${number.format(quote.final / quote.cards)} óbolos
  `).join(" / ")}</p><p>Media teórica por sobre · ${number.format(selected.expectedThematic)} cartas de familias temáticas ·
    ${number.format(selected.expectedDuplicates)} copias repetidas.</p>
    <details><summary>Coste esperado por rareza</summary><dl class="shop-rarity-list">
      ${selected.expectedRarities.map((mean,i)=>`<div><dt>${RARITIES[i].name}</dt><dd>${mean ?
        quotes.map(quote=>number.format(quote.final/quote.quantity/mean)).join(" / ")+" óbolos" : "Sin resultados"}</dd></div>`).join("")}</dl>
      <p>Compras de 1, 5 y 10 respectivamente. Se divide el precio efectivo por la cantidad esperada por sobre.</p></details><details><summary>Pesos configurados por posición</summary><ul>${selected.groups.map(group =>
    `<li>${group.count} × ${group.label} · ${group.weights.join(" / ")}</li>`).join("")}</ul></details>`;
  results.innerHTML = "";
}
pick.addEventListener("change",show);
form.addEventListener("submit",event => {
  event.preventDefault();
  const sample = simulatePacks(pick.value,form.elements.count.valueAsNumber,form.elements.seed.valueAsNumber);
  results.innerHTML = `<h2>Resultados · ${number.format(sample.iterations)} aperturas</h2>
    <p>Semilla ${sample.seed} · ${sample.violations} aperturas inválidas · ${number.format(sample.duplicates)} copias repetidas por sobre ·
    ${percent.format(sample.withDuplicates)} con al menos un duplicado.</p>
    <dl class="shop-rarity-list">${sample.rarities.map((result,i) =>
      `<div><dt>${RARITIES[i].name}</dt><dd>${percent.format(result.presence)} con alguna · ${number.format(result.copies)} por sobre</dd></div>`).join("")}</dl>
    <details><summary>Frecuencia observada por carta</summary><dl class="shop-possible">${CARDS.map(card =>
      `<div><dt>${card.name}</dt><dd>${percent.format(sample.cards[card.id].presence)}</dd></div>`).join("")}</dl></details>`;
});
show();
