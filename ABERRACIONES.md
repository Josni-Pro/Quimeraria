# Aberraciones y esencias de Quimeraria

La actualización parte de `main` en `3beeeea`. El sistema anterior elegía por semilla un defecto fijo por pareja. Una repetición acumulaba copias de esa misma aberración. Las parejas válidas de generaciones posteriores ya tenían riesgo salvo las fusiones de dos copias de una misma quimera, que eran seguras. La esencia ya cruzaba progenitores de fuentes distintas y evitaba el fallo.

## Forja

La Forja valida materiales, cantidad, linaje, generación y óbolos antes de tirar. La generación resultante es la mayor de los dos progenitores más uno. Cada generación tiene un porcentaje configurado por separado en `docs/game-config.js`. Se revisaron las 12 fórmulas especiales. Todas usan la tasa de la Forja, y cada fórmula conserva su nombre, arte y reglas de éxito. El cruce de dos copias de una misma variante usa la misma tasa que los demás. La excepción de éxito garantizado corresponde a Alquimia.

| Generación | Éxito | Aberración | Intentos de la simulación | Fallos observados | Frecuencia |
| --- | ---: | ---: | ---: | ---: | ---: |
| G1 | 95 % | 5 % | 20.000 | 1.003 | 5,015 % |
| G2 | 95 % | 5 % | 20.000 | 985 | 4,925 % |
| G3 | 95 % | 5 % | 20.000 | 990 | 4,950 % |
| G4 | 95 % | 5 % | 20.000 | 967 | 4,835 % |

Las simulaciones usan semillas fijas y cuatro desviaciones estándar como tolerancia. Incluyen carta base con base, quimera con base, quimera con quimera y un cruce de generaciones distintas. Las pruebas de umbral comprueban 0,95 y el valor inmediatamente inferior.

La segunda tirada elige dentro del grupo de éxitos o de fallos. Las aberraciones compatibles de una pareja tienen el mismo peso entre sí. Se cotejaron las fichas y pesos de las 1.206 variantes exitosas G1 con `main`. La operación guarda juntos el consumo de los materiales, el gasto de óbolos, la copia obtenida y la revelación pendiente. La recarga revela la misma copia sin otro sorteo.

## Biblioteca y cobertura

El barrido encontró **1.993 variantes fallidas en 496 de 496 parejas base**. Las parejas tienen entre una y ocho variantes, con media de 4,02. Las parejas con una, dos, tres, cuatro, cinco, seis, siete y ocho variantes suman respectivamente 2, 31, 154, 145, 110, 42, 11 y 1. Las generaciones posteriores se evalúan al elegir los progenitores, con caché de 128 parejas.

| Familia | Variantes G1 | Qué deja de funcionar |
| --- | ---: | --- |
| Anatómica | 431 | Una articulación intenta cambiar el mismo apoyo en direcciones distintas. |
| Fisiológica | 238 | La señal se devuelve al receptor y repite el reflejo antes de completar el movimiento. |
| Estructural | 165 | Un refuerzo ocupa el espacio que la articulación necesita para cargar peso y girar. |
| Elemental | 116 | La sustancia escapa en el cambio de estado y se interrumpe la parte del cuerpo que debía propulsarla. |
| Conceptual | 255 | Un gesto profesional queda fuera del alcance del cuerpo o dos oficios bloquean el mismo movimiento. |
| Sobrenatural | 72 | Un dominio desvía el poder hacia el órgano que debía canalizarlo y repliega su manifestación. |
| Incompleta | 496 | Una fase endurece o cierra el apoyo antes de que la parte vecina termine de cambiar. |
| Por exceso | 220 | Se produce otra capa del mismo material y se pierde el espacio necesario para mover el apoyo. |

