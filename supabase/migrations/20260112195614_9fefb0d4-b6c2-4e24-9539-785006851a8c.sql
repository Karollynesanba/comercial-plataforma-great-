-- Add new values to operational_role enum
ALTER TYPE public.operational_role ADD VALUE IF NOT EXISTS 'EQUIPE_DESIGN';
ALTER TYPE public.operational_role ADD VALUE IF NOT EXISTS 'EQUIPE_TECH';