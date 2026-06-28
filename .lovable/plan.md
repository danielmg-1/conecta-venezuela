## Qué resolver

1. **Métodos de contacto al publicar un centro**: hoy solo aparece un único campo "Teléfono" al crear el centro. La sección para agregar hasta 4 métodos (teléfono, WhatsApp, correo, Instagram, otro) solo existe al editar. Hay que mostrarla también al publicar y como aclaración en la pantalla de edición para que sea obvia.
2. **Notificaciones**: no existen. Hay que crearlas desde cero, guardarlas en la base de datos, mostrarlas en el perfil y en una campanita con popup en el encabezado.

## Métodos de contacto

- En el formulario "Publicar punto de ayuda" reemplazo el campo único "Teléfono" por la misma sección de hasta 4 métodos de contacto que usa la edición (teléfono, WhatsApp, correo, Instagram, otro), cada uno con etiqueta opcional como "María, encargada".
- Al guardar, primero se crea el centro y luego se insertan los contactos asociados. Si no agrega ninguno, queda igual que hoy (sin contactos).
- En la pantalla de edición, mover la sección de contactos justo debajo de los campos principales y añadir un título claro ("Métodos de contacto — hasta 4") para que se note.

## Notificaciones

Tipos que se generarán automáticamente:
- **Reporte sobre tu familiar**: cuando alguien deja una pista (`tips`) sobre una persona que tú publicaste como desaparecida.
- **Cambios en una persona que publicaste**: cuando un moderador o admin edita o cambia el estado del reporte de un desaparecido tuyo.
- **Invitación a anfitrión**: cuando te invitan a coadministrar un centro de acopio.
- **Cambios en un centro donde eres anfitrión o dueño**: cuando otra persona con permisos edita el centro o marca una necesidad como abastecida.
- **Respuesta a tu invitación**: cuando un anfitrión acepta o rechaza tu invitación (te notifica como dueño).

Cada notificación guarda: destinatario, tipo, título, mensaje corto, enlace al recurso (perfil del desaparecido, centro, etc.), si está leída y cuándo se creó.

Dónde se ven:
- **Campana en el encabezado** (escritorio y móvil): icono con un punto rojo y el número de no leídas. Al tocar, abre un popup con las últimas 10 notificaciones, botón "Marcar todas como leídas" y enlace "Ver todas". Se actualiza en vivo (realtime) sin recargar.
- **Sección en `/perfil` → "Notificaciones"**: lista completa con filtros por leídas/no leídas y por tipo, paginada.

Comportamiento:
- Al abrir una notificación se marca como leída y navega al recurso.
- Solo cada persona ve sus propias notificaciones; nadie más, ni siquiera admin.
- El usuario podrá silenciar tipos específicos desde su perfil (preferencias guardadas por usuario).

## Detalles técnicos

Base de datos:
- Nueva tabla `notifications` (`user_id`, `type`, `title`, `body`, `link`, `read_at`, `meta` jsonb) con RLS para que cada quien solo lea/actualice las suyas; service role para inserciones desde triggers.
- Nueva tabla `notification_preferences` (`user_id`, `type`, `enabled`).
- Triggers en `tips` (después de insertar), `missing_persons` (después de actualizar, reutilizando el log de auditoría existente), `aid_point_hosts` (al insertar invitación y al cambiar estado), `aid_points` (después de actualizar para avisar a dueño y anfitriones distintos del autor) y `aid_point_needs` (al marcar abastecido). Los triggers respetan las preferencias del usuario antes de insertar.
- Habilitar realtime en `notifications` para empujar el cambio al cliente.

Frontend:
- `src/hooks/use-notifications.tsx`: suscripción realtime, conteo de no leídas, cargar últimas, marcar leídas.
- `src/components/NotificationBell.tsx`: campana con popover (usa `@/components/ui/popover` ya disponible) y badge de no leídas. Se monta en `Layout.tsx` tanto en el header de escritorio como en el barra móvil superior, solo si el usuario está autenticado.
- `src/routes/_authenticated/perfil.tsx`: añadir pestaña/sección "Notificaciones" con lista completa, filtros y preferencias por tipo.

Sin cambios en cómo se crean los demás recursos; solo se agregan los disparadores de notificaciones.

## Fuera de alcance

- Envío de correo o push del navegador (solo notificaciones dentro de la app).
- Notificaciones para visitantes anónimos.
