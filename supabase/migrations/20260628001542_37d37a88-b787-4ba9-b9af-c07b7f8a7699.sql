
-- =========================
-- notifications
-- =========================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_delete_own_notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;

-- =========================
-- notification_preferences
-- =========================
CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_prefs" ON public.notification_preferences
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- helper to check if a user has a given notification type enabled (default true)
CREATE OR REPLACE FUNCTION public.notification_enabled(_user_id uuid, _type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.notification_preferences WHERE user_id = _user_id AND type = _type),
    true
  );
$$;

-- =========================
-- Trigger: tip on a missing person
-- =========================
CREATE OR REPLACE FUNCTION public.notify_on_new_tip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reporter uuid;
  _name text;
BEGIN
  SELECT reporter_id, full_name INTO _reporter, _name FROM public.missing_persons WHERE id = NEW.person_id;
  IF _reporter IS NULL THEN RETURN NEW; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() = _reporter THEN RETURN NEW; END IF;
  IF NOT public.notification_enabled(_reporter, 'tip_received') THEN RETURN NEW; END IF;

  INSERT INTO public.notifications(user_id, type, title, body, link, meta)
  VALUES (
    _reporter,
    'tip_received',
    'Nueva pista sobre ' || COALESCE(_name, 'tu reporte'),
    COALESCE(NEW.autor_nombre, 'Alguien') || ' dejó información sobre la persona que publicaste.',
    '/desaparecidos/' || NEW.person_id::text,
    jsonb_build_object('person_id', NEW.person_id, 'tip_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_tip ON public.tips;
CREATE TRIGGER trg_notify_on_new_tip
AFTER INSERT ON public.tips
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_tip();

-- =========================
-- Trigger: missing_persons updated by someone other than reporter
-- =========================
CREATE OR REPLACE FUNCTION public.notify_on_missing_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _changed boolean := false;
  _status_changed boolean := false;
  _body text;
BEGIN
  IF NEW.reporter_id IS NULL THEN RETURN NEW; END IF;
  IF _actor IS NOT NULL AND _actor = NEW.reporter_id THEN RETURN NEW; END IF;
  IF NOT public.notification_enabled(NEW.reporter_id, 'missing_updated') THEN RETURN NEW; END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN _status_changed := true; _changed := true; END IF;
  IF NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.cedula IS DISTINCT FROM OLD.cedula
     OR NEW.birth_date IS DISTINCT FROM OLD.birth_date
     OR NEW.estado IS DISTINCT FROM OLD.estado
     OR NEW.ciudad IS DISTINCT FROM OLD.ciudad
     OR NEW.lugar_desaparicion IS DISTINCT FROM OLD.lugar_desaparicion
     OR NEW.descripcion IS DISTINCT FROM OLD.descripcion
     OR NEW.photo_path IS DISTINCT FROM OLD.photo_path
     OR COALESCE(NEW.hidden_by_admin, false) IS DISTINCT FROM COALESCE(OLD.hidden_by_admin, false)
  THEN
    _changed := true;
  END IF;

  IF NOT _changed THEN RETURN NEW; END IF;

  IF _status_changed THEN
    _body := 'Se actualizó el estado a "' || NEW.status::text || '".';
  ELSE
    _body := 'Se actualizó la información del reporte.';
  END IF;

  INSERT INTO public.notifications(user_id, type, title, body, link, meta)
  VALUES (
    NEW.reporter_id,
    'missing_updated',
    'Cambios en ' || COALESCE(NEW.full_name, 'tu reporte'),
    _body,
    '/desaparecidos/' || NEW.id::text,
    jsonb_build_object('person_id', NEW.id, 'status_changed', _status_changed)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_missing_update ON public.missing_persons;
CREATE TRIGGER trg_notify_on_missing_update
AFTER UPDATE ON public.missing_persons
FOR EACH ROW EXECUTE FUNCTION public.notify_on_missing_update();

-- =========================
-- Trigger: aid_point_hosts INSERT -> notify invited user
-- =========================
CREATE OR REPLACE FUNCTION public.notify_on_host_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nombre text;
BEGIN
  IF NOT public.notification_enabled(NEW.user_id, 'host_invitation') THEN RETURN NEW; END IF;
  SELECT nombre INTO _nombre FROM public.aid_points WHERE id = NEW.aid_point_id;
  INSERT INTO public.notifications(user_id, type, title, body, link, meta)
  VALUES (
    NEW.user_id,
    'host_invitation',
    'Invitación a coadministrar un centro',
    'Te invitaron a ser anfitrión de ' || COALESCE(_nombre, 'un centro de ayuda') || '.',
    '/mis-reportes',
    jsonb_build_object('aid_point_id', NEW.aid_point_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_host_invite ON public.aid_point_hosts;
CREATE TRIGGER trg_notify_on_host_invite
AFTER INSERT ON public.aid_point_hosts
FOR EACH ROW EXECUTE FUNCTION public.notify_on_host_invite();

-- =========================
-- Trigger: aid_point_hosts UPDATE (status change) -> notify owner
-- =========================
CREATE OR REPLACE FUNCTION public.notify_on_host_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _nombre text;
  _responder_name text;
  _action text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('accepted','declined') THEN RETURN NEW; END IF;

  SELECT owner_id, nombre INTO _owner, _nombre FROM public.aid_points WHERE id = NEW.aid_point_id;
  IF _owner IS NULL THEN RETURN NEW; END IF;
  IF NOT public.notification_enabled(_owner, 'host_response') THEN RETURN NEW; END IF;

  SELECT COALESCE(p.full_name, u.email::text) INTO _responder_name
    FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = NEW.user_id;

  _action := CASE WHEN NEW.status = 'accepted' THEN 'aceptó' ELSE 'rechazó' END;

  INSERT INTO public.notifications(user_id, type, title, body, link, meta)
  VALUES (
    _owner,
    'host_response',
    'Respuesta de anfitrión',
    COALESCE(_responder_name, 'Una persona') || ' ' || _action || ' la invitación a ' || COALESCE(_nombre, 'tu centro') || '.',
    '/centros-acopio/' || NEW.aid_point_id::text || '/editar',
    jsonb_build_object('aid_point_id', NEW.aid_point_id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_host_response ON public.aid_point_hosts;
CREATE TRIGGER trg_notify_on_host_response
AFTER UPDATE ON public.aid_point_hosts
FOR EACH ROW EXECUTE FUNCTION public.notify_on_host_response();

-- =========================
-- Trigger: aid_points UPDATE -> notify owner + accepted hosts (excluding actor)
-- =========================
CREATE OR REPLACE FUNCTION public.notify_on_aid_point_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _uid uuid;
BEGIN
  IF NEW.nombre IS NOT DISTINCT FROM OLD.nombre
     AND NEW.descripcion IS NOT DISTINCT FROM OLD.descripcion
     AND NEW.direccion IS NOT DISTINCT FROM OLD.direccion
     AND NEW.estado IS NOT DISTINCT FROM OLD.estado
     AND NEW.ciudad IS NOT DISTINCT FROM OLD.ciudad
     AND NEW.telefono IS NOT DISTINCT FROM OLD.telefono
     AND NEW.horario IS NOT DISTINCT FROM OLD.horario
     AND NEW.necesidades IS NOT DISTINCT FROM OLD.necesidades
     AND NEW.lat IS NOT DISTINCT FROM OLD.lat
     AND NEW.lng IS NOT DISTINCT FROM OLD.lng
     AND NEW.tipo IS NOT DISTINCT FROM OLD.tipo
  THEN
    RETURN NEW;
  END IF;

  -- recipients = owner + accepted hosts, excluding the actor
  FOR _uid IN
    SELECT DISTINCT u FROM (
      SELECT NEW.owner_id AS u
      UNION
      SELECT user_id FROM public.aid_point_hosts WHERE aid_point_id = NEW.id AND status = 'accepted'
    ) s WHERE u IS NOT NULL AND (_actor IS NULL OR u <> _actor)
  LOOP
    IF public.notification_enabled(_uid, 'aid_point_updated') THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, meta)
      VALUES (
        _uid,
        'aid_point_updated',
        'Se editó ' || COALESCE(NEW.nombre, 'un centro'),
        'Otra persona con permiso actualizó la información del centro.',
        '/centros-acopio',
        jsonb_build_object('aid_point_id', NEW.id)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_aid_point_update ON public.aid_points;
CREATE TRIGGER trg_notify_on_aid_point_update
AFTER UPDATE ON public.aid_points
FOR EACH ROW EXECUTE FUNCTION public.notify_on_aid_point_update();

-- =========================
-- Trigger: aid_point_needs marked fulfilled -> notify owner + hosts
-- =========================
CREATE OR REPLACE FUNCTION public.notify_on_need_fulfilled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _uid uuid;
  _nombre text;
BEGIN
  IF NEW.fulfilled IS NOT TRUE OR COALESCE(OLD.fulfilled, false) = true THEN RETURN NEW; END IF;
  SELECT nombre INTO _nombre FROM public.aid_points WHERE id = NEW.aid_point_id;

  FOR _uid IN
    SELECT DISTINCT u FROM (
      SELECT owner_id AS u FROM public.aid_points WHERE id = NEW.aid_point_id
      UNION
      SELECT user_id FROM public.aid_point_hosts WHERE aid_point_id = NEW.aid_point_id AND status = 'accepted'
    ) s WHERE u IS NOT NULL AND (_actor IS NULL OR u <> _actor)
  LOOP
    IF public.notification_enabled(_uid, 'aid_need_fulfilled') THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, meta)
      VALUES (
        _uid,
        'aid_need_fulfilled',
        'Necesidad cubierta',
        '"' || NEW.title || '" se marcó como abastecida en ' || COALESCE(_nombre, 'tu centro') || '.',
        '/centros-acopio',
        jsonb_build_object('aid_point_id', NEW.aid_point_id, 'need_id', NEW.id)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_need_fulfilled ON public.aid_point_needs;
CREATE TRIGGER trg_notify_on_need_fulfilled
AFTER UPDATE ON public.aid_point_needs
FOR EACH ROW EXECUTE FUNCTION public.notify_on_need_fulfilled();

-- =========================
-- Realtime
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
