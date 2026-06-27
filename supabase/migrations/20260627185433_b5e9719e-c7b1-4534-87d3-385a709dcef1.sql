
-- 1) Make sure WITH CHECK is explicit on owner/admin update policy
DROP POLICY IF EXISTS mp_update_owner_admin ON public.missing_persons;
CREATE POLICY mp_update_owner_admin ON public.missing_persons
  FOR UPDATE TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

-- 2) Owner/admin should be able to manage contacts of their report
DROP POLICY IF EXISTS mpc_select_public ON public.missing_person_contacts;
DROP POLICY IF EXISTS mpc_manage_owner_admin ON public.missing_person_contacts;

CREATE POLICY mpc_select_public ON public.missing_person_contacts
  FOR SELECT
  USING (true);

CREATE POLICY mpc_manage_owner_admin ON public.missing_person_contacts
  FOR ALL TO authenticated
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

GRANT SELECT ON public.missing_person_contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missing_person_contacts TO authenticated;
GRANT ALL ON public.missing_person_contacts TO service_role;

-- 3) Defensive: trigger functions should be callable in the role's context.
GRANT EXECUTE ON FUNCTION public.log_missing_person_changes() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.enforce_status_change() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.touch_updated_at() TO authenticated, anon, service_role;

-- 4) Ensure audit table grants are intact (SELECT only for authenticated; inserts happen via SECURITY DEFINER trigger as postgres)
GRANT SELECT ON public.missing_person_audit TO authenticated;
GRANT ALL ON public.missing_person_audit TO service_role;
