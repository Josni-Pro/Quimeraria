import { sortCardEntries, DEFAULT_CARD_ORDER } from "./card-order.js";
import { getCreatureProfiles } from "./creature-profiles.js";
import { DAMAGE_FAMILIES, FATIGUE_LEVELS, HEALTH_RULES, SANCTUARY_AREAS, TREATMENTS, WOUNDS } from "./health-config.js";
import { healthSummary } from "./health.js";
import { availabilityLabel, conditionLabel, escapeHealth as esc, healthDetails } from "./health-ui.js";
import { getPortrait } from "./illustrations.js";
import { mountGameNavigation } from "./game-nav.js";
import { applyRecovery, assignSpecialist, quoteRecovery, recoveryInventory, specialistSkills, treatmentStaff } from "./recovery.js";
import { commitGame, presentationPreferences, readGame, SAVE_KEY } from "./save-store.js";
import { createBattleAudio } from "./training-audio.js";

const $ = id=>document.getElementById(id);
const number = new Intl.NumberFormat("es-MX");
const areas = Object.keys(SANCTUARY_AREAS);
const dialog = $("sanctuary-dialog");
const body = $("sanctuary-dialog-body");
const selected = new Set();
const pageSize = 12;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const audio = createBattleAudio(()=>{
  const prefs = presentationPreferences();
  return prefs.muted === false ? prefs.volume ?? 28 : 0;
});
const format = value=>number.format(value)+" óbolos";
const nameKey = name=>name.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase();
const images = { enfermeria:"Enfermería de piedra con plantas, frascos y camas de tratamiento",
  taller:"Banco de restauración con herramientas y blindajes", arcana:"Círculo arcano rodeado de cristales",
  descanso:"Patio verde con agua, bancos y refugios de piedra" };
let game = readGame();
let area;
let patients = [];
let byId = new Map();
let room;
let page = 0;
let draft;
let source;
let effectTimer;
let statusTimer;
let pending = false;

const nav = mountGameNavigation({section:"santuario",coins:game.coins,onSaved:latest=>{ game=latest; draw(); }});

function button(action,label,{id = "",style = "",disabled = false} = {}) {
  return `<button type="button" class="sanctuary-button ${style}" data-care="${action}" data-id="${esc(id)}" ${disabled ? "disabled" : ""}>${label}</button>`;
}

function notify(message) {
  clearTimeout(statusTimer);
  $("sanctuary-status").textContent = message;
  if (message) statusTimer = setTimeout(()=>{ $("sanctuary-status").textContent=""; },6000);
}

function roomKey() {
  const hash = location.hash.slice(1);
  return areas.includes(hash) ? hash : "enfermeria";
}

function drawRoom() {
  if (room===area) return;
  room = area;
  const info = SANCTUARY_AREAS[area];
  $("sanctuary").style.setProperty("--room-tone",info.tone);
  $("sanctuary-areas").innerHTML = areas.map(id=>{
    const entry = SANCTUARY_AREAS[id];
    return `<a href="#${id}" ${id===area ? 'aria-current="location"' : ""}><span aria-hidden="true">${entry.icon}</span><span>${entry.title}</span></a>`;
  }).join("");
  $("sanctuary-room").innerHTML = `<img src="./assets/santuario/${area}.webp" alt="${images[area]}" fetchpriority="high" width="1280" height="853">
    <div><p class="sanctuary-kicker">Santuario de recuperación</p><h1 id="sanctuary-title">${info.title}</h1><p>${info.note}</p>
    <a class="sanctuary-room-link" href="#patient-title" data-care="patients">Administrar ejemplares <span aria-hidden="true">↓</span></a></div>`;
}

function drawLedger() {
  const healthy = patients.filter(row=>!row.health.wound).length;
  const active = patients.filter(row=>row.status.available).length;
  const care = patients.filter(row=>row.status.needsCare).length;
  const summary = [["Disponibles en Arena",active],["Necesitan atención",care],["Sin heridas",healthy]];
  const fatigue = FATIGUE_LEVELS.map((level,i)=>[level.label,patients.filter(row=>row.health.fatigue>=level.min &&
    (i===FATIGUE_LEVELS.length-1 || row.health.fatigue<FATIGUE_LEVELS[i+1].min)).length]);
  const wounds = WOUNDS.slice(1).map((wound,i)=>[wound.label,patients.filter(row=>row.health.wound===i+1).length]);
  $("sanctuary-ledger").innerHTML = `<dl>${summary.map(([label,count])=>`<div><dd>${count}</dd><dt>${label}</dt></div>`).join("")}</dl>
    <div class="sanctuary-counts"><div aria-label="Fatiga">${fatigue.map(([label,count])=>`<span>${label} <b>${count}</b></span>`).join("")}</div>
    <div aria-label="Heridas">${wounds.map(([label,count])=>`<span>${label} <b>${count}</b></span>`).join("")}</div></div>`;
}

