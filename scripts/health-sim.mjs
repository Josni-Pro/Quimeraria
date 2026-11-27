import { exposureExamples, HEALTH_LENGTHS, HEALTH_SCENARIOS, recoveryExamples, simulateCondition } from "../docs/health-diagnostics.js";

const average = values=>Math.round(values.reduce((sum,n)=>sum+n,0)/Math.max(1,values.length)*10)/10;
for (const scenario of HEALTH_SCENARIOS) {
  for (const matches of HEALTH_LENGTHS) {
    const series = [0,7,19,31,47,65].map(seed=>simulateCondition(scenario,matches,seed));
    const encounters = series.flatMap(run=>run.observations);
    const ending = series.flatMap(run=>run.observations.at(-1).current);
    const fatigue = encounters.flatMap(row=>row.fatigue);
    console.log(JSON.stringify({ scenario,matches,samples:series.length,rounds:average(encounters.map(row=>row.rounds)),
      added:average(fatigue),range:[Math.min(...fatigue),Math.max(...fatigue)],final:average(ending),
      wounded:encounters.flatMap(row=>row.wounds).filter(wound=>wound>0).length,fought:fatigue.length,
      severe:encounters.flatMap(row=>row.wounds).filter(wound=>wound===3).length,rest:encounters.reduce((sum,row)=>sum+row.rested,0),
      repairs:series.reduce((sum,run)=>sum+run.repairs,0) }));
  }
}
console.log(JSON.stringify({ treatments:recoveryExamples(),exposure:exposureExamples() },null,2));
