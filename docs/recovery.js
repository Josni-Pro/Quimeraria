import { getCard } from "./engine.js";
import { getCreatureConcept } from "./creature-concepts.js";
import { getCreatureProfiles } from "./creature-profiles.js";
import { activeCopies, creatureCopies } from "./creature-instances.js";
import { DAMAGE_FAMILIES, HEALTH_RULES as RULES, SANCTUARY_AREAS, TREATMENTS } from "./health-config.js";
import { healthFor, healthSummary, normalizeHealth, saveHealth } from "./health.js";

const fail = error => ({ ok:false,error });

export function recoveryInventory(game) {
  const occupied = activeCopies(game);
  return Object.keys(game.inventory).flatMap(cardId=>{
    const card = getCard(cardId,game);
    if (!card?.stats || card.category==="aberration") return [];
    return creatureCopies(game,cardId).map(({id},i)=>{
      const health = healthFor(game,id);
      return { id,card,index:i+1,health,status:healthSummary(health,occupied.has(id)),occupied:occupied.has(id) };
    });
  });
}

export function specialistSkills(card) {
  const concept = getCreatureConcept(card);
  if (!concept) return [];
  const { tags,knowledge,tools,capabilities } = concept;
  const { utility,combat } = getCreatureProfiles(card);
  const skills = [];
  const knowledgeText = [...knowledge,concept.profession ?? ""].join(" ");
  const regeneration = tags.includes("regeneration");
  const support = ["healer","support","logistics"].includes(combat.role) || ["healer","support"].includes(combat.secondaryRole);
  const add = (area,name,score) => skills.push({ area,name,score:Math.min(3,score) });

  if (/medicina|primeros auxilios|diagnóstico|curación/.test(knowledgeText) ||
      tags.includes("medicine") && support && (tools.length || capabilities.includes("heal") && concept.intelligence!=="animal")) {
    add("enfermeria",regeneration ? "Medicina regenerativa" : "Medicina",regeneration ? 3 : 2);
  } else if (regeneration && card.id==="fenix") add("enfermeria","Ceniza restauradora",2);
  else if (tags.includes("alchemy") && tools.length) add("enfermeria","Preparados alquímicos",1);

  if (tags.includes("smithing") || tags.includes("construction") ||
      /reparaci|mantenimiento|soldadura/.test(knowledgeText) ||
      concept.nature==="artificial" && concept.intelligence!=="animal" && utility.capabilities.includes("craft")) {
    add("taller",tags.includes("smithing") ? "Herrería" : "Restauración estructural",
      tags.includes("smithing") ? 3 : utility.capabilities.includes("craft") ? 2 : 1);
  }
  if (tags.includes("alchemy") || tags.includes("magic") && (support || /runa|ritual|energ/i.test(knowledgeText)) ||
      concept.nature==="divine" && support) {
    add("arcana",tags.includes("alchemy") ? "Alquimia" : "Estabilización arcana",support ? 3 : 2);
  }
  if (utility.capabilities.some(skill=>["logistics","supply"].includes(skill))) {
    add("descanso","Logística",utility.ratings.logistics ?? utility.ratings.supply ?? 1);
  }
  return skills;
}

export function assignSpecialist(game, area, id, remove = false) {
  if (!Object.hasOwn(SANCTUARY_AREAS,area)) return fail("Área de Santuario desconocida.");
  const specialists = { ...game.specialists };
  const members = specialists[area] ?? [];
  if (remove) {
    if (!members.includes(id)) return fail("La asignación ya cambió.");
    const rest = members.filter(value=>value!==id);
    if (rest.length) specialists[area] = rest;
    else delete specialists[area];
  } else {
    const patient = recoveryInventory(game).find(copy=>copy.id===id);
    if (!patient || !patient.status.available || patient.health.fatigue>=75 ||
        !specialistSkills(patient.card).some(skill=>skill.area===area)) return fail("Ese ejemplar no puede asistir en esta área.");
    if (Object.values(specialists).some(list=>list.includes(id))) return fail("Este ejemplar ya está asignado.");
    if (members.length>=RULES.specialistsPerArea) return fail("Retira un especialista para liberar una plaza.");
    specialists[area] = [...members,id];
  }
  return { ok:true,state:{ ...game,specialists,healthRevision:(game.healthRevision ?? 0)+1 } };
}

