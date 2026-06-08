import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx), line.slice(idx + 1)];
    })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

const leads = [
  {
    name: 'VITOR',
    clinic: 'VITOR',
    phone: '+55 48 8875-9071',
    creative: 'FORMS/CAIXINHA EVENTO 04',
    faturamento: '0_A_15K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: 'NAO',
    entrada: 0,
    stage: 'NOVO',
    vendor: 'HERBERT',
    socio: 'NAO',
    mkt: 'NAO',
    secretaria: 'NAO',
    date: '2026-05-06',
    time: '19:30',
  },
  {
    name: 'BRUNO ABRANTES',
    clinic: 'BRUNO ABRANTES',
    phone: '+55 21 98883-7477',
    creative: 'FORMS/ADVENTO 03',
    faturamento: '0_A_15K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: 'NAO',
    entrada: 0,
    stage: 'NOVO',
    vendor: 'HERBERT',
    socio: 'NAO',
    mkt: 'NAO',
    secretaria: 'NAO',
    date: '2026-05-11',
    time: '16:00',
  },
  {
    name: 'REUNI\u00c3O - JOANA',
    clinic: 'REUNI\u00c3O - JOANA',
    phone: '+55 86 9953-3896',
    creative: 'BOTOX',
    faturamento: '0_A_15K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: 'NAO',
    entrada: 0,
    stage: 'NO_SHOW',
    vendor: 'HERBERT',
    socio: 'NAO',
    mkt: 'NAO',
    secretaria: 'NAO',
    date: '2026-05-06',
    time: '14:00',
  },
  {
    name: 'LARISSA',
    clinic: 'LARISSA',
    phone: '+55 81 9613-5830',
    creative: 'NAO IDENTIFICADO',
    faturamento: '0_A_15K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: 'NAO',
    entrada: 0,
    stage: 'NO_SHOW',
    vendor: 'HERBERT',
    socio: 'NAO',
    mkt: 'NAO',
    secretaria: 'NAO',
    date: '2026-05-04',
    time: '17:00',
  },
  {
    name: 'ELIANE',
    clinic: 'ELIANE',
    phone: null,
    creative: 'FORMS/CAIXINHA',
    faturamento: '0_A_15K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: 'NAO',
    entrada: 200,
    stage: 'TAXA_INTERESSE',
    vendor: 'HERBERT',
    socio: 'NAO',
    mkt: 'NAO',
    secretaria: 'NAO',
    date: '2026-04-08',
    time: '17:00',
  },
  {
    name: 'FABIO',
    clinic: 'FABIO',
    phone: null,
    creative: 'CAIXA DE PERGUNTAS',
    faturamento: '0_A_15K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: 'NAO',
    entrada: 200,
    stage: 'TAXA_INTERESSE',
    vendor: 'HERBERT',
    socio: 'NAO',
    mkt: 'NAO',
    secretaria: 'NAO',
    date: '2026-04-29',
    time: '10:00',
  },
  {
    name: 'LV HARMONIZA\u00c7\u00c3O',
    clinic: 'LV HARMONIZA\u00c7\u00c3O',
    phone: '+55 98 8489-6389',
    creative: 'NAO IDENTIFICADO',
    faturamento: '0_A_15K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: 'NAO',
    entrada: 6000,
    stage: 'NEGOCIACAO',
    vendor: 'CLED',
    socio: 'NAO',
    mkt: 'NAO',
    secretaria: 'NAO',
    date: '2026-05-04',
    time: '18:00',
  },
  {
    name: 'DIEGO RIBEIRO FARIA',
    clinic: 'DIEGO RIBEIRO FARIA',
    phone: '+55 35 9765-0498',
    creative: 'FORMS/CAIXINHA OFICIAL 01',
    faturamento: '0_A_15K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: 'NAO',
    entrada: 6000,
    stage: 'NEGOCIACAO',
    vendor: 'PEDRO_H',
    socio: 'NAO',
    mkt: 'NAO',
    secretaria: 'NAO',
    date: '2026-05-04',
    time: '17:30',
  },
  {
    name: 'Reuni\u00e3o - PATRICIA PEDRO H',
    clinic: 'Reuni\u00e3o - PATRICIA PEDRO H',
    phone: '+55 61 9914-0545',
    creative: 'BOTOX',
    faturamento: '0_A_15K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: 'NAO',
    entrada: 2000,
    stage: 'NOVO',
    vendor: 'PEDRO_H',
    socio: 'NAO',
    mkt: 'NAO',
    secretaria: 'NAO',
    date: '2026-05-03',
    time: '14:00',
  },
];

const normalizePhone = (value) => (value ? String(value).replace(/\D/g, '') : null);
const normalizeName = (value) => String(value || '').trim().toLowerCase();
const meetingTs = (date, time) => `${date}T${time}:00-03:00`;

const payloadForLead = (lead) => ({
  client_name: lead.name,
  clinic_name: lead.clinic,
  telefone: normalizePhone(lead.phone),
  vendedor: lead.vendor,
  criativo: lead.creative,
  funil: lead.creative,
  equipe: null,
  faturamento: lead.faturamento,
  pacote: lead.pacote,
  periodo: lead.periodo,
  indicacao: lead.indicacao,
  entrada: lead.entrada,
  stage: lead.stage,
  last_stage_change: meetingTs(lead.date, lead.time),
  lost_reason: null,
  no_show_reason: null,
  notes: null,
  agendado_por: lead.vendor,
  agendado_via: null,
  pagador_anuncio: null,
  tem_socio: lead.socio,
  tem_mkt: lead.mkt,
  tem_secretaria: lead.secretaria,
  salao_ou_clinica: null,
  meeting_date: lead.date,
  meeting_time: lead.time,
  created_by_user_id: null,
  followup_done: false,
  ativo: true,
  data_entrada: lead.date,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const { data: existing, error: readError } = await supabase
  .from('pipeline_clients')
  .select('id, client_name, telefone');

if (readError) throw readError;

const existingByKey = new Map(
  (existing || []).map((row) => [
    `${normalizeName(row.client_name)}|${normalizePhone(row.telefone)}`,
    row,
  ])
);

let inserted = 0;
let updated = 0;

for (const lead of leads) {
  const payload = payloadForLead(lead);
  const key = `${normalizeName(lead.name)}|${normalizePhone(lead.phone)}`;
  const match = existingByKey.get(key);

  if (match) {
    const { error } = await supabase.from('pipeline_clients').update(payload).eq('id', match.id);
    if (error) throw error;
    updated += 1;
  } else {
    const { error } = await supabase.from('pipeline_clients').insert({ id: randomUUID(), ...payload });
    if (error) throw error;
    inserted += 1;
  }
}

const { data: after, error: afterError } = await supabase
  .from('pipeline_clients')
  .select('client_name, telefone, stage, vendedor')
  .order('created_at', { ascending: true });

if (afterError) throw afterError;

console.log(JSON.stringify({ inserted, updated, total: after.length, after }, null, 2));
