import { COMBAT_STATS } from "./creature-profiles.js";
import { DAMAGE_FAMILIES, SANCTUARY_AREAS } from "./health-config.js";
import { effectiveStats, healthSummary } from "./health.js";

export const escapeHealth = value => String(value ?? "").replace(/[&<>"']/g,char=>
  ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[char]);

export function conditionLabel(record,status = healthSummary(record)) {
  return `${status.fatigue} · ${record.fatigue}/100 · ${status.wound}`;
}

export function availabilityLabel(status,record) {
  if (!status.available) return status.blocked;
  if (record.fatigue>=75) return "Exhausta · disponible con penalizaciones";
  if (record.wound || record.fatigue>=25) return "Disponible con penalizaciones";
  return "Disponible";
}

export function healthDetails(record,status,stats,{ training = false,link = "" } = {}) {
  const effective = effectiveStats(stats,record);
  const areas = DAMAGE_FAMILIES[record.family]?.areas ?? [];
  return `<div class="creature-health-detail">
    <p><strong>${conditionLabel(record,status)}</strong>${status.damage ? ` · ${status.damage}` : ""}</p>
    <p>${availabilityLabel(status,record)}${record.reserve ? ` · Reserva de ${record.reserve} de fatiga para el próximo combate` : ""}</p>
    <p>${training ? "El entrenamiento usa los atributos originales. " : ""}Atributos de Arena <small>Original → efectivo</small></p>
    <div class="creature-health-stats">${Object.entries(COMBAT_STATS).map(([id,label])=>`<div><small>${label}</small>
      <strong>${stats[id]} → ${effective.stats[id]}</strong><span>${effective.penalties[id] ? "−"+Math.round(effective.penalties[id]*100)+" %" : "0 %"}</span></div>`).join("")}</div>
    <p>Tratamientos ${areas.map(area=>SANCTUARY_AREAS[area].title).join(", ")}${areas.length ? " · " : ""}Recuperación gratuita${record.fatigue ? " · Descanso guiado" : ""}</p>
    ${link ? `<a href="./sanctuary.html?copy=${encodeURIComponent(link)}">Ver ejemplar en el Santuario →</a>` : ""}
  </div>`;
}
