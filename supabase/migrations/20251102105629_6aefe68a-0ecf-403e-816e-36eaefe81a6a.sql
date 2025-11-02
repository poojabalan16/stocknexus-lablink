-- Add approved column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
