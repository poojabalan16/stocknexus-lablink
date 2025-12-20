CREATE OR REPLACE FUNCTION public.check_low_stock_by_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_quantity INTEGER;
BEGIN
  -- Calculate total quantity for items with the same name in the same department
  SELECT COALESCE(SUM(quantity), 0)
  INTO total_quantity
  FROM public.inventory_items
  WHERE name = NEW.name 
    AND department = NEW.department;

  -- Delete any existing alerts for this item name to avoid duplicates
  DELETE FROM public.alerts 
  WHERE item_id IN (
    SELECT id FROM public.inventory_items 
    WHERE name = NEW.name AND department = NEW.department
  )
  AND alert_type IN ('low_stock', 'out_of_stock')
  AND is_resolved = false;

  -- Create new alert based on total quantity (threshold is fixed at 10)
  IF total_quantity = 0 THEN
    INSERT INTO public.alerts (item_id, alert_type, message, severity)
    VALUES (
      NEW.id,
      'out_of_stock',
      'Item "' || NEW.name || '" in ' || NEW.department || ' is out of stock (Total: 0)',
      'high'
    );
  ELSIF total_quantity < 10 THEN
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