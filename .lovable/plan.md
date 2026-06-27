## Anfitriones y bitácora de necesidades en centros de acopio

Dos mejoras nuevas para los puntos de ayuda (`aid_points`):

### 1. Anfitriones (hasta 4 por centro)

El admin y la persona que publicó el centro podrán otorgar acceso de **anfitrión** a hasta 4 personas (por correo). Los anfitriones podrán editar la información del centro y publicar/marcar necesidades, igual que el propietario.

**Base de datos**
- Nueva tabla `aid_point_hosts`:
  - `aid_point_id` (referencia al centro)
  - `user_id` (referencia al usuario)
  - `invited_by`, `invited_at`
  - Único por (aid_point_id, user_id)
  - Trigger que rechaza el INSERT si ya hay 4 anfitriones para ese centro.
  - GRANT a `authenticated` y `service_role`; RLS:
    - El anfitrión ve sus propios accesos.
    - El propietario y admin ven todos los anfitriones del centro.
    - Solo propietario/admin pueden insertar o borrar.
- Función `can_manage_aid_point(_user_id uuid, _aid_point_id uuid)` (security definer) → true si es admin, dueño o anfitrión.
- RPC `aid_point_add_host_by_email(_aid_point_id, _email)` y `aid_point_remove_host(_aid_point_id, _user_id)` con validación de permiso y límite de 4.
- Actualizar políticas UPDATE de `aid_points` para usar `can_manage_aid_point(auth.uid(), id)` en vez de solo `owner_id = auth.uid()`.

**Cambios en la app**
- En la lista y ficha de centros: el botón "Editar" aparece también si el usuario es anfitrión.
- En `/centros-acopio/$id/editar`: nueva sección "Anfitriones" (solo visible para dueño/admin):
  - Input de correo + botón "Invitar anfitrión".
  - Lista de anfitriones actuales con su nombre/correo y botón "Quitar".
  - Mensaje si ya se alcanzó el máximo de 4.

### 2. Bitácora de necesidades

Cada centro tendrá un historial de "qué necesitamos ahora" que se puede marcar como **abastecido** para que la lista no se acumule visualmente.

**Base de datos**
- Nueva tabla `aid_point_needs`:
  - `aid_point_id`, `created_by`, `title` (ej. "Agua potable"), `details` (opcional), `priority` (`alta`|`media`|`baja`, default `media`).
  - `fulfilled` (bool, default false), `fulfilled_at`, `fulfilled_by`.
  - GRANT a `authenticated` y `service_role`; lectura pública (anon SELECT) para que cualquiera pueda ver qué hace falta.
  - RLS: insertar/editar/borrar solo si `can_manage_aid_point(auth.uid(), aid_point_id)`.

**Cambios en la app**
- En la ficha pública del centro (dentro de `centros-acopio.tsx` como popup/sección expandible): mostrar lista de necesidades **activas** (no abastecidas) con su prioridad y fecha; debajo, un acordeón "Historial abastecido" colapsado por defecto.
- Para anfitriones/dueño/admin:
  - Formulario rápido "Agregar necesidad" (título, detalle, prioridad).
  - Botón "Marcar como abastecido" en cada necesidad activa (registra `fulfilled_at` y quién).
  - Botón "Reabrir" en el historial por si se equivocaron.

### Layout y navegación
- Reusar el modal/popup actual del centro (similar al de desaparecidos) para mostrar necesidades + acciones, evitando crear otra ruta.
- Sin cambios en el menú principal.

### Fuera de alcance
- Notificaciones por correo a los anfitriones invitados (solo se les agrega al sistema; verán el acceso al iniciar sesión).
- Edición de necesidades ya creadas (solo crear, marcar abastecido o reabrir, para mantenerlo simple).
