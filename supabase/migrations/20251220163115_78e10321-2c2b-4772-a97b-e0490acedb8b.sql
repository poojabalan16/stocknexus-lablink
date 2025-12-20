
CREATE OR REPLACE FUNCTION public.check_low_stock_by_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_quantity INTEGER;
  existing_alert_count INTEGER;
BEGIN
  -- Calculate total quantity for items with the same name in the same department
  SELECT COALESCE(SUM(quantity), 0)
  INTO total_quantity
  FROM public.inventory_items
  WHERE name = NEW.name 
    AND department = NEW.department;

  -- Check if an unresolved alert already exists for this item name/department
  SELECT COUNT(*)
  INTO existing_alert_count
  FROM public.alerts 
  WHERE item_id IN (
    SELECT id FROM public.inventory_items 
    WHERE name = NEW.name AND department = NEW.department
  )
  AND alert_type IN ('low_stock', 'out_of_stock')
  AND is_resolved = false;

  -- If stock is above 10, resolve any existing alerts (stock replenished)
  IF total_quantity > 10 THEN
    UPDATE public.alerts 
    SET is_resolved = true, resolved_at = NOW()
    WHERE item_id IN (
      SELECT id FROM public.inventory_items 
      WHERE name = NEW.name AND department = NEW.department
    )
    AND alert_type IN ('low_stock', 'out_of_stock')
    AND is_resolved = false;
    
  -- If stock is 0 and no existing alert, create out_of_stock alert
  ELSIF total_quantity = 0 AND existing_alert_count = 0 THEN
    INSERT INTO public.alerts (item_id, alert_type, message, severity)
    VALUES (
      NEW.id,
      'out_of_stock',
      'Item "' || NEW.name || '" in ' || NEW.department || ' is out of stock (Total: 0)',
      'high'
    );
    
  -- If stock is between 1-10 and no existing alert, create low_stock alert
  ELSIF total_quantity <= 10 AND total_quantity > 0 AND existing_alert_count = 0 THEN
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
