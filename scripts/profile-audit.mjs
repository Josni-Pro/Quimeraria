import { CARDS } from "../docs/catalog.js";
import { COMBAT_STATS, getCreatureProfiles } from "../docs/creature-profiles.js";
import { createGame, getCard, inspectFusionVariants } from "../docs/engine.js";
import { seededRng } from "../docs/pack-diagnostics.js";

const base = CARDS.map(card => getCard(card.id));
const sample = [base, [], [], [], []];
const archive = createGame();
for (const [i,one] of base.entries()) for (const two of base.slice(i)) {
  sample[1].push(...inspectFusionVariants(archive,one.id,two.id).variants);
}
const random = seededRng(5813);
for (let generation = 2; generation <= 4; generation++) {
  const found = new Map();
  const prior = sample[generation-1];
  while (found.size < 180) {
    const left = prior[Math.floor(random()*prior.length)];
    const eligible = base.filter(card => !left.lineage.includes(card.id));
    const right = eligible[Math.floor(random()*eligible.length)];
    const variants = inspectFusionVariants({ ...archive, fusions:{ [left.id]:left } },left.id,right.id).variants;
    const variant = variants[Math.floor(random()*variants.length)];
    found.set(variant.id,variant);
  }
  sample[generation] = [...found.values()];
}

const attributes = Object.keys(COMBAT_STATS);
const rounded = n => Number(n.toFixed(3));
function stats(values) {
  const sorted = values.slice().sort((a,b)=>a-b);
  const n = sorted.length;
  const mean = sorted.reduce((a,b)=>a+b,0)/n;
  return { min:sorted[0], max:sorted.at(-1), mean:rounded(mean), median:(sorted[Math.floor((n-1)/2)]+sorted[Math.floor(n/2)])/2,
    deviation:rounded(Math.sqrt(sorted.reduce((sum,x)=>sum+(x-mean)**2,0)/n)), distinct:new Set(sorted).size };
}

function measure(cards) {
  const entries = cards.map(card => getCreatureProfiles(card).combat);
  // Una vecindad casi idéntica admite dos puntos por atributo y hasta ocho de distancia L1.
  const exact = new Set(), near = new Set();
  let equalPairs = 0, nearPairs = 0;
  for (const [i,a] of entries.entries()) for(let j=i+1;j<entries.length;j++){
    const b = entries[j];
    if (a.powerBudget !== b.powerBudget) continue;
    const delta=attributes.map(attr=>Math.abs(a.stats[attr]-b.stats[attr]));
    if(delta.every(n=>n===0)){ equalPairs++;exact.add(i);exact.add(j); }
    if(delta.every(n=>n<=2)&&delta.reduce((x,y)=>x+y,0)<=8){ nearPairs++;near.add(i);near.add(j); }
  }
  return { count:cards.length,equalPairs,nearPairs, exactCards:exact.size,nearCards:near.size,
    stats:Object.fromEntries([...attributes.map(attr=>[attr,stats(entries.map(e=>e.stats[attr]))]),
      ["budget",stats(entries.map(c=>c.powerBudget))]]) };
}

function group(cards, key) {
  const groups = new Map();
  for(const card of cards){
    const label=key(card);
    if(!groups.has(label)) groups.set(label,[]);
    groups.get(label).push(card);
  }
  return Object.fromEntries([...groups].map(([label,items])=>[label,measure(items)]));
}
const all=sample.flat();
console.log(JSON.stringify({ seed:5813, overall:measure(all), generations:sample.map(measure),
  rarity:group(all,c=>c.rarity), role:group(all,c=>getCreatureProfiles(c).combat.role),
  byGeneration:sample.map(cards=>({ rarity:group(cards,c=>c.rarity),role:group(cards,c=>getCreatureProfiles(c).combat.role) })),
  examples: [...base,...inspectFusionVariants(archive,"alquimista","mamut").variants].map(card=>({id:card.id,name:card.name,
    ...getCreatureProfiles(card).combat})) },null,2));
