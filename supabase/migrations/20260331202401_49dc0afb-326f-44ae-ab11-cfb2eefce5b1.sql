
-- Delete all dependent records first
DELETE FROM client_activity_tracking WHERE client_id IN (SELECT id FROM operational_clients);
DELETE FROM client_files WHERE client_id IN (SELECT id FROM operational_clients);
DELETE FROM ad_creatives WHERE client_id IN (SELECT id FROM operational_clients);
DELETE FROM crm_events WHERE client_id IN (SELECT id FROM operational_clients);
DELETE FROM projects WHERE client_id IN (SELECT id FROM operational_clients);
UPDATE exec_cards SET client_id = NULL WHERE client_id IN (SELECT id FROM operational_clients);

-- Delete all operational clients
DELETE FROM operational_clients;
