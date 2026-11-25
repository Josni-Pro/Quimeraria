# Guía artística de Quimeraria

Usa como referencia el peso y la textura mineral del [Coloso Alquímico](docs/assets/piloto/coloso-alquimico.webp) y la luz ambiental y el pelaje de [Kitsune](docs/assets/piloto/kitsune.webp). Ambos son retratos cuadrados de fantasía con acabado de pintura digital detallada. Conserva el contraste entre materiales y reserva los brillos intensos para los poderes, el fuego o los reactivos que definan a la criatura.

- **Composición.** Da prioridad al cuerpo y a su acción. Deja margen alrededor de las extremidades, alas y herramientas importantes para que sigan legibles en el recorte de las cartas. Usa el entorno para dar escala y deja que pierda detalle a distancia.
- **Iluminación.** Elige una fuente ambiental dominante. Usa reflejos secundarios en metal, vidrio, roca húmeda o pelaje para separarlos del fondo. Prueba la silueta a tamaño de carta.
- **Anatomía.** Fija el número de extremidades y sus puntos de anclaje antes de introducir equipo. Si una criatura sostiene una carga, muestra cómo reparte el peso y cómo acciona la herramienta. En un beastkin, rasgos como la nariz, el oído y el pelaje pueden transmitir el linaje con una cara humanoide.
- **Diferenciación.** Decide qué aporta cada progenitor y qué acción permite la fusión. Un laboratorio necesita una estación de trabajo, un vehículo de asedio necesita su plataforma y una criatura de rescate necesita equipo que pueda utilizar. Compara las siluetas y funciones de las variantes hermanas antes de aceptar el retrato.
- **Archivo.** Exporta a WebP de 768 × 768 píxeles con un nombre estable en minúsculas. Revisa la compresión a tamaño completo y en miniatura. Entrega el cuadro sin texto, marco ni marcas de agua. Asocia el archivo al identificador exacto de la variante en el registro de arte.

## Lote 01

La dirección artística de cada pintura completa la ficha de la variante con postura, anatomía y función visible. Los datos del lote están en `docs/fusion-art-batch-01.js` y alimentan el registro, la galería y la exportación JSON del diagnóstico.

El Laboratorio, el Bastión y el Vigía son tres mamuts con funciones y siluetas diferenciadas. El primero lleva una estación de destilación, el segundo una plataforma baja de asedio y el tercero aloja un organismo acuático. El Taller de Tricerátops se concentra en un tablero de planos y un compás. El Barrio de Contrapeso quedó reservado para el lote 02 para dedicar una pintura propia a su escala habitable. El Coloso Alquímico y Kitsune conservan las pinturas del piloto.

Para revisar el lote, ejecuta `python3 -m http.server 8000 --directory docs` desde la raíz y abre `/lote-01.html`. Cada pintura enlaza al WebP completo y su ficha muestra los progenitores y el identificador.

### Registro del lote

