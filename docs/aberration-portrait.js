import { PORTRAIT_PROFILES } from "./portrait-profiles.js";

const cache = new WeakMap();

// Las aberturas, apéndices y espacios negativos son parte de cada silueta.
// Todos los patrones descargan sobre el mismo plano de suelo o sedimento.
const silhouettes = {
  "axis-lock": {
    backdrop: "#87684d", contact: "flank",
    body: `<path d="M33 157Q46 135 78 131L92 94Q114 91 129 124L155 111 170 85 186 93 173 124 201 144
      215 117 229 121 219 157Q196 176 157 171L91 174 49 167Z" fill="url(#body)"/>
    <path d="M166 149l-19-31-23-14-22 15 17 5-4 20 14 4 4-17 15 27M170 144l13-34 22-6-5 22-18 3-3 25"
      fill="url(#accent)" stroke="#483634" stroke-width="2"/>
    <path d="M103 152q24 13 52 3" fill="none" stroke="#ead0a8" stroke-width="3"/>`
  },
  "sensory-loop": {
    backdrop: "#478379", contact: "mantle",
    body: `<path d="M30 158Q40 129 69 124Q49 100 82 91Q108 81 124 102Q137 76 165 93Q174 107 163 119
      Q216 104 232 132Q255 163 218 173L112 173Q65 181 30 158Z" fill="url(#body)"/>
    <path d="M76 142q26-37 54-18 17 19-9 24-28-4-48 13m88-32q24-32 48-8 11 15-16 20-29-10-44 8
      m44 3q18-15 27-2-3 17-23 13l-34-6" stroke="url(#accent)" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M86 101q19-25 47-11m4 9q-14 2-17 12m44-17q41-21 61 9l-11-1" fill="none" stroke="#d5edbf" stroke-width="2" opacity=".8"/>`
  },
  "load-bind": {
    backdrop: "#a18364", contact: "wedge",
    body: `<path d="M34 156Q51 131 79 129L92 99 129 99 156 112 208 112 235 140 221 163 183 165
      142 151 111 170 63 174Z" fill="url(#body)"/>
    <path d="M60 171L97 65l24 3 16 26 13-9 19 5 30 75-20 4-18-52-19 9-18-21-20-16-24 82Z"
      fill="url(#accent)" stroke="#5c4c46" stroke-width="3"/>
    <path d="M109 139l23 12 13-27m7 10 15 14 11-20" fill="none" stroke="#e4c499" stroke-width="7" stroke-linecap="round"/>
    <path d="M42 173H95m80-1h29" stroke="#ecc89a" stroke-width="2"/>`
  },
  "phase-bleed": {
    backdrop: "#527e89", contact: "spill",
    body: `<path d="M27 167q33-39 68-31l-14-57 34 17 5 19 31 20 17-22 19 2-12 35 17-20 35-22
        -16 33-22 22 59 9-98 2-30-10-45 10Z" fill="url(#body)"/>
    <path d="M89 159l35-8 29 20-46 3zm52 10 40-13 51 13-35 10Z" fill="#81c6d1"/>
    <path d="M118 121l-14-22m50 54 14-24 6 9m19 3 14-15" fill="none" stroke="#f5d495" stroke-width="4"/>
    <path d="M160 155l7 9m20-13 7 10m20-9 5 9" stroke="#c4edf3" stroke-width="4" stroke-linecap="round"/>`
  },
  "blocked-craft": {
    backdrop: "#8a634f", contact: "jaw",
    body: `<path d="M28 162Q50 144 72 146l15-25 22 13 5 15 29-8 7-39 27-6 19 22 12 28
      26 20-46 9-109-3Z" fill="url(#body)"/>
    <path d="M125 127l96-6 17 13-28 13 1 14 24 8-89 3 15-17-5-12-30-2Z"
      fill="#a6a7ad" stroke="#504852" stroke-width="3"/>
    <path d="M88 152l13 9 12-18m-1 20 11-10 6 6" fill="none" stroke="#edc4a3" stroke-width="6" stroke-linecap="round"/>
    <path d="M139 132l73-5m-59 40h64" stroke="#ece1bb" stroke-width="2"/>`
  },
  "domain-knot": {
    backdrop: "#4d836c", contact: "crest",
    body: `<path d="M40 159Q55 136 90 141L58 112l48-27 29 26 31-36 46 33-25 28 43 15
      -33 22-38-4-46 4-35 3Z" fill="url(#body)"/>
    <path d="M80 104l34 12 7 22 29-2 1-25 29-19 10 19-18 30 23 16-49 7-34-8-20-29Z"
      fill="url(#accent)" stroke="#806449" stroke-width="3"/>
    <path d="M24 110q38-25 74-9l-13 1m161 31q-43-16-75 3l10 3m-76-13 17 12"
      fill="none" stroke="#efd6a4" stroke-width="3" stroke-linecap="round"/>`
  },
  "interrupted": {
    backdrop: "#647f66", contact: "belly",
    body: `<path d="M36 154q9-26 39-26l15-25 24 10 10 21 35 16 45-20 24 17-13 19-54 7-62-11-44 9Z" fill="url(#body)"/>
    <path d="M86 117Q104 129 123 139L151 113 172 119 158 139 189 127 203 145 236 152 224 161 186 172 105 169Z"
      fill="#a9c6b3" stroke="#6b8d84" stroke-width="3"/>
    <path d="M118 154l-4-17-13 9m43-3 11 17 12-16m6 15 11-13 8 11"
      fill="none" stroke="#5d7e7b" stroke-width="5" stroke-linecap="round"/>
    <path d="M149 155l17-23m4 27 12-24m9 25 18-18" stroke="#e3dfbd" stroke-width="2"/>`
  },
  "overgrowth": {
    backdrop: "#91755c", contact: "layers",
    body: `<path d="M29 159Q57 136 82 136l18-33 25 11 27 19 35 5 19-17 19 10-8 28-54 15-91-2Z" fill="url(#body)"/>
    <path d="M73 171l11-64 24-27 8 19 20-24 14 25 24-10 11 20 32 12-22 19 1 30Z"
      fill="url(#accent)" stroke="#675038" stroke-width="3"/>
    <path d="M89 171l15-50 13-10-4 53 18-54 15-12-1 66 17-46 14-11 6 57m-99-34 98 10m-101 10 109 6"
      fill="none" stroke="#ead3a6" stroke-width="5"/>
    <path d="M63 152l11 6m121-32 12 12" stroke="#4e463f" stroke-width="5" stroke-linecap="round"/>`
  }
};

