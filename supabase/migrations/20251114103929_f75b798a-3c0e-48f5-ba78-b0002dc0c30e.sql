-- Add unit_price column to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2) DEFAULT 0;

-- Drop the existing function with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS public.check_low_stock() CASCADE;

-- Create improved low stock check function that aggregates by item name
CREATE OR REPLACE FUNCTION public.check_low_stock_by_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_quantity INTEGER;
  sample_threshold INTEGER;
BEGIN
  -- Calculate total quantity for items with the same name in the same department
  SELECT 
    COALESCE(SUM(quantity), 0),
    MAX(low_stock_threshold)
  INTO total_quantity, sample_threshold
  FROM public.inventory_items
  WHERE name = NEW.name 
    AND department = NEW.department;

  -- Only create alerts based on total quantity across all items with same name
  -- Delete any existing alerts for this item name to avoid duplicates
  DELETE FROM public.alerts 
  WHERE item_id IN (
    SELECT id FROM public.inventory_items 
    WHERE name = NEW.name AND department = NEW.department
  )
  AND alert_type IN ('low_stock', 'out_of_stock')
  AND is_resolved = false;

  -- Create new alert based on total quantity
  IF total_quantity = 0 THEN
    INSERT INTO public.alerts (item_id, alert_type, message, severity)
    VALUES (
      NEW.id,
      'out_of_stock',
      'Item "' || NEW.name || '" in ' || NEW.department || ' is out of stock (Total: 0)',
      'high'
    );
  ELSIF total_quantity <= sample_threshold AND total_quantity > 0 THEN
    INSERT INTO public.alerts (item_id, alert_type, message, severity)
    VALUES (
      NEW.id,
      'low_stock',
      'Item "' || NEW.name || '" in ' || NEW.department || ' is running low (Total: ' || total_quantity || ')',
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for the new function
CREATE TRIGGER check_low_stock_by_name_trigger
AFTER INSERT OR UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.check_low_stock_by_name();