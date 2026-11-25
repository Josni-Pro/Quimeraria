import { PORTRAIT_PROFILES } from "./portrait-profiles.js";

const portraitCache = new Map();
const CACHE_LIMIT = 48;
const isHex = value => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

const wings = (membranous = false) => membranous
  ? `<path d="M142 112Q162 46 211 33Q207 65 226 87Q200 82 183 113Q169 105 142 112Z" fill="url(#accent)"/>
    <path d="M146 109Q169 83 211 33M181 106Q188 80 204 55" fill="none" stroke="#21182d" opacity=".55"/>`
  : `<path d="M140 115Q151 55 231 41L207 64L222 59L201 81L212 76Q197 111 140 115Z" fill="url(#accent)"/>
    <path d="M153 108L218 49M160 107L202 74M168 107L192 91" fill="none" stroke="#faf0db" opacity=".45"/>`;

function quadruped(head) {
  const trunk = head === "elephant";
  const feline = ["wolf", "fox", "jackal", "sphinx"].includes(head);
  const armored = ["ceratops", "rhino"].includes(head);
  const face = trunk
    ? `<path d="M211 90q31 4 29 28l1 30q1 11 11 5l-2 9q-20 8-23-13l-4-30q-15 7-23-6z"/>
      <path d="M224 120q14 17 31 5q-5 19-27 9z" fill="#f8e3a8"/>
      <path d="M216 95q-21-13-23 6q-2 20 19 23" fill="url(#accent)"/>`
    : feline
      ? `<path d="M196 89l5-23 16 19 13-15 3 23 17 13-11 10-30-1-16 12z"/>
        <path d="M88 104Q57 115 37 84Q40 125 89 125" fill="url(#accent)"/>`
      : `<path d="M191 82q21-13 41 1l19 13-7 16-28 2-17 18z"/>`;
  return `<g fill="url(#body)">
    <path d="M75 105q-18 9-28-6 7 30 33 22z"/>
    <path d="M80 116h35l-9 55H90l1-25zM171 113h34l-1 57h-15l-4-33z" opacity=".6"/>
    <path d="M74 116q0-39 61-40l47 4q16-2 30 9l18 23-27 24-25 3-12 32h-18l7-41-33 5-26-2-11 37H66l8-34z"/>
    ${face}
    ${armored ? '<path d="M195 87q-9-28 21-29l8 21 26-10-13 25" fill="url(#accent)"/>' : ""}
    <path d="M91 102q43-21 87-8M96 113q34-13 61-11" fill="none" stroke="#f7e7de" opacity=".2"/>
    <circle cx="225" cy="101" r="3" fill="#fff4c8"/>
  </g>`;
}

const avian = membranous => `<g><g transform="translate(282) scale(-1 1)">${wings(membranous)}</g>${wings(membranous)}
  <path d="M104 128q8-26 40-28l14-20q11-14 30-3l14 13-18 13q-8 24-31 35l-35 25 6-19-29 10z" fill="url(#body)"/>
  <path d="M176 91l23-2 13 5-19 9z" fill="url(#accent)"/>
  <circle cx="181" cy="87" r="3" fill="#fff4c8"/></g>`;

const aquatic = (manyArms, visibleEye = true) => `<g><path d="${manyArms
  ? "M106 110Q74 134 55 122Q45 153 92 149L77 169Q98 185 121 146Q127 169 158 172L150 138Q175 159 201 142L174 116"
  : "M105 107Q78 101 55 79L62 109L48 137Q79 135 103 126L142 142L132 115"}" fill="url(#accent)"/>
  <path d="M77 116q40-37 81-37 45-4 80 18l14 16-12 19-41 2q-62 18-122-18z" fill="url(#body)"/>
  <path d="M133 85q8-33 42-37l-7 33M161 127l17 25 14-28" fill="url(#accent)"/>
  <path d="M186 95l-9 16M198 95l-9 16" fill="none" stroke="#f9eedd" opacity=".5"/>
  ${visibleEye ? '<circle cx="225" cy="104" r="3" fill="#fff4c8"/>' : ""}</g>`;

