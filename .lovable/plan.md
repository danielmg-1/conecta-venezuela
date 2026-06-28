## Cambios solicitados

### 1. Vista previa en pantalla completa (noticias y centros)
- **Noticias** (`admin.noticias.tsx`): Botón "Vista previa" que abre un modal a pantalla completa renderizando el artículo exactamente como se verá en `/noticias` (mismo sanitizado HTML, mismos estilos prose, título, fecha).
- **Centros** (`centros-acopio.nuevo.tsx` y `.../editar.tsx`): Botón "Vista previa" que abre un modal mostrando la ficha completa del centro tal como aparecerá públicamente (foto de portada, tipo, nombre, descripción, ubicación, contactos, necesidades, horario).

### 2. Editor de noticias mejorado
- **HTML como modo predeterminado**: invertir el toggle — al crear/editar una noticia el modo enriquecido (HTML) está activo por defecto; se puede cambiar a "Texto plano".
- **Barra de herramientas ampliada** con:
  - Alineación: izquierda, centro, derecha, justificado
  - Insertar **tabla** (con filas/columnas configurables, encabezado opcional, bordes estilizados)
  - Listas, citas, código, separador horizontal, deshacer/rehacer
  - Encabezados H2/H3, negrita/cursiva/subrayado, enlaces (target=_blank), imágenes (ya con resize/alt)
- Sanitizado extendido en `/noticias` para permitir `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`, `style="text-align"` y clases de alineación.

### 3. Foto de portada al editar centros
- Verificar `centros-acopio.$id.editar.tsx`: el componente `AidCoverPhotoInput` ya se incluye, pero el usuario no lo ve. Causas probables:
  - El bloque está dentro del `<form>` pero después de otros campos largos y puede no estar renderizando si `user` aún no carga.
  - Posible falla de RLS al subir al bucket `aid-photos` durante edición (el path usa `userId` del editor, que puede no ser el owner).
- Acción: mover `AidCoverPhotoInput` arriba (junto a Nombre/Descripción), asegurar que se renderiza sin depender de `user` (usar `user?.id ?? row.owner_id` como prefijo), y revisar políticas del bucket para permitir subida a cualquier host/owner autorizado.

### 4. Ficha popup al hacer clic en un centro de acopio
- En `centros-acopio.tsx`: al pulsar una tarjeta, abrir un **Dialog** modal con la ficha completa:
  - Foto de portada (grande)
  - Tipo, nombre, badges, estado/ciudad/dirección
  - Mapa pequeño embebido + botón "Cómo llegar"
  - Horario, descripción
  - Lista de **necesidades** activas con prioridad y estado (abastecido/pendiente)
  - Métodos de contacto (con iconos y enlaces tel:/mailto:/wa.me)
  - Botones: "Editar" (si es owner/host/admin) y "Ver perfil completo"
- Misma ficha reutilizable se usa para la "Vista previa" del punto 1.

### Detalles técnicos
- Componente nuevo `src/components/AidPointPreview.tsx` (ficha reutilizable; recibe datos en memoria o por id).
- Componente nuevo `src/components/NewsPreview.tsx` (renderiza titulo + body_html sanitizado igual que `/noticias`).
- Editor de noticias: extender el toolbar existente. Se mantiene `contentEditable` + `document.execCommand` ya en uso, añadiendo: `justifyLeft/Center/Right/Full` e `insertHTML` para tablas con plantilla.
- Sanitizador en `/noticias` y en `NewsPreview`: añadir `table, thead, tbody, tfoot, tr, th, td, caption` a `ALLOWED_TAGS` y `colspan, rowspan, align` a `ALLOWED_ATTR`.
- Estilos prose añaden bordes y padding a tablas.

### Archivos a tocar
- `src/routes/_authenticated/admin.noticias.tsx` (toolbar, modo por defecto, botón preview)
- `src/routes/noticias.tsx` (ampliar sanitizador y estilos de tabla)
- `src/components/NewsPreview.tsx` (nuevo)
- `src/components/AidPointPreview.tsx` (nuevo)
- `src/routes/centros-acopio.tsx` (abrir ficha en modal)
- `src/routes/_authenticated/centros-acopio.nuevo.tsx` (botón Vista previa)
- `src/routes/_authenticated/centros-acopio.$id.editar.tsx` (botón Vista previa + revisión de foto)
- Posible migración menor: políticas del bucket `aid-photos` para que hosts también puedan subir.

¿Apruebas para implementar?
