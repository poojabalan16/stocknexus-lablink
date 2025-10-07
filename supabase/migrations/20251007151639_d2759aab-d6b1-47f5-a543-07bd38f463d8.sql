-- Clean up the problematic admin user that was inserted incorrectly
DELETE FROM public.user_roles WHERE user_id = 'a0000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.profiles WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM auth.users WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;

-- Create the trigger for handling new user signups (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();