La ficha identifica el intento, la interrupción y el aporte de cada progenitor. Las reglas consultan su plan corporal, escala, oficio, materiales, sentidos, fisiología, conocimientos, afinidades y dominios disponibles. Un progenitor fusionado aporta sus rasgos conservados. Los ancestros aparecen como linaje informativo y como referencia de silueta cuando el progenitor inmediato es un híbrido.

Ejemplos revisados además del piloto incluyen Reflejo de Retorno con Lobo y Grifo, Dominio en Retorno con Dragón y Thor y Oficio sin Recorrido con Abogado y Médica. Lobo con Lobo puede perder la coordinación del apoyo; Civil con Civil conserva solo la transformación incompleta. En G2, la Forja de Placas de Anquilosaurio con Obrero admite fallos de carga y exceso. El Foco de fuego de Fénix y Sirena con Ajolote puede presentar un reflejo que se repite por regeneración. Se verificó el consumo de dos ejemplares de una misma variante y la prohibición de cruzar linajes que se solapan cuando los identificadores son distintos.

## Esencia y guardados

1. Alquimia consume exactamente cinco copias disponibles. Cada aberración aporta dos referencias directas, incluidas ambas si repite un progenitor. La esencia guarda fichas completas y agrupa las referencias idénticas con su multiplicidad.
2. Se enumeran pares de identificadores sin importar el orden. Cada par válido tiene una oportunidad. Tener muchas copias de uno de los dos identificadores solo habilita un par idéntico si hay al menos dos referencias. Distintos orígenes de aberración pueden aportar una pareja. El inventario ordinario y los ancestros quedan fuera de esta selección.
3. Activa la esencia para elegir uniformemente un par permitido y aplicar los pesos habituales de éxitos de ese cruce. La generación se calcula con esos dos progenitores. El resultado consume una esencia y entrega una copia funcional. El saldo de óbolos, las cartas progenitoras y el riesgo de fallo quedan fuera de esta operación.
4. Una esencia que pierde todas sus parejas compatibles se conserva con sus referencias. Su uso queda en espera. Si una actualización vuelve a permitir una de sus parejas, la lista se recalcula y vuelve a habilitar la recuperación. Se prueba esta ruta con un guardado histórico que contiene una pareja por encima del límite vigente.

En una prueba con fuentes G1, G2, G2, G3 y G4, las 20 parejas válidas dieron **20 éxitos** e incluyeron resultados G1 a G4. Se probaron los veinte intervalos de selección, incluido el cruce entre fuentes y la recuperación de dos copias referenciadas de una misma quimera.

El guardado pasa al formato 4 y conserva fichas, inventario, linaje, óbolos, retratos y descubrimientos de las versiones 1 a 3. Se probó un guardado real de `main` con seis aberraciones, una esencia destilada y una revelación pendiente. Las aberraciones anteriores conservan su identificador, defecto y apariencia. Las nuevas tienen un identificador de variante con la pareja ordenada y el fallo, y un identificador de copia por operación. El guardado contiene la ficha descubierta completa y un número de versión de reglas. Una variante retirada del sorteo puede seguir existiendo en la colección. La colección normal incorpora solo las aberraciones obtenidas.

## Revisión de las pinturas históricas

Se examinaron ocho pinturas y las ocho siguen asociadas a las fichas históricas. La revisión conserva la continuidad de esas cartas.

| Progenitores | Lectura de la pintura |
| --- | --- |
| Abogado + Pulpo | Los brazos convergen en un solo apoyo alrededor de la balanza. Conviene enfatizar el tirón en sentidos diferentes en una revisión futura. |
| Alquimista + Lobo | La pieza rígida cruza el eje del torso y condiciona su postura. |
| Alquimista + Mamut | Los dos flujos comparten el mismo núcleo del portador. |
| Búho + Búho | Los dos extremos intentan orientar el cuerpo en sentidos opuestos. |
| Búho + Lobo | Las alas descienden hacia el suelo desde el cuerpo. |
| Búho + Zorro | Una extremidad ocupa la zona ocular en lugar de aportar un apoyo. |
| Lobo + Mamut | Los apoyos acumulados en un costado coinciden con el peso caído. |
| Obrero + Zorro | Las cabezas opuestas conservan el defecto. El aporte del oficio se lee principalmente en el equipo. |

