# Refinamiento de fusiones y preparación artística

Comparación contra `a696355`. El barrido abarca las parejas base sin orden, incluidas dos copias de una misma carta. Las cifras de arte corresponden al nivel inicial del retrato. Para las generaciones superiores se mantuvo una muestra de 13 cruces comparables, entre ellos un Dragón convergente con Thor, dos Colosos Alquímicos y crías G2 y G3 con linajes disjuntos.

| Indicador | Antes | Después |
| --- | ---: | ---: |
| Cartas base | 31 | 31 |
| Parejas base | 496 | 496 |
| Resultados exitosos | 1.507 | 1.180 |
| Promedio por pareja | 3,04 | 2,38 |
| Parejas con un solo resultado | 0 | 61 |
| Parejas con dos resultados | 202 | 239 |
| Planeadores | 145 | 50 |
| Simbiosis | 210 | 80 |
| Excepcionales | 121 | 10 |
| Oráculos del Voto excepcionales | 118 | 1 |
| Rol principal Soporte | 423 | 155 |
| Convergencias | 11 | 13 |
| Especies convergentes distintas | 1 | 3 |
| Formas mitológicas / extintas | 2 / 1 | 5 / 2 |
| Híbridos antropomórficos / beastkin explícitos | 1 / 1 | 201 / 10 |
| Construcciones vivientes / portadores de estructuras | 1 / 50 | 3 / 54 |
| Variantes con arte definitivo asignado | 55 | 59 |
| Provisionales WebP / SVG | 452 / 1.000 | 452 / 669 |
| SVG compartidos entre variantes | 44 | 22 |
| Cruces con dos alternativas que comparten el mismo SVG | 5 | 0 |
| Pinturas visibles sin referencia definitiva en la ficha | 32 | 0 |
| Fichas clásicas con la frase «Retrato de la fusión original» | 496 | 0 |
| Variantes en la muestra G2–G4 | 37 | 29 |

Las 29 opciones de la muestra avanzada se reparten en G2 (15), G3 (9) y G4 (5). Usan arte procedural bajo demanda. Alquimista + Mamut conserva el máximo de ocho opciones. Las parejas con una sola opción descartaron alternativas que repetían una plantilla sin una justificación suficiente. El sorteo sigue normalizando los pesos de las calidades compatibles.

## Casos que fijan la dirección

- **Dos búhos.** Se retira el Planeador del sorteo futuro y se conserva la evolución de gran envergadura. Una partida de la versión anterior sigue cargando su Planeador con el nombre, el identificador, el inventario y el perfil guardados.
- **Médica + Búho.** La rescatista usa el vuelo para llegar a heridos aislados y utiliza un arnés de evacuación. Su rol es Sanador y su utilidad incluye transporte. Las profesiones civiles, de construcción, alquimia, magia rúnica, abogacía, medicina, herrería, cartografía, música y arquitectura tienen actividades y equipo propios. Los talleres de dos oficios asignan el rol según sus tareas.
- **Herrera + Anquilosaurio.** La Forja de Placas usa los segmentos metálicos como articulaciones y el lomo como yunque. Arquitecta + Tricerátops puede obtener un taller o un barrio habitable, con funciones y escalas distintas. Médica + Lobo incorpora una interpretación beastkin que conserva la función médica.
- **Atenea + Thor.** La Égida del Trueno convierte el escudo de Atenea en el techo de una ciudadela y el martillo de Thor en un sistema de contrafuertes pararrayos. El Oráculo del Voto queda reservado a Abogado + Anubis, donde el oficio y el ritual funerario justifican el pacto.
- **Pulpo + Mamut.** El Vigía de Dos Orillas ahora tiene cuatro patas y un depósito húmedo sobre el lomo. La forma nueva tiene identificador propio para conservar las versiones anteriores de la criatura.
- **Especies reconocidas.** Se incorporaron las convergencias a Fénix y Sirena, y las formas Wyvern, Cerbero, Kraken y Oso cavernario. Las afinidades y transformaciones pertenecen al mundo fantástico del juego. Las convergencias usan el arte existente y conservan la generación y el linaje de la fusión.

La biblioteca de presupuestos y atributos sigue siendo compartida. Los roles principales después del barrido se reparten entre Hechicero (276), Guardián (212), Logístico (206), Asaltante (157), Soporte (155), Tirador (55), Sanador (40), Controlador (39), Combatiente (23), Artillería (13) y Asesino (4). La distribución refleja las tareas propuestas por las variantes y conserva las estadísticas de expedición.

## Arte de producción

`docs/fusion-art-registry.js` resuelve los recursos compartidos por el juego y por la galería. El JSON distingue pintura definitiva, WebP provisional, SVG procedural, Canvas procedural y arte pendiente. La ficha expone silueta, anatomía, tamaño, rasgos, herramientas, función visible y aportes de los dos progenitores. Para ver y exportar una pareja, sirve `docs` con `python3 -m http.server 8000 --directory docs` y abre `/diagnostics.html`.

El piloto integra dos pinturas de 768 × 768 en `docs/assets/piloto/`. **Coloso Alquímico** muestra patas columnares, colmillos minerales y el núcleo expuesto. **Kitsune** muestra las colas ilusorias separándose hacia distintos caminos. Las pinturas se aplican también a ejemplares históricos de esas dos variantes.

La base está preparada para ampliar un piloto. Antes de producir en serie conviene revisar los encargos por lotes, en especial los clásicos derivados de rasgos combinados, las 157 manifestaciones elementales y los 22 SVG que se comparten entre parejas. Las fichas estructuradas dan un punto de partida y la coherencia de cada encargo aún requiere revisión editorial.

## Comprobaciones

`node --test tests/*.mjs` comprueba el catálogo, los perfiles, la conservación de identidades y el guardado real del motor anterior. Chromium comprueba la galería y el flujo desde la Forja hasta la revelación, incluida la carga de las pinturas piloto. Las 21 comprobaciones pasaron. Chromium decodificó las 1.153 fuentes distintas de los 509 cruces auditados sin errores ni discrepancias de estado del arte. La prueba móvil se hizo con un viewport emulado de 393 px.