const humanoid = (head, kin = false) => `<g><path d="M128 111l30-5 18 26 1 40-15-1-12-35-20 34h-17z" fill="url(#body)"/>
  <path d="M119 78l15-9 27 4 16 16 30 5-3 13-48-8 8 30-41 2-14-19-23 9-9-10 29-28z" fill="url(#body)"/>
  <path d="M115 79l15 8 28-12 22 16-17 1-3 13-23 18-25-20z" fill="url(#accent)"/>
  <path d="M129 77q-10-19-4-29q8-17 29-17q22 7 20 27l-10 19z" fill="url(#body)"/>
  ${kin ? '<path d="M113 48q1-18 18-21h28q17 5 17 21l-12-5-7-5-15 7-14-4-2 16z" fill="url(#accent)"/><path d="M129 66l-4 9 8-4m20 1 8 3-2-9" fill="#f4dfb0"/><path d="M112 78q20 23 60-2l11 18-21 17-10-11-14 13-17-11-19-4z" fill="#c9b2aa"/>' : head === "elephant" ? '<path d="M129 47l-11-4-7 18 16 11M165 58l11 7 8 15 8-5-1 12q-19 6-26-11M159 68q21 3 27-11-1 25-23 21" fill="url(#accent)"/>' :
    '<path d="M125 48l-3-17 15 8 15-3 14-8 1 19M130 64l11 5 15-5" fill="url(#accent)"/>'}
  <path d="M132 53h5m10 0h5" stroke="#fff4c8" stroke-width="2" stroke-linecap="round"/>
  <path d="M209 85l12-35 4 1-7 68-6 11z" fill="#eae2cc"/>
  <path d="M216 42l7-10 7 10-7 12z" fill="url(#accent)"/></g>`;

const construct = `<g><path d="M116 114l-18 23 7 30 27 2 6-29 24-1 12 31 31-1-7-32-19-29zM102 67L76 83l-11 35 24 6 17-21 10-17zM181 65l29 14 12 35-24 10-11-23-18-17z" fill="url(#body)"/>
  <path d="M103 73l34-19 29 1 23 19-12 52-45 13-22-25z" fill="url(#body)"/>
  <path d="M131 53l-5-20 14-14 24 7 6 16-10 16z" fill="url(#body)"/>
  <path d="M139 41l16 1M136 75l-15 10 7 22M170 108l11-14" stroke="#e5d8cb" fill="none" opacity=".7"/>
  <path d="M150 73l19 15-7 23-20 3-11-20z" fill="url(#accent)"/>
  <path d="M150 79l7 9-8 17-7-11z" fill="#fff4c8"/></g>`;

const laboratory = `<g><path d="M88 84l17-17h85l18 19z" fill="#e6c39b"/>
  <path d="M111 71V36h12v15h22v20m14 0V43h24v22l14 5" fill="url(#accent)"/>
  <path d="M103 66q-2-9 7-13h17q8 3 6 13zM163 63V48h15v15z" fill="#f9efcf"/>
  <path d="M117 33q-11-5 0-11q14-5 5-11m48 32q11-7 4-15" fill="none" stroke="#f9efcf" opacity=".55" stroke-width="4" stroke-linecap="round"/>
  <path d="M97 80l10 37m85-37-11 36" fill="none" stroke="#c29260" stroke-width="4"/></g>`;

const artillery = `<g><path d="M107 86l18-25 43-10 21 28-12 10z" fill="#8c777e"/>
  <path d="M133 61l66-36 29 2 9 16-13 9-66 25z" fill="url(#accent)"/>
  <path d="M205 24l20-8 14 8 6 15-14 11-12-1z" fill="#e7c2a7"/>
  <path d="M234 25l7 6-5 7-7-3z" fill="#21192d"/><path d="M113 85l63-5-11 15-43 2z" fill="#d5ab87"/></g>`;

