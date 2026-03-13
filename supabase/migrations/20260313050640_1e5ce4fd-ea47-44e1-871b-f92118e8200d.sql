INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Club logos publicly viewable" ON storage.objects FOR SELECT TO public USING (bucket_id = 'club-logos');

CREATE POLICY "Club owners can upload logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'club-logos');

CREATE POLICY "Club owners can update logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'club-logos');