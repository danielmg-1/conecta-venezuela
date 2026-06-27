
-- Section enum-ish using text + check
CREATE TABLE public.moderator_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('desaparecidos','centros','voluntarios','noticias','anuncios','emergencias')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section)
);

GRANT SELECT ON public.moderator_permissions TO authenticated;
GRANT ALL ON public.moderator_permissions TO service_role;

ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own moderator perms" ON public.moderator_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage moderator perms" ON public.moderator_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper function: admin always true, otherwise check explicit permission
CREATE OR REPLACE FUNCTION public.has_moderator_permission(_user_id uuid, _section text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.moderator_permissions WHERE user_id = _user_id AND section = _section);
$$;

GRANT EXECUTE ON FUNCTION public.has_moderator_permission(uuid, text) TO authenticated, anon;

-- Seed: existing moderators keep access to the 3 previously moderated sections
INSERT INTO public.moderator_permissions (user_id, section)
SELECT ur.user_id, s.section
FROM public.user_roles ur
CROSS JOIN (VALUES ('desaparecidos'),('centros'),('voluntarios')) AS s(section)
WHERE ur.role = 'moderator'
ON CONFLICT DO NOTHING;

-- Replace blanket moderator policies with section-scoped ones
DROP POLICY IF EXISTS "Moderators can update missing persons" ON public.missing_persons;
CREATE POLICY "Moderators with permission update missing persons"
  ON public.missing_persons FOR UPDATE TO authenticated
  USING (public.has_moderator_permission(auth.uid(), 'desaparecidos'))
  WITH CHECK (public.has_moderator_permission(auth.uid(), 'desaparecidos'));

DROP POLICY IF EXISTS "Moderators can update aid points" ON public.aid_points;
CREATE POLICY "Moderators with permission update aid points"
  ON public.aid_points FOR UPDATE TO authenticated
  USING (public.has_moderator_permission(auth.uid(), 'centros'))
  WITH CHECK (public.has_moderator_permission(auth.uid(), 'centros'));

DROP POLICY IF EXISTS "Moderators can update volunteers" ON public.volunteers;
CREATE POLICY "Moderators with permission update volunteers"
  ON public.volunteers FOR UPDATE TO authenticated
  USING (public.has_moderator_permission(auth.uid(), 'voluntarios'))
  WITH CHECK (public.has_moderator_permission(auth.uid(), 'voluntarios'));

-- New sections: noticias, anuncios, emergencias — allow moderators with permission full management
CREATE POLICY "Moderators with permission insert news"
  ON public.news FOR INSERT TO authenticated
  WITH CHECK (public.has_moderator_permission(auth.uid(), 'noticias'));
CREATE POLICY "Moderators with permission update news"
  ON public.news FOR UPDATE TO authenticated
  USING (public.has_moderator_permission(auth.uid(), 'noticias'))
  WITH CHECK (public.has_moderator_permission(auth.uid(), 'noticias'));
CREATE POLICY "Moderators with permission delete news"
  ON public.news FOR DELETE TO authenticated
  USING (public.has_moderator_permission(auth.uid(), 'noticias'));

CREATE POLICY "Moderators with permission manage announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (public.has_moderator_permission(auth.uid(), 'anuncios'))
  WITH CHECK (public.has_moderator_permission(auth.uid(), 'anuncios'));

CREATE POLICY "Moderators with permission manage emergencies"
  ON public.emergency_contacts FOR ALL TO authenticated
  USING (public.has_moderator_permission(auth.uid(), 'emergencias'))
  WITH CHECK (public.has_moderator_permission(auth.uid(), 'emergencias'));

-- RPC: set permissions for a moderator by email (replaces full set)
CREATE OR REPLACE FUNCTION public.admin_set_moderator_permissions(_email text, _sections text[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _s text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo el administrador puede asignar permisos';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No existe un usuario registrado con ese correo';
  END IF;

  -- Ensure moderator role
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'moderator')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Replace permissions
  DELETE FROM public.moderator_permissions WHERE user_id = _uid;
  IF _sections IS NOT NULL THEN
    FOREACH _s IN ARRAY _sections LOOP
      IF _s NOT IN ('desaparecidos','centros','voluntarios','noticias','anuncios','emergencias') THEN
        RAISE EXCEPTION 'Sección inválida: %', _s;
      END IF;
      INSERT INTO public.moderator_permissions (user_id, section, granted_by) VALUES (_uid, _s, auth.uid())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('user_id', _uid, 'sections', _sections);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_moderator_permissions(text, text[]) TO authenticated;

-- RPC: list moderators with their permissions
CREATE OR REPLACE FUNCTION public.admin_list_moderators_with_permissions()
RETURNS TABLE(user_id uuid, email text, full_name text, sections text[], granted_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo el administrador puede ver esta información';
  END IF;
  RETURN QUERY
    SELECT ur.user_id,
           u.email::text,
           p.full_name,
           COALESCE(ARRAY_AGG(mp.section ORDER BY mp.section) FILTER (WHERE mp.section IS NOT NULL), ARRAY[]::text[]) AS sections,
           ur.created_at
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    LEFT JOIN public.moderator_permissions mp ON mp.user_id = ur.user_id
    WHERE ur.role = 'moderator'
    GROUP BY ur.user_id, u.email, p.full_name, ur.created_at
    ORDER BY ur.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_moderators_with_permissions() TO authenticated;