const historical = {
  miembro_ocular: "axis-lock", alas_invertidas: "axis-lock",
  cabezas_opuestas: "axis-lock", extremidades_unilaterales: "axis-lock",
  enjambre_trabado: "sensory-loop", objeto_incrustado: "load-bind", energia_plegada: "phase-bleed"
};

const headShapes = {
  fox: 'M0 13l6-16 6 11 15-7 5 16 18 9-10 7-26-5z',
  wolf: 'M0 14l7-14 7 9 19-5 1 13 17 8-8 8-29-4z',
  owl: 'M0 16l6-14 6 7 9-8 8 13-2 14-11 8L3 29z',
  eagle: 'M0 14l12-11 17 2 7 10 16 5-9 13-8-9-17 8L5 24z',
  serpent: 'M0 14l9-14 5 10 21-2 18 14-13 9-23-4L5 24z',
  dragon: 'M0 16l8-14 11 10 11-9 5 12 19 8-11 11-23-5-12 4z',
  elephant: 'M0 12q8-17 29-8l10 14-3 19 10 7-7 5-12-12-1-14-10 8-15-9z',
  ceratops: 'M0 13l9-11 17 1 9 18 13-8-6 12 10-2-8 11-22-1L4 24z',
  octopus: 'M0 16Q4-3 28 3q17 5 13 20l-13 9-21-3z',
  salamander: 'M0 15q10-11 32-10 11 3 13 12l-9 12-26-3L3 21z',
  fish: 'M0 19L11 8l22-6 15 16-16 12-20-4z',
  human: 'M0 15Q1 2 15 0l15 6 4 12-7 12-16 2-8-8z'
};

function headPortrait(face, misplacedEye = false) {
  const path = headShapes[face] ?? headShapes.human;
  const tusk = face === "elephant" ? '<path d="M31 32q15 7 19-8-2 21-18 15z" fill="#ead4a0"/>' : "";
  const eye = misplacedEye ? '<path d="M13 18q-6-18 7-28l10 3-6 7-4-4-2 23z" fill="url(#accent)" stroke="#654c45" stroke-width="2"/>'
    : '<path d="M13 18l10 3" stroke="#f3dda9" stroke-width="2.2" stroke-linecap="round"/>';
  return `<path d="${path}" fill="url(#body)" stroke="#634a46" stroke-width="1.4"/>${tusk}${eye}`;
}

