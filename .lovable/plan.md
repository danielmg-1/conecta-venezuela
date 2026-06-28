## Problema

Hoy el `MapPicker` solo permite tocar el mapa o usar "mi ubicación". No hay forma de escribir una dirección y que el mapa salte al punto exacto, y el centro inicial es Venezuela completa (zoom 6), así que el usuario termina arrastrando el marcador a ojo. En una emergencia eso lleva a coordenadas imprecisas.

Además, al publicar un centro de acopio o un reporte de desaparecido, el campo "Dirección" (texto libre) y las coordenadas del mapa son independientes: uno puede escribir una dirección y olvidar marcar el punto, o marcar el punto y dejar la dirección vacía.

## Objetivo

Que cualquier usuario pueda fijar una ubicación exacta en segundos, ya sea:
1. Escribiendo la dirección y eligiendo de una lista de sugerencias (autocompletar).
2. Tocando el mapa.
3. Usando su ubicación actual con mejor precisión.
4. Pegando un enlace de Google Maps.

Y que la dirección textual y las coordenadas queden sincronizadas.

## Cambios

### 1. `MapPicker` con búsqueda de direcciones (Places API New)

- Agregar una barra de búsqueda arriba del mapa usando **Places API (New) Autocomplete** restringida a Venezuela (`includedRegionCodes: ['ve']`), vía `AutocompleteSuggestion.fetchAutocompleteSuggestions` (la API legacy `places.Autocomplete` está prohibida por las reglas del conector).
- Al elegir una sugerencia: centrar el mapa, hacer zoom 17, colocar el marcador y devolver `{ lat, lng, address, placeId }` al formulario padre.
- Cuando el usuario toca el mapa o arrastra el marcador, hacer **reverse geocoding** vía el gateway (`/maps/api/geocode/json?latlng=...`) para obtener la dirección formateada y devolverla también.
- Permitir pegar un enlace de Google Maps (`maps.app.goo.gl/...` o `google.com/maps/...?q=lat,lng`): extraer coordenadas si están en la URL; si es un enlace corto, mostrar mensaje pidiendo abrirlo y copiar las coordenadas (no podemos seguir redirects desde el navegador de forma fiable).
- Mejorar el centro inicial: si no hay valor, intentar `navigator.geolocation` silenciosamente al montar (con timeout corto) para centrar cerca del usuario; si falla, usar Caracas con zoom 11 en lugar de zoom 6.
- Subir el zoom de "Usar mi ubicación" a 17 y mostrar el `accuracy` (radio en metros) como círculo translúcido para que el usuario sepa qué tan precisa es la lectura del GPS.
- Mostrar la dirección formateada bajo el mapa cuando exista, con botón "Copiar coordenadas".

### 2. Sincronización con el campo "Dirección" del formulario

- En `centros-acopio.nuevo.tsx`, `centros-acopio.$id.editar.tsx`, `desaparecidos.nuevo.tsx` y `desaparecidos.$id.editar.tsx`:
  - Convertir el input de "Dirección" en estado controlado.
  - Cuando el `MapPicker` devuelva una dirección (por autocompletar o reverse geocode), prellenar el campo si está vacío; si el usuario ya escribió algo, no sobrescribir sin confirmar (mostrar botón "Usar dirección del mapa").
  - Validación suave: si hay dirección sin coordenadas al enviar, mostrar aviso "Te recomendamos marcar el punto en el mapa para mayor precisión" (no bloqueante).

### 3. Geocodificación en backend (server function)

- Crear `src/lib/geocode.functions.ts` con `geocodeAddress` y `reverseGeocode` usando el gateway de Google Maps (`Authorization: Bearer LOVABLE_API_KEY` + `X-Connection-Api-Key`). El navegador no puede llamar a Geocoding directamente (la clave del navegador solo cubre Maps JS + Places New).
- El `MapPicker` invoca `reverseGeocode` mediante `useServerFn` tras cada cambio de coordenadas (debounced 400 ms).

### 4. Vista del mapa público (`/mapa`) y popups

- Cuando un punto tenga `lat/lng` exactos guardados, dejar de aplicarles el "jitter" aleatorio (`Math.random()` en `mapa.tsx`) que actualmente desplaza los marcadores hasta ~30 km. El jitter solo aplica al fallback por estado.

### 5. Conexión Google Maps

- Verificar que la conexión `google_maps` esté linkeada al proyecto y que `LOVABLE_API_KEY` y `GOOGLE_MAPS_API_KEY` estén disponibles en el runtime de servidor. Si falta, pedir al usuario que la conecte.

## Detalles técnicos

- Componentes/archivos a tocar:
  - `src/components/MapPicker.tsx` — reescritura para añadir búsqueda + reverse geocode + mejor UX inicial.
  - `src/lib/geocode.functions.ts` *(nuevo)* — server functions con el gateway.
  - `src/routes/_authenticated/centros-acopio.nuevo.tsx` y `.editar.tsx` — dirección controlada + sincronización.
  - `src/routes/_authenticated/desaparecidos.nuevo.tsx` y `.editar.tsx` — idem.
  - `src/routes/mapa.tsx` — quitar jitter cuando hay coords reales.
- No hay cambios de base de datos. Las columnas `lat`, `lng`, `direccion` ya existen.
- Se usa exclusivamente Places API (New) en el navegador (`AutocompleteSuggestion`), nunca la clase legacy.
- El reverse geocoding va por server function (gateway), no por la clave del navegador.
- Sin nuevas dependencias npm.

## Fuera de alcance

- No se cambia el modelo de datos ni se añade un sistema de "direcciones verificadas".
- No se toca el chat de IA ni las notificaciones.
- No se rediseña la página `/mapa`, solo se corrige el jitter.
