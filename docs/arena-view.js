import { ARCHETYPES, ARENA_DIFFICULTY, ARENA_RANKS, ranking } from "./arena-config.js";
import { arenaEnemy, arenaOffers, rewardQuote } from "./arena.js";
import { arenaProgress } from "./arena-records.js";
import { packDefinition } from "./pack-config.js";
import { budgetUsed } from "./combat/engine.js";
import { COMBAT_ROLES } from "./creature-profiles.js";
import { escape } from "./training-view.js";

const glyphs = {
  shield:"M18 10 28 6 38 10v12l-10 9-10-9z M28 10v15", fang:"M15 9l11 6 2 13 8-10 1-9 M19 16l4 7",
  star:"M28 4v27M14 18h28M19 9l18 18M37 9 19 27", horn:"M15 21q7 11 13-4 6 15 13 4M15 21l2-11m24 11-2-11",
  sun:"M28 3v8m0 14v7M13 18h8m14 0h8M28 11a7 7 0 1 0 .01 0Z M18 8l4 4m12 12 4 4",
  hammer:"M15 10h20v8H15z M25 18v12m6-12v12", swarm:"M16 12h5v5h-5zm19 0h5v5h-5zm-13 9h5v5h-5zm9 0h5v5h-5zm-6-15h5v5h-5z",
  peak:"M14 28 24 12l5 7 5-10 9 19H14zm9-6 2-3 2 3", hook:"M16 9h15q13 1 5 13l-8 6v-10m0 10-9-6",
  knot:"M16 19c0-16 24-16 24 0s-24 16-24 0Zm8-9 9 18M32 9l-9 19"
};
const rankGlyphs = ["shield","hammer","fang","sun","star","peak","knot","horn"];
function symbol(shape,rank = null) {
  const crest = rank !== null;
  return `<svg viewBox="0 0 56 48" aria-hidden="true" class="arena-emblem" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">
    <path d="${crest ? "M4 5 28 2l24 3v24L28 46 4 29Z" : "M8 4h40v31l-20 9L8 35Z"}" fill="currentColor" fill-opacity=".12"/>
    ${crest && rank>1 ? '<path d="M11 10v17l17 13 17-13V10" opacity=".55"/>' : ""}
    <path d="${glyphs[shape]}" transform="translate(0 4)"/>
    ${crest && rank>3 ? '<path d="M8 35 2 26l3-7m43 16 6-9-3-7M13 38 8 39m35-1 5 1"/>' : ""}
    ${crest && rank>5 ? '<path d="M18 6l2-5 8 5 8-5 2 5"/>' : ""}</svg>`;
}
const n = new Intl.NumberFormat("es-MX");
const difference = value => value>0 ? "+"+value : String(value);
const act = (key,label,id="",css="") =>
  `<button type="button" class="camp-btn ${css}" data-camp="${key}" data-id="${escape(id)}">${label}</button>`;

function offersSection(offers,portrait) {
  return offers.map(offer=>{
    const enemy = arenaEnemy(offer);
    const budget = budgetUsed(enemy);
    const quote = rewardQuote(offer,budget,budget);
    const archetype = ARCHETYPES[offer.family];
    const title = offer.kind === "ranked" ? ARENA_DIFFICULTY[offer.difficulty].label : offer.completed ? "Primer triunfo registrado" : offer.kind === "champion" ? "Campeón" : "Desafío";
    const prize = offer.pack && !offer.completed ? ` · ${escape(packDefinition(offer.pack).name)}${offer.bonus ? " y "+offer.bonus+" óbolos" : ""}` : "";
    return `<article class="arena-contract" data-terrain="${offer.terrain}">
      <header>${symbol(archetype.symbol)}<div><p>${title}</p><h3>${escape(offer.name)}</h3></div></header>
      <p>${escape(offer.description)} ${offer.kind !== "ranked" ? escape(archetype.style) : ""}</p>
      ${offer.locked ? `<div class="arena-locked">Se desbloquea al alcanzar ${n.format(offer.threshold)} puntos</div>` : `
      <div class="arena-opponent-faces">${enemy.filter(Boolean).map(({profile})=>
        `<img src="${escape(portrait(profile.cardId,"enemy"))}" alt="" title="${escape(profile.name)}" loading="lazy">`).join("")}</div>
      <p class="arena-contract-budget">${offer.kind === "ranked" ? "" : escape(archetype.name)+" · "}${budget} pts · ${enemy.filter(Boolean).length} criaturas
      ${offer.kind==="challenge" ? " · tu límite "+offer.budget+" pts" : ""}</p>
      <details><summary>Formación y capacidades</summary><ul>${enemy.filter(Boolean).map(entry=>entry.profile).map(profile=>`
        <li>${escape(profile.name)} · ${escape(COMBAT_ROLES[profile.role].name)} · G${profile.generation}
        ${act("arena-foe","Ficha",profile.cardId)}</li>`).join("")}</ul></details>
      <p class="arena-contract-award">+${quote.gain} / −${quote.loss} rango · ${quote.coins} óbolos${prize}</p>
      ${act("arena-pick","Preparar escuadra",offer.id,offer.kind==="ranked" ? "gold" : "")}`}
    </article>`;
  }).join("");
}

