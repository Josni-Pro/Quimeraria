# Quimeraria · Ritmo y presentación del combate

La Fase 02 parte de `f83025e`, la integración del campo de entrenamiento en `main`. El acceso sigue siendo **Entrenamiento**. Para probar la rama localmente, ejecuta `python3 -m http.server 8000 --directory docs` y abre `http://localhost:8000/training.html`.

## Qué hacía esperar

En el encuentro normal, 139 acciones y 21 presentaciones secundarias ocupaban 91,8 segundos en pantalla. La lógica de las catorce rondas ocupó en total 20,1 milisegundos. En difícil hubo menos acciones principales, 124, pero 57 presentaciones secundarias, con 93,1 segundos de animación. El reloj también reservaba 360 ms entre rondas automáticas. El p95 entre fotogramas inicial fue 16,8 ms en escritorio y en móvil con CPU ralentizada. En esas sesiones predominó el tiempo reservado a cada evento, junto con la curación y el escudo que alargaban los enfrentamientos.

## Comparación a velocidad normal

Se usaron Chromium 156, semilla 1977, formación y dificultad iguales en cada pareja, reproducción automática y calidad gráfica alta. El duelo sencillo enfrenta un Mamut y una patrulla de una criatura en Principiante. El ensayo normal enfrenta seis criaturas con Fénix, Médica y Dragón contra la Guardia de la bóveda. El ensayo difícil usa esas seis criaturas con el Dragón en otra plaza contra el Coro de la marea. Móvil repite el ensayo normal a 393 px con CPU emulada 3× más lenta.

| Encuentro | Total inicial → final | Rondas | Acciones | Tiempo medio por ronda | Resultado inicial → final |
| --- | ---: | ---: | ---: | ---: | --- |
| Sencillo, 1 contra 1 | 9,61 → 5,15 s | 7 → 7 | 13 → 13 | 1,37 → 0,74 s | Derrota → derrota |
| Normal, 6 contra 6 | 96,75 → 45,53 s | 14 → 13 | 139 → 131 | 6,91 → 3,50 s | Victoria → victoria |
| Difícil, 6 contra 6 | 98,42 → 43,25 s | 15 → 15 | 124 → 125 | 6,56 → 2,88 s | Derrota → victoria |
| Normal, móvil emulado | 96,96 → 45,67 s | 14 → 13 | 139 → 131 | 6,93 → 3,51 s | Victoria → victoria |

Se repitió el ensayo normal con el motor y el balance de `main` y la presentación nueva. El tiempo fue **47,68 s**, con el mismo resultado, 14 rondas, 139 acciones y los mismos 495 eventos exportados. En normal, el tiempo de la presentación pasó de 91,8 a 43,4 s y el intervalo automático entre rondas de 360 a 115 ms base. En difícil, la presentación pasó de 93,1 a 40,4 s. Las capas secundarias programaban 6,3 s en normal y 17,1 s en difícil y pasaron a 0,94 s y 2,20 s de tramos agrupados, respectivamente. Los cambios de ganador que aparecen en la tabla pertenecen al balance.

El duelo 1 contra 1 y la muestra difícil quedaron por debajo de sus rangos orientativos. En el ensayo difícil la mejora vino de la cadencia, con las mismas 15 rondas y una acción adicional. No se introdujeron esperas para acercarlos a los rangos. Los datos de fotogramas y tareas largas dependen de la carga concurrente del entorno. En las primeras corridas comparativas, la versión nueva mantuvo una mediana de 16,7 ms con un p95 de 33,3–33,4 ms en las formaciones de seis. Una repetición móvil aislada dio 44,81 s, con mediana de 16,7 ms, p95 de 16,8 ms, seis tareas largas y 51,3 ms en total de resolución lógica. Las capturas y las pruebas móviles son de Chromium emulado. No se utilizó un Galaxy A54 físico.

## Ritmo y controles

- Las duraciones base de una acción son 237 ms para básicas, 325 ms para principales, 505 ms para especiales y 157 ms para un grupo secundario. La siguiente preparación puede empezar hasta 61 ms antes de que termine la reacción anterior. Los impactos y las modificaciones de vitalidad conservan el orden del motor. Regeneraciones, expiraciones y daño periódico pueden compartir una sola presentación.
- Un solo ciclo de animación por ronda recorre las acciones. Se evita dibujar Canvas fuera de pantalla. Las posiciones se leen al preparar cada tramo y el tamaño se mantiene con un observador. Cada ronda actualiza las cartas existentes, y solo se reconstruye la formación si cambia la ocupación. Al salir se cancela la reproducción, se desconectan observadores y se detienen las notas activas.
- La velocidad se puede cambiar durante la reproducción. **Resolver combate** explica el efecto y solicita confirmación. Usa la misma política automática que el botón Automático, respeta las órdenes de la ronda en curso y entrega la crónica completa. La pausa conserva la ronda activa y se cumple antes de avanzar a la siguiente.
- Velocidad, calidad, silencio y volumen se recuerdan en una clave de preferencias separada del guardado. La calidad Alta añade partículas, movimiento de cartas e iluminación. Equilibrada simplifica esas capas y conserva las trayectorias principales. Reducida muestra título, anillos de foco, estados, vida y cifras con movimiento mínimo. El ajuste del sistema para reducir movimiento tiene prioridad.

