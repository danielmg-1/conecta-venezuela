-- Restore execution permissions for internal permission checks and triggers used by RLS.
-- These functions do not expose data directly; they are required so authenticated users
-- can pass policies and trigger validations during edits/deletes/admin actions.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

GRANT EXECUTE ON FUNCTION public.enforce_status_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_missing_person_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_contact_limit() TO authenticated;

-- Ensure admin/owner policies are present and consistent for missing person reports.
DROP POLICY IF EXISTS "mp_update_owner_admin" ON public.missing_persons;
CREATE POLICY "mp_update_owner_admin"
ON public.missing_persons
FOR UPDATE
TO authenticated
USING ((auth.uid() = reporter_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK ((auth.uid() = reporter_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "mp_delete_owner_admin" ON public.missing_persons;
CREATE POLICY "mp_delete_owner_admin"
ON public.missing_persons
FOR DELETE
TO authenticated
USING ((auth.uid() = reporter_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "mpc_manage_owner_admin" ON public.missing_person_contacts;
CREATE POLICY "mpc_manage_owner_admin"
ON public.missing_person_contacts
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.missing_persons mp
    WHERE mp.id = missing_person_contacts.person_id
      AND mp.reporter_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.missing_persons mp
    WHERE mp.id = missing_person_contacts.person_id
      AND mp.reporter_id = auth.uid()
  )
);

-- Ensure admin can manage announcements.
DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
CREATE POLICY "Admins manage announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
