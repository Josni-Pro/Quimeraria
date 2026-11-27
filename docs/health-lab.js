import { DAMAGE_FAMILIES, FATIGUE_LEVELS, HEALTH_RULES, WOUNDS } from "./health-config.js";
import { exposureExamples, HEALTH_SCENARIOS, recoveryExamples, simulateCondition } from "./health-diagnostics.js";

const form = document.querySelector("#simulation");
const report = document.querySelector("#simulation-report");
form.elements.scenario.innerHTML = HEALTH_SCENARIOS.map(item=>`<option value="${item}">${item[0].toUpperCase()+item.slice(1)}</option>`).join("");
function run(event) {
  event?.preventDefault();
  const { observations,repairs } = simulateCondition(form.elements.scenario.value,Number(form.elements.matches.value),Number(form.elements.seed.value));
  report.innerHTML = `<h2>${repairs} recuperaciones gratuitas entre encuentros</h2><ol>${observations.map(row=>
    `<li>${row.rounds} rondas · ${({win:"Victoria",loss:"Derrota",draw:"Empate"})[row.outcome]} · Fatiga añadida ${row.fatigue.join(", ")}
      · Fatiga acumulada ${row.current.join(", ")} · ${row.wounds.filter(Boolean).length} heridas · ${row.rested} en reserva · ${row.coins} óbolos</li>`).join("")}</ol>`;
}
form.addEventListener("submit",run);
document.querySelector("#formula").textContent = JSON.stringify({ HEALTH_RULES,FATIGUE_LEVELS,WOUNDS },null,2);
document.querySelector("#exposure").textContent = JSON.stringify(exposureExamples(),null,2);
document.querySelector("#treatments").textContent = JSON.stringify({ examples:recoveryExamples(),DAMAGE_FAMILIES },null,2);
run();
