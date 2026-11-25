# Auditoría de coherencia de las fusiones

Se revisaron los **128 archivos WebP definitivos** que una fusión exitosa podía mostrar en `main` (`3beeeea`). El inventario abarca retratos clásicos, los acabados de sus recetas, los dos pilotos, los lotes 01–03 y los cinco retratos de catálogo reutilizados por convergencia. Un archivo se cuenta una vez aunque aparezca en varias variantes. Cada imagen se contrastó con sus progenitores y con la ficha de su variante. La clasificación registra el problema principal de cada archivo antes de la corrección.

## Hallazgos y correcciones

- **Escala.** La regla divina asignaba tamaño colosal de forma uniforme. Las profesiones antropomórficas no tenían medidas ni referencias ambientales y algunas direcciones pedían viajeros diminutos. La talla se calcula ahora a partir de la locomoción, las dimensiones del cuerpo y el trabajo de cada variante. El Búho de las Runas sigue midiendo unos 45 cm, mientras que los Rescatistas de altura miden unos 1,70 m. Un anclaje fijo sostiene a la persona durante el rescate. La Égida del Trueno mantiene un tamaño colosal porque tiene que cobijar una comunidad.
- **Simbiosis.** Las plantillas describían vínculos o turnos de vigilancia sin indicar qué intercambia cada organismo. Las colonias ahora especifican tejido, circulación, coordinación y una actividad conjunta. Los Vigías integran un órgano húmedo en el portador, con intercambio de oxígeno y señales. Un Pacto terrestre usa un circuito de presión que coordina el apoyo y los avisos.
- **Elementales.** La ficha genérica describía un núcleo que mezclaba formas. La nueva regla distingue qué linaje mantiene el flujo y qué función del otro organiza el cuerpo. El núcleo participa en ese mismo flujo. Octomarea ya tenía una envoltura continua en la pintura y conserva su archivo. Su ficha explica cómo la voz gobierna el ritmo y los brazos mantienen remolinos distribuidos. Ascuamarea y Ferroescama conservan sus pinturas con una ficha funcional más precisa.
- **Deidades.** La Tejedora del Viento sigue siendo una serpiente protectora de rutas. Entreteje corrientes con una égida de plumas vivas que incorpora la estrategia y artesanía de Atenea al viento de Ehécatl. El Tribunal de las Dos Puertas sigue siendo un umbral viviente. El tránsito funerario de Anubis se expresa en el propio dintel y la égida dirige a las almas por un paso protegido. Se conservaron los nombres y los identificadores.
- **Zorro + Ajolote.** Se comprobaron Axolocola y Vigía de Dos Orillas · Zorro. Ambos eran provisionales. Axolocola conserva la talla de zorro e integra branquias, olfato y una aleta que regenera. El Vigía incorpora un órgano irrigado. La pintura con dos progenitores independientes correspondía a Colonia de Pulpo y Sirena. También se encontró ese problema en Colonia de Ajolote y Sirena y en el Vigía de Mamut.
- **Otras familias y generaciones.** Las 31 cartas base declaran expresiones de fisiología, percepción, conducta, conocimiento, oficio o dominio según corresponda. La ficha conserva una contribución narrativa por progenitor inmediato. Estas expresiones permiten heredar, por ejemplo, percepción o regeneración sin copiar una anatomía entera. La lectura estratégica conserva sus campos y su límite de seis registros directos. Casos procedurales y de arte legado con identidad superficial se registran abajo por archivo cuando requieren revisión.

Las 496 parejas de cartas base siguen produciendo **1.206 variantes** con los mismos identificadores, orden y probabilidades condicionales. La escala se expresa en altura o longitud, masa orientativa, envergadura y carga cuando aplican. Las fichas exponen proporciones, equipo, ambiente y justificación. El estado guardado conserva los campos de las criaturas ya obtenidas y el registro de retratos resuelve las correcciones por el identificador existente. Las diez correcciones artísticas sustituyen archivos de las galerías y recetas que ya publicaba `docs`.

