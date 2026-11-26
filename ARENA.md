# Quimeraria · Arena, perfiles y sobres almacenados

La rama parte de `c0be80a`. **Arena** está en el menú principal y se sirve en `arena.html`. La tienda conserva la ruta `#sobres` y el diagnóstico se abre en `pack-lab.html`. Para probar la rama localmente, ejecuta `python3 -m http.server 8000 --directory docs` desde la raíz.

## Organización de las cartas

Inventario, biblioteca, colección, Forja, selección de expediciones, entrenamiento y constructor de Arena usan el mismo comparador. Ordena inicialmente de mítica a común, luego por generación más alta y nombre. Alquimia, el diagnóstico y los resultados agrupados de sobres también usan ese criterio. En los selectores con controles se puede ordenar en ambos sentidos por rareza, generación, nombre, cualquiera de los seis atributos de combate, coste de despliegue, cantidad y obtención reciente. La preferencia de orden se comparte en el navegador. Los filtros de búsqueda y categoría de cada sección y los filtros del constructor se restauran en la sesión. Cambiar el orden o filtrar actúa sobre la lista de cartas disponibles. Las plazas de formación y las cartas seleccionadas conservan su posición.

## Auditoría de atributos

`node scripts/profile-audit.mjs` examina las 31 cartas G0 y las **1 206 variantes G1** de las 496 parejas. Para G2–G4 se extraen 180 identificadores únicos por generación con semilla 5813, usando cruces reales entre un ejemplar de la generación anterior y cartas base de linaje compatible. La auditoría incluye mínimo, máximo, media, mediana, desviación estándar poblacional y valores distintos para cada atributo, por generación, rareza y rol. También publica grupos cruzados, presupuestos, pares coincidentes y ejemplos. Una coincidencia casi exacta exige igual presupuesto, diferencias de hasta dos puntos por atributo y distancia total de hasta ocho. Incluye las coincidencias exactas.

| Generación | Cartas | Con otra idéntica, antes → después | Con otra casi idéntica, antes → después | VIT distintas | AGI distintas |
| --- | ---: | ---: | ---: | ---: | ---: |
| G0 | 31 | 10 → 0 | 10 → 0 | 16 → 26 | 15 → 24 |
| G1 | 1 206 | 1 162 → 272 | 1 164 → 413 | 37 → 66 | 44 → 76 |
| G2 | 180 | 162 → 8 | 162 → 12 | 27 → 60 | 26 → 64 |
| G3 | 180 | 164 → 4 | 164 → 8 | 23 → 64 | 24 → 71 |
| G4 | 180 | 165 → 6 | 165 → 6 | 22 → 72 | 23 → 77 |

| Atributo | Rango anterior → actual | Media anterior → actual | Mediana anterior → actual | Desviación anterior → actual | Valores distintos |
| --- | --- | --- | --- | --- | --- |
| Vitalidad | 25–110 → 13–122 | 54,19 → 53,14 | 51 → 51 | 17,16 → 18,56 | 72 → 103 |
| Fuerza | 12–127 → 10–147 | 40,94 → 42,99 | 32 → 33 | 26,01 → 29,97 | 81 → 129 |
| Defensa | 19–110 → 10–139 | 46,89 → 46,47 | 42 → 40 | 17,42 → 22,65 | 71 → 119 |
| Agilidad | 13–105 → 10–147 | 45,83 → 47,10 | 43 → 44 | 15,77 → 21,28 | 69 → 107 |
| Poder mágico | 12–130 → 10–145 | 48,73 → 49,19 | 41 → 45 | 30,22 → 32,78 | 87 → 130 |
| Resistencia mágica | 18–105 → 10–120 | 53,09 → 50,79 | 53 → 50 | 17,47 → 20,58 | 76 → 101 |