const settlement = `<g><path d="M79 85l90-13 48 10-22 16H92z" fill="#c9976f"/>
  <path d="M95 65l23-22 22 19v25H95zM141 56l22-23 23 16v29l-45 6zM177 65l22-18 21 14v20l-43 1z" fill="url(#accent)"/>
  <path d="M89 67l29-29 29 22m-11-2 28-29 28 21m-18 15 26-22 25 17" fill="none" stroke="#edd7aa" stroke-width="4"/>
  <path d="M111 66h10v12h-10zm49-13h9v13h-9zm36 10h9v11h-9z" fill="#ffdfa1"/>
  <path d="M152 87l-24 65m14-37 19 3m-24 10 19 4m-24 10 19 4m14-57-25 67" fill="none" stroke="#c9976f" stroke-width="2"/></g>`;

const crystals = `<g fill="url(#accent)"><path d="M106 109l-11-28 15-21 13 22-3 18zM120 91l6-30 18 6 4 22zM153 94l10-21 11-8 10 19-9 22zM192 106l10-27 17-9-4 27z"/>
  <path d="M101 79l8-13 6 17-8 11zm62-2 10-8 5 14-12 13z" fill="#faf0ed" opacity=".6"/></g>`;

const sigil = `<g fill="none" stroke="url(#accent)" opacity=".7"><circle cx="141" cy="85" r="53"/><circle cx="141" cy="85" r="62" stroke-dasharray="5 9"/>
  <path d="M141 12v20m0 106v20M68 85h20m106 0h20M89 33l14 14m76 76 14 14m0-104-14 14m-76 76-14 14" stroke-width="3"/></g>`;

const elemental = `<g><path d="M145 32q-2 23 20 41l-2-33q27 17 30 46l24-22q3 28-12 43-17 17-38 16 18 16 44 13-40 30-81 14-24-9-42-29-10-10-24-12 15-16 32-8-13-28 11-46 0 15 9 25 10-10 7-29z" fill="url(#accent)"/>
 <path d="M98 120q28-1 41-33 5 20 21 21l24-7-12 18 20 26-35 1-17-19-16 16z" fill="url(#body)"/>
 <path d="M148 105l12 9-13 11-12-10z" fill="#fff4c8"/></g>`;

const growth = `<g fill="url(#accent)"><path d="M106 111q-34-13-32-48 13 4 23 23-15-45 9-67 8 30-2 59 13-22 35-20-9 33-33 53z"/>
  <path d="M163 101q-16-28 5-44 10 13 7 27 8-20 27-20-8 28-39 37z"/></g>`;

const foxTails = `<path d="M96 121Q47 113 27 68Q48 78 73 83Q88 87 96 108
  M100 119Q72 82 83 49Q90 73 111 95
  M102 119Q46 135 27 113Q58 123 92 102" fill="none" stroke="url(#accent)" stroke-linecap="round" stroke-width="7" opacity=".85"/>`;

const direWolf = `<g><path d="M72 119q-29 11-44-18 0 28 45 34zM88 117l31 9-12 46H93l2-33zM175 115l31-6 5 62h-16l-10-33z" fill="url(#body)" opacity=".65"/>
  <path d="M68 119q4-34 40-39l25 2 31-21 35 7 21-5 7 17 22 11 10 13-11 25-31 2-17-9-18 20-31 9-23-3-18-23-7 44H87l14-43-18 13z" fill="url(#body)"/>
  <path d="M163 66l-15 6 18 5-20 16 28-7 8 18 12-16 15-1-10-22z" fill="url(#accent)"/>
  <path d="M218 108l11 5 17-3-4 12-15 2z" fill="#372033"/>
  <path d="M225 114l4 11 6-12zM241 112l3 7 4-8z" fill="#fff4c8"/>
  <circle cx="224" cy="92" r="3" fill="#fff4c8"/></g>`;

const secondHound = `<g transform="translate(-22 20)"><path d="M182 92l-8-29-10 18-13-6-15 19-20 3 6 13 31 5 18 33 23-18z" fill="url(#accent)"/>
  <path d="M125 98l-5-2 1 5 5 2z" fill="#201a2b"/><circle cx="153" cy="91" r="3" fill="#fff4c8"/></g>`;

