
-- 1) Noticias: rich HTML support
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS body_html text;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS is_html boolean NOT NULL DEFAULT false;

-- 2) Update admin_set_moderator_permissions to accept new 'reportes' section
CREATE OR REPLACE FUNCTION public.admin_set_moderator_permissions(_email text, _sections text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'moderator')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.moderator_permissions WHERE user_id = _uid;
  IF _sections IS NOT NULL THEN
    FOREACH _s IN ARRAY _sections LOOP
      IF _s NOT IN ('desaparecidos','centros','voluntarios','noticias','anuncios','emergencias','reportes') THEN
        RAISE EXCEPTION 'Sección inválida: %', _s;
      END IF;
      INSERT INTO public.moderator_permissions (user_id, section, granted_by) VALUES (_uid, _s, auth.uid())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('user_id', _uid, 'sections', _sections);
END;
$function$;

-- 3) Storage policies for news-images bucket
CREATE POLICY "news-images read all"
ON storage.objects FOR SELECT
USING (bucket_id = 'news-images');

CREATE POLICY "news-images insert by news moderators"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'news-images' AND public.has_moderator_permission(auth.uid(), 'noticias'));

CREATE POLICY "news-images delete by news moderators"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'news-images' AND public.has_moderator_permission(auth.uid(), 'noticias'));
