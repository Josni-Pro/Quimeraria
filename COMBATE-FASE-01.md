# Quimeraria · Combate y entrenamiento

El acceso **Entrenamiento** de la navegación abre el Santuario del Umbral. Para revisar la rama antes de publicarla, sirve la carpeta `docs` con `python3 -m http.server 8000 --directory docs` y abre `http://localhost:8000/training.html`. Tras incorporar la rama, la ruta de GitHub Pages será `/Quimeraria/training.html`.

## Entrenar

1. Elige de una a seis copias de tu colección. Selecciona una plaza y pulsa una criatura para desplegarla. Pulsa dos plazas para intercambiarlas y vuelve a pulsar la plaza seleccionada para abrir la ficha. La lista permite buscar, filtrar, ordenar y paginar.
2. Escoge dificultad y formación entre Guardia de la bóveda, Coro de la marea y Cazadores de cornisas. La sección de semilla acepta un entero de 32 bits sin signo. Repetir conserva la semilla, los equipos y la dificultad.
3. Durante el combate, toca un retrato para inspeccionarlo o seleccionarlo. Prepara hasta dos órdenes y avanza una ronda o activa el modo automático. Pasa un turno completo sin autorizar otra ronda si se activa la pausa durante una animación.
4. Consulta el resultado, las contribuciones y la crónica. La exportación JSON incluye las plazas iniciales, la semilla, la dificultad, las órdenes y los eventos con sus instantáneas de vitalidad, escudo, posición y estados.

Cada escuadra dispone de tres plazas de vanguardia y tres de retaguardia y un máximo de **12 puntos**. El combate se inicia con al menos una criatura, dentro del presupuesto y sin utilizar dos veces la misma copia. Cada ejemplar distinto que realmente se posee se puede desplegar. Las aberraciones y esencias quedan excluidas.

| Generación | Puntos de despliegue en entrenamiento | Presupuesto de atributos antes de rareza |
| --- | ---: | ---: |
| G0 | 1 | 200 |
| G1 | 2 | 250 |
| G2 | 3 | 300 |
| G3 | 4 | 350 |
| G4 | 6 | 400 |

G4 usa 6 puntos en entrenamiento. El valor orientativo del perfil compartido sigue en 5. Se adopta el presupuesto de atributos existente, con el ajuste aditivo por rareza de 0, 5, 10, 15 o 20 puntos. El rol primario, el secundario y la naturaleza siguen distribuyendo ese presupuesto.

## Reglas del motor

Al inicio se aplican pasivas y se asignan dos puntos de mando. Antes de resolver la iniciativa de una ronda se aplican los reposicionamientos y posturas. Después, las criaturas en pie actúan por Agilidad efectiva descendente, con desempates por semilla. Cada criatura dispone de una acción principal. Los golpes múltiples pertenecen a esa acción. La incapacitación de todo un lado cierra el combate. Si ambos lados siguen en pie al terminar la ronda 30, el resultado es empate.

Al pasar a la ronda siguiente se reponen los puntos de mando, caducan los estados agotados y se procesan los efectos periódicos. La regeneración, la quemadura y el veneno de dos rondas actúan al comienzo de las dos rondas siguientes. Un estado normal de dos rondas está activo desde su aplicación hasta el inicio de R+2. Una técnica de recarga C usada en R vuelve a estar disponible en R+C.

La vanguardia terrestre cubre la retaguardia de su columna. El ataque cuerpo a cuerpo terrestre alcanza las columnas accesibles más cercanas. Un hueco puede exponer directamente a quien se encuentra detrás. El vuelo y los ataques a distancia y de área permiten alcanzar otros blancos. Las áreas se limitan a tres objetivos.

| Cálculo | Fórmula |
| --- | --- |
| Vitalidad máxima | `redondear(44 + 2,2 × Vitalidad)` |
| Daño por impacto | `máx(1, redondear((8 + 0,52 × potencia) × coeficiente × 65/(65 + mitigación) × modificadores))` |
| Curación directa | `redondear((9 + 0,46 × Poder mágico efectivo) × coeficiente)`, limitada a la vida perdida |
| Escudo directo | `redondear((7 + 0,44 × Defensa efectiva) × coeficiente)`, hasta el 36 % de la vitalidad máxima total del receptor |

El daño físico usa Fuerza y Defensa y el mágico usa Poder mágico y Resistencia mágica. La perforación reduce proporcionalmente la mitigación. La variación del impacto es de ±5 %, la exposición aumenta el daño recibido un 22 % y Defender reduce un 32 % el daño recibido y un 28 % el infligido durante la ronda. Los aportes de escudo caducan individualmente al inicio de R+2. La intercepción deriva un 48 % de un impacto elegible al protector una vez por ronda. Se mide el daño efectivo y se contabiliza aparte lo absorbido.

Los estados del mismo tipo conservan la intensidad más alta y la expiración más lejana. El aturdimiento solo quita la acción a quien todavía debe actuar y deja resistencia durante dos rondas. El silencio conserva la acción básica. La inmovilización impide intercambiar plazas y ser empujado. Un empuje requiere una plaza posterior libre. La curación actúa sobre criaturas en pie.