export function treatmentStaff(game,area,inventory,excluded = new Set()) {
  const byId = new Map(inventory.map(copy=>[copy.id,copy]));
  return (game.specialists?.[area] ?? []).flatMap(id=>{
    const patient = byId.get(id);
    const skill = patient && specialistSkills(patient.card).find(item=>item.area===area);
    if (!skill) return [];
    return [{ ...patient,skill,working:patient.status.available && patient.health.fatigue<75 && !excluded.has(id) }];
  });
}

export function quoteRecovery(game, ids, { area = "descanso", type = "free" } = {}) {
  if (!Object.hasOwn(TREATMENTS,type) || !Object.hasOwn(SANCTUARY_AREAS,area)) return fail("Tratamiento desconocido.");
  if (type==="rest" && area!=="descanso") return fail("El descanso guiado se ofrece en la zona de descanso.");
  if (["focus","restore"].includes(type) && area==="descanso") return fail("Elige un área compatible con la lesión.");
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size!==ids.length) return fail("Selecciona ejemplares distintos.");
  const inventory = recoveryInventory(game);
  const byId = new Map(inventory.map(row=>[row.id,row]));
  const staff = treatmentStaff(game,area,inventory,new Set(ids)).filter(row=>row.working);
  const efficiency = staff.reduce((sum,row)=>sum+row.skill.score,0);
  const discount = type==="free" ? 0 : Math.min(RULES.maxDiscount,efficiency*RULES.prices.specialistStep);
  const rows = [];
  let skipped = 0;
  for (const id of ids) {
    const patient = byId.get(id);
    if (!patient || patient.occupied) { skipped++; continue; }
    const { health:before } = patient;
    const fits = DAMAGE_FAMILIES[before.family]?.areas.includes(area);
    if (!patient.status.needsCare || (type==="rest" && !before.fatigue) ||
        (["focus","restore"].includes(type) && (!before.wound || !fits))) { skipped++; continue; }
    const after = { ...before };
    let fullPrice = 0;
    const prices = RULES.prices;
    if (type==="free") {
      after.fatigue=0;
      after.wound=0;
    } else if (type==="rest") {
      const amount = Math.min(before.fatigue,26+efficiency*3);
      fullPrice = prices.restBase+Math.ceil(amount/prices.restStep);
      after.fatigue -= amount;
      after.reserve = Math.max(before.reserve ?? 0,Math.min(4,2+Math.floor(efficiency/2)));
    } else {
      const complete = type==="restore";
      fullPrice = (complete ? prices.complete : prices.focused)[before.wound];
      after.wound = Math.max(0,before.wound-(complete ? 3 : efficiency>=4 ? 2 : 1));
      after.fatigue -= (complete ? 26 : 12)+efficiency*3;
      after.reserve = Math.max(before.reserve ?? 0,Math.min(RULES.maxReserve,(complete ? 4 : 2)+Math.floor(efficiency/2)));
    }
    const condition = normalizeHealth(after);
    const cost = Math.max(type==="free" ? 0 : 1,Math.round(fullPrice*(1-discount)));
    rows.push({ id,cardId:patient.card.id,name:patient.card.name,before,after:condition,cost,fullPrice });
  }
  if (!rows.length) return fail("No hay ejemplares compatibles que necesiten ese tratamiento.");
  const price = rows.reduce((sum,row)=>sum+row.cost,0);
  const saving = rows.reduce((sum,row)=>sum+row.fullPrice-row.cost,0);
  return { ok:true,area,type,rows,staff,discount,saving,skipped,price,remaining:game.coins-price,
    affordable:game.coins>=price,revision:game.healthRevision ?? 0 };
}

export function applyRecovery(game,ids,options,expected) {
  const quote = quoteRecovery(game,ids,options);
  if (!quote.ok) return quote;
  if (expected && (expected.revision!==quote.revision || expected.price!==quote.price ||
      expected.count!==quote.rows.length || expected.balance!==game.coins)) {
    return fail("Las condiciones cambiaron. Revisa el tratamiento antes de confirmarlo.");
  }
  if (!quote.affordable) return fail("Saldo insuficiente. La recuperación gratuita está disponible.");
  const health = { ...game.health };
  for (const row of quote.rows) saveHealth(health,row.id,row.after);
  return { ok:true,quote,state:{ ...game,coins:quote.remaining,health,healthRevision:quote.revision+1 } };
}