const stoneMammoth = `<g><path d="M72 113l-10-16 23-29 41-12 54 6 36 16 18 9 14 28 2 33-7 12-12-5-5-37-17-3-15 15-14 43h-29l3-32-37-2-17 34H73l13-49z" fill="url(#body)"/>
  <path d="M82 101l44-38 38 7 11 40-29 23-58-9zM185 81l21-2 13 17-7 24-19 8-17-14z" fill="url(#accent)"/>
  <path d="M119 80l16 16-10 25-24-13 4-17z" fill="#fff4c8"/>
  <path d="M219 115q23 15 38-2-6 32-32 14z" fill="#faf0c9"/>
  <path d="M94 129l19 14m37-4 25-29m29 21-19 10m21-54-19 22" fill="none" stroke="#2d2239" stroke-width="3"/></g>`;

const wetMantle = `<g><path d="M104 98q25-11 56-1l18 14-19 12-32-2-18-10z" fill="#2c777f" opacity=".85"/>
  <path d="M110 104q26 12 59 2m-49 9q19 8 38 1" fill="none" stroke="#9dd9cc" stroke-width="3"/>
  <path d="M130 109h1m12 2h1m12-2h1" stroke="#eed4c5" stroke-width="3" stroke-linecap="round"/></g>`;

const riverFox = `${quadruped("fox")}
  <path d="M187 103q-23-12-27-29m28 32q-19-4-30-16m32 22q-17 1-26-7M78 114q-29 8-44-16 0 26 44 25"
    stroke="url(#accent)" stroke-width="6" fill="none" stroke-linecap="round"/>`;
const reefOctopus = `${aquatic(true, false)}
  <path d="M167 105q-8-19 0-35 9-23 28-14l10 17-13 10 13 15-12 18z" fill="url(#body)"/>
  <path d="M181 72h5m8 0h4m-20 25q-17 13-39 14m35-3q-21 18-43 16" stroke="#d8f2de" stroke-width="2" fill="none"/>`;
const rescueHarness = `<g><path d="M111 122L77 163m85-41 25 41" stroke="#f4d396" stroke-width="3"/>
  <path d="M72 162h118l-13 14h-92z" fill="#b89164"/>
  <path d="M126 138h16m-8-8v16" stroke="#f6e7c9" stroke-width="4"/></g>`;

const wyvern = `<g>${wings(true)}
  <g transform="translate(270 -8) scale(-1 .9)">${wings(true)}</g>
  <path d="M61 133q40 5 61-28l43-13 17-28 25-9 17 15-12 15-19 4-11 29-27 14-4 28h-14l3-29-20 7-15 25H94l12-26q-29 16-59 5z" fill="url(#body)"/>
  <circle cx="207" cy="71" r="3" fill="#fff4c8"/></g>`;
const windLoom = `<g>
  <path d="M45 132Q72 79 106 116T171 117Q200 108 200 78l12-16 16 8-16 20q-4 44-40 45-24 13-64-4t-63 1z" fill="url(#body)"/>
  <path d="M187 108q-21-21 9-41l-4 19 23-10-10 20 10 8-19 13z" fill="url(#accent)"/>
  <path d="M46 60q67-22 115 13 27 15 55 11M35 75q67-21 111 14 40 24 82 1"
    stroke="#ead5ad" fill="none" stroke-width="2" opacity=".74"/></g>`;
const citadel = `<g><path d="M69 82h140v51H69zM79 130h25l-9 44H75zm49 0h27v47h-29zm49 0h23l13 44h-23z" fill="url(#body)"/>
  <path d="M66 88q73-102 148 0q-70 38-148 0z" fill="url(#accent)" stroke="#e6cd95" stroke-width="3"/>
  <path d="M142 6l-12 24 16 1-13 32" fill="none" stroke="#d2e6fa" stroke-width="5"/>
  <path d="M132 111h17v27h-17z" fill="#fff4c8"/></g>`;

// Siluetas del lote conceptual 03. Se usan como respaldo procedural.
const horizonLions = `<g>
  <path d="M68 112l-24-11 5-21 24-10 7 19 28 11h64l28-11 7-19 24 10 5 21-24 11-13 15-5 30h-15v-30H101v30H86l-5-30z" fill="url(#body)"/>
  <path d="M68 75l16 15 16 21-30 8-16-20zm144 0-16 15-16 21 30 8 16-20z" fill="url(#accent)"/>
  <circle cx="140" cy="68" r="25" fill="#ffe5a0"/>
  <path d="M91 166h100" stroke="#ceac83" stroke-width="5"/></g>`;
