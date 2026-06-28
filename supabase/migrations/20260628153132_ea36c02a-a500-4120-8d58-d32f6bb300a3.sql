
-- 1) Verified flags
ALTER TABLE public.missing_persons
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;
ALTER TABLE public.aid_points
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

-- 2) content_reports table
CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('missing_person','aid_point','news')),
  content_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('falsa','duplicada','ofensiva','desactualizada','spam','otra')),
  details text,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_reports_status_idx ON public.content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_target_idx ON public.content_reports(content_type, content_id);

GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can submit reports" ON public.content_reports;
CREATE POLICY "Authenticated can submit reports" ON public.content_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Reporters can see own reports" ON public.content_reports;
CREATE POLICY "Reporters can see own reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Mods can see all reports" ON public.content_reports;
CREATE POLICY "Mods can see all reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING (public.has_moderator_permission(auth.uid(), 'reportes'));

DROP POLICY IF EXISTS "Mods can update reports" ON public.content_reports;
CREATE POLICY "Mods can update reports" ON public.content_reports
  FOR UPDATE TO authenticated
  USING (public.has_moderator_permission(auth.uid(), 'reportes'))
  WITH CHECK (public.has_moderator_permission(auth.uid(), 'reportes'));

-- 3) RPC to mark a content item verified (admin or section moderator)
CREATE OR REPLACE FUNCTION public.set_content_verified(_type text, _id uuid, _verified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _section text;
  _table text;
BEGIN
  IF _type = 'missing_person' THEN _section := 'desaparecidos'; _table := 'missing_persons';
  ELSIF _type = 'aid_point' THEN _section := 'centros'; _table := 'aid_points';
  ELSIF _type = 'news' THEN _section := 'noticias'; _table := 'news';
  ELSE RAISE EXCEPTION 'Tipo no soportado'; END IF;

  IF NOT public.has_moderator_permission(auth.uid(), _section) THEN
    RAISE EXCEPTION 'Sin permiso para verificar este contenido';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET verified = $1, verified_at = CASE WHEN $1 THEN now() ELSE NULL END, verified_by = CASE WHEN $1 THEN $2 ELSE NULL END WHERE id = $3',
    _table
  ) USING _verified, auth.uid(), _id;
END;
$$;

-- 4) RPC to resolve a content report
CREATE OR REPLACE FUNCTION public.resolve_content_report(_report_id uuid, _status text, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_moderator_permission(auth.uid(), 'reportes') THEN
    RAISE EXCEPTION 'Sin permiso para resolver reportes';
  END IF;
  IF _status NOT IN ('reviewed','dismissed','pending') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;
  UPDATE public.content_reports
    SET status = _status,
        reviewed_at = CASE WHEN _status = 'pending' THEN NULL ELSE now() END,
        reviewed_by = CASE WHEN _status = 'pending' THEN NULL ELSE auth.uid() END,
        resolution_note = _note
  WHERE id = _report_id;
END;
$$;
