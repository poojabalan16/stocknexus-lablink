-- Create storage bucket for service bills
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-bills', 'service-bills', false);

-- Create RLS policies for service-bills bucket
CREATE POLICY "Admins can upload service bills"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-bills' 
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can view service bills"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'service-bills'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update service bills"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service-bills'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete service bills"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-bills'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add bill_photo_url column to services table
ALTER TABLE public.services
ADD COLUMN bill_photo_url TEXT;