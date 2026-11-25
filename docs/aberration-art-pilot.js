// Pinturas definitivas asociadas a la variante, nunca a la copia individual.
export const ABERRATION_PILOT = [
  { parents: ["lobo", "zorro"], key: "axis-lock", asset: "aberraciones/piloto/paso-en-espejo",
    direction: "El hombro de lobo y la cola vulpina se leen en una sola masa torcida. El cuerpo descansa sobre el flanco. Las patas enfrentadas y el apoyo bifurcado quedan recogidos bajo el pecho." },
  { parents: ["pulpo", "sirena"], key: "sensory-loop", asset: "aberraciones/piloto/eco-de-retorno",
    direction: "Un rostro de sirena queda hundido de lado en el manto. Los brazos con ventosas se repliegan y sus extremos se traban en el centro. El cuerpo se hunde contra el sedimento y las ondas regresan al nudo." },
  { parents: ["arquitecta", "triceratops"], key: "load-bind", asset: "aberraciones/piloto/contrafuerte-empotrado",
    direction: "La clave quebrada derriba el arco que crece de la piel del Tricerátops. La piedra descansa sobre el suelo. El arco fuerza un apoyo hacia el centro y otro queda suspendido." },
  { parents: ["fenix", "sirena"], key: "phase-bleed", asset: "aberraciones/piloto/marea-que-se-apaga",
    direction: "Las alas quedan plegadas hacia la roca, con el cuerpo hundido entre ellas. La materia acuática cae por el centro antes de cerrar una aleta. La transformación se lee en una única masa pegada a la costa." },
  { parents: ["herrera", "zorro"], key: "blocked-craft", asset: "aberraciones/piloto/mordaza-sin-alcance",
    direction: "Un yunque continuo con el hocico sustituye la mandíbula. La masa inmoviliza el cuello contra el suelo, oculta la abertura de la boca y aprisiona las patas delanteras detrás de la base." },
  { parents: ["atenea", "quetzalcoatl"], key: "domain-knot", asset: "aberraciones/piloto/egida-a-contraviento",
    direction: "Los pliegues del bronce invertido aprisionan la cresta y el cuello de la serpiente. La masa en caída atraviesa el pavimento. Las corrientes enfrentadas regresan a las hendiduras del cuerpo." },
  { parents: ["ajolote", "zorro"], key: "interrupted", asset: "aberraciones/piloto/ribera-a-medias",
    direction: "El frente vulpino descansa directamente en el barro. La aleta larvaria se cierra alrededor de las patas y deja las puntas hacia arriba. Las branquias quedan tendidas bajo el borde de la membrana." },
  { parents: ["fusion(alquimista+mamut)", "obrero"], key: "overgrowth", asset: "aberraciones/piloto/puntales-saturados",
    direction: "El mamut alquímico pierde apoyo cuando los puntales se multiplican a través de sus articulaciones. La cuña mineral carga el torso sobre el suelo y desvía las patas hacia los lados." },
];

// Las pinturas originales siguen en el archivo de revisión. Su ficha de
// colección conserva el mismo ID y usa el respaldo corporal corregido.
export const ARCHIVED_ABERRATION_PAINTINGS = new Set([
  "aberration(abogado+pulpo)",
  "aberration(alquimista+lobo)",
  "aberration(alquimista+mamut)",
  "aberration(buho+buho)",
  "aberration(buho+lobo)",
  "aberration(buho+zorro)",
  "aberration(obrero+zorro)"
]);

export function aberrationId(parents, key) {
  return `aberration(${[...parents].sort().join("+")};${key})`;
}

const paintings = new Map(ABERRATION_PILOT.map(entry => [aberrationId(entry.parents, entry.key), entry]));

export function aberrationPainting(id) {
  return paintings.get(id);
}
