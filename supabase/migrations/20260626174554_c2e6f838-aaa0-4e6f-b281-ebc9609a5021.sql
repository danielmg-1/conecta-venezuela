
-- Moderator policies: allow moderators to toggle hidden_by_admin (and other admin-only updates) on key tables
CREATE POLICY "Moderators can update missing persons"
ON public.missing_persons FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update aid points"
ON public.aid_points FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update volunteers"
ON public.volunteers FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Admin: grant role to a user by email
CREATE OR REPLACE FUNCTION public.admin_grant_role_by_email(_email text, _role public.app_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo el administrador puede asignar roles';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No existe un usuario registrado con ese correo';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN jsonb_build_object('user_id', _uid, 'role', _role);
END;
$$;

-- Admin: revoke role
CREATE OR REPLACE FUNCTION public.admin_revoke_role_by_email(_email text, _role public.app_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo el administrador puede revocar roles';
  END IF;
  IF _role = 'admin' THEN
    RAISE EXCEPTION 'No se puede revocar el rol admin desde aquí';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _uid AND role = _role;
  RETURN jsonb_build_object('user_id', _uid, 'role', _role);
END;
$$;

-- Admin: list users with a given role (returns id, email, full_name)
CREATE OR REPLACE FUNCTION public.admin_list_users_by_role(_role public.app_role)
RETURNS TABLE(user_id uuid, email text, full_name text, granted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo el administrador puede ver esta información';
  END IF;
  RETURN QUERY
    SELECT ur.user_id, u.email::text, p.full_name, ur.created_at
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = _role
    ORDER BY ur.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_role_by_email(text, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_role_by_email(text, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users_by_role(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_role_by_email(text, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role_by_email(text, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users_by_role(public.app_role) TO authenticated;
