
# Guía de Apoyo Venezuela — Plan MVP (Fase 1)

Plataforma pública para ayudar a localizar personas desaparecidas tras el terremoto en Venezuela, con mapa interactivo y números de emergencia. Diseño limpio tipo Apple, mobile-first.

## Alcance Fase 1 (esta entrega)

1. **Landing pública** explicando el propósito y secciones disponibles.
2. **Reportes de personas desaparecidas** (crear, ver, actualizar status).
3. **Búsqueda con filtros** (nombre, CI, fecha de nacimiento, estado/lugar).
4. **Mapa interactivo** con Google Maps mostrando concentración de casos.
5. **Directorio de números de emergencia** del Estado venezolano.
6. **Autenticación** (email/contraseña + Google) y rol admin para ti.
7. **Panel admin básico**: ocultar/borrar publicaciones y ver conteos.

Fases siguientes (NO en esta entrega, pero la base las soporta): centros de acopio, hospitales/clínicas en mapa, voluntarios, noticias, listados de hospitales, reportes/informes avanzados.

## Estructura de páginas

```text
/                        Landing — explica funciones, accesos rápidos
/desaparecidos           Listado + barra de búsqueda + filtros
/desaparecidos/nuevo     Formulario (requiere sesión)
/desaparecidos/$id       Perfil público: foto, datos, contactos, formulario para enviar pista
/mapa                    Mapa interactivo Google Maps con pines por status
/emergencias             Directorio de teléfonos oficiales por categoría
/auth                    Login / registro
/_authenticated/mis-reportes   Reportes creados por el usuario (editar status)
/_authenticated/admin          Panel admin (solo rol admin)
```

## Modelo de datos (Lovable Cloud)

- **profiles**: id (= auth.uid), nombre, creado.
- **user_roles**: user_id, role (`admin` | `user`) — tabla separada, función `has_role()` security definer.
- **missing_persons**: id, reporter_id, nombre completo, cédula, fecha_nacimiento, foto_url, estado_vzla, ciudad, lugar_desaparicion (texto), lat, lng, descripción, status (`desaparecido` | `en_busqueda` | `encontrado`), created_at, hidden_by_admin (bool).
- **missing_person_contacts**: id, person_id, tipo (`telefono` | `email` | `instagram` | `whatsapp` | `otro`), valor, codigo_pais. Validación: mínimo 1, máximo 4 por persona.
- **tips** (pistas/información): id, person_id, autor_nombre, autor_contacto, mensaje, created_at — visible al reportante y admin.
- **emergency_contacts** (seed inicial por ti/admin): id, categoria, nombre_institucion, telefono, descripción.
- **Storage**: bucket público `missing-photos` para fotos.

**RLS clave:**
- Cualquiera lee `missing_persons` no ocultos y sus contactos (visibilidad pública confirmada por ti).
- INSERT requiere sesión; `reporter_id = auth.uid()`.
- UPDATE de status: solo el reportante o admin.
- `tips`: cualquiera puede crear (incluso anónimo si está logueado); solo reportante + admin leen.
- Admin (`has_role(uid,'admin')`) puede ocultar/editar todo.

## Mapa interactivo

- Google Maps JS API vía el conector Google Maps Platform de Lovable.
- Pines coloreados por status (rojo = desaparecido, amarillo = en búsqueda, verde = encontrado).
- Clusters por zona para mostrar dónde hay más afectados.
- Click en pin → tarjeta resumen + link al perfil.
- Al crear un reporte, el formulario incluye autocompletar de dirección (Places API New) para guardar lat/lng.

## Búsqueda y filtros

Barra superior + panel lateral colapsable:
- Texto libre (nombre, descripción).
- CI exacta o parcial.
- Fecha de nacimiento (rango).
- Estado/ciudad (dropdown).
- Status (chips).
URL refleja los filtros (search params) para compartir búsquedas.

## Diseño (estilo Apple, mobile-first)

- Tipografía: SF Pro vía `@fontsource/inter` como fallback web + display headings con `@fontsource-variable/figtree` (semi-bold, tracking ajustado). Sin fuentes genéricas tipo Poppins.
- Paleta sobria: blanco hueso `#FAFAF7`, texto `#111`, acento amarillo Venezuela `#FFD100` y azul `#0A4DA6` para acciones; rojo `#D7263D` para status crítico.
- Cards con bordes redondeados grandes (`rounded-3xl`), sombras suaves, mucho espacio en blanco.
- Bottom tab bar en móvil (Inicio / Buscar / Mapa / Emergencias / Cuenta).
- Header sticky en desktop.
- Transiciones suaves con Motion, sin animaciones excesivas.

## Autenticación y roles

- Email + contraseña y Google (vía broker Lovable).
- Al registrarse, se crea `profile`; rol por defecto `user`.
- Tu cuenta admin: la promuevo manualmente vía SQL después del primer login.
- Tipos de usuario seleccionables (familiar, colaborador, voluntario) **se preparan en el schema** pero la diferenciación de permisos llega en Fase 2 cuando existan las secciones correspondientes.

## SEO

- Title: "Guía de Apoyo Venezuela — Personas desaparecidas y ayuda tras el terremoto".
- Meta description enfocada en búsqueda de familiares.
- Cada perfil de desaparecido tiene head() propio con nombre + ciudad para que sea indexable y compartible (og:image = foto del reporte).
- robots.txt permisivo, sitemap.xml con rutas estáticas.

## Detalles técnicos

- TanStack Start + Lovable Cloud (Supabase).
- Server functions para crear reporte (validación Zod), actualizar status (verifica ownership/admin), enviar pista.
- Loaders públicos usan cliente publishable server-side (sin auth) para SSR del listado y perfiles.
- Google Maps: conector ya disponible, browser key referrer-restringida.
- Storage: bucket `missing-photos` público, RLS de objetos por owner para upload.
- Validación de contactos (1–4) en server function antes de insertar.

## Lo que NO incluye esta fase

Centros de acopio, hospitales/clínicas con ubicación, listas de pacientes atendidos, voluntarios con perfiles cruzados, sección de noticias, panel admin con reportes/gráficas avanzadas, negocios colaboradores. Quedan como Fase 2+ sobre la misma base.

## Tras aprobar el plan

1. Habilito Lovable Cloud y creo el schema con RLS y grants.
2. Conecto Google Maps Platform.
3. Construyo rutas, auth, formularios, búsqueda y mapa.
4. Te indico cómo promoverte a admin y cómo cargar los números de emergencia iniciales.
