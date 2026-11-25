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

## Lote 03

La galería `/lote-03.html` permite abrir cada WebP completo. Desde la raíz, sirve `docs` con `python3 -m http.server 8000 --directory docs`. El registro `docs/fusion-art-batch-03.js` añade la dirección de cada pintura a la ficha y a la exportación JSON del diagnóstico.

La Cordillera Errante se lee de perfil en una cornisa abierta, con rayos que abandonan el cuerpo. El Mamut de Vetaclara entra en una caverna, con colmillos facetados y vetas de calor bajo el pelaje. El Archivo muestra cómo la pasarela transmite carga al suelo. La Estratega tensa los hilos con los que mueve el relieve del tablero. El Rastreador junta osteodermos y cola de maza con un hocico olfativo.

Se precisaron el gesto y las herramientas de los oficios, la anatomía funcional y los aportes visibles de cada progenitor. Las diez variantes existentes conservan sus nombres y descripciones en el juego. El Barrio de Contrapeso conserva su pintura del lote 02. Las convergencias hacia Grifo y Esfinge usan sus retratos de catálogo.

El lote incluye **20 pinturas WebP de 768 × 768** y **3.188.054 bytes**. El registro de primera generación suma 115 variantes con arte definitivo y 1.091 con arte provisional. La Esfinge del Eco y la Mesa de Pactos ya tienen fichas y representaciones provisionales. [Informe de cobertura y pendientes](AMPLIACION-FUSIONES-03.md)

### Registro del lote 03

| Criatura | Progenitores | Variante | Identificador | WebP | Bytes |
| --- | --- | --- | --- | --- | ---: |
| Oráculo del Voto · Abogado | Abogado + Anubis | Existente | `variant(fusion(abogado+anubis);divine)` | [oraculo-del-voto.webp](docs/assets/lote-03/oraculo-del-voto.webp) | 138.214 |
| Cordillera Errante | Mamut + Thor | Existente | `variant(fusion(mamut+thor);divine-manifest)` | [cordillera-errante.webp](docs/assets/lote-03/cordillera-errante.webp) | 167.412 |
| Guía de asentamientos · Lobo | Civil + Lobo | Existente | `variant(fusion(civil+lobo);field-kin)` | [guia-de-asentamientos-lobo.webp](docs/assets/lote-03/guia-de-asentamientos-lobo.webp) | 186.994 |
| Taller itinerante de cartografía | Cartógrafa + Grifo | Existente | `variant(fusion(cartografa+grifo);workshop)` | [taller-cartografia-grifo.webp](docs/assets/lote-03/taller-cartografia-grifo.webp) | 145.214 |
| Destilador de campo · Ajolote | Ajolote + Alquimista | Existente | `variant(fusion(ajolote+alquimista);trade-specialist)` | [destilador-campo-ajolote.webp](docs/assets/lote-03/destilador-campo-ajolote.webp) | 159.922 |
| Oso pardo del Bastión | Oso pardo + Oso pardo | Existente | `variant(fusion(oso+oso);evolution)` | [oso-pardo-del-bastion.webp](docs/assets/lote-03/oso-pardo-del-bastion.webp) | 189.244 |
| Colonia de Pulpo y Sirena | Pulpo + Sirena | Existente | `variant(fusion(pulpo+sirena);reef-colony)` | [colonia-pulpo-sirena.webp](docs/assets/lote-03/colonia-pulpo-sirena.webp) | 151.698 |
| Rescatista de altura · Fénix | Fénix + Médica | Existente | `variant(fusion(fenix+medica);air-rescue)` | [rescatista-altura-fenix.webp](docs/assets/lote-03/rescatista-altura-fenix.webp) | 154.144 |
| Mamut de Vetaclara | Alquimista + Mamut | Existente | `variant(fusion(alquimista+mamut);transmuted)` | [mamut-de-vetaclara.webp](docs/assets/lote-03/mamut-de-vetaclara.webp) | 156.462 |
| Diseñador de refugios · Oso pardo | Arquitecta + Oso pardo | Existente | `variant(fusion(arquitecta+oso);trade-specialist)` | [disenador-refugios-oso.webp](docs/assets/lote-03/disenador-refugios-oso.webp) | 174.584 |
| Aker | Anubis + Esfinge | Nueva | `variant(fusion(anubis+esfinge);aker)` | [aker.webp](docs/assets/lote-03/aker.webp) | 140.958 |
| Jörmungandr | Quetzalcóatl + Thor | Nueva | `variant(fusion(quetzalcoatl+thor);jormungandr)` | [jormungandr.webp](docs/assets/lote-03/jormungandr.webp) | 139.848 |
| Simurgh | Grifo + Lobo | Nueva | `variant(fusion(grifo+lobo);simurgh)` | [simurgh.webp](docs/assets/lote-03/simurgh.webp) | 152.198 |
| Ahuízotl | Ajolote + Lobo | Nueva | `variant(fusion(ajolote+lobo);ahuizotl)` | [ahuizotl.webp](docs/assets/lote-03/ahuizotl.webp) | 125.628 |
| Smilodon | Esfinge + Mamut | Nueva | `variant(fusion(esfinge+mamut);smilodon)` | [smilodon.webp](docs/assets/lote-03/smilodon.webp) | 168.382 |
| Elasmotherium | Rinoceronte lanudo + Rinoceronte lanudo | Nueva | `variant(fusion(rinoceronte_lanudo+rinoceronte_lanudo);elasmotherium)` | [elasmotherium.webp](docs/assets/lote-03/elasmotherium.webp) | 150.046 |
| Utahraptor | Velociraptor + Velociraptor | Nueva | `variant(fusion(velociraptor+velociraptor);utahraptor)` | [utahraptor.webp](docs/assets/lote-03/utahraptor.webp) | 163.244 |
| Archivo de Contrafuertes | Arquitecta + Arquitecta | Nueva | `variant(fusion(arquitecta+arquitecta);counterfort-archive)` | [archivo-de-contrafuertes.webp](docs/assets/lote-03/archivo-de-contrafuertes.webp) | 206.202 |
| Estratega de las Cien Piezas | Atenea + Atenea | Nueva | `variant(fusion(atenea+atenea);hundred-pieces)` | [estratega-de-las-cien-piezas.webp](docs/assets/lote-03/estratega-de-las-cien-piezas.webp) | 150.018 |
| Rastreador de Coraza · Anquilosaurio | Anquilosaurio + Lobo | Nueva | `variant(fusion(anquilosaurio+lobo);scent-vanguard)` | [rastreador-coraza-anquilosaurio.webp](docs/assets/lote-03/rastreador-coraza-anquilosaurio.webp) | 167.642 |

