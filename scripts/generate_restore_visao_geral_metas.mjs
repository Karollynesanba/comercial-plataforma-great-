import fs from 'fs';
import path from 'path';

const base = path.resolve('backup-local/supabase-data-backup-local-20260630_201655');
const outPath = path.resolve('comercial-plataforma-great-/supabase/restore_visao_geral_metas.sql');

const tables = [
  {
    name: 'pipeline_clients',
    conflict: '(id)',
    jsonFile: 'pipeline_clients.json',
    columns: null,
  },
  {
    name: 'commercial_goals',
    conflict: '(month)',
    jsonFile: 'commercial_goals.json',
    columns: ['id', 'month', 'goal_value', 'created_by_user_id', 'created_at', 'updated_at'],
  },
  {
    name: 'sdr_goals',
    conflict: '(agendador, month)',
    jsonFile: 'sdr_goals.json',
    columns: ['id', 'agendador', 'month', 'goal_count', 'created_by_user_id', 'created_at', 'updated_at'],
  },
  {
    name: 'commercial_settings',
    conflict: '(setting_key)',
    jsonFile: 'commercial_settings.json',
    columns: ['id', 'setting_key', 'setting_value', 'updated_at', 'updated_by_user_id'],
  },
  {
    name: 'criativos',
    conflict: '(name)',
    jsonFile: 'criativos.json',
    columns: ['id', 'name', 'is_active', 'created_at', 'created_by_user_id', 'updated_at'],
  },
];

function dollarTag(text) {
  let tag = '$json$';
  let i = 1;
  while (text.includes(tag)) {
    tag = `$json${i++}$`;
  }
  return tag;
}

function buildUpdateList(columns) {
  return columns
    .filter((col) => col !== 'id')
    .map((col) => `${col} = EXCLUDED.${col}`)
    .join(',\n    ');
}

const chunks = [];
chunks.push('-- Restore backup only for Visao Geral / Metas Comerciais');
chunks.push('-- Safe UPSERTs: pipeline, goals, settings, criativos');
chunks.push('BEGIN;');
chunks.push('');

for (const table of tables) {
  const jsonText = fs.readFileSync(path.join(base, table.jsonFile), 'utf8').trim();
  const rows = JSON.parse(jsonText);
  if (!Array.isArray(rows) || rows.length === 0) continue;

  const columns = table.columns || Object.keys(rows[0]);
  const tag = dollarTag(jsonText);
  const colsList = columns.join(', ');

  chunks.push(`-- ${table.name}`);
  chunks.push('WITH source_rows AS (');
  chunks.push(`  SELECT * FROM jsonb_populate_recordset(NULL::public.${table.name}, ${tag}${jsonText}${tag}::jsonb)`);
  chunks.push(')');
  chunks.push(`INSERT INTO public.${table.name} (${colsList})`);
  chunks.push(`SELECT ${colsList}`);
  chunks.push('FROM source_rows');
  chunks.push(`ON CONFLICT ${table.conflict} DO UPDATE SET`);
  chunks.push(`    ${buildUpdateList(columns)};`);
  chunks.push('');
}

chunks.push('COMMIT;');
chunks.push('');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, chunks.join('\n'), 'utf8');
console.log(`Wrote ${outPath}`);
