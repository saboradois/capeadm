
-- Add foto_url column to produtos_semijoias
ALTER TABLE public.produtos_semijoias ADD COLUMN foto_url text DEFAULT NULL;

-- Create storage bucket for product photos
INSERT INTO storage.buckets (id, name, public) VALUES ('produto-fotos', 'produto-fotos', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users upload own product photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'produto-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Public read product photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'produto-fotos');

-- Allow users to update/delete their own photos
CREATE POLICY "Users manage own product photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'produto-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own product photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'produto-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
