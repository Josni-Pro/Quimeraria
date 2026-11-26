# Mercado del Umbral · Sobres

Este documento describe el lanzamiento de la tienda y sus cifras iniciales. El balance y las modalidades de apertura actuales están registrados en [Arena, perfiles y sobres almacenados](ARENA.md#sobres-y-aperturas). La tienda de Quimeraria vende ocho sobres sellados. Ve a **Sobres**, elige una colección y selecciona **1**, **5** o **10**. Las opciones muestran el precio original, el porcentaje, el ahorro, el precio final y el número de cartas. El apartado **Otra cantidad** admite enteros de 1 a 10. La confirmación muestra el saldo restante. Guarda los sobres para más tarde, abre uno o abre la compra completa. Durante la apertura puedes revelar una carta, pasar a otro sobre, revelar todas las cartas, acelerar u omitir la animación.

La tienda se sirve desde `docs/index.html#sobres`. El [diagnóstico de sobres](docs/pack-lab.html) muestra los pesos, el catálogo elegible, las probabilidades por posición y por sobre, la clasificación de las cartas y una simulación local. Para abrir ambas páginas desde la rama, ejecuta `python3 -m http.server 8000 --directory docs` en la raíz y visita `http://localhost:8000/#sobres`.

## Precios y contenido

| Sobre | Cartas | Posiciones reservadas | Precio de 1 / 5 / 10 | Óbolos por carta de 1 / 5 / 10 |
| --- | ---: | --- | ---: | ---: |
| Explorador | 5 | Catálogo completo | 55 / 261 / 495 | 11,00 / 10,44 / 9,90 |
| Naturaleza | 6 | 4 animales naturales terrestres o aéreos | 72 / 342 / 648 | 12,00 / 11,40 / 10,80 |
| Civilización | 6 | 4 profesionales | 72 / 342 / 648 | 12,00 / 11,40 / 10,80 |
| Era Primordial | 6 | 4 especies extintas | 83 / 394 / 747 | 13,83 / 13,13 / 12,45 |
| Profundidades | 6 | 4 acuáticas o anfibias | 83 / 394 / 747 | 13,83 / 13,13 / 12,45 |
| Arcano | 7 | 4 cartas mágicas o fantásticas | 110 / 523 / 990 | 15,71 / 14,94 / 14,14 |
| Panteón | 7 | 1 deidad y 3 cartas mitológicas o divinas | 138 / 656 / 1 242 | 19,71 / 18,74 / 17,74 |
| Quimérico | 10 | 2 animales naturales, 2 profesiones, 1 prehistórica y 1 mitológica o divina | 165 / 784 / 1 485 | 16,50 / 15,68 / 14,85 |

Cada posición restante se sortea del catálogo general. Las posiciones reservadas se resuelven por separado. Las probabilidades de rareza dependen del grupo y dentro de una rareza elegible las cartas tienen el mismo peso. Cada sobre repite su propia configuración, con reposición entre posiciones. Se mezclan las cartas antes de mostrar sus reversos.

Los precios siguen los multiplicadores pedidos sobre P = 55 con redondeo al óbolo más cercano. Los descuentos son 0 %, 5 % y 10 % para 1, 5 y 10 sobres, respectivamente, y se aplican una sola vez al total. Las demás cantidades pagan el precio unitario completo. Por ejemplo, cinco Primordiales cuestan `redondear(83 × 5 × 0,95) = 394`. Diez Quiméricos entregan 100 cartas base por 1 485 óbolos, un ahorro de 165.

### Sistema anterior y comparación

| Sobre histórico | Cartas | Precio | Coste por carta | Pesos por rareza, de común a mítica | Garantía anterior |
| --- | ---: | ---: | ---: | --- | --- |
| Esencial | 3 | 55 | 18,33 | 70 / 24 / 5 / 1 / 0 | Rara o superior en hasta 4 sobres |
| Arcano | 3 | 110 | 36,67 | 35 / 42 / 18 / 4,5 / 0,5 | Épica o superior en hasta 4 sobres |
| Reliquia | 3 | 155 | 51,67 | 12 / 33 / 37 / 16 / 2 | Épica o superior en hasta 5 sobres |

El precio de entrada de 55 pasó de tres a cinco cartas. A 110, el nuevo Arcano pasa de tres a siete y reserva cuatro lugares para conceptos mágicos o fantásticos. La especialización puede costar más por carta y aumenta la posibilidad de obtener el linaje correspondiente. El Quimérico da la mezcla más amplia. El Explorador conserva el costo más bajo por carta con y sin descuento. Los 120 óbolos iniciales permiten comprar dos Exploradores. Desde saldo cero, cinco recorridos de la Senda del recolector dan para uno a 12 óbolos por recorrido. Se conservan los pagos de expediciones.

### Las 31 cartas y sus etiquetas

La clasificación utiliza las familias del catálogo, la anatomía, los rasgos, el oficio, el conocimiento y el equipo que ya describen las cartas. Los grupos pueden solaparse. El reto de Naturaleza aplica a los cuatro animales naturales terrestres o aéreos. Quimérico también admite al Pulpo y al Ajolote en su cuota de animales naturales.

| Grupo | Cartas |
| --- | --- |
| Naturales terrestres o aéreas | Lobo, Zorro, Búho y Oso pardo |
| Acuáticas o anfibias | Pulpo, Ajolote, Megalodón y Sirena |
| Profesionales | Civil, Obrero, Alquimista, Mago, Abogado, Médica, Herrera, Cartógrafa, Músico y Arquitecta |
| Prehistóricas | Mamut, Velociraptor, Tricerátops, Anquilosaurio, Megalodón y Rinoceronte lanudo |
| Fantásticas y mitológicas | Grifo, Dragón, Fénix, Esfinge y Sirena |
| Deidades y figuras mitológicas | Quetzalcóatl, Anubis, Atenea y Thor |

Megalodón es acuático y prehistórico. Sirena es acuática, fantástica y mitológica. Quetzalcóatl es divino, mitológico, sobrenatural y aéreo. Alquimista combina profesión, conocimiento, artesanía y magia. La vista de etiquetas del diagnóstico detalla otros rasgos, incluidos artesanía, tecnología y vuelo. Todas las posiciones entregan G0.

### Probabilidades y simulación

Para una rareza o una carta de probabilidad `p_i` en cada grupo de `n_i` posiciones independientes, la probabilidad de verla al menos una vez es `1 − ∏(1 − p_i)^n_i`. En una posición, la probabilidad de una carta es el peso normalizado de su rareza dividido por las cartas elegibles en esa rareza. Los porcentajes siguientes son probabilidades de ver al menos una de la rareza indicada. Una apertura puede contribuir a varias columnas.

| Sobre | Común | Poco común | Rara | Épica | Mítica |
| --- | ---: | ---: | ---: | ---: | ---: |
| Explorador | 99,47 % | 76,27 % | 34,09 % | 8,22 % | 1,49 % |
| Naturaleza | 99,93 % | 84,03 % | 15,36 % | 3,37 % | 0,60 % |
| Civilización | 98,80 % | 94,06 % | 51,51 % | 3,37 % | 0,60 % |
| Era Primordial | 98,71 % | 87,97 % | 63,57 % | 24,56 % | 0,60 % |
| Profundidades | 97,81 % | 97,01 % | 15,36 % | 44,64 % | 0,60 % |
| Arcano | 90,89 % | 96,86 % | 86,27 % | 60,10 % | 12,79 % |
| Panteón | 90,89 % | 91,83 % | 84,53 % | 97,26 % | 12,85 % |
| Quimérico | 99,97 % | 98,23 % | 73,30 % | 27,15 % | 3,17 % |

La plaza divina del Panteón tiene 94 % de peso épico y 6 % mítico. El resto del sobre puede sumar deidades y míticas, y la probabilidad de Quetzalcóatl en todo el sobre queda en 4,43 %.

| Sobre | Cartas temáticas esperadas | Ejemplo de progenitor y probabilidad teórica de al menos uno | Aperturas con algún duplicado en la muestra |
| --- | ---: | --- | ---: |
| Explorador | Generalista | Lobo 28,54 % | 41,9 % |
| Naturaleza | 4,45 | Lobo 71,34 % | 94,6 % |
| Civilización | 4,81 | Médica 45,15 % | 68,5 % |
| Era Primordial | 4,41 | Mamut 52,94 % | 83,3 % |
| Profundidades | 4,25 | Megalodón 43,20 % | 94,7 % |
| Arcano | 4,49 | Mago 41,67 % | 77,1 % |
| Panteón | 4,32 | Quetzalcóatl 4,43 % | 78,5 % |
| Quimérico | 10,00 en la unión de grupos, 6 plazas reservadas | Médica 39,80 % | 83,3 % |

`node scripts/pack-sim.mjs 10000 1977` simula 10 000 aperturas de cada uno de los ocho sobres y de cada uno de los tres históricos. Las 80 000 aperturas nuevas entregaron 530 000 cartas y cumplieron todas las cantidades, elegibilidades y garantías. El script contrasta las frecuencias observadas con una tolerancia basada en el tamaño de muestra. En las simulaciones históricas, Lobo apareció en 18,57 % de Esenciales y Mago en 10,22 % de Arcanos. La repetición es más alta en Naturaleza y Profundidades porque sus cuatro posiciones reservadas eligen entre cuatro cartas disponibles. Sus medias teóricas son 1,61 y 1,59 copias repetidas, respectivamente. Estos grupos merecen seguimiento si se amplía el catálogo.

## Persistencia y arquitectura

- `docs/pack-config.js` centraliza precios, descuentos, etiquetas, grupos, garantías y enlaces a arte. `docs/pack-rules.js` resuelve sorteos y probabilidades compartidos por tienda y diagnóstico. `docs/pack-diagnostics.js` y `scripts/pack-sim.mjs` ejecutan simulaciones reproducibles.
- `docs/pack-transactions.js` valida el saldo, guarda los sobres sellados y asigna identificadores independientes. Al abrir consume los sobres y guarda el resultado antes de animar. Revelar cambia únicamente las posiciones vistas hasta que se revela la última. En ese momento se acredita todo el lote en una escritura. El recibo y el resumen se recuperan tras recargar. Una carta ya descubierta cuenta como copia adicional incluso si se usaron todos sus ejemplares. Las fichas enumeran los ejemplares obtenidos que sigan disponibles.
- `docs/engine.js` migra los formatos 1–4 al 5 y conserva las reglas, pesos y contadores de los sobres históricos. La tienda anterior compraba y abría inmediatamente. Un ejemplar histórico sellado presente en el guardado se puede abrir con su configuración original. El flujo utiliza el guardado de LocalStorage y el bloqueo entre pestañas disponible en Chromium. En navegadores sin Web Locks se conserva la comprobación de revisión y saldo.
- `docs/pack-shop.js`, `docs/pack-shop.css` y `docs/pack-visuals.js` presentan la tienda, la confirmación, la apertura y el resumen. La apertura centra el envoltorio, ilumina la unión, separa las mitades y distribuye cartas boca abajo. Las transiciones combinan hojas, chispas, fragmentos, ondulaciones, burbujas y trazos según la colección. Las épicas y míticas tienen una revelación breve más luminosa. La vista conjunta agrupa hasta 31 fichas y permite filtrar por rareza. El audio local reutiliza las preferencias de volumen y silencio, y es opcional. Se respetan movimiento reducido y el modo sin animación.

## Pinturas y validación

Se generaron ocho pinturas originales. Se publican como WebP de 768 × 1152 píxeles en `docs/assets/sobres/` y pesan **784 154 bytes** en conjunto. La guía registra cada archivo, su peso y la dirección artística. [Registro de arte de sobres](GUIA-ARTISTICA.md#arte-de-los-sobres)

Pasaron 55 pruebas automatizadas con `node --test tests/*.mjs`. En Chromium se revisaron escritorio y anchos táctiles de 360, 393 y 430 px. Se comprobó la decodificación de imágenes, las ocho aperturas temáticas, el modo sin animación, la revelación mítica con sorteo controlado, el descuento, la recarga durante la apertura, el cobro único en dos pestañas y el resumen real de 100 cartas. El navegador registró cero errores de JavaScript o HTTP. La grabación visual muestra Naturaleza y Profundidades en la implementación. Las pruebas móviles se ejecutaron por emulación.
