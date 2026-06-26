-- Add public data consent and enforce status-change restriction
ALTER TABLE public.missing_persons
  ADD COLUMN IF NOT EXISTS public_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() <> OLD.reporter_id AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Solo quien publicó el reporte o el administrador pueden cambiar el estado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_status_change ON public.missing_persons;
CREATE TRIGGER trg_enforce_status_change
BEFORE UPDATE ON public.missing_persons
FOR EACH ROW EXECUTE FUNCTION public.enforce_status_change();