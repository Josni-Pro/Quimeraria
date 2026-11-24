# Quimeraria

Juego de cartas que combina personas, animales actuales, especies extintas, criaturas míticas y deidades. La colección inicial contiene seis cartas y 120 óbolos. La Forja muestra el resultado de cada combinación antes de que confirmes el gasto. Las expediciones usan tus cartas para obtener óbolos y los sobres añaden cartas al inventario.

## Ejecutar la versión local

Sirve la carpeta del juego desde la raíz del proyecto y abre `http://localhost:8000`.

```sh
python3 -m http.server 8000 --directory dist
```

La interfaz guarda el progreso en el almacenamiento local del navegador. `dist/engine.js` contiene las reglas y gestiona los cambios de estado. `dist/catalog.js` contiene las cartas, rasgos, habilidades, fórmulas, sobres y expediciones. `dist/app.js` conecta el motor con la interfaz.

## Cómo se calcula una fusión

1. El motor ordena los dos identificadores de material. Invertirlos produce la misma quimera. Fusionar dos cartas iguales requiere dos copias.
2. El motor suma un punto si los rasgos coinciden o pertenecen a la misma familia, otro si los atributos principales difieren y otro si las categorías son distintas.
3. La rareza normal parte de la media de las rarezas de los materiales, redondeada hacia abajo. Sube un grado si la afinidad llega a dos puntos. Una fórmula registrada puede fijar la rareza. El resultado queda a un grado como máximo por encima del mejor material y para una mítica hacen falta dos materiales épicos o míticos.
4. El motor reparte el presupuesto de atributos de la rareza entre Fuerza, Guardia e Ingenio, ponderando las estadísticas de los dos materiales y la especialidad. Cada atributo recibe al menos 2 puntos y como máximo el 58 % del presupuesto, redondeado hacia arriba.
5. La quimera conserva hasta tres rasgos. Tiene una habilidad activa, heredada de uno de los materiales o definida por su fórmula. La habilidad da hasta 3 puntos adicionales en expediciones del atributo correspondiente.
6. Al confirmar se consumen dos cartas y se añade una. La tarifa se fija con la rareza del material de mayor nivel. Las cartas base son generación 0 y el máximo de una quimera es generación 2. Si alguno de los materiales es una quimera, sus antepasados base deben ser distintos de los del otro material.

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

Las expediciones muestran su puntuación antes de salir. Suman el atributo que pide la misión de cada carta, su habilidad si corresponde y una bonificación única si el grupo tiene el rasgo solicitado. La primera victoria puede pagar un extra. Las cartas regresan tras cada intento. Con una sola carta puedes hacer la Senda del recolector y obtener siempre 12 óbolos, incluso si te quedaste sin fondos después de una compra o fusión.

## Ampliar el catálogo

- **Añadir una profesión, un animal o una deidad.** Añade una fila a `CARDS` con un identificador único y estable, su familia, rareza, tres atributos, rasgos y habilidad. Usa los presupuestos de la tabla. El identificador también es la clave predeterminada de su ilustración. La carta entra automáticamente en los sobres que admiten esa rareza y familia y recibe fusiones con todo el catálogo.
- **Añadir un rasgo.** Decláralo en `TRAITS`. Su familia agrupa rasgos afines para la Forja. Para usarlo en un reto, asigna su clave a `trait` y la cantidad de puntos a `traitBonus` en `MISSIONS`.
- **Añadir una habilidad.** Declárala en `ABILITIES` con un atributo y una bonificación de 1 a 3. Después referencia su identificador en las cartas y fórmulas que la utilicen.
- **Registrar una fórmula.** Añade una entrada a `RECIPES` con dos identificadores de material y el nombre del resultado. Puedes definir descripción, rareza, habilidad, ilustración y rasgos destacados. `specialization` acepta un atributo y un peso de 0 a 6 que ajusta la distribución de puntos sin cambiar el presupuesto.
- **Añadir un sobre o una ruta.** Usa una nueva entrada de `PACKS` o `MISSIONS`. Cada peso positivo del sobre necesita al menos una carta compatible con la rareza y familia indicadas. Mantén una expedición de recuperación para una sola carta al ajustar precios y recompensas.
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

Añade un perfil en `dist/portrait-profiles.js` con el mismo identificador que la carta base. `face` define su contorno, `features` ordena sus distintivos por prioridad y `colors` guarda sus colores base, de sombra y de luz. `accent` da color a los detalles, `texture` define el acabado y `visual` describe la apariencia en español. Puedes reutilizar las formas y motivos de los perfiles existentes.

El retrato generado combina anatomía, rasgos y objetos de los dos materiales. El orden de selección conserva la apariencia. Un linaje puede aportar su silueta de chacal y el otro la balanza de un abogado.

Guarda la ilustración de la carta base en `dist/assets/<id>.webp`. Una fórmula puede usar el retrato generado o declarar una ilustración propia mediante `art`. El arreglo opcional `artVariants` admite las claves de archivo de los niveles refinado y magistral, en ese orden. Cada repetición guarda el mejor nivel del retrato en la partida. El retrato se comparte entre las copias de la misma quimera y los atributos conservan sus valores.

Configura `nameMotif` como `[raíz, forma, epíteto]` en una carta nueva para personalizar las palabras que aporta al generador de nombres. Cuando falta, el generador usa el nombre y los rasgos de la carta.

## Comprobar cambios

Ejecuta la verificación del catálogo, la economía y las reglas desde la raíz con Node.js 22 o superior.

```sh
node tests/balance.mjs
node tests/portraits.mjs
```

Tras añadir cartas o ajustar los costos, revisa la distribución de rarezas, la garantía de los sobres, las rutas que se pueden superar al comenzar y el acceso a la moneda después de gastar los fondos iniciales.
