-- Add sale_value column to crm_events for operational sales
ALTER TABLE public.crm_events 
ADD COLUMN sale_value numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.crm_events.sale_value IS 'Valor da venda para eventos do tipo VENDA_OPERACIONAL';