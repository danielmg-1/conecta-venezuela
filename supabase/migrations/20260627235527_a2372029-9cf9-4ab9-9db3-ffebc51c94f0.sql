-- 1) Invitaciones pendientes para anfitriones de centros
ALTER TABLE public.aid_point_hosts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aid_point_hosts_status_check') THEN
    ALTER TABLE public.aid_point_hosts
      ADD CONSTRAINT aid_point_hosts_status_check CHECK (status IN ('pending','accepted','declined'));
  END IF;
END $$;

-- Anfitriones ya existentes quedan como aceptados (fueron agregados antes de este cambio)
UPDATE public.aid_point_hosts SET status='accepted', responded_at = COALESCE(responded_at, invited_at)
WHERE status='pending';

-- 2) can_manage solo si la invitación está aceptada
CREATE OR REPLACE FUNCTION public.can_manage_aid_point(_user_id uuid, _aid_point_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.aid_points WHERE id = _aid_point_id AND owner_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.aid_point_hosts WHERE aid_point_id = _aid_point_id AND user_id = _user_id AND status = 'accepted');
$$;

-- 3) RLS: el invitado puede ver y responder su propia invitación
DROP POLICY IF EXISTS "Invitee can view their invitations" ON public.aid_point_hosts;
CREATE POLICY "Invitee can view their invitations"
  ON public.aid_point_hosts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Invitee can respond to their invitation" ON public.aid_point_hosts;
CREATE POLICY "Invitee can respond to their invitation"
  ON public.aid_point_hosts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status IN ('accepted','declined'));

-- 4) Listar anfitriones (incluye estado)
DROP FUNCTION IF EXISTS public.aid_point_list_hosts(uuid);
CREATE OR REPLACE FUNCTION public.aid_point_list_hosts(_aid_point_id uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, invited_at timestamptz, status text, responded_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_aid_point(auth.uid(), _aid_point_id) THEN
    RAISE EXCEPTION 'Sin permiso';
  END IF;
  RETURN QUERY
    SELECT h.user_id, u.email::text, p.full_name, h.invited_at, h.status, h.responded_at
    FROM public.aid_point_hosts h
    JOIN auth.users u ON u.id = h.user_id
    LEFT JOIN public.profiles p ON p.id = h.user_id
    WHERE h.aid_point_id = _aid_point_id
    ORDER BY h.invited_at ASC;
END;
$$;

-- 5) Responder invitación (aceptar / rechazar)
CREATE OR REPLACE FUNCTION public.aid_point_respond_invitation(_aid_point_id uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.aid_point_hosts
    SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,
        responded_at = now()
  WHERE aid_point_id = _aid_point_id AND user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes una invitación pendiente para este centro';
  END IF;
END;
$$;

-- 6) Listar mis invitaciones (pendientes y aceptadas) para mostrar en "Mis reportes"
CREATE OR REPLACE FUNCTION public.aid_point_list_my_invitations()
RETURNS TABLE(aid_point_id uuid, nombre text, tipo text, estado text, ciudad text, invited_at timestamptz, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.aid_point_id, a.nombre, a.tipo::text, a.estado, a.ciudad, h.invited_at, h.status
  FROM public.aid_point_hosts h
  JOIN public.aid_points a ON a.id = h.aid_point_id
  WHERE h.user_id = auth.uid()
  ORDER BY h.invited_at DESC;
$$;

-- 7) Métodos de contacto múltiples por centro (máx 4)
CREATE TABLE IF NOT EXISTS public.aid_point_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aid_point_id uuid NOT NULL REFERENCES public.aid_points(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('telefono','whatsapp','email','instagram','otro')),
  value text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aid_point_contacts_point ON public.aid_point_contacts(aid_point_id);

GRANT SELECT ON public.aid_point_contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aid_point_contacts TO authenticated;
GRANT ALL ON public.aid_point_contacts TO service_role;

ALTER TABLE public.aid_point_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view aid point contacts" ON public.aid_point_contacts;
CREATE POLICY "Anyone can view aid point contacts" ON public.aid_point_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Managers can insert aid point contacts" ON public.aid_point_contacts;
CREATE POLICY "Managers can insert aid point contacts" ON public.aid_point_contacts FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_aid_point(auth.uid(), aid_point_id));

DROP POLICY IF EXISTS "Managers can update aid point contacts" ON public.aid_point_contacts;
CREATE POLICY "Managers can update aid point contacts" ON public.aid_point_contacts FOR UPDATE TO authenticated
  USING (public.can_manage_aid_point(auth.uid(), aid_point_id))
  WITH CHECK (public.can_manage_aid_point(auth.uid(), aid_point_id));

DROP POLICY IF EXISTS "Managers can delete aid point contacts" ON public.aid_point_contacts;
CREATE POLICY "Managers can delete aid point contacts" ON public.aid_point_contacts FOR DELETE TO authenticated
  USING (public.can_manage_aid_point(auth.uid(), aid_point_id));

CREATE OR REPLACE FUNCTION public.enforce_aid_point_contacts_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.aid_point_contacts WHERE aid_point_id = NEW.aid_point_id) >= 4 THEN
    RAISE EXCEPTION 'Máximo 4 contactos por centro';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aid_point_contacts_limit ON public.aid_point_contacts;
CREATE TRIGGER aid_point_contacts_limit BEFORE INSERT ON public.aid_point_contacts
FOR EACH ROW EXECUTE FUNCTION public.enforce_aid_point_contacts_limit();

-- Migración suave: el teléfono actual queda también como primer contacto
INSERT INTO public.aid_point_contacts (aid_point_id, kind, value, label)
SELECT id, 'telefono', telefono, 'Principal'
FROM public.aid_points a
WHERE telefono IS NOT NULL AND btrim(telefono) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.aid_point_contacts c WHERE c.aid_point_id = a.id);