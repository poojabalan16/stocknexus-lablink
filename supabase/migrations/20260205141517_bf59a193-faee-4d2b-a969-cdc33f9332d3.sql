-- Add course_id and course_name columns to grievances table
ALTER TABLE public.grievances 
ADD COLUMN course_id text,
ADD COLUMN course_name text;