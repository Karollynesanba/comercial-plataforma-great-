import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { getCommercialSetting, savePipelineClientToCloud, setCommercialSetting } from '@/lib/commercialCloudStore';
import { readCommercialLocalData, syncAllCommercialAutomations, updateCommercialLocalData } from '@/lib/commercialLocalStore';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { normalizeImportedMoneyValue } from '@/lib/utils';
import { coerceCommercialAnswer } from '@/lib/commercialAnswer';
import { syncPipelineAutomationsToCloud } from '@/lib/commercialCloudStore';

const PIPELINE_IMPORT_VERSION = 'pipeline-clientes-completo-2026-05-06-v8';
const PIPELINE_IMPORT_MARKER_KEY = 'great_pipeline_csv_import_version';
const PIPELINE_IMPORT_PATH = '/imports/pipeline_clientes_completo.csv';
const MAY_BACKUP_IMPORT_VERSION = 'may-2026-backup-v5';
const MAY_BACKUP_IMPORT_MARKER_KEY = 'great_may_backup_import_version';
const MAY_BACKUP_IMPORT_PATH = '/imports/may_2026_backup.csv';

const TEAM_FALLBACK = 'team-equipe-7';

const STAGE_BY_LABEL: Record<string, string> = {
  'novo lead': 'NOVO',
  'no show': 'NO_SHOW',
  'taxa de interesse': 'TAXA_INTERESSE',
  'negociacao': 'NEGOCIACAO',
  'negociação': 'NEGOCIACAO',
  'perdido': 'PERDIDO',
  'fechado': 'FECHADO',
};

const FATURAMENTO_BY_VALUE: Record<string, string> = {
  '0_A_10K': '0_A_10K',
  '0_A_15K': '0_A_10K',
  '0_10K': '0_A_10K',
  'FATURA_12K': '0_A_10K',
  'PODE_INVESTIR': '0_A_10K',
  '10K_A_20K': '10K_A_20K',
  '15K_A_30K': '10K_A_20K',
  '15K_MAIS': '10K_A_20K',
  '20K_A_30K': '20K_A_30K',
  '30K_A_50K': '30K_A_50K',
  '50K_A_80K': '50K_A_80K',
  '50K_A_100K': '50K_A_80K',
  '80K_A_100K': '80K_A_100K',
  '100K_A_150K': '100K_A_150K',
  '100K_PLUS': '100K_A_150K',
  '150K_A_250K': '150K_A_250K',
  '250K_A_400K': '250K_A_400K',
  '400K_A_600K': '400K_A_600K',
  '600K_A_1M': '600K_A_1M',
  '1M_PLUS': '1M_PLUS',
  'NAO_INFORMADO': 'NAO_INFORMADO',
  'PERSONALIZADO': 'PERSONALIZADO',
};

const VENDEDOR_BY_VALUE: Record<string, string | undefined> = {
  HERBERT: 'HERBERT',
  CLED: 'CLED',
  PEDRO_H: 'PEDRO_H',
  PEDRO_JUAN: 'PEDRO_JUAN',
  CAETANO: 'CAETANO',
  BRENDA: undefined,
  HANNAH: undefined,
};

const AGENDADOR_BY_VALUE: Record<string, string | undefined> = {
  PEDRO: 'PEDRO',
  PEDRO_H: 'PEDRO_H',
  PEDRO_JUAN: 'PEDRO_JUAN',
  HEBERT: 'HEBERT',
  HERBERT: 'HEBERT',
  CLED: 'CLED',
  CAETANO: 'CAETANO',
};

const TEAM_BY_VALUE: Record<string, string> = {
  LIRA: 'team-tropa-de-elite',
  KAUAN: 'team-equipe-7',
  '38c9028d-856d-481e-95c9-bb2eb8b459f5': 'team-tropa-de-elite',
  '0469e3aa-5b34-42e2-b89d-f412efaa27ba': 'team-equipe-7',
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ';' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);

  const [headers = [], ...dataRows] = rows;
  return dataRows.map((values) => {
    const entries: [string, string][] = [];

    headers.forEach((header, index) => {
      const cleanHeader = header.replace(/^\uFEFF/, '').trim();
      const value = values[index]?.trim() || '';
      entries.push([cleanHeader, value], [normalizeHeader(cleanHeader), value]);
    });

    return Object.fromEntries(entries);
  });
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function readRow(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key] || row[normalizeHeader(key)];
    if (value) return value;
  }

  return '';
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function normalizeMoney(value: string) {
  return normalizeImportedMoneyValue(value);
}

function normalizeTeam(value: string) {
  return TEAM_BY_VALUE[value] || value || TEAM_FALLBACK;
}

function normalizeStage(value: string) {
  return STAGE_BY_LABEL[value.trim().toLowerCase()] || 'NOVO';
}

function normalizeFaturamento(value: string) {
  return FATURAMENTO_BY_VALUE[value] || 'NAO_INFORMADO';
}

function normalizeBoolean(value: string) {
  return coerceCommercialAnswer(value) || 'NAO_SEI';
}

function normalizeDate(value: string, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
}