### Órdenes

| Orden | Coste | Comportamiento |
| --- | ---: | --- |
| Concentrar | 1 | Prioriza un rival alcanzable. La curación crítica conserva prioridad sobre atacar. |
| Proteger | 1 | Encarga a una criatura compatible la protección de un aliado con una técnica disponible. |
| Especial | 1 | Pide una técnica especial legal y disponible, con blanco seleccionado cuando corresponde. |
| Reposicionar | 1 | Mueve a un hueco o intercambia dos aliados antes de la iniciativa. Se admite un cambio por escuadra y ronda. |
| Defender | 1 | Aplica postura defensiva durante la ronda con una contrapartida ofensiva. |

Cada criatura recibe como máximo una orden personal. El blanco concentrado es una orden de escuadra. Si al llegar el turno desaparece un objetivo o deja de poder alcanzarse, la criatura vuelve a su política automática. Se pueden limpiar las órdenes sin gastar puntos antes de avanzar.

### Roles, técnicas y sinergias

Se adaptan los doce roles del catálogo. Guardián, Combatiente, Asaltante, Tirador, Asesino, Hechicero, Sanador, Soporte, Controlador, Invocador, Artillería y Logístico. Cada perfil tiene una básica, una principal, una especial y una pasiva. Las técnicas se eligen a partir de las capacidades del concepto activo, sus afinidades y sus roles. Los perfiles históricos se resuelven con el adaptador existente y conservan su identidad.

| Familia | Técnicas implementadas |
| --- | --- |
| Ataque físico | Golpe, Proyectil, Intervención, Carga, Tiro rasante, Doble proyectil, Garras cruzadas, Mordedura tóxica, Barrido de avance y Embate decisivo |
| Daño mágico, elemental y control | Pulso, Onda de impacto, Corriente adversa, Impacto volcador, Sello de quietud, Raíces de contención, Abrir brecha, Descarga de brasas, Sendero de vendaval, Trueno conducido, Umbral del juicio y Cortina de tinta |
| Protección y apoyo | Interponerse, Cobertura mutua, Barrera, Baluarte, Ceder el ritmo, Defensa prevista, Reacción catalítica, Templar en caliente, Resguardo de marfil, Reserva de campaña y Velo de concentración |
| Recuperación | Primeros auxilios, Restauración gradual, Purificar, Marea recobrada, Ceniza regeneradora y Estabilización |

Las pasivas cubren regeneración de emergencia, coraza, apoyo firme, ritmo de manada, previsión, reserva catalítica, vuelo y aplomo inicial. El Fénix recupera a sus aliados con ceniza, la Médica estabiliza y purifica, el Pulpo usa tinta para debilitar, Atenea protege y potencia y la Herrera refuerza la defensa mediante el temple.

Las sinergias funcionales incluyen guardianes que cubren a sanadores, apertura de vulnerabilidad para ataques posteriores, apoyo de Fuerza o Poder mágico según quién lo aprovecha, ritmo de manada por adyacencia y ralentización que cambia la iniciativa en turnos posteriores. Las mismas reglas se aplican a variantes y cartas base.

### Rivales

Principiante usa una colocación simple, suele elegir blancos por posición y no emite órdenes. Normal concentra objetivos disponibles y puede proteger criaturas vulnerables con una orden por ronda. Difícil admite dos órdenes y coordina protecciones, focus en objetivos frágiles y especiales listos. Con ocho puntos o más intenta incluir dos fusiones G1 reales en su patrulla. La formación rival respeta el presupuesto de entrenamiento y se construye con un tope igual a los puntos desplegados por el jugador. Los tres niveles usan la misma vitalidad, mitigación y recargas por perfil.

## Arquitectura y archivos

| Ruta | Responsabilidad |
| --- | --- |
| `docs/combat/config.js` | Reglas de encuentro, presupuesto y generador reproducible de números de 32 bits |
| `docs/combat/skills.js` | Datos de técnicas y pasivas, adaptación de perfiles y firmas de criaturas |
| `docs/combat/targeting.js` | Alcance, cobertura, prioridades y área |
| `docs/combat/effects.js` | Fórmulas, aplicación, expiración, sinergias y eventos |
| `docs/combat/engine.js` | Validación de escuadras y órdenes, resolución por rondas e informe de contribución |
| `docs/combat/bots.js` | Políticas locales, ejecución y simulación sin animaciones |
| `docs/combat/roster.js` | Lectura de partidas, identificación de copias y patrullas de entrenamiento |
| `docs/training.html`, `docs/training.css` | Página estática y adaptación para móvil |
| `docs/training.js`, `docs/training-view.js` | Selección, controles, fichas, resultados y exportación |
| `docs/training-animation.js` | Reproducción de los eventos resueltos mediante Canvas y animaciones de cartas |
| `docs/assets/entrenamiento/` | Pintura del Santuario y recorte para móvil |
| `docs/index.html`, `README.md` | Acceso desde el juego e instrucciones |
| `tests/combat.mjs`, `scripts/combat-sim.mjs` | Pruebas del nuevo motor y simulaciones reproducibles |