export function arenaLobby(game,portrait,message = "") {
  const ledger = arenaProgress(game);
  const index = ranking(ledger.points);
  const [rank,min,color] = ARENA_RANKS[index];
  const next = ARENA_RANKS[index+1];
  const offers = arenaOffers(game);
  const max = next ? next[1] : min+1;
  return `<section class="arena-hero" data-terrain="bronce">
    <div><p class="eyebrow">Quimeraria · Progresión personal</p><h1>Arena</h1><p>Combate contra escuadras de la ciudad y gana puntos de rango.</p>
      ${ledger.active ? act("arena-resume","Reanudar encuentro","","gold") : ""}</div>
    <div class="arena-rank" style="--crest:${color}">${symbol(rankGlyphs[index],index)}
      <strong>${escape(rank)}</strong><span>${n.format(ledger.points)} puntos</span>
      ${next ? `<progress value="${ledger.points-min}" max="${max-min}" aria-label="Progreso hacia ${next[0]}"></progress>
        <small>${n.format(max-ledger.points)} para ${next[0]}</small>` : ""}</div>
  </section>
  ${message ? `<p class="arena-notice" role="status">${escape(message)}</p>` : ""}
  <div class="arena-ledger">${[["Victorias",ledger.wins],["Derrotas",ledger.losses],["Empates",ledger.draws],
    ["Racha / mejor",ledger.streak+" / "+ledger.bestStreak],["Rango máximo",ARENA_RANKS[ranking(ledger.peak)][0]],
    ["Óbolos / sobres",ledger.rewards.coins+" / "+ledger.rewards.packs]].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join("")}</div>
  <section><div class="arena-section-head"><h2>Adversarios disponibles</h2><p>Los importes mostrados suponen el mismo presupuesto en ambos lados.</p></div><div class="arena-cards">${offersSection(offers.board,portrait)}</div></section>
  <section><div class="arena-section-head"><h2>Campeones</h2><p>${ledger.champions.length} de ${offers.champions.length} derrotados</p></div>
    <div class="arena-cards">${offersSection(offers.champions,portrait)}</div></section>
  <section><div class="arena-section-head"><h2>Desafíos</h2><p>${ledger.challenges.length} de ${offers.challenges.length} completados</p></div>
    <div class="arena-cards">${offersSection(offers.challenges,portrait)}</div></section>
  <details class="arena-chronicle"><summary>Historial reciente y rangos</summary>
    <div class="arena-rank-list">${ARENA_RANKS.map(([name,threshold,hue,coins],i)=>`
       <div style="--crest:${hue}">${symbol(rankGlyphs[i],i)}<span>${name}</span><small>${n.format(threshold)} pts${coins ? " · +"+coins+" óbolos" : ""}</small></div>`).join("")}</div>
    ${ledger.history.length ? `<ul>${ledger.history.map(item=>`<li><strong>${escape(item.name)}</strong> ·
     ${({win:"Victoria",loss:"Derrota",withdraw:"Abandono",draw:"Empate"})[item.outcome]} · ${difference(item.delta)} pts · ${item.coins} óbolos
     ${item.packs.map(id=>escape(packDefinition(id).name)).join(", ")}</li>`).join("")}</ul>` : "<p>Tu primer encuentro aparecerá aquí.</p>"}</details>`;
}

export function arenaReceipt(result,model) {
  if (!result) return "";
  return `<section class="arena-award ${model.quality === "minimal" || model.instant ? "" : "arena-celebrate"}" aria-label="Recompensa de arena">
    <div><small>Clasificación</small><strong>${difference(result.delta)} pts · ${ARENA_RANKS[ranking(result.points)][0]}</strong></div>
    <div><small>Recompensa</small><strong>${result.coins} óbolos</strong></div>
    ${result.ranks.map(id=>`<div class="arena-promotion" style="--crest:${ARENA_RANKS[id][2]}">${symbol(rankGlyphs[id],id)}
      <strong>Ascenso a ${ARENA_RANKS[id][0]}</strong></div>`).join("")}
    ${result.champion ? "<div><strong>Primer triunfo contra el campeón</strong></div>" : ""}
    ${result.challenge ? "<div><strong>Desafío completado</strong></div>" : ""}
    ${result.packs.map(id=>`<div><small>Sobre sellado</small><strong>${escape(packDefinition(id).name)}</strong>
      <a href="./index.html#sobres">Ver sobres</a></div>`).join("")}</section>`;
}
