## Plan: Acortar el copy de la homepage

El objetivo es reducir la cantidad de texto en el inicio para que sea escaneable en segundos, sin perder el mensaje clave de que la plataforma opera a corto, mediano y largo plazo.

### Cambios propuestos en `src/routes/index.tsx`

**1. Hero — párrafo principal**
- Actual: ~50 palabras explicando que no es emergencia de fin de semana.
- Nuevo: ~20 palabras. Ejemplo: "No es una emergencia de un fin de semana. La ayuda durará semanas y meses. Conectamos afectados, donantes y voluntarios para que llegue a quien más la necesita."

**2. Mission statement — sección completa**
- Actual: título largo + párrafo explicativo + lista de 4 bullets + 2 tarjetas laterales.
- Nuevo: se elimina esta sección entera. El hero ya transmite la misión. Las 2 tarjetas laterales (registrar centro / donar) se convierten en 2 cards dentro del grid de features (ahora 8 cards en 2 filas de 4, o se integran como CTAs directos en el hero).

**3. Feature grid — descripciones**
- Acortar cada `desc` a 1 línea máximo (8-12 palabras).

**4. Cómo funciona — sección de 3 pasos**
- Acortar títulos y descripciones a frases de impacto inmediato.

**5. Footer CTA**
- Mantener, texto ya es corto.

### Resultado esperado
- Scroll inicial más corto.
- Mensaje de "semanas y meses" visible en el hero sin necesidad de leer un párrafo largo.
- Cada sección scaneable en ~2 segundos.
