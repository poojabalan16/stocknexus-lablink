
-- Create enums for purchase module
CREATE TYPE public.purchase_type AS ENUM ('asset', 'consumable', 'service', 'subscription', 'utility');
CREATE TYPE public.vendor_category AS ENUM ('asset_vendor', 'service_provider', 'utility', 'software_vendor', 'other');
CREATE TYPE public.item_category AS ENUM ('hardware', 'network', 'software', 'office', 'lab', 'other');
CREATE TYPE public.billing_period AS ENUM ('one_time', 'monthly', 'quarterly', 'annual');
CREATE TYPE public.payment_mode AS ENUM ('cash', 'cheque', 'neft', 'rtgs', 'upi');
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'partially_paid');

-- Create purchases table
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Vendor Details
  vendor_name text NOT NULL,
  vendor_category vendor_category NOT NULL,
  vendor_gst_number text,
  vendor_contact text,
  -- Purchase Classification
  purchase_type purchase_type NOT NULL,
  item_category item_category NOT NULL,
  item_name text NOT NULL,
  item_description text,
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  -- Billing Information
  bill_invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  billing_period billing_period NOT NULL DEFAULT 'one_time',
  reference_order_number text,
  -- Financial Details
  base_amount numeric NOT NULL DEFAULT 0,
  gst_applicable boolean NOT NULL DEFAULT false,
  gst_percentage numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  -- Payment Details
  payment_mode payment_mode NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  due_date date,
  -- Organizational Mapping
  department public.department NOT NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  remarks text,
  -- Metadata
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  -- Unique constraint: no duplicate bill numbers per vendor
  UNIQUE (vendor_name, bill_invoice_number)
);

-- Create purchase_attachments table for multiple file uploads
CREATE TABLE public.purchase_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_attachments ENABLE ROW LEVEL SECURITY;

-- RLS for purchases: Admin full access, Accounts dept can view
CREATE POLICY "Admins can manage all purchases" ON public.purchases FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view purchases" ON public.purchases FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS for attachments
CREATE POLICY "Admins can manage all attachments" ON public.purchase_attachments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view attachments" ON public.purchase_attachments FOR SELECT USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for purchase bills
INSERT INTO storage.buckets (id, name, public) VALUES ('purchase-bills', 'purchase-bills', false);

-- Storage policies
CREATE POLICY "Admins can upload purchase bills" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'purchase-bills' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update purchase bills" ON storage.objects FOR UPDATE USING (bucket_id = 'purchase-bills' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete purchase bills" ON storage.objects FOR DELETE USING (bucket_id = 'purchase-bills' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view purchase bills" ON storage.objects FOR SELECT USING (bucket_id = 'purchase-bills' AND auth.uid() IS NOT NULL);
