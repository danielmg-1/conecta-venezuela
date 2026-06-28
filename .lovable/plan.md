## Mejoras al editor de noticias y fotos en centros de acopio

### 1. Enlaces externos abren en nueva pestaña
- En `admin.noticias.tsx`: al insertar un link con la barra de herramientas, aplicar automáticamente `target="_blank"` y `rel="noopener noreferrer"`.
- En `noticias.tsx` (lectura pública): post-procesar el HTML sanitizado para añadir `target="_blank"` y `rel="noopener noreferrer"` a todos los `<a href="http...">`, dejando intactos los enlaces internos (`/...`).
- Actualizar el allowlist de DOMPurify para conservar esos atributos (ya están permitidos, pero asegurar el hook `afterSanitizeAttributes`).

### 2. Optimización de imágenes al subirlas (noticias y centros)
Crear un helper compartido `src/lib/image-optimize.ts` que, antes de subir al bucket de Supabase:
- Redimensione la imagen a un máximo de **1600px** del lado más largo (canvas + `OffscreenCanvas` con fallback).
- La re-codifique como **WebP** con calidad ~82 (con fallback a JPEG si el navegador no soporta WebP).
- Devuelva un `File` optimizado con nombre `.webp` y un objeto `{ width, height }`.
- Genere también una versión **thumbnail** (400px) opcional para listados.

Esto reduce típicamente 3-5MB → ~150-300KB sin pérdida visible.

### 3. Editor de noticias: control de tamaño de imágenes en línea
Reemplazar el `document.execCommand("insertImage")` actual por una inserción enriquecida:
- Al insertar la imagen, envolver con `<figure class="news-img" data-size="medium">` y agregar atributos `loading="lazy"`, `decoding="async"`, `alt` (preguntar al usuario o usar nombre del archivo).
- Detectar clic sobre una `<img>` dentro del editor → mostrar **toolbar flotante** con:
  - Tamaño: **Pequeño / Mediano / Grande / Ancho completo** (50%, 75%, 100%, full-bleed).
  - Alineación: izquierda / centro / derecha.
  - Texto alternativo (alt) editable.
  - Eliminar.
- Renderizar esos tamaños vía clases utilitarias (`max-w-sm mx-auto`, `max-w-md`, `max-w-full`, etc.) que aplican tanto en el editor como en `/noticias`.
- Permitir el ajuste manual mientras se redacta (sin tener que salir del flujo).

### 4. SEO en imágenes de noticias
- Pedir texto alternativo (`alt`) al insertar cada imagen — obligatorio salvo que el moderador lo marque como decorativa.
- Conservar `width`/`height` reales en el `<img>` para evitar CLS (Cumulative Layout Shift).
- Añadir `loading="lazy"` excepto en la primera imagen del artículo (LCP).
- En la vista pública, la primera imagen del artículo recibe `fetchpriority="high"`.

### 5. Foto de portada para centros de acopio
- Migración SQL: añadir columna `cover_photo` (text, ruta en storage) a `aid_points`.
- Crear bucket privado `aid-photos` con políticas RLS: el owner y hosts pueden subir/borrar; lectura mediante URL firmada para todos (consistente con `missing-photos`).
- Actualizar:
  - `centros-acopio.nuevo.tsx` — campo de subida con preview y optimización antes del upload.
  - `centros-acopio.$id.editar.tsx` — reemplazar/eliminar foto existente.
  - `centros-acopio.tsx` (listado) — mostrar miniatura optimizada en cada tarjeta.
  - `centros-acopio.$id.tsx` (detalle) — imagen hero responsive.
- Usar el mismo helper de optimización (1600px / WebP).

### Detalles técnicos
- **No** se añaden dependencias nuevas: la compresión usa Canvas API nativa del navegador.
- DOMPurify ya permite `class`, `style`, `target` y `rel` → solo se ajusta el hook post-sanitize.
- Las imágenes en el bucket se sirven con URL firmada (TTL 10 años para noticias, 1h con caché en cliente para centros).
- Migración aplicada con grants completos a `authenticated` y `service_role` siguiendo el patrón del proyecto.

### Archivos a tocar
- **Nuevo:** `src/lib/image-optimize.ts`, `src/components/NewsImageToolbar.tsx`
- **Editar:** `src/routes/_authenticated/admin.noticias.tsx`, `src/routes/noticias.tsx`, `src/routes/_authenticated/centros-acopio.nuevo.tsx`, `src/routes/_authenticated/centros-acopio.$id.editar.tsx`, `src/routes/centros-acopio.tsx`, `src/routes/desaparecidos.$id.tsx` (opcional reuso del optimizador), `src/lib/photo.ts` (helper para `aid-photos`)
- **Migración:** columna `cover_photo`, bucket `aid-photos` + políticas