El perfil anterior dependía casi por completo de un peso por rol y de pocos ajustes por naturaleza. El motor recibía la Agilidad entera y usaba `round(44 + 2,2 × VIT)` para la vida máxima. Por ejemplo, los 62 puntos de Vitalidad del Mamut dan 180 de vida y los 13 del Búho dan 73. Una diferencia real en el perfil llega a la partida y a la ficha. La iniciativa usa la Agilidad efectiva, con desempates reproducibles y efectos que modifican el valor de turno.

`docs/profile-weights.js` combina anatomía, rasgos funcionales, masa acotada, materiales, equipo, estructuras, interpretación y especialidades de base con los pesos de rol. Las características heredadas intervienen cuando forman parte del concepto activo. La masa aporta a la resistencia y la movilidad depende de otros rasgos. Los límites son 5 % y 35 % del presupuesto, redondeados hacia abajo. Un reparto acotado devuelve o asigna los puntos sobrantes hasta obtener exactamente la suma. Se mantienen 200/250/300/350/400 por generación más 0–20 por rareza. El presupuesto de las 1 777 cartas va de 200 a 420 y mantiene su distribución.

| Ejemplo | G / presupuesto | VIT / FUE / DEF / AGI / MAG / RES |
| --- | --- | --- |
| Mamut | G0 / 205 | 62 / 47 / 52 / 12 / 10 / 22 |
| Sirena | G0 / 205 | 28 / 10 / 17 / 44 / 61 / 45 |
| Búho | G0 / 200 | 13 / 48 / 10 / 70 / 28 / 31 |
| Dragón | G0 / 215 | 40 / 57 / 32 / 34 / 36 / 16 |
| Laboratorio alquímico ambulante | G1 / 260 | 50 / 22 / 40 / 27 / 67 / 54 |
| Bastión de pólvora verde | G1 / 260 | 50 / 54 / 55 / 13 / 59 / 29 |

El motor calcula el **perfil activo v2** a partir del concepto persistido. Las estadísticas de expedición se conservan, igual que nombre, variante, identidad, linaje, progenitores, ilustración y copias. Una partida con un perfil de combate histórico explícito conserva sus seis valores bajo `historicalCombat`. Los encuentros de Arena ya iniciados conservan sus dos escuadras y las reglas de ese combate en el registro activo.

### Balance del combate

`node scripts/combat-sim.mjs 40` compara 680 duelos antes y después con los mismos escenarios y semillas. El duelo espejo de una criatura pasó de 6,0 a 4,9 rondas, curación contra control de 12,5 a 10,9 y ataque contra defensa de 12,9 a 13,4. Dos G4 contra tres G2 pasaron de 40 victorias a 17 de 40. La composición física contra magia pasó de 18 a 25. La muestra registra daño, protección, recuperación, acciones de control y utilidad por rol. Los 40 empates del espejo defensivo siguen llegando al límite de 30 rondas. En los escenarios probados, seis criaturas siguen favorecidas frente a dos G4 por la economía de acciones. Esos casos quedan como referencias de balance.

## Sobres y aperturas

Los sobres sellados permiten abrir todas las compras, limitar la selección a un tipo o seguir abriendo uno o una compra. El diálogo confirma cantidad, distribución, cartas y modo. Para el conjunto se ofrece por defecto un resumen rápido. El resultado agrupa por carta, muestra rareza máxima, primeras obtenciones, copias adicionales y duplicados de la apertura. El registro individual pagina diez sobres. No se cargan las imágenes de cada ejemplar. Se registra y acredita mediante la misma transacción de guardado. Con revelación individual, la partida conserva el sorteo y el avance antes de acreditar al final. Se consume cada sello una vez y no se vuelve a cobrar.

