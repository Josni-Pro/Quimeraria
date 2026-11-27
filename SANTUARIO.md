# Santuario de recuperación y navegación global

## Navegación

La Forja tenía una cabecera de siete entradas y saldo dentro de un contenedor de 1456 px. Entrenamiento y Arena definían otra de cuatro entradas dentro de un contenedor de 1330 px. El `justify-content: space-between` enviaba ese grupo más corto hacia la derecha. Las reglas responsivas y los márgenes también divergían.

Las cuatro páginas principales montan [game-nav.js](docs/game-nav.js) y usan [game-nav.css](docs/game-nav.css). Forja, Alquimia, Colección, Sobres, Expediciones, Entrenamiento, Arena y Santuario aparecen en ese orden. La Forja es la portada. Alquimia incluye aberraciones y esencia. Colección incluye inventario y biblioteca, y Sobres incluye la tienda. Se retiraron las reglas respectivas de `styles.css` y `training.css`. El componente mantiene la alineación y el saldo en escritorio, y presenta un menú de dos columnas con sección activa en móvil. Puede abrirse por teclado y cerrarse con Escape. El saldo se sincroniza al confirmar transacciones y al recibir cambios de LocalStorage de otra pestaña.

La ruta de publicación al incorporar la rama será `/Quimeraria/sanctuary.html`. El [diagnóstico](docs/health-lab.html) tiene su propio enlace de retorno y ejecuta sus simulaciones con una partida aislada en memoria.

## Vitalidad, fatiga y heridas

La vitalidad pertenece al combate y vuelve a calcularse al empezar el siguiente encuentro. Fatiga y heridas pertenecen al ejemplar. Los perfiles originales se conservan y la ficha muestra el valor original, el efectivo y el porcentaje temporal de cada atributo.

| Fatiga | Estado | Efecto en Arena |
| --- | --- | --- |
| 0–24 | Descansada | 0 % |
| 25–49 | Cansada | −5 % de agilidad |
| 50–74 | Fatigada | −10 % de agilidad, fuerza y magia |
| 75–99 | Exhausta | −20 % de agilidad, fuerza y magia |
| 100 | Agotada | Despliegue restringido |

Las heridas leve, moderada y grave aplican 5 %, 15 % y 20 % a los atributos de su familia. La grave restringe el despliegue. Las familias biológica, estructural, arcana y mixta afectan, respectivamente, vitalidad/agilidad/fuerza, vitalidad/defensa/agilidad, vitalidad/magia/resistencia y vitalidad/defensa/magia/agilidad. Las penalizaciones coincidentes se suman hasta 30 %. Se redondea al entero más cercano con un mínimo de 1 por atributo. La vitalidad máxima utiliza el atributo efectivo y la fórmula anterior de combate.

La fatiga por encuentro parte de 4 y suma (0,53 × acciones, tope 7,5), (0,72 × especiales, tope 3), (3,2 × daño recibido/vitalidad máxima, tope 4,5) y (0,65 × dificultad). Resta resistencia original/48 hasta 1,6 y 1,45 si existe regeneración. El resultado entero queda entre 3 y 22 antes de una posible reserva, y la fatiga acumulada entre 0 y 100. Las acciones realmente ejecutadas representan tiempo y participación, incluida la salida anticipada por incapacitación. La dificultad vale 0 en encuentros habituales, 1 en desafiantes y 2 contra campeones.

Para la herida se define un ajuste de riesgo (0,035 × dificultad − 0,08 × fracción de vitalidad protegida, tope de fracción 1 − 0,14 con regeneración − 0,045 con blindaje o estructura). Una criatura incapacitada tiene una probabilidad de (0,59 + mínimo(0,17, 0,07 × daño/vitalidad) + ajuste), acotada entre 20 % y 91 %. Para una superviviente es (0,24 × fracción de vitalidad perdida + 0,027 × daño/vitalidad + ajuste), con tope de 32 %. Una superviviente por encima del 52 % de vitalidad y con daño acumulado inferior al 140 % queda sin riesgo. Si aparece una herida, la probabilidad condicional de gravedad es (0,055 + 0,04 × exceso de daño/vitalidad sobre 1 + 0,55 × ajuste), entre 0 y 16 %, solo tras incapacitación. La moderada tras incapacitación parte de 38 %, con (0,68 × ajuste) y piso de 18 %. Una superviviente por debajo del 29 % de vitalidad tiene 20 % de probabilidad condicional de moderada. El resto de los casos con herida son leves. La gravedad previa se conserva hasta recibir tratamiento. [Configuración](docs/health-config.js) · [Cálculo](docs/health.js)

