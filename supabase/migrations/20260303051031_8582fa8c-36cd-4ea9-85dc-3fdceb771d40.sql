
-- Step 1: Add 'Main Stock' to the department enum
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'Main Stock';

-- Create item_status enum for stock classification
DO $$ BEGIN
  CREATE TYPE public.item_status AS ENUM ('working', 'scrap', 'outdated', 'under_maintenance', 'available');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add item_status column to inventory_items (using text default, will update after)
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS item_status text NOT NULL DEFAULT 'available';

-- Migrate existing is_working data
UPDATE public.inventory_items 
SET item_status = CASE 
  WHEN is_working = false THEN 'under_maintenance'
  WHEN is_working = true THEN 'working'
  ELSE 'available'
END;

-- Add index for item_status
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_status ON public.inventory_items(item_status);