## Aberraciones

- **Representa el intento y su interrupción.** Empieza por el plan corporal, la tarea y los aportes de los dos progenitores. Elige un único defecto principal. Haz visible dónde se detienen el apoyo, la carga, el reflejo o el poder.
- **Apoya el mecanismo en la composición.** Dos huellas muestran qué giro se bloqueó. Una pieza frente al hocico muestra por qué una herramienta integrada queda fuera de alcance. Una correa o un efecto mágico por sí solos comunican poco sobre la transformación.
- **Usa anatomía y materiales legibles.** Conserva los apoyos, articulaciones y proporciones que sí funcionan. Si hay duplicación o un apéndice mal situado, muestra su consecuencia. En el tejido, usa pliegues, membranas y cambios de textura. En estructuras, señala la trayectoria que ocupa la pieza rígida.
- **Distingue la causa con luz y entorno.** Ilumina el peso, la dirección del flujo o la continuidad del cuerpo. Una escena clara puede mostrar el fallo tan bien como una oscura. Usa color y material de los progenitores y evita el daño gráfico.
- **Contrasta con una fusión exitosa.** Si dos progenitores pueden producir una criatura extraña pero funcional, reserva la aberración para una incapacidad concreta. Revisa cada pintura junto con su ficha, a tamaño completo y en miniatura. Publica WebP de 768 × 768 y registra la variante por su identificador estable.

El piloto compara las ocho familias y registra los pesos, rutas y progenitores de las pinturas. [Registro artístico de aberraciones](ABERRACIONES.md)
