
-- Add lecture_book_number to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS lecture_book_number text;
CREATE INDEX IF NOT EXISTS idx_inventory_items_lecture_book ON public.inventory_items(lecture_book_number);

-- Item Movements table
CREATE TABLE public.item_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  lecture_book_number text,
  from_department public.department NOT NULL,
  to_department public.department NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  moved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

ALTER TABLE public.item_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all movements" ON public.item_movements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view movements" ON public.item_movements FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- Item Requests table
CREATE TABLE public.item_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_department public.department NOT NULL,
  requested_from_department public.department NOT NULL,
  item_name text NOT NULL,
  lecture_book_number text,
  quantity_requested integer NOT NULL DEFAULT 1,
  priority text NOT NULL DEFAULT 'medium',
  remarks text,
  attachment_url text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  movement_id uuid REFERENCES public.item_movements(id),
  requested_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

ALTER TABLE public.item_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all requests" ON public.item_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own requests" ON public.item_requests FOR SELECT TO authenticated USING (auth.uid() = requested_by);
CREATE POLICY "Users can create requests" ON public.item_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requested_by);

-- Add lecture_book_number to scrap_items
ALTER TABLE public.scrap_items ADD COLUMN IF NOT EXISTS lecture_book_number text;
ALTER TABLE public.scrap_items ADD COLUMN IF NOT EXISTS scrap_value numeric DEFAULT 0;
ALTER TABLE public.scrap_items ADD COLUMN IF NOT EXISTS vendor_name text;
ALTER TABLE public.scrap_items ADD COLUMN IF NOT EXISTS vendor_contact text;
ALTER TABLE public.scrap_items ADD COLUMN IF NOT EXISTS bill_url text;
ALTER TABLE public.scrap_items ADD COLUMN IF NOT EXISTS disposal_certificate_url text;

-- Add payment fields to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS payment_mode text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS transaction_id text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS payment_date date;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS payment_proof_url text;

-- Create request_attachments bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('request-attachments', 'request-attachments', false) ON CONFLICT DO NOTHING;

-- Storage policies for request-attachments
CREATE POLICY "Authenticated users can upload request attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'request-attachments');
CREATE POLICY "Authenticated users can view request attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'request-attachments');
