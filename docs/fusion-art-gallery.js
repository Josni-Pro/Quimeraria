import { createGame, getCard, inspectFusionVariants } from "./engine.js";
import { getPortrait } from "./illustrations.js";
import { scaleDimensions } from "./creature-scale.js";

export function renderArtBatch(entries, gallery) {
  const state = createGame();

  for (const entry of entries) {
    const { variants } = inspectFusionVariants(state, ...entry.parents);
    const card = variants.find(candidate => candidate.id === entry.id);
    const portrait = getPortrait(card, state);
    const article = document.createElement("article");
    article.className = "variant";
    const artLink = document.createElement("a");
    artLink.href = portrait.src;
    const illustration = new Image(768, 768);
    illustration.src = portrait.src;
    illustration.alt = card.name;
    illustration.className = "variant__art";
    illustration.loading = "lazy";
    illustration.decoding = "async";
    artLink.append(illustration);

    const caption = document.createElement("div");
    caption.className = "variant__body";
    const title = document.createElement("h2");
    title.className = "variant__name";
    title.textContent = card.name;
    const parents = document.createElement("p");
    parents.className = "variant__meta";
    parents.textContent = entry.parents.map(id => getCard(id, state).name).join(" + ");

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Ficha artística";
    const direction = document.createElement("p");
    direction.textContent = entry.direction;
    const scale = document.createElement("p");
    const brief = card.identity.brief;
    scale.textContent = `${brief.size} · ${scaleDimensions(brief.scale)}. Referencia visual · ${brief.scale.environment}.`;
    const id = document.createElement("code");
    id.textContent = card.id;
    details.append(summary, scale, direction, id);
    caption.append(parents, title, details);
    article.append(artLink, caption);
    gallery.append(article);
  }
}
