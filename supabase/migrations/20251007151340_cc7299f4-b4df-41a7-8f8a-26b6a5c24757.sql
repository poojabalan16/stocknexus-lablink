-- Create a default admin user
-- Note: This creates a user with a known password for initial setup
-- You should change this password after first login

-- Insert admin user (password will be: admin123)
-- The handle_new_user trigger will automatically create the profile
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'admin@stocknexus.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"full_name":"System Administrator"}',
  NOW(),
  NOW(),
  '',
  ''
);

-- Create profile for admin
INSERT INTO public.profiles (id, email, full_name)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'admin@stocknexus.com',
  'System Administrator'
)
ON CONFLICT (id) DO NOTHING;

-- Assign admin role
INSERT INTO public.user_roles (user_id, role, department)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'admin',
  'IT'
);