function inheritedMarks(profiles) {
  const features = new Set(profiles.flatMap(profile => profile.features));
  const feathers = profiles.some(profile => ["owl", "eagle", "serpent"].includes(profile.face));
  const gills = profiles.some(profile => profile.face === "salamander");
  return [
    feathers ? '<path d="M58 143l18-13 20-4-11 8 13 2-17 8-9-3-15 7z" fill="url(#accent)"/>' : "",
    gills ? '<path d="M72 141l-12-9m17 7-8-13m14 14-3-14" stroke="#eaa3a1" stroke-width="3.3" stroke-linecap="round"/>' : "",
    features.has("scales") || features.has("armor") ? '<path d="M162 145l14-8 7 7-11 8zm-21 4 13-9 6 8-11 8z" fill="#c9a680"/>' : "",
    features.has("scalesOfJustice") ? '<path d="M93 123l74-12-3 9-66 13z" fill="#d6b58a" stroke="#72534b" stroke-width="2"/><path d="M113 128l-11 19m42-25 18 17" fill="none" stroke="#ad937e" stroke-width="3"/>' : ""
  ].join("");
}

const historicalObstructions = {
  alas_invertidas: `<path d="M79 149q14 9 34 13l-9 11-21-2-12-13-18-4 8-7 15 5zm87 5q8-11 25-18l-2 11 18-7-9 12 12-3-13 13-25 8-10-6z"
    fill="url(#accent)" stroke="#574441" stroke-width="2"/><path d="M69 153l35 14m68-4 27-13" stroke="#e4bda1" stroke-width="2"/>`,
  cabezas_opuestas: '<path d="M70 154q17-38 58-25l24 5q32-15 53 12" fill="none" stroke="url(#body)" stroke-width="17"/>',
  energia_plegada: `<path d="M120 136q8-21 24-12 12 11 1 22l-8-4q10-5 4-10-10-5-15 10m46-22q20 2 20 17-7 14-20 10l-9-6q18 4 20-5-2-8-13-8"
    stroke="#b7d9df" fill="none" stroke-width="4"/><path d="M136 154l14-13 6 6 14-15" stroke="#e3ba86" fill="none" stroke-width="4"/>`
};

export function renderAberrationPortrait(card) {
  if (cache.has(card)) return cache.get(card);
  const defect = historical[card.defect] ?? card.defect;
  const style = silhouettes[defect] ?? silhouettes.interrupted;
  const profiles = card.lineage.map(id => PORTRAIT_PROFILES[id]).filter(Boolean);
  const visualFace = card.defect === "miembro_ocular" ? "fox" : card.identity?.head;
  const palette = profiles.find(profile => profile.face === visualFace)
    ?? profiles.find(profile => profile.face !== "human") ?? profiles[0];
  const [base, shade, light] = palette?.colors ?? ["#826875", "#4b435e", "#dbaf88"];
  const face = palette?.face ?? "human";
  const orientation = defect === "blocked-craft" ? "translate(153 102) rotate(18)"
    : defect === "sensory-loop" ? "translate(95 94) rotate(47) scale(.62)"
      : "translate(71 130) rotate(-23) scale(-.86 .86)";
  const head = `<g transform="${orientation}">${headPortrait(face, card.defect === "miembro_ocular")}</g>`;
  const opposite = card.defect === "cabezas_opuestas"
    ? `<g transform="translate(206 135) rotate(18) scale(.72)">${headPortrait(face)}</g>` : "";
  const anatomicalSeam = defect === "sensory-loop" ?
    '<path d="M99 108q14-12 24 9l-6 11-15-6q2-4-3-14Z" fill="url(#body)"/>' : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 200" width="560" height="400">
    <defs>
      <linearGradient id="land" x2="0" y2="1"><stop stop-color="${style.backdrop}"/><stop offset="1" stop-color="#424552"/></linearGradient>
      <linearGradient id="body" x2=".85" y2="1"><stop stop-color="${light}"/><stop offset=".53" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
      <linearGradient id="accent" x2="0" y2="1"><stop stop-color="#fae0ac"/><stop offset="1" stop-color="${style.backdrop}"/></linearGradient>
    </defs>
    <rect width="280" height="200" fill="url(#land)"/>
    <path d="M0 143l47-16 53 12 56-17 65 16 59-11v73H0Z" fill="#685e59" opacity=".48"/>
    <ellipse cx="140" cy="173" rx="116" ry="13" fill="#332f38" opacity=".62"/>
    <g data-contact="${style.contact}">${style.body}${historicalObstructions[card.defect] ?? ""}${head}${opposite}
    ${anatomicalSeam}${inheritedMarks(profiles)}</g>
  </svg>`;
  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  cache.set(card, src);
  return src;
}