## Referencias mitológicas

- Atenea. La *Ilíada* documenta su intervención deliberada en conflicto y su protección. Separar esa estrategia de la égida como motivo permite mostrarla en la acción. [Homero, Ilíada, canto I y canto V, texto de Perseus Digital Library](https://github.com/PerseusDL/canonical-greekLit/blob/master/data/tlg0012/tlg001/tlg0012.tlg001.perseus-eng3.xml)
- Quetzalcóatl. Se usó el contexto nahua del viento de Ehécatl y la transmisión de artes, con el alcance concreto de la Tejedora como interpretación del juego. [Sahagún, Códice florentino, libro I, edición digital Getty](https://florentinecodex.getty.edu/book/1) · [Brinton, American Hero-Myths, capítulo sobre Quetzalcóatl](https://github.com/GITenberg/American-Hero-MythsA-Study-in-the-Native-Religions-of-the-Western-Continent_11029/blob/master/11029.txt)
- Anubis. El dios de cabeza de cánido participa en el pesaje en el juicio funerario. El Tribunal crea una aplicación fantástica de la custodia y el acompañamiento. [Papiro de Ani, British Museum EA10470](https://www.britishmuseum.org/collection/object/Y_EA10470-3) · [Budge, Egyptian Ideas of the Future Life, descripción de la escena del pesaje](https://github.com/GITenberg/Egyptian-Ideas-of-the-Future-Life_11277/blob/master/11277.txt)
- Thor. Se consultaron el relato de su carro, sus cabras y su martillo en la *Edda prosaica*, además de la identificación del trueno. [Sturluson, The Younger Edda, Gylfaginning](https://github.com/GITenberg/The-Younger-EddaAlso-called-Snorre-s-Edda-or-The-Prose-Edda_18947) · [Guerber, Myths of the Norsemen, Thor](https://github.com/GITenberg/Myths-of-the-NorsemenFrom-the-Eddas-and-Sagas_28497)

Las ediciones en GitHub pudieron consultarse durante la revisión. El acceso directo a Getty y al Museo Británico quedó limitado por la red del entorno.

## Validación

`node --test tests/*.mjs` completó 28 pruebas en siete suites. Se cotejaron los identificadores, perfiles y probabilidades de las 1.206 variantes con `main`. Chromium decodificó los 128 archivos, abrió las tres galerías, verificó las diez pinturas en el juego y comprobó la exportación JSON y la herencia en G2. La emulación móvil usó 393 px. Una revelación pendiente creada con el código anterior conservó su criatura y mostró la pintura corregida.

## Registro de la revisión previa

**98 correctas y 30 con observaciones.** Las diez pinturas sustituidas se señalan como corregidas. La ficha del Pacto se corrigió conservando su pintura.

| Clasificación inicial | Archivos |
| --- | ---: |
| Problema menor | 8 |
| Correcta | 98 |
| Problema anatómico | 2 |
| Problema de escala | 6 |
| Concepto incorrectamente representado | 7 |
| Revisión conceptual | 4 |
| Integración insuficiente | 3 |

### Pendientes prioritarios

Revisar primero la anatomía de Noctimamut y la carga de Barrio de Contrapeso. Después resolver la identidad del Custodio del Veredicto en sus tres acabados, la lectura de escala del Custodio del Último Relámpago y la función de Lexiescama, Lexitentáculo, Crisocola, Egiescama, Nocticuerno y Caldoala. Mantener visibles estas entradas antes de autorizar más regeneraciones. La revisión previa de los planeadores de Pulpo y Ajolote sigue abierta para sus fichas provisionales.

### Inventario por archivo

| # | Retrato | Progenitores | Clasificación inicial | Observación | Estado |
| ---: | --- | --- | --- | --- | --- |
| 1 | [Arcanolobo](docs/assets/arcanolobo-magistral.webp) | alquimista + lobo | Problema menor | El acabado muestra la iluminación alquímica más claramente que el rastro que sigue el lobo. | Conservada |
| 2 | [Arcanolobo](docs/assets/arcanolobo-refinada.webp) | alquimista + lobo | Correcta |  | Conservada |
| 3 | [Arcanolobo](docs/assets/arcanolobo.webp) | alquimista + lobo | Problema menor | El retrato de cabeza expresa el olfato y el aura, aunque no muestra el reactivo seguido. | Conservada |
| 4 | [Armadura Viviente](docs/assets/armadura-viviente-magistral.webp) | anquilosaurio + herrera | Correcta |  | Conservada |
| 5 | [Armadura Viviente](docs/assets/armadura-viviente-refinada.webp) | anquilosaurio + herrera | Problema anatómico | El acabado refinado era bípedo. Se recuperaron los cuatro apoyos y la cola de la misma Armadura. | Corregida |
| 6 | [Armadura Viviente](docs/assets/armadura-viviente.webp) | anquilosaurio + herrera | Correcta |  | Conservada |
| 7 | [Búho de las Runas](docs/assets/buho-runas-magistral.webp) | buho + mago | Problema menor | El atuendo arcano compite con el gesto funcional de leer las inscripciones. | Conservada |
| 8 | [Búho de las Runas](docs/assets/buho-runas-refinada.webp) | buho + mago | Correcta |  | Conservada |
| 9 | [Búho de las Runas](docs/assets/buho-runas.webp) | buho + mago | Problema de escala | Las ruinas lejanas hacían parecer gigante al ave. Se usó un manuscrito de mano a su altura. | Corregida |
| 10 | [Cartógrafo de las Mareas](docs/assets/cartografo-mareas-magistral.webp) | cartografa + pulpo | Correcta |  | Conservada |
| 11 | [Cartógrafo de las Mareas](docs/assets/cartografo-mareas-refinada.webp) | cartografa + pulpo | Correcta |  | Conservada |
| 12 | [Cartógrafo de las Mareas](docs/assets/cartografo-mareas.webp) | cartografa + pulpo | Correcta |  | Conservada |
| 13 | [Custodio del Veredicto](docs/assets/custodio-veredicto-magistral.webp) | abogado + anubis | Concepto incorrectamente representado | Anubis domina la figura. Falta mostrar el efecto que produce la aportación jurídica. | Pendiente |
| 14 | [Custodio del Veredicto](docs/assets/custodio-veredicto-refinada.webp) | abogado + anubis | Concepto incorrectamente representado | La balanza y el rollo sirven como señales genéricas de juicio, con escasa evidencia visual de negociación. | Pendiente |
| 15 | [Custodio del Veredicto](docs/assets/custodio-veredicto.webp) | abogado + anubis | Concepto incorrectamente representado | La figura resulta cercana al retrato de Anubis. Hace falta diferenciar la función de condenar o absolver del pesaje funerario. | Pendiente |
| 16 | [Draco Acorazado](docs/assets/draco-acorazado-magistral.webp) | anquilosaurio + dragon | Correcta |  | Conservada |
| 17 | [Draco Acorazado](docs/assets/draco-acorazado-refinada.webp) | anquilosaurio + dragon | Correcta |  | Conservada |
| 18 | [Draco Acorazado](docs/assets/draco-acorazado.webp) | anquilosaurio + dragon | Correcta |  | Conservada |
| 19 | [Dragón](docs/assets/dragon.webp) | buho + dragon | Correcta |  | Conservada |
| 20 | [Esfinge](docs/assets/esfinge.webp) | atenea + grifo | Correcta |  | Conservada |
| 21 | [Fénix del Restablecimiento](docs/assets/fenix-restablecimiento-magistral.webp) | fenix + medica | Correcta |  | Conservada |
| 22 | [Fénix del Restablecimiento](docs/assets/fenix-restablecimiento-refinada.webp) | fenix + medica | Correcta |  | Conservada |
| 23 | [Fénix del Restablecimiento](docs/assets/fenix-restablecimiento.webp) | fenix + medica | Problema menor | Los emblemas de medicina pesan más visualmente que su función de restablecimiento. | Conservada |
| 24 | [Fénix](docs/assets/fenix.webp) | buho + dragon | Correcta |  | Conservada |
| 25 | [Lexiescama](docs/assets/fusiones/abogado--dragon.webp) | abogado + dragon | Revisión conceptual | El tribunal y los útiles legales dan contexto. Falta definir cómo Lexiescama distingue un pacto verdadero. | Pendiente |
| 26 | [Lexitentáculo](docs/assets/fusiones/abogado--pulpo.webp) | abogado + pulpo | Revisión conceptual | La balanza es casi toda la aportación visible del Abogado. Falta precisar qué añade el linaje jurídico al pulpo. | Pendiente |
| 27 | [Axolomarea](docs/assets/fusiones/ajolote--sirena.webp) | ajolote + sirena | Correcta |  | Conservada |
| 28 | [Crisocrisol](docs/assets/fusiones/alquimista--alquimista.webp) | alquimista + alquimista | Correcta |  | Conservada |
| 29 | [Crisopluma](docs/assets/fusiones/alquimista--buho.webp) | alquimista + buho | Problema menor | El equipo sugiere alquimia. Un reactivo en uso aclararía la destreza del Búho. | Conservada |
| 30 | [Crisomamut](docs/assets/fusiones/alquimista--mamut.webp) | alquimista + mamut | Correcta |  | Conservada |
| 31 | [Ferrocrisol](docs/assets/fusiones/alquimista--obrero.webp) | alquimista + obrero | Correcta |  | Conservada |
| 32 | [Crisocola](docs/assets/fusiones/alquimista--zorro.webp) | alquimista + zorro | Concepto incorrectamente representado | El equipo alquímico va atado al Zorro sin indicar cómo recupera o procesa el reactivo. | Pendiente |
| 33 | [Anquilocuerno](docs/assets/fusiones/anquilosaurio--triceratops.webp) | anquilosaurio + triceratops | Correcta |  | Conservada |
| 34 | [Torachacal](docs/assets/fusiones/anubis--thor.webp) | anubis + thor | Problema menor | El martillo y el rayo se leen bien. El tránsito funerario solo se insinúa en la arquitectura. | Conservada |
| 35 | [Egiescama](docs/assets/fusiones/atenea--dragon.webp) | atenea + dragon | Revisión conceptual | El casco y el decorado helénico sustituyen casi por completo la estrategia protectora de Atenea. | Pendiente |
| 36 | [Noctipluma](docs/assets/fusiones/buho--buho.webp) | buho + buho | Correcta |  | Conservada |
| 37 | [Nocticolmillo](docs/assets/fusiones/buho--lobo.webp) | buho + lobo | Correcta |  | Conservada |
| 38 | [Noctimamut](docs/assets/fusiones/buho--mamut.webp) | buho + mamut | Problema anatómico | La masa de los colmillos necesita una inserción al cráneo compatible con el pico y el vuelo. | Pendiente |
| 39 | [Ferropluma](docs/assets/fusiones/buho--obrero.webp) | buho + obrero | Correcta |  | Conservada |
| 40 | [Nocticuerno](docs/assets/fusiones/buho--triceratops.webp) | buho + triceratops | Revisión conceptual | La gola y los cuernos hacen legible el cruce. Falta justificar sus anclajes y carga al volar. | Pendiente |
| 41 | [Nocticola](docs/assets/fusiones/buho--zorro.webp) | buho + zorro | Correcta |  | Conservada |
| 42 | [Ascuaescama](docs/assets/fusiones/dragon--fenix.webp) | dragon + fenix | Correcta |  | Conservada |
| 43 | [Marfiescama](docs/assets/fusiones/dragon--mamut.webp) | dragon + mamut | Correcta |  | Conservada |
| 44 | [Caldoala](docs/assets/fusiones/fenix--herrera.webp) | fenix + herrera | Concepto incorrectamente representado | La armadura identifica la Herrería por asociación. Falta una acción de templado o reparación en el Fénix. | Pendiente |
| 45 | [Eolopico](docs/assets/fusiones/grifo--quetzalcoatl.webp) | grifo + quetzalcoatl | Problema menor | El cuerpo o el plumaje integran la forma sagrada. El uso de las corrientes queda poco visible. | Conservada |
| 46 | [Lupocolmillo](docs/assets/fusiones/lobo--lobo.webp) | lobo + lobo | Correcta |  | Conservada |
| 47 | [Lupomamut](docs/assets/fusiones/lobo--mamut.webp) | lobo + mamut | Correcta |  | Conservada |
| 48 | [Lupoaleta](docs/assets/fusiones/lobo--megalodon.webp) | lobo + megalodon | Correcta |  | Conservada |
| 49 | [Ferrocolmillo](docs/assets/fusiones/lobo--obrero.webp) | lobo + obrero | Correcta |  | Conservada |
| 50 | [Lupocola](docs/assets/fusiones/lobo--zorro.webp) | lobo + zorro | Correcta |  | Conservada |
| 51 | [Marfimamut](docs/assets/fusiones/mamut--mamut.webp) | mamut + mamut | Correcta |  | Conservada |
| 52 | [Marficola](docs/assets/fusiones/mamut--zorro.webp) | mamut + zorro | Correcta |  | Conservada |
| 53 | [Ferropuntal](docs/assets/fusiones/obrero--obrero.webp) | obrero + obrero | Correcta |  | Conservada |
| 54 | [Ferrocola](docs/assets/fusiones/obrero--zorro.webp) | obrero + zorro | Correcta |  | Conservada |
| 55 | [Velocola](docs/assets/fusiones/velociraptor--zorro.webp) | velociraptor + zorro | Correcta |  | Conservada |
| 56 | [Vulpicola](docs/assets/fusiones/zorro--zorro.webp) | zorro + zorro | Correcta |  | Conservada |
| 57 | [Grifo](docs/assets/grifo.webp) | buho + esfinge | Correcta |  | Conservada |
| 58 | [Leviatán de las Brasas](docs/assets/leviatan-brasas-magistral.webp) | dragon + megalodon | Correcta |  | Conservada |
| 59 | [Leviatán de las Brasas](docs/assets/leviatan-brasas-refinada.webp) | dragon + megalodon | Correcta |  | Conservada |
| 60 | [Leviatán de las Brasas](docs/assets/leviatan-brasas.webp) | dragon + megalodon | Correcta |  | Conservada |
| 61 | [Bastión de pólvora verde](docs/assets/lote-01/bastion-polvora-verde.webp) | alquimista + mamut | Correcta |  | Conservada |
| 62 | [Cerbero](docs/assets/lote-01/cerbero.webp) | anubis + lobo | Correcta |  | Conservada |
| 63 | [Colonia de Ajolote y Sirena](docs/assets/lote-01/colonia-ajolote-sirena.webp) | ajolote + sirena | Integración insuficiente | La imagen mostraba dos cuerpos y la ficha no explicaba su intercambio. Ahora los pólipos, la piel y la aleta forman un organismo colonial. | Corregida |
| 64 | [Égida del Trueno](docs/assets/lote-01/egida-del-trueno.webp) | atenea + thor | Correcta |  | Conservada |
| 65 | [Foco de fuego · Ascuamarea](docs/assets/lote-01/foco-de-fuego-ascuamarea.webp) | fenix + sirena | Correcta |  | Conservada |
| 66 | [Forja de Placas · Anquilosaurio](docs/assets/lote-01/forja-de-placas-anquilosaurio.webp) | anquilosaurio + herrera | Correcta |  | Conservada |
| 67 | [Laboratorio alquímico ambulante](docs/assets/lote-01/laboratorio-alquimico-ambulante.webp) | alquimista + mamut | Correcta |  | Conservada |
| 68 | [Oso cavernario](docs/assets/lote-01/oso-cavernario.webp) | oso + oso | Correcta |  | Conservada |
| 69 | [Rescatista de altura · Búho](docs/assets/lote-01/rescatista-altura-buho.webp) | buho + medica | Problema de escala | Una persona mucho menor bajo el saliente hacía parecer gigante a la rescatista. Ahora comparten plano, baranda y anclaje. | Corregida |
| 70 | [Socorrista de campo · Lobo](docs/assets/lote-01/socorrista-de-campo-lobo.webp) | lobo + medica | Correcta |  | Conservada |
| 71 | [Taller itinerante de arquitectura](docs/assets/lote-01/taller-itinerante-arquitectura.webp) | arquitecta + triceratops | Correcta |  | Conservada |
| 72 | [Vigía de Dos Orillas · Mamut](docs/assets/lote-01/vigia-de-dos-orillas.webp) | mamut + pulpo | Integración insuficiente | El pulpo aparecía completo en un tanque. Ahora el manto sensorial forma parte de la piel y circulación del Mamut. | Corregida |
| 73 | [Wyvern](docs/assets/lote-01/wyvern.webp) | buho + velociraptor | Correcta |  | Conservada |
| 74 | [Alquimista de Linaje Mamut](docs/assets/lote-02/alquimista-linaje-mamut.webp) | alquimista + mamut | Correcta |  | Conservada |
| 75 | [Barrio de Contrapeso · Tricerátops](docs/assets/lote-02/barrio-de-contrapeso.webp) | arquitecta + triceratops | Problema de escala | La carga de varias viviendas necesita comprobación. Revisar módulos y apoyos antes de añadir población. | Pendiente |
| 76 | [Búho de las Alturas](docs/assets/lote-02/buho-de-las-alturas.webp) | buho + buho | Correcta |  | Conservada |
| 77 | [Custodio transmutado · Zorro](docs/assets/lote-02/custodio-transmutado-zorro.webp) | mago + zorro | Correcta |  | Conservada |
| 78 | [Custodio del Último Relámpago](docs/assets/lote-02/custodio-ultimo-relampago.webp) | anubis + thor | Problema de escala | El ángulo bajo y el vano lejano admiten una lectura monumental. La ficha ya especifica talla humana. | Pendiente |
| 79 | [Destilador de Marfil](docs/assets/lote-02/destilador-de-marfil.webp) | alquimista + mamut | Correcta |  | Conservada |
| 80 | [Draco de la Tormenta Coronada](docs/assets/lote-02/draco-tormenta-coronada.webp) | dragon + thor | Correcta |  | Conservada |
| 81 | [Foco de agua · Octomarea](docs/assets/lote-02/foco-agua-octomarea.webp) | pulpo + sirena | Correcta |  | Conservada |
| 82 | [Foco de fuego · Ferroescama](docs/assets/lote-02/foco-fuego-ferroescama.webp) | dragon + obrero | Correcta |  | Conservada |
| 83 | [Forjador de campaña · Fénix](docs/assets/lote-02/forjador-campana-fenix.webp) | fenix + herrera | Correcta |  | Conservada |
| 84 | [Kraken](docs/assets/lote-02/kraken.webp) | megalodon + pulpo | Correcta |  | Conservada |
| 85 | [Lobo terrible](docs/assets/lote-02/lobo-terrible.webp) | lobo + lobo | Correcta |  | Conservada |
| 86 | [Mediador de fronteras · Dragón](docs/assets/lote-02/mediador-fronteras-dragon.webp) | abogado + dragon | Problema de escala | Los viajeros diminutos y el mobiliario monumental desvirtuaban al mediador. Sus interlocutores ahora tienen la misma escala. | Corregida |
| 87 | [Ortro](docs/assets/lote-02/ortro.webp) | lobo + lobo | Correcta |  | Conservada |
| 88 | [Pacto de Anquilosaurio y Tricerátops](docs/assets/lote-02/pacto-anquilosaurio-triceratops.webp) | anquilosaurio + triceratops | Problema menor | La combinación corporal ya es legible. La ficha ahora explica el circuito de presión y el reparto de carga. | Ficha corregida |
| 89 | [Sirena de las Corrientes](docs/assets/lote-02/sirena-de-las-corrientes.webp) | sirena + sirena | Correcta |  | Conservada |
| 90 | [Socorrista de campo · Ajolote](docs/assets/lote-02/socorrista-campo-ajolote.webp) | ajolote + medica | Correcta |  | Conservada |
| 91 | [Tejedora del Viento](docs/assets/lote-02/tejedora-del-viento.webp) | atenea + quetzalcoatl | Concepto incorrectamente representado | El telar suspendido sustituía la protección de Atenea. La égida emplumada ahora organiza las corrientes en un paso seguro. | Corregida |
| 92 | [Trazador de parajes · Zorro](docs/assets/lote-02/trazador-parajes-zorro.webp) | cartografa + zorro | Correcta |  | Conservada |
| 93 | [Tribunal de las Dos Puertas](docs/assets/lote-02/tribunal-dos-puertas.webp) | anubis + atenea | Concepto incorrectamente representado | El cuerpo parecía un proboscídeo. La corrección integra el perfil de chacal, el rito y los dos pasos de la égida en la arquitectura. | Corregida |
| 94 | [Ahuízotl](docs/assets/lote-03/ahuizotl.webp) | ajolote + lobo | Correcta |  | Conservada |
| 95 | [Aker](docs/assets/lote-03/aker.webp) | anubis + esfinge | Correcta |  | Conservada |
| 96 | [Archivo de Contrafuertes](docs/assets/lote-03/archivo-de-contrafuertes.webp) | arquitecta + arquitecta | Correcta |  | Conservada |
| 97 | [Colonia de Pulpo y Sirena](docs/assets/lote-03/colonia-pulpo-sirena.webp) | pulpo + sirena | Integración insuficiente | Un apéndice unía un pulpo completo y una sirena completa. Ahora el manto y su red coordinan una sola silueta. | Corregida |
| 98 | [Cordillera Errante](docs/assets/lote-03/cordillera-errante.webp) | mamut + thor | Correcta |  | Conservada |
| 99 | [Destilador de campo · Ajolote](docs/assets/lote-03/destilador-campo-ajolote.webp) | ajolote + alquimista | Correcta |  | Conservada |
| 100 | [Diseñador de refugios · Oso pardo](docs/assets/lote-03/disenador-refugios-oso.webp) | arquitecta + oso | Correcta |  | Conservada |
| 101 | [Elasmotherium](docs/assets/lote-03/elasmotherium.webp) | rinoceronte_lanudo + rinoceronte_lanudo | Correcta |  | Conservada |
| 102 | [Estratega de las Cien Piezas](docs/assets/lote-03/estratega-de-las-cien-piezas.webp) | atenea + atenea | Correcta |  | Conservada |
| 103 | [Guía de asentamientos · Lobo](docs/assets/lote-03/guia-de-asentamientos-lobo.webp) | civil + lobo | Correcta |  | Conservada |
| 104 | [Jörmungandr](docs/assets/lote-03/jormungandr.webp) | quetzalcoatl + thor | Correcta |  | Conservada |
| 105 | [Mamut de Vetaclara](docs/assets/lote-03/mamut-de-vetaclara.webp) | alquimista + mamut | Correcta |  | Conservada |
| 106 | [Oráculo del Voto · Abogado](docs/assets/lote-03/oraculo-del-voto.webp) | abogado + anubis | Correcta |  | Conservada |
| 107 | [Oso pardo del Bastión](docs/assets/lote-03/oso-pardo-del-bastion.webp) | oso + oso | Correcta |  | Conservada |
| 108 | [Rastreador de Coraza · Anquilosaurio](docs/assets/lote-03/rastreador-coraza-anquilosaurio.webp) | anquilosaurio + lobo | Correcta |  | Conservada |
| 109 | [Rescatista de altura · Fénix](docs/assets/lote-03/rescatista-altura-fenix.webp) | fenix + medica | Problema de escala | Un herido lejano se veía diminuto respecto a la rescatista. Ahora el adulto y la puerta comparten el plano de la intervención. | Corregida |
| 110 | [Simurgh](docs/assets/lote-03/simurgh.webp) | grifo + lobo | Correcta |  | Conservada |
| 111 | [Smilodon](docs/assets/lote-03/smilodon.webp) | esfinge + mamut | Correcta |  | Conservada |
| 112 | [Taller itinerante de cartografía](docs/assets/lote-03/taller-cartografia-grifo.webp) | cartografa + grifo | Correcta |  | Conservada |
| 113 | [Utahraptor](docs/assets/lote-03/utahraptor.webp) | velociraptor + velociraptor | Correcta |  | Conservada |
| 114 | [Mamut de Puntales](docs/assets/mamut-puntales-magistral.webp) | mamut + obrero | Correcta |  | Conservada |
| 115 | [Mamut de Puntales](docs/assets/mamut-puntales-refinada.webp) | mamut + obrero | Correcta |  | Conservada |
| 116 | [Mamut de Puntales](docs/assets/mamut-puntales.webp) | mamut + obrero | Correcta |  | Conservada |
| 117 | [Oráculo de los Acertijos](docs/assets/oraculo-acertijos-magistral.webp) | atenea + esfinge | Correcta |  | Conservada |
| 118 | [Oráculo de los Acertijos](docs/assets/oraculo-acertijos-refinada.webp) | atenea + esfinge | Correcta |  | Conservada |
| 119 | [Oráculo de los Acertijos](docs/assets/oraculo-acertijos.webp) | atenea + esfinge | Correcta |  | Conservada |
| 120 | [Coloso Alquímico](docs/assets/piloto/coloso-alquimico.webp) | alquimista + mamut | Correcta |  | Conservada |
| 121 | [Kitsune](docs/assets/piloto/kitsune.webp) | zorro + zorro | Correcta |  | Conservada |
| 122 | [Rastreador de la Estepa](docs/assets/rastreador-estepa-magistral.webp) | lobo + velociraptor | Correcta |  | Conservada |
| 123 | [Rastreador de la Estepa](docs/assets/rastreador-estepa-refinada.webp) | lobo + velociraptor | Correcta |  | Conservada |
| 124 | [Rastreador de la Estepa](docs/assets/rastreador-estepa.webp) | lobo + velociraptor | Correcta |  | Conservada |
| 125 | [Serpiente del Trueno](docs/assets/serpiente-trueno-magistral.webp) | quetzalcoatl + thor | Correcta |  | Conservada |
| 126 | [Serpiente del Trueno](docs/assets/serpiente-trueno-refinada.webp) | quetzalcoatl + thor | Correcta |  | Conservada |
| 127 | [Serpiente del Trueno](docs/assets/serpiente-trueno.webp) | quetzalcoatl + thor | Correcta |  | Conservada |
| 128 | [Sirena](docs/assets/sirena.webp) | musico + pulpo | Correcta |  | Conservada |
