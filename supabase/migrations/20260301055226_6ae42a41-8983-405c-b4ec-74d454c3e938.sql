
-- 1. Add new departments to the enum
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'ECE';
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'EEE';
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'CIVIL';
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'CSBS';
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'MBA';