| Criatura | Progenitores | Identificador | WebP |
| --- | --- | --- | --- |
| Laboratorio alquímico ambulante | Alquimista + Mamut | `variant(fusion(alquimista+mamut);laboratory)` | [laboratorio-alquimico-ambulante.webp](docs/assets/lote-01/laboratorio-alquimico-ambulante.webp) |
| Bastión de pólvora verde | Alquimista + Mamut | `variant(fusion(alquimista+mamut);siege)` | [bastion-polvora-verde.webp](docs/assets/lote-01/bastion-polvora-verde.webp) |
| Rescatista de altura · Búho | Búho + Médica | `variant(fusion(buho+medica);air-rescue)` | [rescatista-altura-buho.webp](docs/assets/lote-01/rescatista-altura-buho.webp) |
| Taller itinerante de arquitectura | Arquitecta + Tricerátops | `variant(fusion(arquitecta+triceratops);workshop)` | [taller-itinerante-arquitectura.webp](docs/assets/lote-01/taller-itinerante-arquitectura.webp) |
| Égida del Trueno | Atenea + Thor | `variant(fusion(atenea+thor);divine-manifest)` | [egida-del-trueno.webp](docs/assets/lote-01/egida-del-trueno.webp) |
| Forja de Placas · Anquilosaurio | Anquilosaurio + Herrera | `variant(fusion(anquilosaurio+herrera);living-alloy)` | [forja-de-placas-anquilosaurio.webp](docs/assets/lote-01/forja-de-placas-anquilosaurio.webp) |
| Socorrista de campo · Lobo | Lobo + Médica | `variant(fusion(lobo+medica);field-kin)` | [socorrista-de-campo-lobo.webp](docs/assets/lote-01/socorrista-de-campo-lobo.webp) |
| Vigía de Dos Orillas · Mamut | Mamut + Pulpo | `variant(fusion(mamut+pulpo);shore-carrier)` | [vigia-de-dos-orillas.webp](docs/assets/lote-01/vigia-de-dos-orillas.webp) |
| Cerbero | Anubis + Lobo | `variant(fusion(anubis+lobo);cerbero)` | [cerbero.webp](docs/assets/lote-01/cerbero.webp) |
| Wyvern | Búho + Velociraptor | `variant(fusion(buho+velociraptor);wyvern)` | [wyvern.webp](docs/assets/lote-01/wyvern.webp) |
| Oso cavernario | Oso pardo + Oso pardo | `variant(fusion(oso+oso);oso-cavernario)` | [oso-cavernario.webp](docs/assets/lote-01/oso-cavernario.webp) |
| Colonia de Ajolote y Sirena | Ajolote + Sirena | `variant(fusion(ajolote+sirena);reef-colony)` | [colonia-ajolote-sirena.webp](docs/assets/lote-01/colonia-ajolote-sirena.webp) |
| Foco de fuego · Ascuamarea | Fénix + Sirena | `variant(fusion(fenix+sirena);elemental)` | [foco-de-fuego-ascuamarea.webp](docs/assets/lote-01/foco-de-fuego-ascuamarea.webp) |

## Lote 02

La galería `/lote-02.html` muestra las pinturas a tamaño de carta y permite abrir el WebP completo. Desde la raíz, sirve `docs` con `python3 -m http.server 8000 --directory docs`. Las fichas del lote incluyen dirección artística, progenitores, identificador y archivo. Los datos de producción están en `docs/fusion-art-batch-02.js` y alimentan el mismo registro de arte y diagnóstico que el lote anterior.

**Composición y diferencias entre variantes.** El Barrio de Contrapeso muestra viviendas, contrapesos y una pasarela apoyada en tierra. El Taller del lote 01 se reconoce por su tablero de planos al aire libre. El Destilador de Marfil conserva la cabeza y la trompa del mamut y utiliza la trompa junto con sus manos. El Alquimista de Linaje Mamut lleva una cara humanoide con colmillos cortos. Ortro se distingue de Cerbero por sus dos cabezas y por el umbral griego de piedra clara.

**Dirección artística.** Se precisaron los puntos de carga del Barrio, la continuidad del manto y el torso del Kraken, y las manos y la acción visible de los oficios. Los elementales se disponen alrededor de un núcleo reconocible. En Octomarea ese núcleo une brazos de pulpo y una cola de sirena. En Ferroescama sostiene el cuerpo dracónico sobre arcos que evocan apuntalamientos. Las notas de producción se añaden a la ficha de arte. Se conservan los nombres y las descripciones que muestran las cartas.

**Pendientes de revisión conceptual.** El Planeador de Pulpo y el Planeador de Ajolote requieren una silueta que haga compatible el vuelo con su anatomía acuática y muestre el aporte del Dragón. Conviene resolver los puntos de anclaje de las alas y la función de los brazos o branquias antes de encargar esas pinturas.

El lote suma **20 pinturas WebP de 768 × 768** y **3.173.666 bytes**. El registro de primera generación pasa de 72 a 92 variantes con arte definitivo, correspondientes a 82 archivos distintos, y quedan 1.088 variantes con arte provisional. El recuento cubre las 1.180 variantes obtenibles con dos cartas base.

### Registro del lote 02