function normalizeMeetingDate(value: string, fallback: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return normalizeDate(value, fallback).slice(0, 10);
}

function normalizeTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '10:00';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function csvRowToPipelineClient(row: Record<string, string>, index: number) {
  const createdAt = normalizeDate(row['Criado Em'] || row['Data Entrada']);
  const dataEntrada = normalizeDate(row['Data Entrada'], createdAt);
  const stage = normalizeStage(row['Etapa']);

  return {
    id: `pipeline-import-${PIPELINE_IMPORT_VERSION}-${index}`,
    ativo: stage !== 'PERDIDO',
    clientName: row['Nome'] || row['Clínica'] || `Cliente ${index + 1}`,
    clinicName: row['Clínica'] || row['Nome'] || `Cliente ${index + 1}`,
    telefone: normalizePhone(row['Telefone']),
    vendedor: VENDEDOR_BY_VALUE[row['Vendedor']] || undefined,
    criativo: row['Criativo'] || 'NAO IDENTIFICADO',
    equipe: normalizeTeam(row['Equipe']),
    faturamento: normalizeFaturamento(row['Faturamento']),
    pacote: row['Pacote'] || 'COMPLETO',
    periodo: row['Período'] || 'MENSAL',
    indicacao: row['Indicação'] || 'NAO',
    entrada: normalizeMoney(row['Entrada (R$)']),
    dataEntrada,
    stage,
    lastStageChange: normalizeDate(row['Última Mudança Etapa'], dataEntrada),
    lostReason: row['Motivo Perda'] || undefined,
    noShowReason: row['Motivo No Show'] || undefined,
    notes: row['Observações'] || undefined,
    agendadoPor: AGENDADOR_BY_VALUE[row['Agendado Por']] || undefined,
    pagadorAnuncio: row['Pagador Anúncio'] || undefined,
    temSocio: normalizeBoolean(row['Tem Sócio']),
    temMkt: normalizeBoolean(row['Tem MKT']),
    temSecretaria: normalizeBoolean(row['Tem Secretária']),
    salaoOuClinica: 'NAO_INFORMADO',
    createdByUserId: 'csv-import',
    meetingDate: normalizeMeetingDate(row['Data Reunião'], dataEntrada),
    meetingTime: normalizeTime(row['Hora Reunião']),
    createdAt,
  };
}

function csvRowToPipelineClientV2(row: Record<string, string>, index: number) {
  const createdAt = normalizeDate(readRow(row, 'Criado Em') || readRow(row, 'Data Entrada'));
  const dataEntrada = normalizeDate(readRow(row, 'Data Entrada'), createdAt);
  const stage = normalizeStage(readRow(row, 'Etapa'));
  const clientName = readRow(row, 'Nome') || readRow(row, 'Clinica', 'Clínica') || `Cliente ${index + 1}`;
  const clinicName = readRow(row, 'Clinica', 'Clínica') || readRow(row, 'Nome') || `Cliente ${index + 1}`;

  return {
    id: `pipeline-import-${PIPELINE_IMPORT_VERSION}-${index}`,
    ativo: stage !== 'PERDIDO',
    clientName,
    clinicName,
    telefone: normalizePhone(readRow(row, 'Telefone')),
    vendedor: VENDEDOR_BY_VALUE[readRow(row, 'Vendedor')] || undefined,
    criativo: readRow(row, 'Criativo') || 'NAO IDENTIFICADO',
    equipe: normalizeTeam(readRow(row, 'Equipe')),
    faturamento: normalizeFaturamento(readRow(row, 'Faturamento')),
    pacote: readRow(row, 'Pacote') || 'COMPLETO',
    periodo: readRow(row, 'Periodo', 'Período') || 'MENSAL',
    indicacao: readRow(row, 'Indicacao', 'Indicação') || 'NAO',
    entrada: normalizeMoney(readRow(row, 'Entrada (R$)')),
    dataEntrada,
    stage,
    lastStageChange: normalizeDate(readRow(row, 'Ultima Mudanca Etapa', 'Última Mudança Etapa'), dataEntrada),
    lostReason: readRow(row, 'Motivo Perda') || undefined,
    noShowReason: readRow(row, 'Motivo No Show') || undefined,
    notes: readRow(row, 'Observacoes', 'Observações') || undefined,
    agendadoPor: AGENDADOR_BY_VALUE[readRow(row, 'Agendado Por')] || undefined,
    pagadorAnuncio: readRow(row, 'Pagador Anuncio', 'Pagador Anúncio') || undefined,
    temSocio: normalizeBoolean(readRow(row, 'Tem Socio', 'Tem Sócio')),
    temMkt: normalizeBoolean(readRow(row, 'Tem MKT')),
    temSecretaria: normalizeBoolean(readRow(row, 'Tem Secretaria', 'Tem Secretária')),
    salaoOuClinica: 'NAO_INFORMADO',
    createdByUserId: 'csv-import',
    meetingDate: normalizeMeetingDate(readRow(row, 'Data Reuniao', 'Data Reunião'), dataEntrada),
    meetingTime: normalizeTime(readRow(row, 'Hora Reuniao', 'Hora Reunião')),
    createdAt,
  };
}