Un encuentro completado deja descansar 6 puntos de fatiga a las criaturas en reserva y mantiene intacta su gravedad. Un abandono conserva las consecuencias de las rondas ya guardadas y deja la reserva sin beneficio. El estado, las recompensas y el cierre se aplican en una sola transacción. La simulación de Entrenamiento usa las estadísticas originales de ejemplares heridos, agotados u ocupados y deja la partida igual. Expediciones conserva su comportamiento actual. El módulo de salud admite participantes, exposición y contexto por separado para la futura adaptación.

## Compatibilidad y tratamientos

El guardado v7 lee v1–v6 y respeta los identificadores existentes de sobres, fusiones e instancias históricas. Las copias históricas sin datos de salud empiezan sanas. Consumir un ejemplar de una pila antigua conserva los identificadores de sus vecinos. En la Forja se elige la copia exacta y se advierte de su estado antes de consumirla. Las probabilidades son las habituales y toda fusión nueva empieza con salud propia. Los ejemplares en un encuentro de Arena están ocupados hasta su cierre. El constructor conserva la formación y advierte si hay integrantes no disponibles. El recibo identifica los cambios por criatura y ofrece recuperación gratuita de la escuadra.

| Área | Compatibilidad | Tratamientos |
| --- | --- | --- |
| Enfermería | Biológica y mixta | Tratamiento del área y restauración inmediata |
| Taller de restauración | Estructural y mixta | Tratamiento del área y restauración inmediata |
| Cámara arcana | Arcana y mixta | Tratamiento del área y restauración inmediata |
| Zona de descanso | Cualquier ejemplar con fatiga | Descanso guiado |
| Cualquiera de las cuatro | Toda criatura disponible para tratamiento | Recuperación completa gratuita |

La atención gratuita es inmediata y se puede aplicar a un ejemplar, a una selección, a la última escuadra o a toda la colección. La restauración de pago aporta reserva de 2–6 puntos para la próxima participación real, además de tratar fatiga o heridas. El descanso guiado cuesta 2 óbolos más 1 por cada 12 puntos aliviados o fracción. Los tratamientos focalizados cuestan 5/10/16 y las restauraciones 6/12/19 según gravedad, antes de descuentos. Un sobre cuesta 55–165 óbolos y las victorias tienen recompensas base de 9/16/24, ajustadas por presupuesto. Los precios de recuperación usan el desgaste y la ayuda disponible, con el mismo cálculo para cada generación y rareza. La cotización muestra los ejemplares, el estado previsto, el descuento y el saldo restante. Se comprueba de nuevo al confirmar, incluso entre pestañas. Un ejemplar sano y descansado queda fuera del cobro.

Dos especialistas por área aportan, según su capacidad, reducciones del 7,5 % por punto hasta 30 % total, más alivio y en algunos tratamientos una reducción adicional de gravedad. Medicina, alquimia, herrería, construcción, estabilización arcana y logística aprovechan los conceptos y perfiles de utilidad. Ajolote tiene regeneración personal. Fénix aporta ceniza restauradora según su capacidad de apoyo. Una asignación puede sustituirse o retirarse sin cargo. Si el especialista pelea, está exhausto o necesita el tratamiento que se está cotizando, deja de aportar. Los tratamientos se cierran de inmediato y la asignación por sí sola permite combatir o fusionar. [Motor de recuperación](docs/recovery.js)

