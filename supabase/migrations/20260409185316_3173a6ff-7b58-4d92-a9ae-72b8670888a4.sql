ALTER TABLE public.operational_clients DROP CONSTRAINT operational_clients_status_operacional_check;

ALTER TABLE public.operational_clients ADD CONSTRAINT operational_clients_status_operacional_check 
CHECK (status_operacional = ANY (ARRAY['NOVO_CLIENTE'::text, 'ONBOARDING'::text, 'ATIVO'::text, 'PAUSADO'::text, 'ENCERRADO'::text, 'EM_ATIVACAO'::text]));
