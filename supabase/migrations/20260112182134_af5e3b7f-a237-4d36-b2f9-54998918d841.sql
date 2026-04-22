-- Remove the plan check constraint to allow any plan value from the commercial pipeline
ALTER TABLE public.operational_clients DROP CONSTRAINT IF EXISTS operational_clients_plan_check;