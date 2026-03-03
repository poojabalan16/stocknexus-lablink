
-- Create distribution_records table for audit trail
CREATE TABLE IF NOT EXISTS public.distribution_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.inventory_items(id),
  item_name text NOT NULL,
  from_department text NOT NULL DEFAULT 'Main Stock',
  to_department text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  item_status text NOT NULL DEFAULT 'available',
  -- Authorized person details
  authorized_person_name text NOT NULL,
  employee_id text NOT NULL,
  designation text NOT NULL,
  contact_number text NOT NULL,
  auth_department text NOT NULL,
  digital_approval boolean NOT NULL DEFAULT false,
  -- Metadata
  distributed_by uuid NOT NULL,
  distributed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Enable RLS
ALTER TABLE public.distribution_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all distribution records"
ON public.distribution_records FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view distribution records"
ON public.distribution_records FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_distribution_records_to_dept ON public.distribution_records(to_department);
CREATE INDEX IF NOT EXISTS idx_distribution_records_distributed_at ON public.distribution_records(distributed_at);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.distribution_records;