El motor vive en módulos ES sin DOM. La vista recibe eventos estructurados una vez resuelto el turno. Velocidad, duración y efectos visuales viven en la reproducción. Entrenamiento solo lee el guardado. La salud, las recargas y los estados de batalla viven en memoria. Las fusiones con que se construyen las patrullas expertas se calculan sobre una colección desechable. El resultado conserva daño recibido, curación e incapacitación temporal como datos que podrían informar fases posteriores.

Están operativos el entrenamiento contra las tres patrullas, sus órdenes y efectos, la crónica, el diagnóstico, la exportación y la repetición. Quedan preparados el perfil de Invocador como apoyo, los datos de resultado para consecuencias futuras y la configuración reutilizable de presupuesto, plazas, terreno, modalidad y límite. Se difieren la maniobra coordinada, las unidades invocadas, las reglas de terreno, la arena definitiva y las expediciones con este motor. Entrenamiento se ejecuta sin recompensas, fatiga o heridas persistentes.

## Presentación

El Santuario usa una pintura original de un observatorio en ruinas, con piedra azul y luz lunar. Se publica en WebP de 1536 × 1024 y 720 × 784 píxeles. Los dos tamaños suman 267 422 bytes. Los retratos del catálogo se presentan como cartas animadas. El fondo y la profundidad de las dos filas se adaptan con CSS. En móvil se apilan las formaciones y cada una tiene su propio rótulo.

Hay animaciones reutilizables para golpe, embestida, corte, proyectil y ataque pesado. Los efectos elementales diferencian fuego, agua, viento, relámpago y tierra. También hay trazos arcanos, divinos y alquímicos, barreras, interposición, curación, regeneración, purificación y potenciación. La criatura activa anticipa el gesto, el impacto destaca el objetivo y las cifras y barras muestran el cambio. El escudo se distingue del indicador de vida, los estados tienen iconos con nombre y las incapacidades atenúan la carta.

Se puede reproducir a 1×, 2× o 4× con efectos completos, reducidos o sin animaciones. La preferencia de movimiento reducido del navegador se aplica también a las animaciones programáticas. Se carga un fondo según la resolución y los retratos de la colección se cargan por página y visibilidad.

## Validación y balance

`node --test tests/*.mjs` ejecuta las suites de juego y las diez pruebas de combate. La validación en Chromium 156 cubrió montaje, navegación, fichas, órdenes, pausa, reproducción, cura, estados, escudos, KO, resultado, repetición, recarga y exportación. Se comprobó la carga de imágenes y la ausencia de errores en escritorio a 1440 px y en móvil táctil a 360, 393 y 430 px. Cuatro ejecuciones con la misma formación, semilla y órdenes exportaron el mismo resultado y los mismos 61 eventos a 1×, 2×, 4× y sin animaciones. El guardado permaneció idéntico byte a byte tras repetir, salir y recargar.

`node scripts/combat-sim.mjs 40` repite 17 escenarios con las semillas 1 a 40 y genera tablas, métricas, técnicas y estados observados. Incluye formaciones de una a seis criaturas y fusiones reales G1–G4. Verifica una acción por criatura y ronda y la recarga de cada técnica.

| Escenario | Victorias izquierda–derecha | Empates | Rondas medias |
| --- | ---: | ---: | ---: |
| Seis G0 económicos frente a tres G2 | 40–0 | 0 | 17,5 |
| Seis G0 económicos frente a dos G4 | 40–0 | 0 | 7,0 |
| Seis G1 frente a dos G4 a 12 puntos por lado | 40–0 | 0 | 4,0 |
| Tres G3 frente a dos G4 a 12 puntos por lado | 0–40 | 0 | 14,3 |
| Ataque frente a defensa, ambos de seis | 40–0 | 0 | 13,8 |
| Dos escuadras defensivas con guardianes y sanadores | 0–0 | 40 | 30,0 |
| Composición física frente a mágica, ambas de seis | 18–22 | 0 | 8,7 |
| Patrulla Principiante, Normal y Difícil | 38–0, 0–40, 0–40 | 2, 0, 0 | 18,3 · 13,7 · 13,3 |

Se completaron los 680 encuentros. Hubo 42 empates al límite y se observaron 30 técnicas. El límite evita los combates interminables. Los duelos defensivos por espejo y la ventaja por volumen de acciones de seis contra dos justifican ajustar primero la presión sostenida y el valor de las formaciones de élite. La prueba a 12 puntos también muestra que una pareja G4 puede vencer con claridad cuando el rival dispone de tres acciones. Veinte controladores del conjunto de pruebas quedaron incapacitados antes de ejecutar una acción y conviene comprobar su protección y colocación en pruebas de balance posteriores. Invocador tiene adaptación en el código y no apareció en los ejemplares de la simulación.