## Ajustes de balance

Los perfiles, los puntos de despliegue, los enfriamientos y el límite de 30 rondas son los de la Fase 01. A partir de R8, la presión añade **4,4 puntos porcentuales de daño directo por ronda** y resta **3,3 puntos porcentuales por ronda a la curación, regeneración por técnica y escudo nuevo**. Se limita a diez incrementos, con máximos de 1,44× y 0,67× respectivamente. Las pasivas iniciales, el escudo existente, su tope y la cadencia del veneno y de la quemadura conservan sus valores. Se despriorizan las protecciones automáticas sobre un aliado que ya tenga un escudo superior al 16 % de su vitalidad. Una orden explícita sigue pudiendo priorizar esa protección.

Se ejecutó `node scripts/combat-sim.mjs 40` antes y después. Son 680 duelos por versión, con 17 formaciones y 40 semillas por escenario.

| Escenario | Rondas medias iniciales → finales |
| --- | ---: |
| Dos escuadras G1 de dos criaturas | 15,1 → 13,8 |
| Tres criaturas G2–G3 por lado | 26,8 → 21,4 |
| Curación y control, cuatro por lado | 14,1 → 12,5 |
| Ataque contra defensa de seis | 13,8 → 12,9 |
| Patrulla Normal | 13,7 → 12,2 |
| Espejo de tres guardianes y tres sanadores | 30,0 → 30,0 |

Los empates al límite bajaron de 42 a 40. El espejo defensivo sigue empatando en las 40 semillas, con suficiente recuperación para llegar al límite. La ventaja de seis acciones frente a dos G4 también persiste en la composición probada. Quedan como casos concretos para la próxima revisión de balance. Las alineaciones y el comando permiten reproducirlos.

## Presentación y recursos

Se reutilizó la pintura original del Santuario. La perspectiva quedó más visible con un recorte centrado en el eje del patio, un espacio mayor entre los lados y luces diferenciadas. Los retratos conservan su proporción y usan marcos de escuadra, vitalidad de mayor contraste e indicadores de selección y objetivo. En móvil las escuadras apiladas conservan sus rótulos, los controles se ajustan al ancho y los estados se pueden consultar tocando cada criatura.

La dirección física distingue golpes breves, cortes y zarpazos, mordidas, cargas, impactos pesados y proyectiles. Las trayectorias elementales muestran corriente y ondas, lenguas de fuego, relámpagos, polvo y fragmentos de tierra, raíces, trazos arcanos, sellos divinos y reacciones alquímicas. La vida y las cifras se actualizan en el mismo impacto. Las especiales muestran criatura y técnica sobre el campo, junto con un cambio breve de luz. La recuperación, las barreras y la intercepción tienen figuras distintas. El veneno se manifiesta con volutas, la quemadura con lenguas de fuego y la incapacidad atenúa el retrato.

Las tres fichas de resultado tienen tratamientos propios para victoria, derrota y empate. El resumen muestra tiempo activo, rondas, supervivientes, daño, recuperación, protección y control. La contribución por criatura conserva las métricas de apoyo y habilidades. La crónica queda plegada durante el combate.

El audio se sintetiza localmente mediante Web Audio y está silenciado por defecto. Incluye voz de impacto, corte, proyectil, fuego, electricidad, magia, cura, escudo y desenlaces. Se habilita con una interacción del jugador y no requiere descargar archivos de sonido.

## Verificación y estructura

- `node --test tests/*.mjs` pasa 47 pruebas. Las nuevas cubren orden de reproducción y agrupamiento, equivalencia instantánea y límites de presión.
- En Chromium se recorrió el encuentro completo, se decodificaron imágenes, se verificaron entradas táctiles a 360, 393 y 430 px y se comprobaron pausa, reanudación, cambio de velocidad, abandono, preferencias al recargar y conservación del guardado. Se comparó el JSON del mismo duelo a 1×, 2×, 4× e instantáneo, incluido el caso de solicitar resolución durante una ronda.
- `docs/training-playback.js` define el plan de presentación y `docs/training-animation.js` lo reproduce. `docs/training-audio.js` contiene la síntesis local. La vista, el estilo y los controles se encuentran en `docs/training-view.js`, `docs/training.css`, `docs/training.js` y `docs/training.html`. Los cambios al balance están en `docs/combat/config.js`, `effects.js` y `engine.js`. La resolución completa usa `finishCombat` en `docs/combat/bots.js`.