function isSameClient(left: any, right: any) {
  const leftPhone = normalizePhone(left.telefone || '');
  const rightPhone = normalizePhone(right.telefone || '');
  if (leftPhone && rightPhone && leftPhone === rightPhone) return true;

  const leftName = String(left.clientName || '').trim().toLowerCase();
  const rightName = String(right.clientName || '').trim().toLowerCase();
  return Boolean(leftName && rightName && leftName === rightName);
}

async function importPipelineCsvFromPathIfNeeded(params: {
  path: string;
  version: string;
  markerKey: string;
}) {
  const { path, version, markerKey } = params;

  if (safeGetItem(markerKey) === version) {
    return { imported: false, count: 0 };
  }

  try {
    if (await getCommercialSetting(markerKey) === version) {
      safeSetItem(markerKey, version);
      return { imported: false, count: 0 };
    }
  } catch (error) {
    console.warn('Could not read pipeline import marker from cloud, continuing with local recovery.', error);
  }

  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Nao foi possivel carregar ${path}`);
  }

  const csvText = await response.text();
  const importedClients = parseCsv(csvText).map(csvRowToPipelineClientV2);
  let existingClients: Array<{ client_name?: string; telefone?: string }> = [];

  try {
    const { data } = await supabase.from('pipeline_clients').select('client_name, telefone').limit(5000);
    existingClients = data || [];
  } catch (error) {
    console.warn('Could not read pipeline clients from cloud, continuing with local recovery.', error);
  }

  const newClients = importedClients.filter((imported) =>
    !existingClients.some((client) => isSameClient({ clientName: client.client_name, telefone: client.telefone }, imported))
  );

  for (const client of newClients) {
    try {
      await savePipelineClientToCloud(client as any, null);
    } catch (error) {
      console.warn(`Cloud save failed for imported client ${client.clientName}, keeping local copy.`, error);
    }
  }

  const criativos = Array.from(new Set(importedClients.map((client) => client.criativo).filter(Boolean))).sort();
  updateCommercialLocalData((current) => {
    const nextClients = [...current.pipelineClients];

    for (const client of importedClients) {
      const existingIndex = nextClients.findIndex((item) =>
        isSameClient(
          { clientName: item.clientName, telefone: item.telefone },
          client
        )
      );

      if (existingIndex >= 0) {
        nextClients[existingIndex] = {
          ...nextClients[existingIndex],
          ...client,
        };
      } else {
        nextClients.unshift({
          ...client,
          notes: client.notes || undefined,
        });
      }
    }

    const nextCriativos = Array.from(new Set([...(current.criativos || []), ...criativos])).sort();
    return syncAllCommercialAutomations({
      ...current,
      pipelineClients: nextClients,
      criativos: nextCriativos,
    });
  });

  if (criativos.length > 0) {
    try {
      await supabase.from('criativos').upsert(
        criativos.map((name) => ({ name, is_active: true })),
        { onConflict: 'name' }
      );
    } catch (error) {
      console.warn('Could not upsert criativos in cloud, local recovery is preserved.', error);
    }
  }

  for (const client of importedClients) {
    try {
      await syncPipelineAutomationsToCloud(client as any, null);
    } catch (error) {
      console.warn(`Cloud automation sync failed for imported client ${client.clientName}, keeping the pipeline import.`, error);
    }
  }

  safeSetItem(markerKey, version);

  return { imported: true, count: newClients.length };
}

export async function importBundledPipelineCsvIfNeeded() {
  const result = await importPipelineCsvFromPathIfNeeded({
    path: PIPELINE_IMPORT_PATH,
    version: PIPELINE_IMPORT_VERSION,
    markerKey: PIPELINE_IMPORT_MARKER_KEY,
  });

  if (result.imported && isSupabaseConfigured) {
    try {
      await setCommercialSetting('last_team_pointer', TEAM_FALLBACK, null);
    } catch (error) {
      console.warn('Could not persist last team pointer in cloud, continuing with local recovery.', error);
    }

    try {
      await setCommercialSetting(PIPELINE_IMPORT_MARKER_KEY, PIPELINE_IMPORT_VERSION, null);
    } catch (error) {
      console.warn('Could not persist pipeline import marker in cloud, continuing with local recovery.', error);
    }
  }

  return result;
}

export async function importMayBackupCsvIfNeeded() {
  const result = await importPipelineCsvFromPathIfNeeded({
    path: MAY_BACKUP_IMPORT_PATH,
    version: MAY_BACKUP_IMPORT_VERSION,
    markerKey: MAY_BACKUP_IMPORT_MARKER_KEY,
  });

  if (result.imported && isSupabaseConfigured) {
    try {
      await setCommercialSetting(MAY_BACKUP_IMPORT_MARKER_KEY, MAY_BACKUP_IMPORT_VERSION, null);
    } catch (error) {
      console.warn('Could not persist May backup import marker in cloud, continuing with local recovery.', error);
    }
  }

  return result;
}
