
-- Add file_url column to distribution_records for file attachments
ALTER TABLE public.distribution_records ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.distribution_records ADD COLUMN IF NOT EXISTS cabin_number text;

-- Create storage bucket for distribution files
INSERT INTO storage.buckets (id, name, public) VALUES ('distribution-files', 'distribution-files', false) ON CONFLICT (id) DO NOTHING;

-- RLS for distribution-files bucket
CREATE POLICY "Authenticated users can upload distribution files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'distribution-files');

CREATE POLICY "Authenticated users can view distribution files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'distribution-files');