En la muestra reproducible, tratar gratuitamente al Lobo con fatiga 74 y lesión moderada deja 0 y sana. La restauración cuesta 12, deja 48 y sana y concede reserva 4. Con una Médica cuesta 10, deja 42 y sana y concede reserva 5. Médica más Alquimista reducen de 10 a 8 el tratamiento focalizado del mismo caso. Este deja 53 de fatiga y lesión leve y concede reserva 3.

## Simulaciones

Se usaron las ofertas reales de Arena Equilibrada con seis series por escenario, a partir de los contadores 0, 7, 19, 31, 47 y 65. Se resolvieron automáticamente 576 encuentros en series de 1, 5 y 10. Cada celda de fatiga muestra el promedio final entre quienes combatieron en la última partida. Si el juego rechaza una formación bloqueada, el diagnóstico recupera gratis su escuadra para continuar y registra esa operación. Esto explica las medias menores al finalizar algunas series largas.

| Escuadra | Fatiga añadida media en 10 | Fatiga final tras 1 / 5 / 10 | Recuperaciones entre 5 / 10 | Lesiones graves en 10 |
| --- | ---: | --- | --- | ---: |
| Defensiva | 14,1 | 14,5 / 48,1 / 35,2 | 3 / 11 | 9 |
| Ofensiva | 9,1 | 9,6 / 45,7 / 63,7 | 0 / 3 | 3 |
| Regenerativa | 12,7 | 13,8 / 65,8 / 34,4 | 0 / 6 | 1 |
| Construida, con Coloso Alquímico | 12,9 | 13,8 / 55,8 / 56,5 | 2 / 6 | 3 |
| Generaciones mixtas G0–G4 | 14,3 | 14,2 / 47,2 / 33,9 | 2 / 8 | 4 |
| Rotativa | 11,2 | 14,5 / 30,8 / 16,4 | 0 / 4 | 6 |

La prueba inicial mostró demasiadas interrupciones en formaciones ofensivas. Se ajustaron la base de gravedad tras incapacitación del 8,5 % al 5,5 %, su límite del 20 % al 16 % y el peso de las acciones. En cinco encuentros, las seis series rotativas tuvieron 120 recuperaciones por descanso en reserva y ninguna visita forzada. Los equipos defensivos fijos, al prolongar los encuentros, aún necesitaron tres recuperaciones conjuntas. La muestra usa combate automático y muestra sensibilidad a la composición y a las semillas. Las escuadras dirigidas manualmente pueden producir otra distribución.

## Presentación y validación

Hay cuatro pinturas ambientales originales WebP de 1280 × 853 píxeles. La vista carga la ilustración del área activa y usa una composición y un recorte adaptados a móvil. Enfermería emplea pulsos cálidos, Taller chispas, Cámara arcana anillos lumínicos y Descanso hojas concéntricas. Los efectos duran dos segundos, pueden omitirse y respetan el movimiento reducido, la calidad gráfica, el modo de animación y el sonido. Las transacciones se guardan antes de los efectos. [Guía artística](GUIA-ARTISTICA.md)

- La batería pasó las 75 pruebas, incluidas 12 específicas de salud y navegación y la simulación de regresión de 24 000 fusiones. Ejecuta `node --test tests/*.mjs` y `node scripts/health-sim.mjs` para reproducir los resultados.
- Para repetir la validación visual, sirve `docs` en la ruta `/Quimeraria/` y ejecuta `python tests/browser-sanctuary.py` con Chromium, Playwright para Python y FFmpeg. `QUIMERARIA_URL` y `QUIMERARIA_EVIDENCE` ajustan la URL y la carpeta de evidencias.
- Se comprobó Chromium de escritorio y emulación táctil en 360, 393 y 430 px en vertical. Se verificaron los saldos entre pestañas, la recarga tras el pago, una victoria recompensada y una derrota con heridas persistentes. La emulación cubre el flujo móvil de tipo Galaxy A54. El dispositivo físico queda pendiente.
- La rama de revisión es `feat/recovery-sanctuary`. GitHub Pages conserva `docs` como origen.
