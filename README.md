# Quimeraria

Juego de cartas que combina personas, animales actuales, especies extintas, criaturas míticas y deidades. La colección inicial contiene seis cartas y 120 óbolos. La Forja revela el resultado después de confirmar la fusión. Las expediciones otorgan óbolos y los sobres añaden cartas al inventario. Alquimia convierte las aberraciones de fusiones fallidas en oportunidades de recuperar sus linajes.

## Ejecutar la versión local

Sirve la carpeta del juego desde la raíz del proyecto y abre `http://localhost:8000`.

```sh
python3 -m http.server 8000 --directory docs
```

La partida pertenece al navegador y al origen desde el que se abre el juego. `docs/engine.js` aplica las reglas y produce los cambios de estado. `docs/catalog.js` contiene cartas, habilidades, fórmulas, sobres y expediciones. `docs/game-config.js` centraliza el porcentaje de éxito, el número de aberraciones que pide una esencia y la generación máxima. `docs/app.js`, `docs/alchemy-ui.js` y `docs/ritual.js` conectan estas reglas con la interfaz.

## Forja, revelación y guardado

La Forja muestra los materiales elegidos, el costo y la probabilidad de cada desenlace. Al confirmar, consume los dos materiales y los óbolos y sortea el resultado. La configuración inicial da un 95 % de éxito y un 5 % de probabilidad de aberración. Configuración permite completar la animación, reducirla o saltarla.

El juego guarda el gasto, la carta nueva y la revelación pendiente juntos en LocalStorage antes de mostrar la animación. Al volver al juego después de una recarga, se reanuda la revelación del mismo resultado. La migración del guardado anterior conserva cartas, óbolos, fusiones, variantes de retratos y expediciones.

## Aberraciones y esencias

Una fusión fallida produce una aberración con nombre, retrato e identificador propios. Su ficha registra la incompatibilidad, los dos progenitores exactos y el linaje base. Las aberraciones se reservan para Alquimia y se pueden consultar en el inventario, en Descubiertas y en el historial alquímico.

1. Selecciona manualmente cinco aberraciones en Alquimia. Puedes elegir varias copias de una misma carta.
2. Destila la selección. La esencia consume las aberraciones y registra sus progenitores con el número de veces que aparece cada uno.
3. Activa la esencia. El juego elige al azar una pareja válida entre los progenitores registrados, incluso de dos aberraciones distintas. Repetir un progenitor requiere dos registros del mismo. La recuperación respeta la rareza, el linaje, la generación y las recetas especiales de la Forja.
4. La recuperación tiene éxito garantizado y consume únicamente la esencia. La nueva carta se descubre en su propia animación y queda en el historial alquímico.

## Cómo se calcula una fusión

1. El motor ordena los dos identificadores de material. Invertirlos conserva la fórmula y el retrato de cada desenlace. Fusionar dos cartas iguales requiere dos copias.
2. El motor suma un punto si los rasgos coinciden o pertenecen a la misma familia, otro si los atributos principales difieren y otro si las categorías son distintas.
3. La rareza normal parte de la media de las rarezas de los materiales, redondeada hacia abajo. Sube un grado si la afinidad llega a dos puntos. Una fórmula registrada puede fijar la rareza. El resultado queda a un grado como máximo por encima del mejor material y para una mítica hacen falta dos materiales épicos o míticos.
4. El motor reparte el presupuesto de atributos de la rareza entre Fuerza, Guardia e Ingenio, ponderando las estadísticas de los dos materiales y la especialidad. Cada atributo recibe al menos 2 puntos y como máximo el 58 % del presupuesto, redondeado hacia arriba.
5. La quimera conserva hasta tres rasgos. Tiene una habilidad activa, heredada de uno de los materiales o definida por su fórmula. La habilidad da hasta 3 puntos adicionales en expediciones del atributo correspondiente.
6. Al confirmar se consumen dos cartas y se añade una. La tarifa se fija con la rareza del material de mayor nivel. Las cartas base son generación 0 y el máximo inicial de una quimera es generación 4. Si alguno de los materiales es una quimera, sus antepasados base deben ser distintos de los del otro material.

