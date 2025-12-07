-- Allow admins to delete rejected registration requests
CREATE POLICY "Admins can delete rejected registration requests"
ON public.registration_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND status = 'rejected');