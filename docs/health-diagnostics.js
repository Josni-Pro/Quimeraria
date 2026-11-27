import { advanceArena, arenaOffers, beginArena } from "./arena.js";
import { arenaProgress } from "./arena-records.js";
import { CARDS } from "./catalog.js";
import { creatureCopies } from "./creature-instances.js";
import { acknowledgeReveal, createGame, fuseCards, getCard } from "./engine.js";
import { arenaExposure, effectiveStats, woundFamily } from "./health.js";
import { applyRecovery, assignSpecialist, quoteRecovery, specialistSkills } from "./recovery.js";
import { getCreatureProfiles } from "./creature-profiles.js";

const squads = {
  defensiva:["mamut","anquilosaurio","triceratops",null,"medica","obrero"],
  ofensiva:["lobo","velociraptor","grifo","zorro",null,"dragon"],
  regenerativa:["ajolote","fenix","pulpo",null,"medica","sirena"],
  construida:["coloso","obrero",null,null,"herrera","g1"],
  generaciones:["g4",null,"g2","g1",null,"medica"]
};
export const HEALTH_SCENARIOS = [...Object.keys(squads),"rotativa"];
export const HEALTH_LENGTHS = [1,5,10];
const base = (serial=0) => ({ ...createGame(),coins:1000,
  inventory:Object.fromEntries(CARDS.map(card=>[card.id,8])),
  arena:{ ...arenaProgress({}),points:200,peak:200,serial } });
const must = result => {
  if (!result.ok) throw new Error(result.error);
  return result;
};

function buildCollection(serial) {
  let game = base(serial);
  const aliases = {};
  const mates = ["herrera","mamut","mago","triceratops"];
  for (let generation=1;generation<=mates.length;generation++) {
    let parent = "obrero";
    for (const mate of mates.slice(0,generation)) {
      const result = must(fuseCards(game,parent,mate,()=>0));
      game = must(acknowledgeReveal(result.state,result.reveal.id)).state;
      parent = result.card.id;
    }
    aliases["g"+generation] = parent;
  }
  const rolls = [0,.999999];
  const colossus = must(fuseCards(game,"alquimista","mamut",()=>rolls.shift() ?? 0));
  if (woundFamily(colossus.card)!=="structure") throw new Error("La muestra requiere un constructo.");
  game = must(acknowledgeReveal(colossus.state,colossus.reveal.id)).state;
  aliases.coloso = colossus.card.id;
  return { game,aliases };
}

export function simulateCondition(scenario, rounds = 10, serial = 0) {
  const { game:starting,aliases } = buildCollection(serial);
  let game = starting;
  const observations = [];
  let repairs = 0;
  for (let i=0;i<rounds;i++) {
    const cards = squads[scenario==="rotativa" ? i%2 ? "ofensiva" : "defensiva" : scenario];
    const formation = scenario==="generaciones" && i%2 ? ["g4",null,"g3","g1",null,null] : cards;
    const copies = formation.map(id=>id ? creatureCopies(game,aliases[id] ?? id)[0].id : null);
    const offer = arenaOffers(game).board[1];
    let open = beginArena(game,offer.id,copies);
    if (!open.ok) {
      game = must(applyRecovery(game,copies.filter(Boolean))).state;
      repairs++;
      open = must(beginArena(game,offer.id,copies));
    }
    const resolved = must(advanceArena(open.state,open.active.id,1,[],true));
    const { receipt } = resolved;
    game = resolved.state;
    observations.push({ match:i+1, rounds:receipt.rounds,outcome:receipt.outcome,
      fatigue:receipt.health.map(row=>row.after.fatigue-row.before.fatigue),
      current:receipt.health.map(row=>row.after.fatigue),
      wounds:receipt.health.map(row=>row.injury),rested:receipt.rested,
      unavailable:receipt.health.filter(row=>row.after.wound===3 || row.after.fatigue===100).length,
      coins:receipt.coins });
  }
  return { observations,repairs };
}

export function recoveryExamples() {
  const target = "legacy:lobo:0";
  const medic = "legacy:medica:0";
  const game = { ...base(),health:{ [target]:{ fatigue:74,wound:2,family:"bio" } } };
  const team = must(assignSpecialist(game,"enfermeria",medic)).state;
  const fullTeam = must(assignSpecialist(team,"enfermeria","legacy:alquimista:0")).state;
  const options = { area:"enfermeria",type:"restore" };
  return [quoteRecovery(game,[target]),quoteRecovery(game,[target],options),quoteRecovery(team,[target],options),
    quoteRecovery(fullTeam,[target],{ area:"enfermeria",type:"focus" })].map(quote=>({
    treatment:quote.type,staff:quote.staff.map(row=>row.skill.name),cost:quote.price,savings:quote.saving,
    after:quote.rows[0].after
  }));
}

export function exposureExamples() {
  const { game,aliases } = buildCollection(0);
  return ["lobo","mamut","ajolote","fenix","coloso","g1","g3","g4"].map(id=>{
    const card = getCard(aliases[id] ?? id,game);
    const { stats } = getCreatureProfiles(card).combat;
    const unit = { stats,maxHp:200,hp:40,metrics:{ received:160 } };
    const battle = {actions:7,specials:2,absorbed:25};
    const survival = arenaExposure(card,unit,battle);
    const knockout = arenaExposure(card,{ ...unit,hp:0,metrics:{ received:200 } },battle);
    const health = { fatigue:68,wound:2,family:woundFamily(card) };
    const effective = effectiveStats(stats,health);
    return { card:card.name,generation:card.generation,family:health.family,survival,knockout,stats,effective,
      skills:specialistSkills(card).map(skill=>skill.name) };
  });
}
