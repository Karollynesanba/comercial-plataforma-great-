-- Prevent agenda edits from creating or duplicating CRM leads.
-- Agenda-to-pipeline sync stays available on INSERT only, so manual edits
-- in agendamento update the scheduling card without rewriting the CRM.

DROP TRIGGER IF EXISTS trg_sync_agendamento_lead_to_pipeline ON public.agendamento_leads;

CREATE TRIGGER trg_sync_agendamento_lead_to_pipeline
AFTER INSERT
ON public.agendamento_leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_agendamento_lead_to_pipeline();
