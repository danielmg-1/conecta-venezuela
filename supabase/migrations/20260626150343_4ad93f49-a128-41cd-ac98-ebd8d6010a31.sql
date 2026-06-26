
-- Enums
CREATE TYPE public.aid_point_type AS ENUM ('centro_acopio','punto_recaudacion','hospital','clinica','primeros_auxilios','apoyo_psicologico','otro');

-- aid_points
CREATE TABLE public.aid_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo public.aid_point_type NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  direccion TEXT,
  estado TEXT NOT NULL,
  ciudad TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  telefono TEXT,
  horario TEXT,
  necesidades TEXT,
  photo_path TEXT,
  hidden_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aid_points TO authenticated;
GRANT SELECT ON public.aid_points TO anon;
GRANT ALL ON public.aid_points TO service_role;
ALTER TABLE public.aid_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read public aid points" ON public.aid_points FOR SELECT TO anon, authenticated USING (hidden_by_admin = false OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own aid points" ON public.aid_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Update own or admin" ON public.aid_points FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Delete own or admin" ON public.aid_points FOR DELETE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER aid_points_touch BEFORE UPDATE ON public.aid_points FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- volunteers
CREATE TABLE public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nombre TEXT NOT NULL,
  profesion TEXT NOT NULL,
  habilidades TEXT,
  estado TEXT NOT NULL,
  ciudad TEXT,
  descripcion TEXT,
  contacto TEXT NOT NULL,
  disponibilidad TEXT,
  hidden_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT SELECT ON public.volunteers TO anon;
GRANT ALL ON public.volunteers TO service_role;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read public volunteers" ON public.volunteers FOR SELECT TO anon, authenticated USING (hidden_by_admin = false OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own volunteer" ON public.volunteers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own volunteer or admin" ON public.volunteers FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Delete own volunteer or admin" ON public.volunteers FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER volunteers_touch BEFORE UPDATE ON public.volunteers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- news
CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  photo_path TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO authenticated;
GRANT SELECT ON public.news TO anon;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read published news" ON public.news FOR SELECT TO anon, authenticated USING (published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin insert news" ON public.news FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND auth.uid() = author_id);
CREATE POLICY "Admin update news" ON public.news FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete news" ON public.news FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER news_touch BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
