import { getCreatureConcept } from "./creature-concepts.js";
import { creatureCopies } from "./creature-instances.js";
import { DAMAGE_FAMILIES, FATIGUE_LEVELS, HEALTH_RULES as RULES, SANCTUARY_AREAS, WOUNDS } from "./health-config.js";

export const HEALTHY = Object.freeze({ fatigue:0,wound:0,family:null });
const integer = (value,max) => Number.isFinite(value) ? Math.max(0,Math.min(max,Math.round(value))) : 0;

export function normalizeHealth(record) {
  const fatigue = integer(record?.fatigue,RULES.maximum);
  const wound = integer(record?.wound,WOUNDS.length-1);
  const family = wound ? (Object.hasOwn(DAMAGE_FAMILIES,record?.family) ? record.family : "bio") : null;
  const reserve = integer(record?.reserve,RULES.maxReserve);
  return { fatigue,wound,family,...(reserve && {reserve}) };
}

export const healthFor = (game,id) => game.health?.[id] ?? HEALTHY;

export function healthSummary(record, occupied = false) {
  const fatigue = FATIGUE_LEVELS.findLast(level=>record.fatigue>=level.min);
  const wound = WOUNDS[record.wound];
  const injury = DAMAGE_FAMILIES[record.family];
  const blocked = occupied ? "Ocupada en Arena" : record.wound===3 ? "Herida grave" : record.fatigue===RULES.maximum ? "Agotada" : "";
  return { fatigue:fatigue.label,wound:wound.label,damage:injury?.labels[record.wound-1] ?? "",
    blocked,available:!blocked, needsCare:Boolean(record.fatigue || record.wound) };
}

export function effectiveStats(stats, record) {
  const tiredness = FATIGUE_LEVELS.findLast(level=>record.fatigue>=level.min).penalties;
  const affected = DAMAGE_FAMILIES[record.family]?.attrs ?? [];
  const injury = WOUNDS[record.wound].penalty;
  const penalties = Object.fromEntries(Object.keys(stats).map(attr=>[attr,
    Math.min(RULES.maxPenalty,Math.round(((tiredness[attr] ?? 0)+(affected.includes(attr) ? injury : 0))*100)/100)]));
  return { stats:Object.fromEntries(Object.entries(stats).map(([attr,value])=>[attr,Math.max(1,Math.round(value*(1-penalties[attr])))])), penalties };
}

export function woundFamily(card) {
  const concept = getCreatureConcept(card);
  const tags = concept?.tags ?? [];
  const arcane = ["elemental","spiritual","divine","mythic","mythical"].includes(concept?.nature) &&
    (tags.some(tag=>["magic","ritual","supernatural"].includes(tag)) || ["elemental","spiritual","divine"].includes(concept?.nature));
  const materials = concept?.materials ?? [];
  const built = concept?.anatomy==="construct" || concept?.nature==="artificial";
  const integrated = concept?.structure || tags.includes("transmuted") ||
    (materials.some(material=>/acero|bronce|obsidiana|cobre/.test(material)) && card.generation);
  if ((built && arcane) || (integrated && !built)) return "mixed";
  if (built) return "structure";
  return arcane ? "arcane" : "bio";
}

