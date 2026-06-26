
DROP POLICY IF EXISTS "tips_insert_any" ON public.tips;
CREATE POLICY "tips_insert_valid" ON public.tips FOR INSERT WITH CHECK (
  length(trim(autor_nombre)) BETWEEN 2 AND 80
  AND length(trim(mensaje)) BETWEEN 4 AND 2000
);