| Rareza | Presupuesto de Fuerza, Guardia e Ingenio | Costo de forja si es la mayor rareza de los materiales |
| --- | ---: | ---: |
| Común | 12 | 18 óbolos |
| Poco común | 15 | 24 óbolos |
| Rara | 18 | 30 óbolos |
| Épica | 21 | 38 óbolos |
| Mítica | 24 | 48 óbolos |

El **Arcanolobo** combina el olfato del Lobo con la especialidad del Alquimista. Su fórmula da prioridad a Ingenio y fija la habilidad Olfato alquímico, que añade 3 puntos al resolver expediciones de Ingenio. Su rareza es rara y cuesta 24 óbolos porque su material de mayor rareza, el Alquimista, es poco común.

## Sobres y expediciones

Cada sobre contiene tres cartas base. Las probabilidades se aplican por posición. Dentro de cada rareza, todas las cartas disponibles en el sobre tienen el mismo peso y se pueden repetir. El contador de garantía es independiente para cada sobre y vuelve a cero cuando sale una carta que cumple su mínimo. Si se agota la espera, el último espacio del sobre garantiza ese mínimo cuando los dos primeros espacios aún no lo cumplen.

| Sobre | Precio | Común | Poco común | Rara | Épica | Mítica | Garantía |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Esencial | 55 | 70 % | 24 % | 5 % | 1 % | 0 % | Rara o mejor en hasta 4 sobres |
| Arcano | 110 | 35 % | 42 % | 18 % | 4,5 % | 0,5 % | Épica o mejor en hasta 4 sobres |
| Reliquia | 155 | 12 % | 33 % | 37 % | 16 % | 2 % | Épica o mejor en hasta 5 sobres |

Esencial y Arcano incluyen las cinco familias de cartas base. Reliquia concentra su oferta en especies extintas, criaturas míticas y deidades.

Las expediciones muestran su puntuación antes de salir. Suman el atributo que pide la misión de cada carta, su habilidad si corresponde y una bonificación única si el grupo tiene el rasgo solicitado. La primera victoria puede pagar un extra. Las cartas regresan tras cada intento. La Senda del recolector paga 12 óbolos. Puedes recorrerla con una carta o con el equipo vacío si agotaste las criaturas funcionales de tu inventario.

## Ampliar el catálogo

- **Añadir una profesión, un animal o una deidad.** Añade una fila a `CARDS` con un identificador único y estable, su familia, rareza, tres atributos, rasgos y habilidad. Usa los presupuestos de la tabla. El identificador también es la clave predeterminada de su ilustración. La carta entra automáticamente en los sobres que admiten esa rareza y familia y recibe fusiones con todo el catálogo.
- **Añadir un rasgo.** Decláralo en `TRAITS`. Su familia agrupa rasgos afines para la Forja. Para usarlo en un reto, asigna su clave a `trait` y la cantidad de puntos a `traitBonus` en `MISSIONS`.
- **Añadir una habilidad.** Declárala en `ABILITIES` con un atributo y una bonificación de 1 a 3. Después referencia su identificador en las cartas y fórmulas que la utilicen.
- **Registrar una fórmula.** Añade una entrada a `RECIPES` con dos identificadores de material y el nombre del resultado. Puedes definir descripción, rareza, habilidad, ilustración y rasgos destacados. `specialization` acepta un atributo y un peso de 0 a 6 que ajusta la distribución de puntos sin cambiar el presupuesto.
- **Añadir un sobre o una ruta.** Usa una nueva entrada de `PACKS` o `MISSIONS`. Cada peso positivo del sobre necesita al menos una carta compatible con la rareza y familia indicadas. Mantén accesible la Senda del recolector al ajustar precios y recompensas.
- **Mantener compatibilidad.** Conserva los identificadores publicados. Las quimeras descubiertas se guardan con sus propios atributos y habilidad. Si vas a eliminar cartas, renombrar identificadores o cambiar el esquema de guardado, añade una migración en `loadGame`.

