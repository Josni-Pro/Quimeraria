import { CARDS } from "../catalog.js";
import { acknowledgeReveal, createGame, fuseCards, getCard, getFusionCopies, loadGame } from "../engine.js";
import { getBaseCopies } from "../pack-transactions.js";
import { TRAINING_RULES } from "./config.js";
import { prepareCombatant } from "./skills.js";

const SAVE_KEY = "quimeraria:partida:v1";

export function readTrainingGame() {
  try { return loadGame(localStorage.getItem(SAVE_KEY)); }
  catch { return createGame(); }
}

export function trainingRoster(game, rules = TRAINING_RULES) {
  return Object.entries(game.inventory).flatMap(([id, owned]) => {
    const card = getCard(id, game);
    const profile = prepareCombatant(card, rules);
    if (!profile) return [];
    const tracked = card.generation ? getFusionCopies(game,id) : getBaseCopies(game,id);
    const count = Math.min(owned, rules.slots);
    const copies = Array.from({ length: count }, (_, index) => ({
      copyId: tracked[index]?.id ?? `legacy:${id}:${index - tracked.length}`, profile
    }));
    return [{ card, profile, copies, owned }];
  });
}

export function availableCopies(roster) {
  return new Map(roster.flatMap(entry => entry.copies.map(copy => [copy.copyId, entry.card.id])));
}

export const SCOUTS = Object.freeze({
  watch: { name: "Guardia de la bóveda", description: "Vanguardia resistente y recuperación en retaguardia.",
    basic: ["triceratops", "lobo", "medica", "buho", "herrera", "anubis"],
    expert: ["fusion(mamut+obrero)", "fusion(buho+medica)", "triceratops", "thor", "lobo", "atenea"] },
  tide: { name: "Coro de la marea", description: "Ralentización y presión mágica sobre varias posiciones.",
    basic: ["pulpo", "sirena", "ajolote", "mamut", "quetzalcoatl", "dragon"],
    expert: ["fusion(pulpo+sirena)", "fusion(fenix+medica)", "anquilosaurio", "quetzalcoatl", "ajolote", "anubis"] },
  hunt: { name: "Cazadores de cornisas", description: "Ataques rápidos que pueden alcanzar la retaguardia.",
    basic: ["grifo", "velociraptor", "zorro", "buho", "lobo", "alquimista"],
    expert: ["fusion(lobo+velociraptor)", "fusion(buho+mago)", "grifo", "oso", "zorro", "alquimista"] }
});

function specimens() {
  let game = { ...createGame(), coins: 10_000,
    inventory: Object.fromEntries(CARDS.map(card => [card.id, 3])) };
  const pairs = [["mamut", "obrero"], ["buho", "medica"], ["pulpo", "sirena"],
    ["fenix", "medica"], ["lobo", "velociraptor"], ["buho", "mago"]];
  for (const pair of pairs) {
    const result = fuseCards(game, ...pair, () => 0);
    game = acknowledgeReveal(result.state, result.reveal.id).state;
  }
  return game;
}

let specimensCache;
export function trainingOpponent(key, difficulty, playerBudget, rules = TRAINING_RULES) {
  const definition = SCOUTS[key] ?? SCOUTS.watch;
  specimensCache ??= specimens();
  const amount = Math.max(1, Math.min(rules.budget, playerBudget));
  const cards = difficulty === "hard" && amount >= rules.slots + 2 ? definition.expert : definition.basic;
  const preferences = difficulty === "beginner" ? [0, 2, 5, 3, 1, 4] : [1, 0, 4, 2, 5, 3];
  const result = Array(rules.slots).fill(null);
  let spent = 0;
  let index = 0;
  for (const id of cards) {
    const card = getCard(id, specimensCache);
    const profile = prepareCombatant(card, rules);
    if (spent + profile.cost > amount) continue;
    const prefersRear = ["healer", "mage", "support", "marksman", "artillery"].includes(profile.role);
    const allowed = preferences.filter(slot => slot < rules.slots && !result[slot]);
    const slot = difficulty !== "beginner" ? allowed.find(slot => (slot >= 3) === prefersRear) ?? allowed[0] : allowed[0];
    if (slot === undefined) break;
    result[slot] = { copyId: `bot:${index++}`, profile };
    spent += profile.cost;
  }
  return result;
}

export function opponentPortraitCard(id) {
  specimensCache ??= specimens();
  return getCard(id, specimensCache);
}

export function opponentPortraitState() {
  specimensCache ??= specimens();
  return specimensCache;
}
