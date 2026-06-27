
CREATE TABLE public.missing_person_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.missing_persons(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX missing_person_audit_person_idx ON public.missing_person_audit(person_id, created_at DESC);

GRANT SELECT ON public.missing_person_audit TO authenticated;
GRANT ALL ON public.missing_person_audit TO service_role;

ALTER TABLE public.missing_person_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin can view audit"
ON public.missing_person_audit FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.missing_persons mp
    WHERE mp.id = missing_person_audit.person_id
      AND mp.reporter_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.log_missing_person_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _email text;
  _changes jsonb := '{}'::jsonb;
BEGIN
  SELECT email::text INTO _email FROM auth.users WHERE id = _actor;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.missing_person_audit(person_id, actor_id, actor_email, action, changes)
    VALUES (NEW.id, _actor, _email, 'create', jsonb_build_object('status', NEW.status, 'full_name', NEW.full_name));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      _changes := _changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF NEW.photo_path IS DISTINCT FROM OLD.photo_path THEN
      _changes := _changes || jsonb_build_object('photo_path', jsonb_build_object('old', OLD.photo_path, 'new', NEW.photo_path));
    END IF;
    IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
      _changes := _changes || jsonb_build_object('full_name', jsonb_build_object('old', OLD.full_name, 'new', NEW.full_name));
    END IF;
    IF NEW.cedula IS DISTINCT FROM OLD.cedula THEN
      _changes := _changes || jsonb_build_object('cedula', jsonb_build_object('old', OLD.cedula, 'new', NEW.cedula));
    END IF;
    IF NEW.birth_date IS DISTINCT FROM OLD.birth_date THEN
      _changes := _changes || jsonb_build_object('birth_date', jsonb_build_object('old', OLD.birth_date, 'new', NEW.birth_date));
    END IF;
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      _changes := _changes || jsonb_build_object('estado', jsonb_build_object('old', OLD.estado, 'new', NEW.estado));
    END IF;
    IF NEW.ciudad IS DISTINCT FROM OLD.ciudad THEN
      _changes := _changes || jsonb_build_object('ciudad', jsonb_build_object('old', OLD.ciudad, 'new', NEW.ciudad));
    END IF;
    IF NEW.lugar_desaparicion IS DISTINCT FROM OLD.lugar_desaparicion THEN
      _changes := _changes || jsonb_build_object('lugar_desaparicion', jsonb_build_object('old', OLD.lugar_desaparicion, 'new', NEW.lugar_desaparicion));
    END IF;
    IF NEW.descripcion IS DISTINCT FROM OLD.descripcion THEN
      _changes := _changes || jsonb_build_object('descripcion', jsonb_build_object('old', OLD.descripcion, 'new', NEW.descripcion));
    END IF;
    IF COALESCE(NEW.hidden_by_admin, false) IS DISTINCT FROM COALESCE(OLD.hidden_by_admin, false) THEN
      _changes := _changes || jsonb_build_object('hidden_by_admin', jsonb_build_object('old', OLD.hidden_by_admin, 'new', NEW.hidden_by_admin));
    END IF;

    IF _changes <> '{}'::jsonb THEN
      INSERT INTO public.missing_person_audit(person_id, actor_id, actor_email, action, changes)
      VALUES (NEW.id, _actor, _email, 'update', _changes);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_missing_person_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_missing_person_changes ON public.missing_persons;
CREATE TRIGGER trg_log_missing_person_changes
AFTER INSERT OR UPDATE ON public.missing_persons
FOR EACH ROW EXECUTE FUNCTION public.log_missing_person_changes();
