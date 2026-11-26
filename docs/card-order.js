import { COMBAT_STATS, getCreatureProfiles } from "./creature-profiles.js";

import { TRAINING_RULES } from "./combat/config.js";

const names = new Intl.Collator("es-MX",{ sensitivity:"base", numeric:true });
const key = "quimeraria:orden-cartas:v1";
export const CARD_ORDERS = Object.freeze({
  rarity:"Rareza", generation:"Generación", name:"Nombre", ...COMBAT_STATS,
  cost:"Costo de despliegue", count:"Cantidad disponible", recent:"Obtención reciente"
});
export const DEFAULT_CARD_ORDER = Object.freeze({ by:"rarity", direction:"desc" });
export function cardOrder(value) {
  return Object.hasOwn(CARD_ORDERS,value?.by) && ["asc","desc"].includes(value.direction) ? value : DEFAULT_CARD_ORDER;
}
export function readCardOrder() {
  try { return cardOrder(JSON.parse(localStorage.getItem(key))); }
  catch { return DEFAULT_CARD_ORDER; }
}
export function writeCardOrder(order) {
  try { localStorage.setItem(key,JSON.stringify(cardOrder(order))); } catch { /* Preferencia de sesión. */ }
}
const compareNames = (a,b) => names.compare(a.name,b.name) || names.compare(a.id,b.id);
const rarity = card => card.rarity ?? -1;
const generation = card => card.generation ?? 0;

export function recentCards(game) {
  const order = new Map();
  game.discovered?.forEach((id,i) => order.set(id,i+1));
  let index = order.size + 1;
  for (const entry of [...(game.history ?? [])].reverse()) {
    for (const id of entry.cards ?? [entry.cardId]) if (id) order.set(id,index++);
  }
  for (const collection of [game.baseCopies,game.fusionCopies,game.aberrationCopies]) {
    for (const [id,copies] of Object.entries(collection ?? {})) {
      const latest = Number(copies.at(-1)?.id.split("-").at(-1));
      if (latest > 0) order.set(id,Math.max(order.get(id) ?? 0,index+latest));
    }
  }
  return order;
}

export function sortCardEntries(entries, preference, recent = new Map()) {
  const { by,direction } = cardOrder(preference);
  const sign = direction === "desc" ? -1 : 1;
  const value = entry => {
    const { card,profile } = entry;
    if (by === "rarity") return rarity(card);
    if (by === "generation") return generation(card);
    if (by === "recent") return recent.get(card.id) ?? 0;
    if (by === "count") return entry.available ?? entry.count ?? entry.owned ?? 0;
    if (entry.card.category === "aberration" || !entry.card.stats) return -1;
    if (by === "cost") return profile?.cost ?? TRAINING_RULES.deployment[generation(card)] ?? -1;
    return (profile ?? getCreatureProfiles(card)?.combat)?.stats[by] ?? -1;
  };
  return [...entries].sort((a,b) => {
    const primary = by === "name" ? compareNames(a.card,b.card) : value(a)-value(b);
    return sign*primary || rarity(b.card)-rarity(a.card) || generation(b.card)-generation(a.card) || compareNames(a.card,b.card);
  });
}

export function sortCards(cards) {
  return sortCardEntries(cards.map(card=>({card})),DEFAULT_CARD_ORDER).map(entry=>entry.card);
}