const seaCoil = `<g>
  <path d="M208 94q-25-42-99-28-66 12-68 47-3 38 77 45 85 7 115-35 9-15-9-38" fill="none" stroke="url(#body)" stroke-width="20" stroke-linecap="round"/>
  <path d="M212 92l-19-7 15-15 23-6 12 17-18 13zm-99 39-12-15 15-18 22-4 26 21-15 13z" fill="url(#accent)"/>
  <path d="M187 33l-12 13 13 1-12 17m25 88 18-8m-165 8 22 10" stroke="#d6f4fc" stroke-width="3" fill="none"/>
  <circle cx="225" cy="77" r="3" fill="#fff4c8"/></g>`;
const walkingArchive = `<g>
  <path d="M77 55h119l15 73H65zM75 126h24l-9 40H64zm44 0h20v40h-27zm44 0h18l9 40h-26zm28 0h20l13 40h-27z" fill="url(#body)"/>
  <path d="M85 65h103v48H85zM138 114l83 52h-41l-51-49z" fill="url(#accent)"/>
  <path d="M94 77h83m-83 12h83m-83 12h83m10 53 10 1m-31-12 11 1" stroke="#302234" stroke-width="4"/></g>`;
const civicTable = `<g>
  <path d="M71 94h133l24 23H57zm5 25h17l-9 42H68zm41 0h16l-5 34h-15zm40 0h17l4 36h-16zm33 0h18l9 42h-16z" fill="url(#body)"/>
  <path d="M89 105q-21-16-16-38m117 38q24-16 17-39" fill="none" stroke="url(#accent)" stroke-width="9" stroke-linecap="round"/>
  <path d="M61 63h23v13H61zm136-3h19v10h-19z" fill="#e2bf91"/></g>`;
const warboard = `<g>
  <path d="M100 45l16 14h48l16-14m-65 9 14 45m35-45-14 45" stroke="#fff0c9" fill="none" stroke-width="2"/>
  <path d="M101 101l37-21 44 21 14 24-46 16-52-17z" fill="url(#accent)" stroke="#f4d396" stroke-width="3"/>
  <path d="M114 113l17-14 8 10 13-6 23 10-16 7z" fill="#7c7360"/>
  <circle cx="122" cy="115" r="4" fill="#fff4c8"/><circle cx="165" cy="116" r="4" fill="#fff4c8"/></g>`;

