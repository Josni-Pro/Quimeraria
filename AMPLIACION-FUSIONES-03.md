# Ampliación de fusiones · Lote 03

## Cobertura de primera generación

Se comparó `main` (`b268c33`) con el lote 03. El barrido recorre las parejas sin distinguir su orden e incluye las 31 parejas de cartas iguales. Las especies mitológicas, prehistóricas y convergentes se cuentan por especie, aunque puedan obtenerse por varios cruces. El arte se cuenta por variante al nivel inicial del retrato.

| Indicador | Antes | Lote 03 |
| --- | ---: | ---: |
| Cartas base | 31 | 31 |
| Combinaciones base | 496 | 496 |
| Variantes exitosas | 1.180 | 1.206 |
| Combinaciones con una variante | 61 | 44 |
| Combinaciones con dos variantes | 239 | 248 |
| Combinaciones con tres o más variantes | 196 | 204 |
| Promedio de variantes por pareja | 2,38 | 2,43 |
| Variantes excepcionales | 10 | 13 |
| Especies mitológicas | 5 | 9 |
| Especies prehistóricas | 2 | 5 |
| Especies obtenibles mediante convergencia | 3 | 5 |
| Variantes con arte definitivo | 92 | 115 |
| Variantes pendientes de arte definitivo | 1.088 | 1.091 |

De las 26 parejas ampliadas, 17 tenían una sola variante, ocho tenían dos y una tenía tres. Las 1.180 variantes previas conservan sus identificadores, conceptos y perfiles. En las parejas ampliadas, los pesos existentes se normalizan junto al de la nueva variante. La tasa de éxito de la fusión conserva su valor. Las generaciones posteriores se resuelven bajo demanda y quedan fuera de este recuento.

## Reglas y ejemplos

- **Adaptaciones de fauna.** Una criatura terrestre de carga con coraza o rasgos ancestrales puede incorporar la habilidad de un guía. El Lobo mantiene una ruta de grupo con el Rastreador de Coraza. El Zorro sigue rastros finos a sotavento. El Búho combina la escucha direccional con la protección del cuerpo terrestre. La regla añade 12 variantes base y también produce un rastreador G2 con Lobo de Huella Fría y Tricerátops.
- **Instituciones de oficio.** Los progenitores deben conservar el mismo oficio en sus conceptos inmediatos. Dos Arquitectas producen un archivo articulado que despliega una pasarela. Dos Abogados producen una mesa viviente que formaliza pactos. Dos copias de una maestra de arquitectura permiten obtener el Archivo en G2.
- **Cartas iguales.** Atenea combina telar y estrategia en un autómata que ensaya rutas sobre un tablero. La Esfinge del Eco usa dos cámaras de garganta y un umbral resonante para indicar un paso. Dos Velociraptores y dos Rinocerontes lanudos abren sendas hacia Utahraptor y Elasmotherium.
- **Convergencias.** Búho o Fénix con Esfinge producen un Grifo. Atenea con Grifo produce una Esfinge. El nombre, la imagen y el perfil de especie provienen del catálogo. La carta obtenida conserva su identidad, generación, progenitores, linaje y origen de fusión. La regla descarta la vuelta a una especie que figura entre los ancestros base. Búho de las Alturas y Esfinge también pueden producir un Grifo G2.

| Especie incorporada | Progenitores | Rasgo representativo |
| --- | --- | --- |
| Aker · tradición egipcia | Anubis + Esfinge | Leones opuestos bajo el disco solar en un umbral funerario |
| Jörmungandr · tradición nórdica | Quetzalcóatl + Thor | Serpiente marina que se muerde la cola en plena tormenta |
| Simurgh · tradición persa | Grifo + Lobo | Ave de rostro canino cuya pluma guía a un viajero herido |
| Ahuízotl · tradición nahua | Ajolote + Lobo | Guardián acuático con una mano en el extremo de su cola |
| Smilodon | Esfinge + Mamut | Felino de hombros fuertes, cola corta y caninos de sable |
| Elasmotherium | Rinoceronte lanudo + Rinoceronte lanudo | Rinocerótido con un solo cuerno frontal, de aspecto imaginado |
| Utahraptor | Velociraptor + Velociraptor | Dromeosáurido emplumado con cola rígida y garras internas curvas |

Las especies prehistóricas son interpretaciones fantásticas. Aker, Jörmungandr y la Estratega de las Cien Piezas son las tres incorporaciones excepcionales. Sus perfiles usan los presupuestos centrales de generación y rareza y las mismas familias de capacidades que las demás variantes. La herencia consulta los rasgos de los progenitores inmediatos y conserva los límites actuales.

## Arte y pendientes

Se incorporaron 20 pinturas nuevas, diez para variantes existentes y diez para variantes nuevas. Otras tres variantes reutilizan los retratos de catálogo de Grifo o Esfinge. El Barrio de Contrapeso conserva su pintura del lote 02. La guía reúne los 20 identificadores, rutas, tamaños y notas de producción. [Guía artística](GUIA-ARTISTICA.md)

Trece de las variantes añadidas siguen con arte provisional, incluidas la Esfinge del Eco, la Mesa de Pactos y las adaptaciones de fauna aún sin pintura. Antes de ilustrar ese grupo conviene diferenciar las siluetas y funciones de sus portadores. Continúa pendiente la revisión anatómica de los planeadores de Pulpo y Ajolote, identificados en el lote 02. Las 44 parejas con un solo resultado se mantienen hasta que haya otra interpretación justificada.

## Revisión

Desde la raíz se puede servir `docs` con `python3 -m http.server 8000 --directory docs`. Abre `http://localhost:8000/lote-03.html` para ver y ampliar las pinturas, o `http://localhost:8000/diagnostics.html` para revisar fichas, perfiles, probabilidades y exportar el registro en JSON.

`node --test tests/*.mjs` ejecuta las siete suites. El barrido de `tests/variants.mjs` imprime las métricas de la tabla y verifica probabilidades, identificadores, perfiles, herencia, fichas y archivos. Las pruebas de guardado incluyen partidas históricas y nuevas variantes G2. Chromium comprueba las veinte imágenes en la galería, el diagnóstico y su exportación JSON, y en emulación móvil verifica las revelaciones, el inventario, la colección y las fichas.