Por ejemplo, una profesión nueva que reutiliza rasgos y habilidad existentes se añade a `CARDS` con una sola entrada de datos.

```js
card("jardinera", "Jardinera", "human", 0, stats(3, 4, 5),
  ["adaptacion", "curacion"], "improvisar",
  "Reconoce qué plantas prosperan cuando cambia el terreno."),
```

Si quieres que con el Ajolote tenga nombre y habilidad propios, registra su cruce en `RECIPES`. El resultado sigue usando las reglas de herencia y presupuesto.

```js
{
  parents: ["jardinera", "ajolote"],
  name: "Guardiana del Humedal",
  rarity: 1,
  ability: "branquias",
  description: "Recupera los humedales a partir de brotes y tejidos que vuelven a crecer.",
},
```

### Retratos de cartas y quimeras

Añade un perfil en `docs/portrait-profiles.js` con el mismo identificador que la carta base. `face` define su contorno, `features` ordena sus distintivos por prioridad y `colors` guarda sus colores base, de sombra y de luz. `accent` da color a los detalles, `texture` define el acabado y `visual` describe la apariencia en español. Puedes reutilizar las formas y motivos de los perfiles existentes.

Las 496 fusiones de primera generación tienen su propio WebP inicial. Hay 44 cruces con pintura dedicada, incluidas las 12 fórmulas especiales, y 452 retratos generados individualmente y guardados como WebP. Ocho aberraciones también tienen pintura dedicada. Las demás aberraciones y las generaciones posteriores se dibujan cuando aparecen.

La composición generada integra la anatomía, los rasgos y los objetos de ambos materiales. Conserva su apariencia al volver a cargar y se dibuja cuando la interfaz la necesita. Un linaje puede aportar el hocico de chacal y el otro la balanza de un abogado. El perfil de incompatibilidad define la estructura imposible de cada aberración.

Guarda la ilustración de la carta base en `docs/assets/<id>.webp`. Una fórmula puede usar el retrato generado o declarar una ilustración propia mediante `art`. El arreglo opcional `artVariants` admite las claves de archivo de los niveles refinado y magistral, en ese orden. Cada repetición guarda el mejor nivel del retrato en la partida. El retrato se comparte entre las copias de la misma quimera y los atributos conservan sus valores.

Para añadir una pintura a un cruce existente, registra el identificador de la carta y las claves de archivo en `PORTRAIT_OVERRIDES` de `docs/fusion-paintings.js`. Si amplías el catálogo base, puedes volver a preparar sus retratos WebP con `node scripts/bake-portraits.mjs`. El comando opcional requiere `@napi-rs/canvas` en el equipo de desarrollo. `QUIMERARIA_CANVAS` admite la ruta de una instalación local de ese módulo.

Configura `nameMotif` como `[raíz, forma, epíteto]` en una carta nueva para personalizar las palabras que aporta al generador de nombres. Cuando falta, el generador usa el nombre y los rasgos de la carta.

## Comprobar cambios

Ejecuta la verificación del catálogo, la economía y las reglas desde la raíz con Node.js 22 o superior.

```sh
node tests/balance.mjs
node tests/portraits.mjs
node tests/alchemy.mjs
node tests/static.mjs
node --test tests/ritual.mjs
```

Las pruebas cubren probabilidades y progresión, ilustraciones y linajes, migración de partidas, consumo de recursos y recuperación de una revelación pendiente. Tras ajustar los costos, revisa la distribución de rarezas, la garantía de los sobres y la recuperación de moneda.

## Publicación

GitHub Pages sirve la carpeta `/docs` de la rama configurada. Las rutas son relativas para que el juego también funcione bajo el nombre del repositorio. Para preparar el artefacto estático de Sites, ejecuta `node scripts/build-static.mjs`. Este comando copia la versión de `docs` en `dist`.
