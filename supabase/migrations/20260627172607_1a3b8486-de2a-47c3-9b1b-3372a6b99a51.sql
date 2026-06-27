
-- 1) CHAT: lock down to signed-in owners
DROP POLICY IF EXISTS "anyone can read threads" ON public.chat_threads;
DROP POLICY IF EXISTS "anyone can insert threads" ON public.chat_threads;
DROP POLICY IF EXISTS "anyone can update threads" ON public.chat_threads;
DROP POLICY IF EXISTS "owner or admin can delete threads" ON public.chat_threads;
DROP POLICY IF EXISTS "anyone can read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "anyone can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "anyone can delete messages" ON public.chat_messages;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_threads FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_messages FROM anon;

CREATE POLICY chat_threads_select_own ON public.chat_threads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY chat_threads_insert_own ON public.chat_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY chat_threads_update_own ON public.chat_threads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY chat_threads_delete_own ON public.chat_threads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY chat_messages_select_own ON public.chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = chat_messages.thread_id AND t.user_id = auth.uid()));
CREATE POLICY chat_messages_insert_own ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = chat_messages.thread_id AND t.user_id = auth.uid()));
CREATE POLICY chat_messages_delete_own ON public.chat_messages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = chat_messages.thread_id AND t.user_id = auth.uid()));

-- 2) PROFILES: lock phone/bio behind authenticated own row
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- 3) AID POINTS: hide telefono from anon
REVOKE SELECT (telefono) ON public.aid_points FROM anon;

-- 4) VOLUNTEERS: hide contacto from anon
REVOKE SELECT (contacto) ON public.volunteers FROM anon;

-- 5) SECURITY DEFINER functions: tighten EXECUTE
REVOKE ALL ON FUNCTION public.enforce_contact_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_status_change() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_list_users_by_role(public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_role_by_email(text, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revoke_role_by_email(text, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users_by_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_role_by_email(text, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role_by_email(text, public.app_role) TO authenticated;

-- has_role is required by RLS policies for both anon and authenticated callers; keep grants
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