function visiblePatients() {
  const query = nameKey($("patient-search").value.trim());
  const condition = $("patient-condition").value;
  const generation = $("patient-generation").value;
  const order = $("patient-order").value;
  const statusFilters = { care:row=>row.status.needsCare,wound:row=>row.health.wound>0,tired:row=>row.health.fatigue>=25,
    ready:row=>row.status.available,blocked:row=>!row.status.available };
  const rows = patients.filter(row=>(!query || nameKey(row.card.name).includes(query)) &&
    (!generation || row.card.generation===Number(generation)) && (!condition || statusFilters[condition](row)));
  const ordered = sortCardEntries(rows,order==="generation" ? { by:"generation",direction:"desc" } : DEFAULT_CARD_ORDER);
  if (order==="fatigue" || order==="wound") ordered.sort((a,b)=>b.health[order]-a.health[order]);
  if (order==="available") ordered.sort((a,b)=>Number(b.status.available)-Number(a.status.available));
  return ordered;
}

function fitsArea(row) {
  return !row.occupied && (area==="descanso" ? row.health.fatigue>0 : row.health.wound>0 &&
    DAMAGE_FAMILIES[row.health.family]?.areas.includes(area));
}

function lastSquad() {
  return game.arena?.history?.find(item=>Array.isArray(item.health) && item.health.length)?.health.map(row=>row.copyId) ?? [];
}

function drawPatientActions() {
  const eligible = patients.filter(row=>row.status.needsCare && !row.occupied);
  const compatible = patients.some(fitsArea);
  const squad = lastSquad().some(id=>eligible.some(row=>row.id===id));
  $("patient-actions").innerHTML = `<div class="sanctuary-actions">
    ${button("free-all","Recuperar todos gratis",{style:"sanctuary-primary",disabled:!eligible.length})}
    ${button("selected","Tratar selección · "+selected.size,{disabled:!selected.size})}
    ${button("compatible",area==="descanso" ? "Descansar a todos" : "Tratar heridas compatibles",{disabled:!compatible})}
    ${button("squad","Recuperar última escuadra",{disabled:!squad})}
  </div>`;
}

function groupPatients(rows) {
  const assignments = new Set(Object.values(game.specialists ?? {}).flat());
  const groups = new Map();
  for (const row of rows) {
    const {fatigue,wound,family,reserve} = row.health;
    const state = JSON.stringify([row.card.id,fatigue,wound,family,reserve,row.occupied,assignments.has(row.id)]);
    const group = groups.get(state) ?? [];
    group.push(row);
    groups.set(state,group);
  }
  return [...groups.values()];
}

function patientRow(row) {
  const {card,status,health,id,index} = row;
  const art = getPortrait(card,game).src;
  return `<li class="patient-row" data-condition="${health.wound || (health.fatigue>=75 ? 2 : 0)}">
    <label class="patient-select"><input type="checkbox" data-patient="${esc(id)}" aria-label="Seleccionar ${esc(card.name)} ejemplar ${index}" ${selected.has(id) ? "checked" : ""} ${row.occupied ? "disabled" : ""}></label>
    ${art ? `<img src="${esc(art)}" alt="" width="54" height="54" loading="lazy" decoding="async">` : '<span class="patient-sigil" aria-hidden="true">✧</span>'}
    <div><strong>${esc(card.name)}</strong><small>G${card.generation} · Ejemplar ${index}</small>
    <span><meter aria-label="Fatiga" min="0" max="100" low="25" high="75" optimum="0" value="${health.fatigue}"></meter> ${health.fatigue}/100 · ${status.fatigue}</span>
    <span class="patient-wound">${status.wound} · ${availabilityLabel(status,health)}</span></div>
    ${button("detail","Ficha",{id,style:"patient-detail"})}</li>`;
}

