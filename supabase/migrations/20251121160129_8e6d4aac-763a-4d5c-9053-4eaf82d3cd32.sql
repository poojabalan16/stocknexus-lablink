-- Step 1: Drop all RLS policies that depend on department column
DROP POLICY IF EXISTS "HODs can insert items for their department" ON inventory_items;
DROP POLICY IF EXISTS "HODs can update items in their department" ON inventory_items;
DROP POLICY IF EXISTS "HODs can delete items in their department" ON inventory_items;

-- Step 2: Drop functions that depend on department enum
DROP FUNCTION IF EXISTS get_user_department(uuid);
DROP FUNCTION IF EXISTS setup_admin_account(text, text, text, department);

-- Step 3: Update the department enum
ALTER TYPE department RENAME TO department_old;
CREATE TYPE department AS ENUM ('IT', 'AI&DS', 'CSE', 'Physics', 'Chemistry', 'Bio-tech');

-- Step 4: Update all tables that use the department enum
ALTER TABLE inventory_items 
  ALTER COLUMN department TYPE department USING 
    CASE department::text 
      WHEN 'AIDS' THEN 'AI&DS'::department
      ELSE department::text::department
    END;

ALTER TABLE profiles
  ALTER COLUMN department TYPE department USING 
    CASE department::text 
      WHEN 'AIDS' THEN 'AI&DS'::department
      ELSE department::text::department
    END;

ALTER TABLE registration_requests
  ALTER COLUMN department TYPE department USING 
    CASE department::text 
      WHEN 'AIDS' THEN 'AI&DS'::department
      ELSE department::text::department
    END;

ALTER TABLE services
  ALTER COLUMN department TYPE department USING 
    CASE department::text 
      WHEN 'AIDS' THEN 'AI&DS'::department
      ELSE department::text::department
    END;

ALTER TABLE user_roles
  ALTER COLUMN department TYPE department USING 
    CASE department::text 
      WHEN 'AIDS' THEN 'AI&DS'::department
      ELSE department::text::department
    END;

DROP TYPE department_old;

-- Step 5: Recreate the functions with new enum
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id uuid)
RETURNS department
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT department
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.setup_admin_account(admin_email text, admin_password text, admin_full_name text, admin_department department)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  RETURN gen_random_uuid();
END;
$$;

-- Step 6: Recreate the RLS policies
CREATE POLICY "HODs can insert items for their department" 
ON inventory_items 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'hod'::app_role) AND (department = get_user_department(auth.uid())));

CREATE POLICY "HODs can update items in their department" 
ON inventory_items 
FOR UPDATE 
USING (has_role(auth.uid(), 'hod'::app_role) AND (department = get_user_department(auth.uid())));

CREATE POLICY "HODs can delete items in their department" 
ON inventory_items 
FOR DELETE 
USING (has_role(auth.uid(), 'hod'::app_role) AND (department = get_user_department(auth.uid())));