Los sellos anteriores conservan sus reglas. Esencial, Arcano histórico y Reliquia mantienen sus contadores independientes. Los ocho tipos ya comprados en formato 5 conservan su tabla v1 al migrar. Las compras nuevas y los premios emiten sellos v2. La nueva plaza premium del Quimérico sustituye una general y garantiza una carta rara o superior dentro de diez cartas. Sus otras nueve posiciones siguen siendo independientes, incluidas las seis reservas temáticas. Sus posiciones con míticas pesan 5 % en la mitológica, 13 % en la premium y 1 % en cada una de tres generales. La probabilidad efectiva es `1 − 0,95 × 0,87 × 0,99³`.

| Sobre | Precio 1 / 5 / 10 | Óbolos por carta 1 / 5 / 10 | ≥1 mítica antes → ahora | Observada en 100 000 | Raras / épicas / míticas esperadas | Óbolos por mítica, 1 / 5 / 10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Explorador | 55 / 261 / 495 | 11 / 10,44 / 9,90 | 1,49 → 1,49 % | 1,48 % | 0,40 / 0,085 / 0,015 | 3 667 / 3 480 / 3 300 |
| Naturaleza | 72 / 342 / 648 | 12 / 11,40 / 10,80 | 0,60 → 0,60 % | 0,60 % | 0,16 / 0,034 / 0,006 | 12 000 / 11 400 / 10 800 |
| Civilización | 72 / 342 / 648 | 12 / 11,40 / 10,80 | 0,60 → 0,60 % | 0,60 % | 0,68 / 0,034 / 0,006 | 12 000 / 11 400 / 10 800 |
| Era Primordial | 83 / 394 / 747 | 13,83 / 13,13 / 12,45 | 0,60 → 1,59 % | 1,58 % | 0,92 / 0,264 / 0,016 | 5 188 / 4 925 / 4 669 |
| Profundidades | 83 / 394 / 747 | 13,83 / 13,13 / 12,45 | 0,60 → 1,59 % | 1,58 % | 0,16 / 0,544 / 0,016 | 5 188 / 4 925 / 4 669 |
| Arcano | 110 / 523 / 990 | 15,71 / 14,94 / 14,14 | 12,79 → 8,21 % | 8,18 % | 1,68 / 0,885 / 0,085 | 1 294 / 1 231 / 1 165 |
| Panteón | 138 / 656 / 1 242 | 19,71 / 18,74 / 17,74 | 12,85 → 12,85 % | 12,79 % | 1,53 / 1,645 / 0,135 | 1 022 / 972 / 920 |
| Quimérico | 165 / 784 / 1 485 | 16,50 / 15,68 / 14,85 | 3,17 → 19,80 % | 19,73 % | 1,76 / 0,600 / 0,210 | 786 / 747 / 707 |

Se aplican 0 %, 5 % y 10 % de descuento. El coste esperado divide el precio efectivo por sobre entre el número medio de ejemplares de la rareza. El diagnóstico muestra este cálculo para las cinco rarezas, además de probabilidades individuales por carta y por tipo. Panteón conserva una deidad garantizada, incluso si la plaza arroja una épica. Arcano conserva cuatro plazas temáticas. Explorador sigue siendo el más económico por carta. `node scripts/pack-sim.mjs 100000 1977` verificó 800 000 aperturas de los tipos de tienda y otras 300 000 de tipos históricos. Las cifras observadas se contrastan con las efectivas tras filtrar y normalizar cada grupo.

## Arena contra bots

La Arena reaprovecha perfiles, formación, dos puntos de mando, resolución, restricciones, ritmos, animaciones y sonido del entrenamiento. Tres contratos por tablero ofrecen un duelo accesible, otro equilibrado y otro desafiante. Se muestran estrategia, retratos, coste real, cantidad, ficha por criatura y recompensa potencial. El tablero resulta de un contador de encuentros y del rango. Se renueva al cerrar un combate, incluida una retirada registrada como derrota. Los bots usan cartas reales y variantes de la Forja en un archivo de sólo lectura para el jugador. Enfrentarlas no añade cartas, descubrimientos ni progenitores a la cuenta.