function drawPatientList() {
  const rows = visiblePatients();
  const groups = groupPatients(rows);
  const pages = Math.max(1,Math.ceil(groups.length/pageSize));
  page = Math.max(0,Math.min(page,pages-1));
  $("patient-count").textContent = `${rows.length} de ${patients.length}`;
  $("patient-list").innerHTML = groups.slice(page*pageSize,(page+1)*pageSize).map(group=>{
    const row = group[0];
    if (group.length===1) return patientRow(row);
    return `<li class="patient-group"><details><summary><strong>${esc(row.card.name)} · ${group.length} ejemplares</strong>
      <small>${conditionLabel(row.health,row.status)} · ${availabilityLabel(row.status,row.health)}</small></summary>
      <ul class="patient-list">${group.map(patientRow).join("")}</ul></details></li>`;
  }).join("") || "<li class='sanctuary-empty'>No hay ejemplares que coincidan con los filtros.</li>";
  $("patient-pages").innerHTML = pages>1 ? `${button("page","Anterior",{id:"-1",disabled:!page})}
      <span>${page+1} / ${pages}</span>${button("page","Siguiente",{id:"1",disabled:page+1>=pages})}` : "";
}

function drawSpecialists() {
  const staff = treatmentStaff(game,area,patients);
  const assigned = new Set(Object.values(game.specialists ?? {}).flat());
  const candidates = patients.flatMap(row=>{
    if (assigned.has(row.id) || !row.status.available || row.health.fatigue>=75) return [];
    const skill = specialistSkills(row.card).find(item=>item.area===area);
    return skill ? [{...row,skill}] : [];
  });
  const full = staff.length>=HEALTH_RULES.specialistsPerArea;
  $("sanctuary-specialists").innerHTML = `<div class="sanctuary-head"><h2 id="specialist-title">Especialistas</h2>
    <span>${staff.length} / ${HEALTH_RULES.specialistsPerArea}</span></div>
    <p>El oficio y las capacidades determinan cómo puede ayudar cada ejemplar.</p>
    <ul class="specialist-list">${staff.map(row=>`<li><div><strong>${esc(row.card.name)} · Ejemplar ${row.index}</strong>
      <small>${row.skill.name} · ${row.working ? "En servicio" : "Pausa por estado o combate"}</small></div>
      ${button("remove-staff","Retirar",{id:row.id})}</li>`).join("")}</ul>
    <form id="specialist-form">
      ${full ? `<label>Plaza a sustituir <select name="replacement">${staff.map(row=>`<option value="${esc(row.id)}">${esc(row.card.name)} · Ej. ${row.index}</option>`).join("")}</select></label>` : ""}
      <label>Ejemplar compatible <select name="specialist" required ${candidates.length ? "" : "disabled"}><option value="">${candidates.length ? "Selecciona un ejemplar" : "Sin candidatos disponibles"}</option>
        ${candidates.map(row=>`<option value="${esc(row.id)}">${esc(row.card.name)} · Ej. ${row.index} · ${row.skill.name} ${row.skill.score}/3</option>`).join("")}</select></label>
      <button class="sanctuary-button" ${candidates.length ? "" : "disabled"}>${full ? "Sustituir especialista" : "Asignar especialista"}</button>
    </form>`;
}

function draw() {
  area = roomKey();
  patients = recoveryInventory(game);
  byId = new Map(patients.map(row=>[row.id,row]));
  for (const id of selected) if (!byId.has(id) || byId.get(id).occupied) selected.delete(id);
  nav.update("santuario",game.coins);
  drawRoom();
  drawLedger();
  drawPatientActions();
  drawPatientList();
  drawSpecialists();
}

function openDialog(title,content) {
  body.innerHTML = `<header class="sanctuary-dialog-head"><h2 id="sanctuary-dialog-title">${esc(title)}</h2>
    ${button("close","Cerrar",{style:"sanctuary-quiet"})}</header>${content}`;
  if (!dialog.open) dialog.showModal();
}

