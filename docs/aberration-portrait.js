import { provisionalBody } from "./provisional-art.js";
import { PORTRAIT_PROFILES } from "./portrait-profiles.js";

const cache = new WeakMap();
const serpent = '<path d="M37 139q30-41 71-18t67 5q29-17 31-49l17-17 19 9-12 17q-6 49-49 57-33 9-75-8-40-16-69 4Z" fill="url(#body)"/><path d="M197 100q-25-24 7-40l1 13 29-17-16 22 17 9-25 15z" fill="url(#accent)"/>';
const motion = {
  "axis-lock": {
    symptom: '<path d="M139 174l-8-38 24 14 11 23-9 4-12-14-7 16z" fill="url(#accent)" stroke="#182632" stroke-width="2"/><path d="M142 164l-23 15h-11m45-8 24 10h11" fill="none" stroke="#ecd0ab" stroke-width="3"/>',
    backdrop: "#715942"
  },
  "sensory-loop": {
    symptom: '<path d="M119 86q61-48 102-6t-13 53q-31 4-30-22m-60-12q40-36 73-24t16 35q-12 4-18-7" fill="none" stroke="#b7eadb" stroke-width="3"/><path d="M221 126l-14 8 3-13m-24-24 5 11-12-3" fill="none" stroke="#f8dfaa" stroke-width="3"/>',
    backdrop: "#347383"
  },
  "load-bind": {
    symptom: '<path d="M107 76h91l-15 19h-73zm64 5-17 84-11 1 13-87zM105 110l45-18 5 9-44 21z" fill="#d7af78" stroke="#483639" stroke-width="3"/><circle cx="155" cy="116" r="6" fill="#f8d7a5"/><circle cx="148" cy="150" r="5" fill="#e5c6a0"/>',
    backdrop: "#90815b"
  },
  "phase-bleed": {
    silhouette: '<path d="M138 40q21-20 43 5l-7 25q19-25 66-34-7 41-49 66l-29 7q-22 23-11 50l35 21-41 9q-17-20-14-49l-24-13Q72 124 39 80l50 13q-21-31-47-53 49 5 92 34l-7-17z" fill="url(#body)"/><path d="M130 127q23-9 41-18-29 30-14 51l28 19-36 6q-18-17-14-45z" fill="#87bfc9" opacity=".84"/>',
    symptom: '<path d="M91 137q-16 2-22 18m129-30q28 5 29 18m-50 3 7 11m-75-5 1 12" fill="none" stroke="#ffddaa" stroke-width="3" stroke-dasharray="4 5"/>',
    backdrop: "#547781"
  },
  "blocked-craft": {
    symptom: '<path d="M216 99l38-7 10 14-33 16-16-5z" fill="#aeb3b8" stroke="#35323b" stroke-width="3"/><path d="M236 107l-8 15-25 2" fill="none" stroke="#f4d4ab" stroke-width="3"/><path d="M225 155h38l-9 10-4 15h-17l4-15z" fill="#74758d"/>',
    backdrop: "#765448"
  },
  "domain-knot": {
    symptom: '<path d="M60 70q51-35 123 7l-15-2m51 48q-76 38-135 8l16-2" fill="none" stroke="#f0dda0" stroke-width="4" stroke-linecap="round"/><path d="M171 124q-14-19 4-42l19 8-7 17 9 18z" fill="#b6925a" stroke="#efe0ad" stroke-width="2"/>',
    backdrop: "#437465"
  },
  "interrupted": {
    symptom: '<path d="M71 95q9 28 22 18l13 33q-30 35-64 17 17-22 2-50z" fill="#8cc0ac" opacity=".86"/><path d="M75 100q-20-16-28-9m30 21-33-7m27 21-21-3" fill="none" stroke="#ecac95" stroke-width="4"/>',
    backdrop: "#657b68"
  },
  "overgrowth": {
    symptom: '<path d="M159 155l-31-60 12-20 23 56-20-55 12-7 22 60-18-61 16-5 22 75-14 26z" fill="url(#accent)" stroke="#7c6147" stroke-width="3"/><path d="M152 130l39 6m-33 8 30 4m-27-38 19 4" stroke="#efe2b7" stroke-width="3"/>',
    backdrop: "#887052"
  }
};

export function renderAberrationPortrait(card) {
  if (cache.has(card)) return cache.get(card);
  const { anatomy, head } = card.identity;
  const style = motion[card.defect] ?? motion.interrupted;
  const palette = card.lineage.map(id => PORTRAIT_PROFILES[id]).find(profile => profile?.face === head)
    ?? PORTRAIT_PROFILES[card.lineage[0]];
  const [base, shade, light] = palette?.colors ?? ["#826875", "#4b435e", "#dbaf88"];
  const body = style.silhouette ?? (anatomy === "serpentine" ? serpent : provisionalBody(anatomy, head));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 200" width="560" height="400">
    <defs>
      <linearGradient id="land" x2="0" y2="1"><stop stop-color="${style.backdrop}"/><stop offset="1" stop-color="#222939"/></linearGradient>
      <linearGradient id="body" x2=".85" y2="1"><stop stop-color="${light}"/><stop offset=".53" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
      <linearGradient id="accent" x2="0" y2="1"><stop stop-color="#fae0ac"/><stop offset="1" stop-color="${style.backdrop}"/></linearGradient>
    </defs>
    <rect width="280" height="200" fill="url(#land)"/>
    <path d="M0 145l47-16 53 12 56-17 65 16 59-11v71H0Z" fill="#252430" opacity=".48"/>
    <ellipse cx="141" cy="176" rx="117" ry="13" fill="#292737" opacity=".6"/>
    ${body}${style.symptom}
  </svg>`;
  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  cache.set(card, src);
  return src;
}
