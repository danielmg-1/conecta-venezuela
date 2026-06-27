## Permisos granulares para moderadores

Hoy un moderador tiene acceso global a verificar (ocultar/mostrar) desaparecidos, centros de ayuda y voluntarios. Vamos a permitir que tú, como admin, decidas **qué secciones** puede moderar cada persona.

### Secciones con permisos individuales
- Desaparecidos (ocultar/mostrar, marcar como verificado)
- Centros de acopio / ayuda
- Voluntarios
- Noticias
- Anuncios globales
- Emergencias (números oficiales)

Cada moderador puede tener una o varias de estas casillas activas. Admin sigue teniendo todo.

### Cambios en base de datos
1. Nueva tabla `moderator_permissions`:
   - `user_id` (referencia al usuario)
   - `section` (enum: `desaparecidos`, `centros`, `voluntarios`, `noticias`, `anuncios`, `emergencias`)
   - `granted_by`, `granted_at`
   - Único por (`user_id`, `section`)
   - GRANT a `authenticated` (solo lectura propia) y `service_role`; RLS: el usuario ve sus permisos, admin ve/edita todos.
2. Función `has_moderator_permission(_user_id, _section)` security definer → true si es admin o tiene el permiso.
3. Funciones admin RPC:
   - `admin_set_moderator_permissions(_email, _sections text[])` → sincroniza permisos (otorga rol moderator si no lo tiene, reemplaza la lista de secciones).
   - `admin_list_moderators_with_permissions()` → lista email + nombre + array de secciones.
4. Actualizar políticas RLS existentes que hoy usan `has_role(uid,'moderator')` para usar `has_moderator_permission(uid,'<section>')` en cada tabla (missing_persons, aid_points, volunteers, news, announcements, emergency_contacts).

### Cambios en la app
- `/_authenticated/admin/moderadores`: rediseño del formulario.
  - Input de correo + checkboxes por sección.
  - Tabla de moderadores actuales con chips de secciones y botón "Editar permisos" (reabre el formulario precargado) y "Quitar acceso" (revoca rol y borra permisos).
- Hook `useModeratorPermissions(userId)` que carga las secciones del usuario actual.
- En cada panel admin (`admin.centros`, `admin.voluntarios`, `admin.noticias`, `admin.anuncios`, `admin.emergencias`, vista de desaparecidos):
  - Ocultar enlaces/botones de moderación si el usuario no tiene esa sección (admin siempre los ve).
  - El menú lateral de admin muestra solo las secciones permitidas.
- `Layout.tsx`: el enlace "Admin" sigue visible solo para admin real; los moderadores acceden a `/admin` y ven únicamente sus secciones permitidas.

### Compatibilidad
Migración inicial: a los moderadores existentes se les otorgan automáticamente las 3 secciones que hoy podían moderar (`desaparecidos`, `centros`, `voluntarios`) para no perder acceso.

### Fuera de alcance
No se crean nuevos tipos de rol; sigue siendo admin / moderator / user. La diferencia es solo qué secciones puede tocar cada moderador.
