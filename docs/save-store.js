import { loadGame, serializeGame } from "./engine.js";

export const SAVE_KEY = "quimeraria:partida:v1";
export const PRESENTATION_KEY = "quimeraria:entrenamiento:preferencias:v1";

export function readGame() {
  try { return loadGame(localStorage.getItem(SAVE_KEY)); }
  catch { return loadGame(null); }
}

export function presentationPreferences() {
  try { return JSON.parse(localStorage.getItem(PRESENTATION_KEY)) ?? {}; }
  catch { return {}; }
}

export async function commitGame(operation) {
  const commit = () => {
    try {
      const result = operation(loadGame(localStorage.getItem(SAVE_KEY)));
      if (result.ok) localStorage.setItem(SAVE_KEY,serializeGame(result.state));
      return result;
    } catch {
      return { ok:false,error:"El navegador impide guardar la partida." };
    }
  };
  return navigator.locks?.request ? navigator.locks.request(SAVE_KEY,commit) : commit();
}
