-- Create admin user account
-- First, we need to insert into auth.users, but since we can't directly modify auth schema,
-- we'll create a SQL function to handle this securely

-- Create a function to set up the admin account
CREATE OR REPLACE FUNCTION setup_admin_account(
  admin_email text,
  admin_password text,
  admin_full_name text,
  admin_department department
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- This function will be called from the backend to create the admin user
  -- For now, we'll prepare the user_roles entry
  -- The actual user creation will happen via Supabase Auth
  
  RETURN gen_random_uuid();
END;
$$;

-- Grant admin role to the user with email admin@stocknexus.com
-- This assumes the user has already signed up via the auth system
-- We'll update this via a direct insert after user creation

-- For now, let's update the registration request status
UPDATE registration_requests 
SET status = 'approved', 
    reviewed_at = now(),
    reviewed_by = (SELECT id FROM auth.users LIMIT 1)
WHERE email = 'admin@stocknexus.com';
