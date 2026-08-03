CREATE POLICY "evidence own read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "evidence own insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text AND public.is_approved(auth.uid()));
CREATE POLICY "evidence own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));