| Criatura | Progenitores | Identificador | WebP |
| --- | --- | --- | --- |
| Barrio de Contrapeso · Tricerátops | Arquitecta + Tricerátops | `variant(fusion(arquitecta+triceratops);mobile-borough)` | [barrio-de-contrapeso.webp](docs/assets/lote-02/barrio-de-contrapeso.webp) |
| Kraken | Megalodón + Pulpo | `variant(fusion(megalodon+pulpo);kraken)` | [kraken.webp](docs/assets/lote-02/kraken.webp) |
| Lobo terrible | Lobo + Lobo | `variant(fusion(lobo+lobo);dire-wolf)` | [lobo-terrible.webp](docs/assets/lote-02/lobo-terrible.webp) |
| Ortro | Lobo + Lobo | `variant(fusion(lobo+lobo);orthros)` | [ortro.webp](docs/assets/lote-02/ortro.webp) |
| Custodio del Último Relámpago | Anubis + Thor | `variant(fusion(anubis+thor);divine-manifest)` | [custodio-ultimo-relampago.webp](docs/assets/lote-02/custodio-ultimo-relampago.webp) |
| Tejedora del Viento | Atenea + Quetzalcóatl | `variant(fusion(atenea+quetzalcoatl);divine-manifest)` | [tejedora-del-viento.webp](docs/assets/lote-02/tejedora-del-viento.webp) |
| Draco de la Tormenta Coronada | Dragón + Thor | `variant(fusion(dragon+thor);divine-manifest)` | [draco-tormenta-coronada.webp](docs/assets/lote-02/draco-tormenta-coronada.webp) |
| Destilador de Marfil | Alquimista + Mamut | `variant(fusion(alquimista+mamut);practitioner)` | [destilador-de-marfil.webp](docs/assets/lote-02/destilador-de-marfil.webp) |
| Alquimista de Linaje Mamut | Alquimista + Mamut | `variant(fusion(alquimista+mamut);kin)` | [alquimista-linaje-mamut.webp](docs/assets/lote-02/alquimista-linaje-mamut.webp) |
| Tribunal de las Dos Puertas | Anubis + Atenea | `variant(fusion(anubis+atenea);divine-manifest)` | [tribunal-dos-puertas.webp](docs/assets/lote-02/tribunal-dos-puertas.webp) |
| Trazador de parajes · Zorro | Cartógrafa + Zorro | `variant(fusion(cartografa+zorro);field-kin)` | [trazador-parajes-zorro.webp](docs/assets/lote-02/trazador-parajes-zorro.webp) |
| Socorrista de campo · Ajolote | Ajolote + Médica | `variant(fusion(ajolote+medica);trade-specialist)` | [socorrista-campo-ajolote.webp](docs/assets/lote-02/socorrista-campo-ajolote.webp) |
| Forjador de campaña · Fénix | Fénix + Herrera | `variant(fusion(fenix+herrera);trade-specialist)` | [forjador-campana-fenix.webp](docs/assets/lote-02/forjador-campana-fenix.webp) |
| Mediador de fronteras · Dragón | Abogado + Dragón | `variant(fusion(abogado+dragon);trade-specialist)` | [mediador-fronteras-dragon.webp](docs/assets/lote-02/mediador-fronteras-dragon.webp) |
| Foco de agua · Octomarea | Pulpo + Sirena | `variant(fusion(pulpo+sirena);elemental)` | [foco-agua-octomarea.webp](docs/assets/lote-02/foco-agua-octomarea.webp) |
| Pacto de Anquilosaurio y Tricerátops | Anquilosaurio + Tricerátops | `variant(fusion(anquilosaurio+triceratops);symbiosis)` | [pacto-anquilosaurio-triceratops.webp](docs/assets/lote-02/pacto-anquilosaurio-triceratops.webp) |
| Custodio transmutado · Zorro | Mago + Zorro | `variant(fusion(mago+zorro);enchanted)` | [custodio-transmutado-zorro.webp](docs/assets/lote-02/custodio-transmutado-zorro.webp) |
| Búho de las Alturas | Búho + Búho | `variant(fusion(buho+buho);evolution)` | [buho-de-las-alturas.webp](docs/assets/lote-02/buho-de-las-alturas.webp) |
| Sirena de las Corrientes | Sirena + Sirena | `variant(fusion(sirena+sirena);evolution)` | [sirena-de-las-corrientes.webp](docs/assets/lote-02/sirena-de-las-corrientes.webp) |
| Foco de fuego · Ferroescama | Dragón + Obrero | `variant(fusion(dragon+obrero);elemental)` | [foco-fuego-ferroescama.webp](docs/assets/lote-02/foco-fuego-ferroescama.webp) |
