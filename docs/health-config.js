export const HEALTH_RULES = Object.freeze({
  maximum:100, maxPenalty:.30, rosterRest:6, specialistsPerArea:2, maxDiscount:.30, maxReserve:6,
  fatigue:{ base:4, actions:.53, actionCap:7.5, specials:.72, specialCap:3, stress:3.2, stressCap:4.5,
    minimum:3, cap:22, hardship:.65, resistanceScale:48, resistanceCap:1.6, regeneration:1.45 },
  wounds:{ knockout:.59, knockoutMin:.20, knockoutMax:.91, knockoutStress:.07, knockoutStressCap:.17,
    exposed:.24, survivorCap:.32, survivorStress:.027, safeLife:.52, safeStress:1.4,
    hardship:.035, absorbed:.08, regeneration:.14, armor:.045,
    severeBase:.055, severeStress:.04, severeRisk:.55, severeCap:.16,
    moderate:.38, moderateFloor:.18, moderateRisk:.68, moderateSurvivorLife:.29, moderateSurvivor:.20 },
  prices:{ restBase:2, restStep:12, focused:[0,5,10,16], complete:[0,6,12,19], specialistStep:.075 }
});
export const FATIGUE_LEVELS = Object.freeze([
  { min:0,label:"Descansada", penalties:{} },
  { min:25,label:"Cansada", penalties:{ agility:.05 } },
  { min:50,label:"Fatigada", penalties:{ agility:.10,strength:.10,magic:.10 } },
  { min:75,label:"Exhausta", penalties:{ agility:.20,strength:.20,magic:.20 } },
  { min:100,label:"Agotada", penalties:{ agility:.20,strength:.20,magic:.20 } }
]);
export const WOUNDS = Object.freeze([
  { label:"Sana", penalty:0 }, { label:"Herida leve", penalty:.05 },
  { label:"Herida moderada", penalty:.15 }, { label:"Herida grave", penalty:.20 }
]);
export const DAMAGE_FAMILIES = Object.freeze({
  bio:{ name:"Biológica", labels:["Distensión","Contusión","Lesión profunda"],
    attrs:["vitality","agility","strength"], areas:["enfermeria"] },
  structure:{ name:"Estructural", labels:["Articulación desgastada","Blindaje fisurado","Fallo de soporte"],
    attrs:["vitality","defense","agility"], areas:["taller"] },
  arcane:{ name:"Arcana", labels:["Agotamiento arcano","Inestabilidad energética","Desequilibrio sobrenatural"],
    attrs:["vitality","magic","resistance"], areas:["arcana"] },
  mixed:{ name:"Mixta", labels:["Desajuste de componentes","Desestabilización alquímica","Daño de integración"],
    attrs:["vitality","defense","magic","agility"], areas:["enfermeria","taller","arcana"] }
});
export const SANCTUARY_AREAS = Object.freeze({
  enfermeria:{ title:"Enfermería", icon:"✚", tone:"#eac491", note:"Cuidados físicos para organismos y cuerpos híbridos." },
  taller:{ title:"Taller de restauración", icon:"◇", tone:"#ecc198", note:"Reparación de blindajes, estructuras y componentes." },
  arcana:{ title:"Cámara arcana", icon:"✧", tone:"#ccb1eb", note:"Estabilización de criaturas elementales, mágicas o espirituales." },
  descanso:{ title:"Zona de descanso", icon:"◒", tone:"#bdd7ae", note:"Descanso y recuperación gratuita para toda la colección." }
});
export const TREATMENTS = Object.freeze({
  free:{ name:"Recuperación gratuita", description:"Elimina toda la fatiga y las heridas." },
  rest:{ name:"Descanso guiado", description:"Reduce la fatiga de inmediato. Los especialistas amplían el descanso." },
  focus:{ name:"Tratamiento del área", description:"Reduce la gravedad de una lesión compatible y alivia la fatiga." },
  restore:{ name:"Restauración inmediata", description:"Elimina la herida y reduce la fatiga en una intervención." }
});