function openPatient(id) {
  const row = byId.get(id);
  if (!row) return;
  const {card,health,status,index} = row;
  openDialog(card.name,`<p>G${card.generation} · Ejemplar ${index}</p>
    ${healthDetails(health,status,getCreatureProfiles(card).combat.stats)}
    ${row.occupied ? "<p>Podrás tratar este ejemplar al cerrar su encuentro.</p>" : `<div class="sanctuary-actions">
      ${button("individual","Elegir tratamiento",{id,style:"sanctuary-primary",disabled:!status.needsCare})}</div>`}`);
}

function showQuote(ids,type = "free") {
  if (!ids.length) { notify("Selecciona al menos un ejemplar."); return; }
  draft = { ids,area,type };
  const options = area==="descanso" ? ["free","rest"] : ["free","focus","restore"];
  const quote = quoteRecovery(game,ids,draft);
  const controls = `<label>Tratamiento <select id="sanctuary-treatment-type">${options.map(key=>
    `<option value="${key}" ${type===key ? "selected" : ""}>${TREATMENTS[key].name}</option>`).join("")}</select></label>
    <p>${TREATMENTS[type].description}${type==="free" ? "" : " Incluye una reserva para la próxima participación en Arena."}</p>`;
  if (!quote.ok) {
    openDialog("Revisar tratamiento",controls+`<p role="status">${esc(quote.error)}</p>`);
    return;
  }
  draft.expected = {revision:quote.revision,price:quote.price,count:quote.rows.length,balance:game.coins};
  const rows = quote.rows.map(row=>`<li><strong>${esc(row.name)} · Ejemplar ${byId.get(row.id).index}</strong>
    <span>${conditionLabel(row.before)} → ${conditionLabel(row.after)}${row.after.reserve && type!=="free" ? " · Reserva "+row.after.reserve : ""}</span>
    <small>${format(row.cost)}${row.cost<row.fullPrice ? " · Antes "+format(row.fullPrice) : ""}</small></li>`).join("");
  openDialog("Revisar tratamiento",controls+`<div class="sanctuary-quote">
    <dl><div><dt>Ejemplares</dt><dd>${quote.rows.length}</dd></div><div><dt>Total</dt><dd>${format(quote.price)}</dd></div>
      <div><dt>Descuento</dt><dd>${Math.round(quote.discount*100)} % · ${format(quote.saving)}</dd></div>
      <div><dt>Saldo restante</dt><dd>${quote.affordable ? format(quote.remaining) : "Saldo insuficiente"}</dd></div></dl>
    ${quote.staff.length && type!=="free" ? `<p>Asisten ${quote.staff.map(row=>esc(row.card.name)).join(" y ")}.</p>` : ""}
    ${quote.skipped ? `<p>${quote.skipped} ejemplares excluidos por salud, compatibilidad o combate.</p>` : ""}
    <details ${quote.rows.length<=5 ? "open" : ""}><summary>Estado antes y después · ${quote.rows.length} ejemplares</summary><ul>${rows}</ul></details>
    ${button("confirm","Confirmar tratamiento",{style:"sanctuary-primary",disabled:!quote.affordable})}</div>`);
}

function stopEffect() {
  const effect = $("sanctuary-effect");
  clearTimeout(effectTimer);
  effect.hidden = true;
  effect.replaceChildren();
}

function playEffect(type,count) {
  stopEffect();
  const prefs = presentationPreferences();
  if (prefs.muted===false) audio.play(({enfermeria:"heal",taller:"shield",arcana:"magic",descanso:"heal"})[type] ?? "heal");
  if (reduce.matches || ["off","skip"].includes(game.settings.animation) || prefs.quality==="minimal") return;
  const effect = $("sanctuary-effect");
  effect.dataset.room = type;
  effect.dataset.quality = game.settings.animation==="reduced" || prefs.quality!=="full" ? "low" : "high";
  effect.style.setProperty("--room-tone",SANCTUARY_AREAS[type].tone);
  effect.innerHTML = `<div class="sanctuary-aura" aria-hidden="true"><i></i><i></i><i></i><i></i><span>${SANCTUARY_AREAS[type].icon}</span></div>
    <strong>${count===1 ? "Ejemplar atendido" : count+" ejemplares atendidos"}</strong>
    ${button("skip","Omitir efecto",{style:"sanctuary-quiet"})}`;
  effect.hidden = false;
  effectTimer = setTimeout(stopEffect,2000);
}

