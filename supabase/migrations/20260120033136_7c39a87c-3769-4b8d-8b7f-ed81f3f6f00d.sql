-- Add is_working column to inventory_items for tracking working status
ALTER TABLE public.inventory_items 
ADD COLUMN is_working boolean NOT NULL DEFAULT true;