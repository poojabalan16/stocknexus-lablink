-- Create scrap_items table to track scrapped inventory
CREATE TABLE public.scrap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_model text,
  item_serial_number text,
  department public.department NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  reason text NOT NULL,
  scrapped_by uuid NOT NULL,
  scrapped_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scrap_items ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all scrap items"
ON public.scrap_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- HODs can view and insert scrap items for their department
CREATE POLICY "HODs can view scrap items in their department"
ON public.scrap_items
FOR SELECT
USING (has_role(auth.uid(), 'hod'::app_role) AND department = get_user_department(auth.uid()));

CREATE POLICY "HODs can insert scrap items in their department"
ON public.scrap_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'hod'::app_role) AND department = get_user_department(auth.uid()));