| Rango | Puntos | Premio único |
| --- | ---: | ---: |
| Aprendiz | 0 | 0 |
| Bronce | 200 | 35 óbolos |
| Plata | 500 | 55 óbolos |
| Oro | 900 | 80 óbolos |
| Platino | 1 400 | 110 óbolos |
| Diamante | 2 000 | 145 óbolos |
| Maestro | 2 800 | 190 óbolos |
| Leyenda Quimérica | 3 800 | 250 óbolos |

A igual despliegue, accesible otorga +23 puntos y 9 óbolos o resta 6 puntos en derrota. Equilibrado aplica +38, 16 o −13 y desafiante +57, 24 o −21. Cada punto extra de despliegue propio reduce el premio en 4 puntos y 2 óbolos, hasta su mínimo de 6 y 3. En desventaja suma 3 puntos por unidad de presupuesto hasta 12 y 2 óbolos hasta 8. El empate conserva puntos y la derrota nunca deja saldo de rango negativo. Las recompensas regulares escalan con el rival y los premios de ascenso y desafío premian objetivos distintos de repetir una escuadra económica.

Fortaleza protege y cura. Depredadores presionan por iniciativa. Concilio Arcano usa áreas y control. Legión Primordial absorbe golpes y concentra cargas. Panteón combina protección y silencio. Gremio de Artesanos potencia sus herramientas. Enjambre acumula acciones económicas. Titanes concentra poder en pocas variantes avanzadas. Saboteadores debilita e interrumpe. Quiméricos mezcla capacidades de varias familias.

| Encuentro | Acceso o restricción | Premio temático de primer triunfo |
| --- | --- | --- |
| Custodia del Ámbar | 200 puntos máximos alcanzados | Sobre de la Era Primordial y 45 óbolos |
| Custodia del Eclipse | 900 puntos máximos alcanzados | Sobre de lo Arcano y 65 óbolos |
| Custodia del Juramento | 2 000 puntos máximos alcanzados | Sobre del Panteón y 90 óbolos |
| Raíces del catálogo | Sólo G0 y 8 puntos | Sobre de la Civilización |
| Seis marcas de bronce | Hasta 6 puntos | Sobre de la Naturaleza |
| El pacto de tres | Hasta 3 criaturas, 8 puntos y sin G4 | Sobre de las Profundidades |

Las recompensas se entregan al cerrar el encuentro. El formato 6 migra partidas 1–5. El registro activo guarda perfiles, reglas, semilla y las órdenes ya resueltas hasta la ronda actual. Al recuperar una batalla vuelve a ejecutar esa secuencia. Las órdenes sin avanzar se vuelven a seleccionar. Los resultados guardan constitución, puntos, premio, ascenso y rondas en un historial de 18 encuentros. La primera victoria queda ligada al campeón o desafío y el ascenso al máximo histórico. La entrada es gratuita y la incapacidad termina con el combate.

## Arte y verificación

La Arena usa tres pinturas originales, con variantes WebP para escritorio y móvil. Cada rango tiene un emblema vectorial y cada arquetipo su propio estandarte. El duelo comparte la presentación táctica de entrenamiento y añade entrada breve, escenario por contrato y un recibo de rango y premios. Los ajustes gráficos y el movimiento reducido se aplican al duelo y a sus celebraciones. [Registro de los escenarios](GUIA-ARTISTICA.md#escenarios-de-arena)

Pasaron 63 pruebas automatizadas. En Chromium se verificaron el orden compartido, los tres escenarios de Arena, perfiles, recuperación de ronda, ascenso a Bronce, premio de campeón y de desafío, y 140 sobres mixtos con 920 cartas entre una apertura por tipo y otra global. En el lote global de 120 sobres se verificó paginación y saldo intacto. Las pruebas a 360, 393 y 430 píxeles fueron en emulación táctil. Se entregan capturas reales, grabación de combate y ascenso, auditoría y simulaciones completas. La muestra G2–G4 y los duelos de formación siguen siendo muestreos.
