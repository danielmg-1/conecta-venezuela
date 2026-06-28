# Conecta Venezuela

Plataforma ciudadana para organizar la ayuda ante emergencias y desastres en Venezuela. Conecta a afectados, donantes, centros de acopio, voluntarios e instituciones en un solo lugar.

## ¿Qué hace?

- **Centros de acopio y ayuda**: Registro de centros de acopio, puntos de recaudación, hospitales y clínicas con ubicación exacta y necesidades actualizadas.
- **Búsqueda de personas**: Reportes de personas desaparecidas con búsqueda activa, filtros avanzados y actualización de estado.
- **Mapa en vivo**: Visualización de zonas afectadas, centros de ayuda y reportes de personas.
- **Voluntarios**: Registro de profesionales y voluntarios por estado y especialidad.
- **Emergencias**: Directorio de números de contacto oficiales.
- **Noticias**: Publicación de información verificada y actualizaciones.
- **Consejos**: Guías de actuación ante sismos y primeros auxilios.

## Tecnologías

- [TanStack Start](https://tanstack.com/start) — Framework full-stack React
- [Tailwind CSS](https://tailwindcss.com) — Estilos
- [Supabase](https://supabase.com) — Base de datos, auth y storage
- [Google Maps](https://developers.google.com/maps) — Mapas y geocodificación
- [Vercel AI SDK](https://sdk.vercel.ai) — Asistente de inteligencia artificial

## Instalación local

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd conecta-venezuela

# Instalar dependencias
bun install

# Configurar variables de entorno
# Copiar .env.example a .env y completar los valores

# Iniciar servidor de desarrollo
bun dev
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública de Supabase |
| `GOOGLE_MAPS_API_KEY` | Clave de la API de Google Maps |
| `LOVABLE_API_KEY` | Clave para el gateway de IA |

## Licencia

MIT — ver [LICENSE](LICENSE).
