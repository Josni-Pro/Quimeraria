# Guía artística de Quimeraria

Usa como referencia el peso y la textura mineral del [Coloso Alquímico](docs/assets/piloto/coloso-alquimico.webp) y la luz ambiental y el pelaje de [Kitsune](docs/assets/piloto/kitsune.webp). Ambos son retratos cuadrados de fantasía con acabado de pintura digital detallada. Conserva el contraste entre materiales y reserva los brillos intensos para los poderes, el fuego o los reactivos que definan a la criatura.

- **Composición.** Da prioridad al cuerpo y a su acción. Deja margen alrededor de las extremidades, alas y herramientas importantes para que sigan legibles en el recorte de las cartas. Usa el entorno para dar escala y deja que pierda detalle a distancia.
- **Iluminación.** Elige una fuente ambiental dominante. Usa reflejos secundarios en metal, vidrio, roca húmeda o pelaje para separarlos del fondo. Prueba la silueta a tamaño de carta.
- **Anatomía.** Fija el número de extremidades y sus puntos de anclaje antes de introducir equipo. Si una criatura sostiene una carga, muestra cómo reparte el peso y cómo acciona la herramienta. En un beastkin, rasgos como la nariz, el oído y el pelaje pueden transmitir el linaje con una cara humanoide.
- **Diferenciación.** Decide qué aporta cada progenitor y qué acción permite la fusión. Un laboratorio necesita una estación de trabajo, un vehículo de asedio necesita su plataforma y una criatura de rescate necesita equipo que pueda utilizar. Compara las siluetas y funciones de las variantes hermanas antes de aceptar el retrato.
- **Archivo.** Exporta a WebP de 768 × 768 píxeles con un nombre estable en minúsculas. Revisa la compresión a tamaño completo y en miniatura. Entrega el cuadro sin texto, marco ni marcas de agua. Asocia el archivo al identificador exacto de la variante en el registro de arte.

## Lote 01

La dirección artística de cada pintura completa la ficha de la variante con postura, anatomía y función visible. Los datos del lote están en `docs/fusion-art-batch-01.js` y alimentan el registro, la galería y la exportación JSON del diagnóstico.

El Laboratorio, el Bastión y el Vigía son tres mamuts con funciones y siluetas diferenciadas. El primero lleva una estación de destilación, el segundo una plataforma baja de asedio y el tercero aloja un organismo acuático. El Taller de Tricerátops se concentra en un tablero de planos y un compás. El Barrio de Contrapeso se reserva para otro lote para dedicar una pintura propia a su escala habitable. El Coloso Alquímico y Kitsune conservan las pinturas del piloto.

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
