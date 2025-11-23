-- Add cabin_number column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN cabin_number text;