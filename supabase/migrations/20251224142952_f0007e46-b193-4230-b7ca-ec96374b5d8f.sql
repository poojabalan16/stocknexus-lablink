-- Add new department values to the enum
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'Chemical';
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'Mechanical';