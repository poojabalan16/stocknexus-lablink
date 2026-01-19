-- Create grievances table
CREATE TABLE public.grievances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by UUID NOT NULL,
  attachment_url TEXT,
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;

-- HOD and Staff can create grievances
CREATE POLICY "HOD and Staff can create grievances"
ON public.grievances
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  (has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'staff'))
);

-- Users can view their own grievances
CREATE POLICY "Users can view their own grievances"
ON public.grievances
FOR SELECT
USING (auth.uid() = created_by);

-- Admins can view all grievances
CREATE POLICY "Admins can view all grievances"
ON public.grievances
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update grievances
CREATE POLICY "Admins can update grievances"
ON public.grievances
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_grievances_updated_at
BEFORE UPDATE ON public.grievances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for grievance attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('grievance-attachments', 'grievance-attachments', false);

-- Storage policies for grievance attachments
CREATE POLICY "Users can upload grievance attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'grievance-attachments' AND
  (has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'staff'))
);

CREATE POLICY "Users can view their own grievance attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'grievance-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all grievance attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'grievance-attachments' AND
  has_role(auth.uid(), 'admin')
);