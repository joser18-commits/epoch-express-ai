CREATE POLICY "Owners read their project media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Owners upload their project media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Owners update their project media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Owners delete their project media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
  )
);