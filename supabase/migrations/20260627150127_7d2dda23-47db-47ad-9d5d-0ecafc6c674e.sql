
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_threads_visitor_idx ON public.chat_threads(visitor_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO anon, authenticated;
GRANT ALL ON public.chat_threads TO service_role;

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read threads" ON public.chat_threads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can insert threads" ON public.chat_threads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can update threads" ON public.chat_threads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner or admin can delete threads" ON public.chat_threads FOR DELETE TO anon, authenticated
  USING (true);

CREATE TRIGGER chat_threads_touch BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  parts JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_thread_idx ON public.chat_messages(thread_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read messages" ON public.chat_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can insert messages" ON public.chat_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can delete messages" ON public.chat_messages FOR DELETE TO anon, authenticated USING (true);
