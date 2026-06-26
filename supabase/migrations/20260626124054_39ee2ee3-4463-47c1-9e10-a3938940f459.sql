
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ AUTO-CREATE PROFILE ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ MISSING PERSONS ============
CREATE TYPE public.missing_status AS ENUM ('desaparecido', 'en_busqueda', 'encontrado');

CREATE TABLE public.missing_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cedula TEXT,
  birth_date DATE,
  photo_path TEXT,
  estado TEXT NOT NULL,
  ciudad TEXT,
  lugar_desaparicion TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  descripcion TEXT,
  status public.missing_status NOT NULL DEFAULT 'desaparecido',
  hidden_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missing_persons TO authenticated;
GRANT SELECT ON public.missing_persons TO anon;
GRANT ALL ON public.missing_persons TO service_role;
ALTER TABLE public.missing_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp_select_public" ON public.missing_persons FOR SELECT USING (hidden_by_admin = false OR auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mp_insert_auth" ON public.missing_persons FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "mp_update_owner_admin" ON public.missing_persons FOR UPDATE TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mp_delete_owner_admin" ON public.missing_persons FOR DELETE TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_mp_cedula ON public.missing_persons (cedula);
CREATE INDEX idx_mp_status ON public.missing_persons (status);
CREATE INDEX idx_mp_estado ON public.missing_persons (estado);
CREATE INDEX idx_mp_created_at ON public.missing_persons (created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_mp_updated BEFORE UPDATE ON public.missing_persons
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ CONTACTS ============
CREATE TYPE public.contact_type AS ENUM ('telefono', 'whatsapp', 'email', 'instagram', 'otro');

CREATE TABLE public.missing_person_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.missing_persons(id) ON DELETE CASCADE,
  tipo public.contact_type NOT NULL,
  valor TEXT NOT NULL,
  codigo_pais TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missing_person_contacts TO authenticated;
GRANT SELECT ON public.missing_person_contacts TO anon;
GRANT ALL ON public.missing_person_contacts TO service_role;
ALTER TABLE public.missing_person_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpc_select_public" ON public.missing_person_contacts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.missing_persons mp WHERE mp.id = person_id AND (mp.hidden_by_admin = false OR mp.reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "mpc_modify_owner_admin" ON public.missing_person_contacts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.missing_persons mp WHERE mp.id = person_id AND (mp.reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.missing_persons mp WHERE mp.id = person_id AND (mp.reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE INDEX idx_mpc_person ON public.missing_person_contacts (person_id);

CREATE OR REPLACE FUNCTION public.enforce_contact_limit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.missing_person_contacts WHERE person_id = NEW.person_id) >= 4 THEN
    RAISE EXCEPTION 'Máximo 4 contactos por persona';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_contact_limit BEFORE INSERT ON public.missing_person_contacts
FOR EACH ROW EXECUTE FUNCTION public.enforce_contact_limit();

-- ============ TIPS ============
CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.missing_persons(id) ON DELETE CASCADE,
  autor_nombre TEXT NOT NULL,
  autor_contacto TEXT,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tips TO authenticated;
GRANT INSERT ON public.tips TO anon;
GRANT ALL ON public.tips TO service_role;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tips_insert_any" ON public.tips FOR INSERT WITH CHECK (true);
CREATE POLICY "tips_select_owner_admin" ON public.tips FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.missing_persons mp WHERE mp.id = person_id AND (mp.reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

-- ============ EMERGENCY CONTACTS ============
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  nombre_institucion TEXT NOT NULL,
  telefono TEXT NOT NULL,
  descripcion TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.emergency_contacts TO anon, authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec_select_all" ON public.emergency_contacts FOR SELECT USING (true);
CREATE POLICY "ec_admin_all" ON public.emergency_contacts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE POLICIES (bucket created separately) ============
-- Bucket missing-photos must be created via storage tool. Below are object-level policies.
CREATE POLICY "missing_photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'missing-photos');
CREATE POLICY "missing_photos_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'missing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "missing_photos_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'missing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "missing_photos_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'missing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
