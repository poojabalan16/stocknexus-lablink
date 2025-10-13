-- Create enum for service types
CREATE TYPE service_type AS ENUM ('internal', 'external');

-- Create enum for nature of service
CREATE TYPE nature_of_service AS ENUM ('maintenance', 'repair', 'calibration', 'installation');

-- Create enum for service status
CREATE TYPE service_status AS ENUM ('pending', 'in_progress', 'completed');

-- Create services table
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type service_type NOT NULL,
  department department NOT NULL,
  equipment_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  nature_of_service nature_of_service NOT NULL,
  service_date date NOT NULL,
  status service_status NOT NULL DEFAULT 'pending',
  technician_vendor_name text NOT NULL,
  cost numeric(10, 2),
  remarks text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admins can view all services"
ON public.services
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert services"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update services"
ON public.services
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete services"
ON public.services
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();