## Piloto artístico

Se generaron ocho pinturas originales como WebP de **768 × 768**. Pesan **1.300.392 bytes** en conjunto. Las siete primeras son G1. Puntales Saturados surge de Crisomamut con Obrero y es G2. Las pinturas usan escala ambiental y un fallo visible, desde un apoyo bifurcado hasta dos corrientes que se encierran sobre la misma égida. Los retratos restantes usan SVG o Canvas histórico bajo demanda.

| Criatura y progenitores | Identificador de variante | Retrato | Bytes |
| --- | --- | --- | ---: |
| Paso en Espejo · Lobo y Zorro | `aberration(lobo+zorro;axis-lock)` | [paso-en-espejo.webp](docs/assets/aberraciones/piloto/paso-en-espejo.webp) | 161.960 |
| Eco de Retorno · Pulpo y Sirena | `aberration(pulpo+sirena;sensory-loop)` | [eco-de-retorno.webp](docs/assets/aberraciones/piloto/eco-de-retorno.webp) | 193.306 |
| Contrafuerte Empotrado · Arquitecta y Tricerátops | `aberration(arquitecta+triceratops;load-bind)` | [contrafuerte-empotrado.webp](docs/assets/aberraciones/piloto/contrafuerte-empotrado.webp) | 173.384 |
| Marea que se Apaga · Fénix y Sirena | `aberration(fenix+sirena;phase-bleed)` | [marea-que-se-apaga.webp](docs/assets/aberraciones/piloto/marea-que-se-apaga.webp) | 108.008 |
| Mordaza sin Alcance · Herrera y Zorro | `aberration(herrera+zorro;blocked-craft)` | [mordaza-sin-alcance.webp](docs/assets/aberraciones/piloto/mordaza-sin-alcance.webp) | 144.886 |
| Égida a Contraviento · Atenea y Quetzalcóatl | `aberration(atenea+quetzalcoatl;domain-knot)` | [egida-a-contraviento.webp](docs/assets/aberraciones/piloto/egida-a-contraviento.webp) | 225.068 |
| Ribera a Medias · Ajolote y Zorro | `aberration(ajolote+zorro;interrupted)` | [ribera-a-medias.webp](docs/assets/aberraciones/piloto/ribera-a-medias.webp) | 130.218 |
| Puntales Saturados · Crisomamut y Obrero | `aberration(fusion(alquimista+mamut)+obrero;overgrowth)` | [puntales-saturados.webp](docs/assets/aberraciones/piloto/puntales-saturados.webp) | 163.562 |

## Acceso y validación

Desde la raíz, ejecuta `python3 -m http.server 8000 --directory docs`. La galería de diagnóstico está en `http://localhost:8000/diagnostics.html`. Selecciona progenitores, compara ambos grupos, exporta sus fichas o añade cinco aberraciones al ensayo de esencia. El piloto está en `http://localhost:8000/aberraciones.html`. Ambas páginas se sirven desde `docs` y funcionan en memoria para el diagnóstico. GitHub Pages ofrecerá esas mismas rutas tras incorporar la rama y publicarla.

`node --test tests/*.mjs` completó 33 pruebas de ocho suites. La inspección visual del piloto se realizó en las imágenes completas y a tamaño de tarjeta. En Chromium se verificaron los ocho archivos, el SVG, las exportaciones, el diagnóstico avanzado y el ensayo de esencia. Se comprobó la recarga durante el ritual completo y se reprodujeron las ocho revelaciones y el uso de esencia en emulación móvil a 393 px. Consola y red registraron cero errores. Los límites actuales del piloto son ocho pinturas nuevas y un muestreo de generaciones posteriores sobre resultados calculados a demanda.
