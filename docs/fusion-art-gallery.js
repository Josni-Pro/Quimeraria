import { RARITIES } from "./catalog.js";
import { CONCEPT_LABELS, getCreatureConcept } from "./creature-concepts.js";
import { COMBAT_ROLES, getCreatureProfiles } from "./creature-profiles.js";
import { createGame, getCard, inspectFusionVariants } from "./engine.js";
import { getPortrait } from "./illustrations.js";

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
    const names = entry.parents.map(id => getCard(id, state).name);
    parents.textContent = names.join(" + ");

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Ficha artística";
    const direction = document.createElement("p");
    direction.textContent = entry.direction;
    const id = document.createElement("code");
    id.textContent = card.id;
    details.append(summary, direction, id);
    caption.append(parents, title);
    if (entry.heritage) {
      const concept = getCreatureConcept(card);
      const { combat } = getCreatureProfiles(card);
      const role = document.createElement("p");
      role.className = "variant__role";
      role.textContent = `G${card.generation} · ${RARITIES[card.rarity].name} · ${COMBAT_ROLES[combat.role].name}`;
      const description = document.createElement("p");
      description.textContent = `${CONCEPT_LABELS.nature[concept.nature]} · ${CONCEPT_LABELS.anatomy[concept.anatomy]}. ${card.description}`;
      const inherited = document.createElement("ul");
      for (const [i, parent] of names.entries()) {
        const contribution = document.createElement("li");
        const source = document.createElement("strong");
        source.textContent = parent;
        contribution.append(source, " · " + entry.heritage[i]);
        inherited.append(contribution);
      }
      caption.append(role);
      details.replaceChildren(summary, description, inherited, direction, id);
    }
    caption.append(details);
    article.append(artLink, caption);
    gallery.append(article);
  }
}
