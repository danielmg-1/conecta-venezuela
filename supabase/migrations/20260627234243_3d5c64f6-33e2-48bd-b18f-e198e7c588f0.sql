
-- ====== aid_point_hosts ======
CREATE TABLE public.aid_point_hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aid_point_id uuid NOT NULL REFERENCES public.aid_points(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  invited_by uuid,
  invited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aid_point_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.aid_point_hosts TO authenticated;
GRANT ALL ON public.aid_point_hosts TO service_role;

ALTER TABLE public.aid_point_hosts ENABLE ROW LEVEL SECURITY;

-- enforce max 4 hosts per aid point
CREATE OR REPLACE FUNCTION public.enforce_aid_point_hosts_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.aid_point_hosts WHERE aid_point_id = NEW.aid_point_id) >= 4 THEN
    RAISE EXCEPTION 'Máximo 4 anfitriones por centro';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER aid_point_hosts_limit
BEFORE INSERT ON public.aid_point_hosts
FOR EACH ROW EXECUTE FUNCTION public.enforce_aid_point_hosts_limit();

-- can manage = admin, owner, or host
CREATE OR REPLACE FUNCTION public.can_manage_aid_point(_user_id uuid, _aid_point_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.aid_points WHERE id = _aid_point_id AND owner_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.aid_point_hosts WHERE aid_point_id = _aid_point_id AND user_id = _user_id);
$$;

-- RLS for aid_point_hosts
CREATE POLICY "host sees own access" ON public.aid_point_hosts
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_manage_aid_point(auth.uid(), aid_point_id));

CREATE POLICY "owner/admin inserts hosts" ON public.aid_point_hosts
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.aid_points WHERE id = aid_point_id AND owner_id = auth.uid())
);

CREATE POLICY "owner/admin removes hosts" ON public.aid_point_hosts
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.aid_points WHERE id = aid_point_id AND owner_id = auth.uid())
);

-- update aid_points UPDATE policy to include hosts
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='aid_points' AND cmd='UPDATE' LOOP
    EXECUTE format('DROP POLICY %I ON public.aid_points', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "manage aid point" ON public.aid_points
FOR UPDATE TO authenticated
USING (public.can_manage_aid_point(auth.uid(), id))
WITH CHECK (public.can_manage_aid_point(auth.uid(), id));

-- RPCs
CREATE OR REPLACE FUNCTION public.aid_point_add_host_by_email(_aid_point_id uuid, _email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid;
  _owner uuid;
  _count int;
BEGIN
  SELECT owner_id INTO _owner FROM public.aid_points WHERE id = _aid_point_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Centro no encontrado'; END IF;
  IF NOT (public.has_role(auth.uid(), 'admin') OR _owner = auth.uid()) THEN
    RAISE EXCEPTION 'Solo el dueño o el administrador pueden invitar anfitriones';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN RAISE EXCEPTION 'No existe un usuario registrado con ese correo'; END IF;
  IF _uid = _owner THEN RAISE EXCEPTION 'Esa persona ya es la dueña del centro'; END IF;
  SELECT COUNT(*) INTO _count FROM public.aid_point_hosts WHERE aid_point_id = _aid_point_id;
  IF _count >= 4 THEN RAISE EXCEPTION 'Máximo 4 anfitriones por centro'; END IF;
  INSERT INTO public.aid_point_hosts(aid_point_id, user_id, invited_by)
  VALUES (_aid_point_id, _uid, auth.uid())
  ON CONFLICT (aid_point_id, user_id) DO NOTHING;
  RETURN jsonb_build_object('user_id', _uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.aid_point_remove_host(_aid_point_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  SELECT owner_id INTO _owner FROM public.aid_points WHERE id = _aid_point_id;
  IF NOT (public.has_role(auth.uid(), 'admin') OR _owner = auth.uid()) THEN
    RAISE EXCEPTION 'Solo el dueño o el administrador pueden quitar anfitriones';
  END IF;
  DELETE FROM public.aid_point_hosts WHERE aid_point_id = _aid_point_id AND user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.aid_point_list_hosts(_aid_point_id uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, invited_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_aid_point(auth.uid(), _aid_point_id) THEN
    RAISE EXCEPTION 'Sin permiso';
  END IF;
  RETURN QUERY
  SELECT h.user_id, u.email::text, p.full_name, h.invited_at
  FROM public.aid_point_hosts h
  JOIN auth.users u ON u.id = h.user_id
  LEFT JOIN public.profiles p ON p.id = h.user_id
  WHERE h.aid_point_id = _aid_point_id
  ORDER BY h.invited_at ASC;
END;
$$;

-- ====== aid_point_needs ======
CREATE TABLE public.aid_point_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aid_point_id uuid NOT NULL REFERENCES public.aid_points(id) ON DELETE CASCADE,
  created_by uuid,
  title text NOT NULL,
  details text,
  priority text NOT NULL DEFAULT 'media',
  fulfilled boolean NOT NULL DEFAULT false,
  fulfilled_at timestamptz,
  fulfilled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (priority IN ('alta','media','baja'))
);

GRANT SELECT ON public.aid_point_needs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aid_point_needs TO authenticated;
GRANT ALL ON public.aid_point_needs TO service_role;

ALTER TABLE public.aid_point_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "needs are public" ON public.aid_point_needs
FOR SELECT USING (true);

CREATE POLICY "managers insert needs" ON public.aid_point_needs
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_aid_point(auth.uid(), aid_point_id));

CREATE POLICY "managers update needs" ON public.aid_point_needs
FOR UPDATE TO authenticated
USING (public.can_manage_aid_point(auth.uid(), aid_point_id))
WITH CHECK (public.can_manage_aid_point(auth.uid(), aid_point_id));

CREATE POLICY "managers delete needs" ON public.aid_point_needs
FOR DELETE TO authenticated
USING (public.can_manage_aid_point(auth.uid(), aid_point_id));

CREATE TRIGGER aid_point_needs_touch
BEFORE UPDATE ON public.aid_point_needs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX aid_point_needs_point_idx ON public.aid_point_needs(aid_point_id, fulfilled, created_at DESC);
