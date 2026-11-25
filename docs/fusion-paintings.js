// Pair keys use the canonical order. Add an entry here and a WebP under assets/fusiones.
export function fusionArtKey(parents) {
  return [...parents].sort().join("--");
}

const paintedPairs = [
  ["alquimista", "buho"], ["alquimista", "zorro"], ["alquimista", "mamut"], ["alquimista", "obrero"],
  ["lobo", "zorro"], ["lobo", "buho"], ["lobo", "mamut"], ["lobo", "obrero"],
  ["zorro", "buho"], ["zorro", "mamut"], ["zorro", "obrero"], ["buho", "mamut"],
  ["buho", "obrero"], ["alquimista", "alquimista"], ["obrero", "obrero"], ["lobo", "lobo"],
  ["zorro", "zorro"], ["mamut", "mamut"], ["buho", "buho"], ["abogado", "dragon"],
  ["abogado", "pulpo"], ["herrera", "fenix"], ["ajolote", "sirena"], ["dragon", "mamut"],
  ["anubis", "thor"], ["atenea", "dragon"], ["grifo", "quetzalcoatl"], ["dragon", "fenix"],
  ["lobo", "megalodon"], ["velociraptor", "zorro"], ["buho", "triceratops"], ["anquilosaurio", "triceratops"],
];
export const PAINTED_FUSIONS = new Set(paintedPairs.map(fusionArtKey));

// For dedicated art at any generation, add its exact card ID and one to three WebP keys in assets.
export const PORTRAIT_OVERRIDES = new Map();

for (const pair of [
  "alquimista--lobo", "buho--lobo", "buho--buho", "buho--zorro",
  "alquimista--mamut", "lobo--mamut", "abogado--pulpo", "obrero--zorro"
]) {
  PORTRAIT_OVERRIDES.set(`aberration(${pair.replace("--", "+")})`, ["aberraciones/" + pair]);
}