function drawShape(shape, anatomy, head, speciesId, family, element) {
  const body = anatomy === "avian" ? avian(false)
    : ["aquatic", "cephalopod", "amphibian"].includes(anatomy) ? aquatic(anatomy === "cephalopod")
      : anatomy === "humanoid" ? humanoid(head) : quadruped(head);
  if (speciesId === "lobo_terrible") return direWolf;
  if (speciesId === "ortro") return secondHound + quadruped(head);
  if (speciesId === "kitsune") return sigil + foxTails + quadruped("fox");
  switch (shape) {
    case "horizon-lions": return horizonLions;
    case "sea-coil": return seaCoil;
    case "walking-archive": return walkingArchive;
    case "civic-table": return civicTable;
    case "warboard": return construct + warboard;
    case "healing-wing": return avian(false) + `<path d="M177 82l17 3 11 9-26 4-8-8z" fill="url(#body)"/>
      <path d="M129 140q13-8 20-2-6 16-20 22l6-11z" fill="#fff4c8"/>`;
    case "river-grip": return quadruped("wolf") + `<path d="M79 113q-32 3-38 22-8 20 22 21l8-14m-8 14 13 1m-13-1 10 7" fill="none"
      stroke="url(#accent)" stroke-width="5" stroke-linecap="round"/><path d="M196 100l-10-17m11 20-15-10" stroke="#efacb8" stroke-width="4"/>`;
    case "saber-cat": return quadruped("sphinx") + `<path d="M218 112l4 18 5-16m8-1 1 12 6-12" fill="#fff2d2"/>`;
    case "single-horn": return quadruped("bear") + `<path d="M214 91q21-25 18-51 17 32 1 58z" fill="#ecd8aa"/>`;
    case "feather-raptor": return `<path d="M28 137q36-4 60-34l38-10 30-22 26-10 35 6 18 15-15 8-29-4-18 31-36 16-19 25h-18l15-35-29 16z" fill="url(#body)"/>
      <path d="M122 108l-17 31m40-13 10 32h22m-20-56 16 13 10-5m-80-13 10-15m-3 13 15-20"
        fill="none" stroke="url(#accent)" stroke-width="6" stroke-linecap="round"/><circle cx="211" cy="76" r="3" fill="#fff4c8"/>`;
    case "echo-gate": return `<path d="M53 157v-46a28 28 0 0 1 56 0v46m59 0v-46a29 29 0 0 1 58 0v46" fill="none" stroke="#bd987a" stroke-width="7"/>`
      + quadruped("sphinx") + `<path d="M217 122h29m-31 6h22" stroke="#fce3a8" stroke-width="2"/>`;
    case "scent-beacons": return body + `<path d="M217 98l14-5m-12 15 17-3" stroke="#fce3a8" stroke-width="4" stroke-linecap="round"/>
      <path d="M217 145q16-13 28-11m-24 22q16-8 29-5" fill="none" stroke="#d5cab1" stroke-width="2" stroke-dasharray="4 4"/>`;
    case "night-disc": return body + `<path d="M208 99l-13-20 19 8 9-19 5 19 19-8-8 17-8 17-17-3z" fill="url(#accent)"/>
      <circle cx="224" cy="96" r="3" fill="#271a2e"/><path d="M250 83q13 11 3 23" fill="none" stroke="#c7acf8" stroke-width="2"/>`;
    case "river-fox": return riverFox;
    case "reef-octopus": return reefOctopus;
    case "shore-carrier": return body + wetMantle;
    case "winged-medic": return wings(false) + `<g transform="translate(282) scale(-1 1)">${wings(false)}</g>` + humanoid(head) + rescueHarness;
    case "cerberus": return `<g transform="translate(18 -9)">${secondHound}</g>` + secondHound + quadruped("wolf");
    case "cave-bear": return `<path d="M41 176V109Q45 29 141 29q85 0 104 81v66" fill="#352e37" stroke="#9c8068" stroke-width="9"/>${quadruped("bear")}
      <path d="M80 174l-14 7m42-9-9 9m115-5 9 6" stroke="#e9c99c" stroke-width="3"/>`;
    case "wyvern": return wyvern;
    case "wind-loom": return windLoom;
    case "citadel": return citadel;
    case "humanoid": return humanoid(head, family === "kin");
    case "laboratory": return quadruped(head) + laboratory;
    case "artillery": return quadruped(head) + artillery;
    case "settlement": return quadruped(head) + settlement;
    case "transmuted": return body + crystals;
    case "construct": return head === "elephant" ? stoneMammoth : construct;
    case "aerial": return avian(anatomy === "reptilian" || head === "dragon");
    case "spectral": return sigil + `<g opacity=".82" transform="translate(0 -8)">${body}</g>`;
    case "elemental": return element === "agua" ? `<g opacity=".78">${aquatic(head === "octopus")}
      <path d="M111 120q30-18 53-9 20 11 9 21-14 10-30-4" fill="none" stroke="#d8f2f9" stroke-width="3"/></g>` : elemental;
    case "symbiotic": return body + growth;
    case "ritual": return sigil + humanoid(head);
    case "colossal": return `<g transform="translate(-36 -18) scale(1.24 1.12)">${body}</g>`;
    default: return body;
  }
}

