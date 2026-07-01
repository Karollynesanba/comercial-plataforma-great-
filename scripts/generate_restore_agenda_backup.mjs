import fs from 'node:fs';
import path from 'node:path';

const backupDir = path.resolve('C:/great-comercial/backup-local/agenda-backup-local-20260630_202727');
const outFile = path.resolve('C:/great-comercial/comercial-plataforma-great-/supabase/restore_agenda_backup.sql');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(backupDir, name), 'utf8'));
}

function sqlText(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function columnList(columns) {
  return columns.map((column) => column.name).join(', ');
}

function recordsetAlias(columns) {
  return columns.map((column) => `  ${column.name} ${column.type}`).join(',\n');
}

function buildInsert(table, columns, rows, options = {}) {
  const { conflictTarget = null, conflictWhere = null } = options;
  const json = sqlJson(rows);
  const dedupeAgendaRows = table === 'agenda_events'
    ? `, ranked_rows as (
  select *,
         row_number() over (
           partition by regexp_replace(coalesce(client_phone, ''), '\\\\D', '', 'g'), event_date, event_time
           order by updated_at desc nulls last, created_at desc nulls last, id desc
         ) as rn
  from source_rows
)`
    : '';
  const sourceSelect = table === 'agenda_events'
    ? `select ${columnList(columns)}
from ranked_rows
where rn = 1`
    : `select ${columnList(columns)}
from source_rows`;
  const onConflict = conflictTarget
    ? `on conflict (${conflictTarget})${conflictWhere ? ` where ${conflictWhere}` : ''} do update set\n${columns
        .filter((column) => column.name !== conflictTarget)
        .map((column) => `  ${column.name} = excluded.${column.name}`)
        .join(',\n')}`
    : '';

  return `with source_rows as (\n  select *\n  from jsonb_to_recordset(${json}) as input(\n${recordsetAlias(columns)}\n  )\n)${dedupeAgendaRows}\ninsert into public.${table} (${columnList(columns)})\n${sourceSelect}\n${onConflict ? `${onConflict};` : ';'}\n`;
}

const pipelineClients = readJson('pipeline_clients.json');
const agendaEvents = readJson('agenda_events.json');
const agendamentoLeads = readJson('agendamento_leads.json');
const commercialSettings = readJson('commercial_settings.json');

const pipelineColumns = [
  { name: 'id', type: 'uuid' },
  { name: 'ativo', type: 'boolean' },
  { name: 'client_name', type: 'text' },
  { name: 'clinic_name', type: 'text' },
  { name: 'telefone', type: 'text' },
  { name: 'vendedor', type: 'text' },
  { name: 'criativo', type: 'text' },
  { name: 'equipe', type: 'text' },
  { name: 'faturamento', type: 'text' },
  { name: 'pacote', type: 'text' },
  { name: 'periodo', type: 'text' },
  { name: 'indicacao', type: 'text' },
  { name: 'entrada', type: 'numeric' },
  { name: 'data_entrada', type: 'timestamptz' },
  { name: 'stage', type: 'text' },
  { name: 'last_stage_change', type: 'timestamptz' },
  { name: 'lost_reason', type: 'text' },
  { name: 'no_show_reason', type: 'text' },
  { name: 'notes', type: 'text' },
  { name: 'agendado_por', type: 'text' },
  { name: 'pagador_anuncio', type: 'text' },
  { name: 'tem_socio', type: 'text' },
  { name: 'tem_mkt', type: 'text' },
  { name: 'meeting_date', type: 'date' },
  { name: 'meeting_time', type: 'text' },
  { name: 'created_by_user_id', type: 'uuid' },
  { name: 'created_at', type: 'timestamptz' },
  { name: 'updated_at', type: 'timestamptz' },
  { name: 'faturamento_personalizado', type: 'text' },
  { name: 'tem_secretaria', type: 'text' },
  { name: 'salao_ou_clinica', type: 'text' },
  { name: 'followup_done', type: 'boolean' },
  { name: 'pode_investir', type: 'text' },
  { name: 'agendado_via', type: 'text' },
  { name: 'is_mrr', type: 'boolean' },
  { name: 'mrr_entrada', type: 'numeric' },
  { name: 'mrr_remaining', type: 'numeric' },
  { name: 'funil', type: 'text' },
];

const agendaColumns = [
  { name: 'id', type: 'uuid' },
  { name: 'title', type: 'text' },
  { name: 'description', type: 'text' },
  { name: 'client_name', type: 'text' },
  { name: 'client_phone', type: 'text' },
  { name: 'event_date', type: 'date' },
  { name: 'event_time', type: 'time' },
  { name: 'duration_minutes', type: 'integer' },
  { name: 'meeting_link', type: 'text' },
  { name: 'color', type: 'text' },
  { name: 'reminder_2h_sent', type: 'boolean' },
  { name: 'reminder_30min_sent', type: 'boolean' },
  { name: 'created_by_user_id', type: 'uuid' },
  { name: 'created_at', type: 'timestamptz' },
  { name: 'updated_at', type: 'timestamptz' },
  { name: 'assigned_closer_id', type: 'uuid' },
  { name: 'notes', type: 'text' },
  { name: 'team_id', type: 'uuid' },
  { name: 'pipeline_client_id', type: 'uuid' },
  { name: 'meeting_owner_name', type: 'text' },
  { name: 'clinic_name', type: 'text' },
  { name: 'scheduled_by', type: 'text' },
  { name: 'lead_stage', type: 'text' },
  { name: 'creative_source', type: 'text' },
  { name: 'title_locked', type: 'boolean' },
];

const leadColumns = [
  { name: 'id', type: 'uuid' },
  { name: 'data', type: 'text' },
  { name: 'nome', type: 'text' },
  { name: 'telefone', type: 'text' },
  { name: 'horario', type: 'text' },
  { name: 'tem_socio', type: 'text' },
  { name: 'tem_mkt', type: 'text' },
  { name: 'faturamento', type: 'text' },
  { name: 'funil', type: 'text' },
  { name: 'status', type: 'text' },
  { name: 'created_by_user_id', type: 'uuid' },
  { name: 'created_at', type: 'timestamptz' },
  { name: 'updated_at', type: 'timestamptz' },
  { name: 'tem_secretaria', type: 'text' },
  { name: 'salao_ou_clinica', type: 'text' },
  { name: 'pode_investir', type: 'text' },
  { name: 'agendado_via', type: 'text' },
  { name: 'pipeline_client_id', type: 'uuid' },
  { name: 'horario_especifico', type: 'text' },
];

const settingsColumns = [
  { name: 'id', type: 'uuid' },
  { name: 'setting_key', type: 'text' },
  { name: 'setting_value', type: 'text' },
  { name: 'updated_at', type: 'timestamptz' },
  { name: 'updated_by_user_id', type: 'uuid' },
];

const sql = `begin;

truncate table
  public.agenda_events,
  public.agendamento_leads,
  public.pipeline_clients,
  public.commercial_settings
restart identity cascade;

${buildInsert('pipeline_clients', pipelineColumns, pipelineClients, { conflictTarget: 'id' })}

${buildInsert('agenda_events', agendaColumns, agendaEvents, { conflictTarget: 'pipeline_client_id', conflictWhere: 'pipeline_client_id is not null' })}

${buildInsert('agendamento_leads', leadColumns, agendamentoLeads, { conflictTarget: 'pipeline_client_id', conflictWhere: 'pipeline_client_id is not null' })}

${buildInsert('commercial_settings', settingsColumns, commercialSettings, { conflictTarget: 'setting_key' })}

commit;
`;

fs.writeFileSync(outFile, sql, 'utf8');
console.log(outFile);
