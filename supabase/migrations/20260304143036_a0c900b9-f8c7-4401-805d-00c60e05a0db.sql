
-- Normalize "ENTRAR EM CONTATO" to "NOVO_LEAD" (invalid status not in pipeline)
UPDATE agendamento_leads SET status = 'NOVO_LEAD' WHERE status = 'ENTRAR EM CONTATO';

-- Sync mismatched statuses: xxxx and Sem nome -> PERDIDO (match pipeline)
UPDATE agendamento_leads SET status = 'PERDIDO' 
WHERE telefone = '556699998400' AND status = 'NOVO_LEAD';

-- ALEXANDRA has 2 pipeline records (PERDIDO + NO_SHOW), keep agendamento as PERDIDO (already correct for latest)
-- FERNANDO has 2 pipeline records (NO_SHOW + PERDIDO), keep as NO_SHOW for the NO_SHOW entry
-- Ramos shares same phone as FERNANDO, keep as NO_SHOW
-- These are duplicate-phone edge cases, no further action needed
