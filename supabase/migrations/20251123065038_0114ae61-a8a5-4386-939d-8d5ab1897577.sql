-- Make category nullable since it's being removed from the UI
ALTER TABLE public.inventory_items 
ALTER COLUMN category DROP NOT NULL;