async function treat(buttonElement) {
  if (!draft?.expected || pending) return;
  pending = true;
  buttonElement.disabled = true;
  audio.unlock();
  const request = draft;
  const result = await commitGame(current=>applyRecovery(current,request.ids,request,request.expected));
  pending = false;
  if (!result.ok) {
    game = readGame();
    draw();
    showQuote(request.ids,request.type);
    body.querySelector(".sanctuary-dialog-head").insertAdjacentHTML("afterend",`<p class="sanctuary-error" role="status">${esc(result.error)}</p>`);
    return;
  }
  game = result.state;
  for (const row of result.quote.rows) selected.delete(row.id);
  dialog.close();
  draw();
  const count = result.quote.rows.length;
  notify(`${count} ${count===1 ? "ejemplar atendido" : "ejemplares atendidos"} · ${format(result.quote.price)}.`);
  playEffect(request.area,count);
}

function drawFromUrl() {
  const id = new URLSearchParams(location.search).get("copy");
  if (id && byId.has(id)) openPatient(id);
}

document.addEventListener("click",event=>{
  const target = event.target.closest("[data-care]");
  if (!target || target.disabled) return;
  const {care,id} = target.dataset;
  if (["free-all","selected","compatible","squad","detail"].includes(care)) source = target;
  switch (care) {
    case "patients":
      event.preventDefault();
      $("patient-title").scrollIntoView({block:"start"});
      break;
    case "detail": openPatient(id); break;
    case "individual": showQuote([id]); break;
    case "selected": showQuote([...selected]); break;
    case "free-all": showQuote(patients.filter(row=>row.status.needsCare && !row.occupied).map(row=>row.id)); break;
    case "squad": showQuote(lastSquad()); break;
    case "compatible": showQuote(patients.filter(fitsArea).map(row=>row.id),area==="descanso" ? "rest" : "focus"); break;
    case "confirm": void treat(target); break;
    case "close": dialog.close(); break;
    case "skip": stopEffect(); break;
    case "remove-staff": {
      const targetArea = area;
      target.disabled = true;
      void commitGame(current=>assignSpecialist(current,targetArea,id,true)).then(result=>{
        if (result.ok) game=result.state;
        draw();
        notify(result.ok ? "Especialista retirado. Su ejemplar sigue disponible en la colección." : result.error);
      });
      break;
    }
    case "page":
      page += Number(id);
      drawPatientList();
      $("patient-title").scrollIntoView({block:"start"});
      break;
  }
});

document.addEventListener("change",event=>{
  const field = event.target;
  if (field.dataset.patient) {
    if (field.checked) selected.add(field.dataset.patient);
    else selected.delete(field.dataset.patient);
    drawPatientActions();
  }
  if (field.id==="sanctuary-treatment-type") {
    showQuote(draft.ids,field.value);
    $("sanctuary-treatment-type").focus({preventScroll:true});
  }
  if (["patient-condition","patient-generation","patient-order"].includes(field.id)) {
    page=0;
    drawPatientList();
  }
});
$("patient-search").addEventListener("input",()=>{ page=0; drawPatientList(); });
document.addEventListener("submit",async event=>{
  if (event.target.id!=="specialist-form") return;
  event.preventDefault();
  const data = new FormData(event.target);
  const targetArea = area;
  const chosen = data.get("specialist");
  const replacement = data.get("replacement");
  if (!chosen) return;
  event.submitter.disabled = true;
  const result = await commitGame(current=>{
    if (!replacement) return assignSpecialist(current,targetArea,chosen);
    const removed = assignSpecialist(current,targetArea,replacement,true);
    return removed.ok ? assignSpecialist(removed.state,targetArea,chosen) : removed;
  });
  if (result.ok) game=result.state;
  draw();
  notify(result.ok ? "Especialista asignado." : result.error);
});
dialog.addEventListener("close",()=>{
  draft = null;
  if (source?.isConnected) source.focus({preventScroll:true});
});
window.addEventListener("hashchange",()=>{ page=0; draw(); });
window.addEventListener("storage",event=>{ if (event.key===SAVE_KEY) { game=readGame(); draw(); } });
window.addEventListener("pageshow",event=>{ if (event.persisted) { game=readGame(); draw(); } });
reduce.addEventListener("change",()=>{ if (reduce.matches) stopEffect(); });
draw();
drawFromUrl();
