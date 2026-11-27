import { setAnimationMode } from "./engine.js";
import { commitGame, presentationPreferences, PRESENTATION_KEY, readGame } from "./save-store.js";

export const GAME_SECTIONS = [
  ["forja","Forja","✦"], ["alquimia","Alquimia","⚗︎"], ["coleccion","Colección","▤"], ["sobres","Sobres","◈"],
  ["expediciones","Expediciones","⌖"], ["entrenamiento","Entrenamiento","✧","training.html"],
  ["arena","Arena","◇","arena.html"], ["santuario","Santuario","✚","sanctuary.html"]
];
const number = new Intl.NumberFormat("es-MX");

function openPreferences(onSaved) {
  const dialog = document.createElement("dialog");
  const preferences = presentationPreferences();
  dialog.className = "game-nav-dialog";
  dialog.setAttribute("aria-labelledby","game-nav-settings");
  dialog.innerHTML = `<form method="dialog">
    <h2 id="game-nav-settings">Configuración</h2>
    <label>Animaciones <select name="animation"><option value="full">Completas</option><option value="reduced">Reducidas</option><option value="skip">Omitir introducción</option><option value="off">Desactivadas</option></select></label>
    <label>Calidad de efectos <select name="quality"><option value="full">Completa</option><option value="reduced">Reducida</option><option value="minimal">Mínima</option></select></label>
    <label>Volumen <input type="range" name="volume" min="0" max="100" step="1"></label>
    <label><input type="checkbox" name="sound"> Activar sonido</label>
    <output role="status"></output>
    <div><button value="cancel">Cancelar</button><button value="apply">Guardar</button></div>
  </form>`;
  const form = dialog.querySelector("form");
  form.elements.animation.value = readGame().settings.animation;
  form.elements.quality.value = preferences.quality ?? "reduced";
  form.elements.volume.value = preferences.volume ?? 28;
  form.elements.sound.checked = preferences.muted === false;
  form.addEventListener("submit",async event=>{
    if (event.submitter?.value!=="apply") return;
    event.preventDefault();
    event.submitter.disabled = true;
    const update = await commitGame(game=>setAnimationMode(game,form.elements.animation.value));
    if (update.ok) {
      try {
        localStorage.setItem(PRESENTATION_KEY,JSON.stringify({ ...presentationPreferences(),
          quality:form.elements.quality.value,volume:Number(form.elements.volume.value),muted:!form.elements.sound.checked }));
      } catch { /* La preferencia de movimiento ya quedó guardada. */ }
      onSaved?.(update.state);
      dialog.close();
    } else {
      form.querySelector("output").textContent = update.error;
      event.submitter.disabled = false;
    }
  });
  dialog.addEventListener("close",()=>dialog.remove(),{ once:true });
  document.body.append(dialog);
  dialog.showModal();
}

export function mountGameNavigation({ section,coins,onSettings,onSaved,onWallet }) {
  const header = document.querySelector("#game-nav");
  const home = GAME_SECTIONS.some(([id,,,page])=>section===id && !page) ? "" : "./index.html";
  header.innerHTML = `<div class="game-nav-inner">
    <a class="game-nav-brand" href="${home}#forja" aria-label="Quimeraria, Forja"><span aria-hidden="true">✧</span> Quimeraria</a>
    <nav id="game-nav-links" aria-label="Secciones del juego">${GAME_SECTIONS.map(([id,label,icon,page])=>
      `<a data-section="${id}" href="${page ? "./"+page : home+"#"+id}"><span aria-hidden="true">${icon}</span> ${label}</a>`).join("")}</nav>
    <div class="game-nav-actions">
      ${onWallet ? '<button type="button" id="game-nav-wallet" aria-label="Óbolos y reglas"></button>' : '<span id="game-nav-wallet"></span>'}
      <button type="button" id="game-nav-settings-button" aria-label="Configuración" title="Configuración">⚙︎</button>
    </div>
    <button type="button" id="game-nav-toggle" aria-controls="game-nav-links" aria-expanded="false"><span id="game-nav-current"></span><span><b>Menú</b> <span aria-hidden="true">⌄</span></span></button>
  </div>`;
  const links = [...header.querySelectorAll("[data-section]")];
  const toggle = header.querySelector("#game-nav-toggle");
  const wallet = header.querySelector("#game-nav-wallet");
  const current = header.querySelector("#game-nav-current");
  function setOpen(open) {
    toggle.setAttribute("aria-expanded",String(open));
    header.toggleAttribute("data-open",open);
  }
  toggle.addEventListener("click",()=>setOpen(toggle.getAttribute("aria-expanded")!=="true"));
  header.querySelector("nav").addEventListener("click",event=>{
    if (event.target.closest("a")) setOpen(false);
  });
  header.addEventListener("keydown",event=>{
    if (event.key==="Escape" && header.hasAttribute("data-open")) { setOpen(false); toggle.focus(); }
  });
  header.querySelector("#game-nav-settings-button").addEventListener("click",onSettings ?? (()=>openPreferences(onSaved)));
  if (onWallet) wallet.addEventListener("click",onWallet);
  function update(id,balance) {
    for (const link of links) {
      if (link.dataset.section===id) link.setAttribute("aria-current","page");
      else link.removeAttribute("aria-current");
    }
    current.textContent = GAME_SECTIONS.find(([key])=>key===id)?.[1] ?? "Secciones";
    wallet.innerHTML = `<span aria-hidden="true">◈</span> <strong>${number.format(balance)}</strong> <small>óbolos</small>`;
  }
  update(section,coins);
  return { update };
}
