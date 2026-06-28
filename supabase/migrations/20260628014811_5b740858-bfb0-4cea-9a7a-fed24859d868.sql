ALTER TABLE public.aid_points ADD COLUMN IF NOT EXISTS cover_photo text;

CREATE POLICY "aid-photos read all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'aid-photos');

CREATE POLICY "aid-photos owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'aid-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "aid-photos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'aid-photos' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'aid-photos' AND owner = auth.uid());

CREATE POLICY "aid-photos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'aid-photos' AND owner = auth.uid());