export function arenaExposure(card, unit, { actions = 0, specials = 0, absorbed = 0, hardship = 0 } = {}) {
  const family = woundFamily(card);
  const tags = getCreatureConcept(card)?.tags ?? [];
  const incoming = unit.metrics.received;
  const life = Math.max(1,unit.maxHp);
  const stress = incoming/life;
  const remaining = unit.hp/life;
  const regenerative = tags.includes("regeneration");
  const armored = tags.includes("armored") || family==="structure";
  const buffer = Math.min(1,absorbed/life);
  const work = RULES.fatigue;
  const resistance = Math.min(work.resistanceCap,(unit.baseStats?.resistance ?? unit.stats.resistance)/work.resistanceScale);
  const effort = work.base+Math.min(work.actionCap,actions*work.actions)+Math.min(work.specialCap,specials*work.specials)
    +Math.min(work.stressCap,stress*work.stress)+hardship*work.hardship-resistance-(regenerative ? work.regeneration : 0);
  const fatigue = Math.max(work.minimum,integer(effort,work.cap));
  const hit = RULES.wounds;
  const knock = unit.hp<=0;
  const risks = hardship*hit.hardship-buffer*hit.absorbed-(regenerative ? hit.regeneration : 0)-(armored ? hit.armor : 0);
  const chance = knock ? Math.max(hit.knockoutMin,Math.min(hit.knockoutMax,hit.knockout+Math.min(hit.knockoutStressCap,stress*hit.knockoutStress)+risks)) :
    remaining>hit.safeLife && stress<hit.safeStress ? 0 : Math.max(0,Math.min(hit.survivorCap,(1-remaining)*hit.exposed+stress*hit.survivorStress+risks));
  const severe = knock ? Math.max(0,Math.min(hit.severeCap,hit.severeBase+Math.max(0,stress-1)*hit.severeStress+risks*hit.severeRisk)) : 0;
  const moderate = knock ? Math.max(hit.moderateFloor,hit.moderate+risks*hit.moderateRisk) :
    remaining<hit.moderateSurvivorLife ? hit.moderateSurvivor : 0;
  return { fatigue,family,chance,severe,moderate };
}

export function rollWound(exposure, random) {
  if (random()>=exposure.chance) return 0;
  const severity = random();
  return severity<exposure.severe ? 3 : severity<exposure.severe+exposure.moderate ? 2 : 1;
}

export function saveHealth(health,id,record) {
  const next = normalizeHealth(record);
  if (next.fatigue || next.wound || next.reserve) health[id] = next;
  else delete health[id];
}

export function resolveCondition(game, { participants, rounds, completed, hardship = 0, rng, cardFor }) {
  if (!rounds) return { state:game, changes:[], rested:0 };
  const health = { ...game.health };
  const present = new Set(participants.map(row=>row.copyId));
  const changes = participants.flatMap(({copyId,cardId,unit,activity})=>{
    const card = cardFor(cardId);
    if (!card) return [];
    const before = healthFor(game,copyId);
    const exposure = arenaExposure(card,unit,{ ...activity,hardship });
    const injury = rollWound(exposure,rng);
    const next = normalizeHealth({ fatigue:before.fatigue+Math.max(1,exposure.fatigue-(before.reserve ?? 0)),wound:Math.max(before.wound,injury),
      family:injury>before.wound ? exposure.family : before.family ?? exposure.family });
    saveHealth(health,copyId,next);
    return [{ copyId,cardId,name:card.name,before,after:next,injury }];
  });
  let rested = 0;
  if (completed) for (const [id,record] of Object.entries(health)) {
    if (!present.has(id) && record.fatigue) {
      saveHealth(health,id,{ ...record,fatigue:record.fatigue-RULES.rosterRest });
      rested++;
    }
  }
  return { state:{ ...game,health,healthRevision:(game.healthRevision ?? 0)+1 },changes,rested };
}

export function restoreHealth(raw,game) {
  if (!raw.health && !raw.specialists && !raw.healthRevision) return {};
  const valid = new Set(Object.keys(game.inventory).filter(id=>!game.aberrations[id]).flatMap(id=>creatureCopies(game,id).map(copy=>copy.id)));
  const health = {};
  for (const [id,record] of Object.entries(raw.health ?? {})) if (valid.has(id)) saveHealth(health,id,record);
  const used = new Set();
  const specialists = {};
  for (const area of Object.keys(SANCTUARY_AREAS)) {
    const members = [];
    for (const id of Array.isArray(raw.specialists?.[area]) ? raw.specialists[area] : []) {
      if (members.length>=RULES.specialistsPerArea) break;
      if (!valid.has(id) || used.has(id)) continue;
      used.add(id);
      members.push(id);
    }
    if (members.length) specialists[area] = members;
  }
  return { ...(raw.health && {health}), ...(raw.specialists && {specialists}),
    healthRevision:Number.isSafeInteger(raw.healthRevision) && raw.healthRevision>=0 ? raw.healthRevision : 0 };
}