const occupationalTools = {
  medicina: '<rect x="89" y="104" width="25" height="27" rx="4"/><path d="M94 117h15m-8-7v15" stroke="#381f2b" stroke-width="3"/>',
  "oficios civiles": '<path d="M93 89h17l8 32-22 9-12-21z"/><path d="M86 106h29" stroke="#362837" stroke-width="3"/>',
  construcción: '<path d="M81 145l18-64h7l-18 64zm10-40h20v6H91z"/>',
  alquimia: '<path d="M96 105h10v15l9 15q1 9-13 9t-15-9l9-15z"/>',
  "magia rúnica": '<path d="M91 145l19-51 4 1-17 50zM107 95l2-12 12 2-3 12z"/>',
  abogacía: '<path d="M97 95h4v36h-4zM81 100l37 3v4l-37-3zm0 18 7-12 7 12zm25 2 7-12 7 12z"/>',
  herrería: '<path d="M85 133l20-41 6 3-20 42zm12-46 23 12 5-11-23-11z"/>',
  cartografía: '<path d="M82 108l33-7 5 30-33 7z"/><circle cx="101" cy="119" r="8" fill="#392b48"/>',
  música: '<path d="M84 94q-8 37 16 43 20-4 15-40l-5 2q5 26-10 31-16-6-10-35zM92 101h19v4H92z"/>',
  arquitectura: '<path d="M87 140l14-44 16 43h-5l-12-33-8 34z"/><circle cx="101" cy="96" r="5"/>'
};

function drawProfession(card) {
  const tools = card.concept?.profession?.split(" y ").map(job => occupationalTools[job]).filter(Boolean) ?? [];
  return tools.map((tool, index) => `<g fill="url(#accent)" transform="translate(${index * 90})">${tool}</g>`).join("");
}

export function renderProvisionalPortrait(card, level) {
  const cacheKey = `${card.id}#${level}`;
  if (portraitCache.has(cacheKey)) return portraitCache.get(cacheKey);
  const profiles = card.lineage.map(id => PORTRAIT_PROFILES[id]).filter(Boolean);
  const animal = PORTRAIT_PROFILES[card.identity.bodySource] ?? profiles.find(profile => profile.face === "elephant")
    ?? profiles.find(profile => profile.face !== "human");
  const colors = animal?.colors ?? profiles[0]?.colors ?? ["#805f93", "#47304f", "#e6ba99"];
  const accent = isHex(card.identity.accent) ? card.identity.accent : profiles.find(profile => profile !== animal)?.accent
    ?? animal?.accent ?? "#b29ee1";
  const shape = drawShape(card.identity.shape, card.concept?.scale?.form ?? card.concept?.anatomy,
    animal?.face, card.identity.speciesId, card.family, card.concept?.affinities?.[0]);
  const finish = level > 1 ? `<rect x="8" y="8" width="264" height="184" rx="8" fill="none" stroke="${accent}" opacity="${level === 3 ? 0.85 : 0.45}"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 200" width="560" height="400">
    <defs>
      <linearGradient id="night" x2="0" y2="1"><stop stop-color="#241b39"/><stop offset="1" stop-color="#0e101b"/></linearGradient>
      <linearGradient id="body" x1="0" y1="0" x2=".82" y2="1"><stop stop-color="${colors[2]}"/><stop offset=".5" stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#fff0ca"/><stop offset=".43" stop-color="${accent}"/><stop offset="1" stop-color="#513456"/></linearGradient>
      <radialGradient id="aura"><stop stop-color="${accent}" stop-opacity=".3"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="280" height="200" fill="url(#night)"/>
    <ellipse cx="145" cy="92" rx="128" ry="91" fill="url(#aura)"/>
    <path d="M0 142l42-20 30 14 35-24 42 22 43-29 33 23 55-17v89H0z" fill="#a59ec9" opacity=".14"/>
    <path d="M0 173l57-21 23 7 37-12 31 14 61-11 71 21v29H0z" fill="#0c0e18"/>
    <path d="M22 46l13-4m9 18 7-1m187 17 13-3M27 161l21-5m185 4 14 5" stroke="#f8eac7" stroke-linecap="round" opacity=".35"/>
    ${shape}${["humanoid", "kin"].includes(card.identity.shape) ? drawProfession(card) : ""}${finish}
  </svg>`;
  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  portraitCache.set(cacheKey, src);
  if (portraitCache.size > CACHE_LIMIT) portraitCache.delete(portraitCache.keys().next().value);
  return src;
}
