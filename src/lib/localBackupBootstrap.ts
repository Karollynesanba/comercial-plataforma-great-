import { writeCommercialLocalData, DEFAULT_COMMERCIAL_LOCAL_DATA, type CommercialLocalData } from '@/lib/commercialLocalStore';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

const LOCAL_BACKUP_BASE = '/local-backup/supabase-data-backup-local-20260630_201655';
const LOCAL_BACKUP_SEED_VERSION = 'agenda-backup-local-20260630_225500';
const LOCAL_BACKUP_MARKER_KEY = 'great_local_backup_seed_version';

type BackupRow = Record<string, any>;

function isBrowser() {
  return typeof window !== 'undefined';
}

function isLocalhost() {
  if (!isBrowser()) return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function onlyDigits(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function mapPipelineClient(row: BackupRow) {
  return {
    id: row.id,
    ativo: row.ativo ?? true,
    clientName: row.client_name || '',
    clinicName: row.clinic_name || row.client_name || '',
    telefone: row.telefone || '',
    vendedor: row.vendedor || undefined,
    criativo: row.criativo || '',
    equipe: row.equipe || '',
    faturamento: row.faturamento || 'NAO_INFORMADO',
    faturamentoPersonalizado: row.faturamento_personalizado || undefined,
    pacote: row.pacote || 'COMPLETO',
    periodo: row.periodo || 'MENSAL',
    indicacao: row.indicacao || '',
    entrada: Number(row.entrada || 0),
    isMrr: row.is_mrr ?? false,
    mrrEntrada: Number(row.mrr_entrada || 0),
    mrrRemaining: Number(row.mrr_remaining || 0),
    dataEntrada: row.data_entrada || row.created_at || undefined,
    stage: row.stage || 'NOVO',
    lastStageChange: row.last_stage_change || undefined,
    lostReason: row.lost_reason || undefined,
    noShowReason: row.no_show_reason || undefined,
    notes: row.notes || undefined,
    agendadoPor: row.agendado_por || undefined,
    agendadoVia: row.agendado_via || undefined,
    pagadorAnuncio: row.pagador_anuncio || undefined,
    temSocio: row.tem_socio || undefined,
    temMkt: row.tem_mkt || undefined,
    temSecretaria: row.tem_secretaria || undefined,
    salaoOuClinica: row.salao_ou_clinica || undefined,
    funil: row.funil || undefined,
    createdByUserId: row.created_by_user_id || null,
    meetingDate: row.meeting_date || undefined,
    meetingTime: row.meeting_time || undefined,
    followupDone: row.followup_done ?? false,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapAgendaEvent(row: BackupRow) {
  return {
    ...row,
    title: row.title || '',
    description: row.description || null,
    client_name: row.client_name || '',
    client_phone: row.client_phone || '',
    clinic_name: row.clinic_name || row.client_name || null,
    scheduled_by: row.scheduled_by || null,
    lead_stage: row.lead_stage || null,
    creative_source: row.creative_source || null,
    event_time: typeof row.event_time === 'string' && row.event_time.length === 5 ? `${row.event_time}:00` : row.event_time,
    reminder_2h_sent: row.reminder_2h_sent ?? false,
    reminder_30min_sent: row.reminder_30min_sent ?? false,
    title_locked: row.title_locked ?? false,
  };
}

function mapAgendamentoLead(row: BackupRow) {
  return {
    ...row,
    data: row.data || '',
    nome: row.nome || '',
    telefone: row.telefone || '',
    horario: row.horario || 'NAO_INFORMADO',
    tem_socio: row.tem_socio || 'NAO',
    tem_mkt: row.tem_mkt || 'NAO',
    tem_secretaria: row.tem_secretaria || 'NAO_SEI',
    salao_ou_clinica: row.salao_ou_clinica || 'NAO_INFORMADO',
    faturamento: row.faturamento || 'NAO_INFORMADO',
    pode_investir: row.pode_investir || null,
    agendado_via: row.agendado_via || null,
    funil: row.funil || 'NAO IDENTIFICADO',
    status: row.status || 'NOVO_LEAD',
    horario_especifico: row.horario_especifico || undefined,
    pipeline_client_id: row.pipeline_client_id || undefined,
  };
}

function mapSalesGoal(row: BackupRow) {
  return {
    id: row.id,
    month: row.month || '',
    goalValue: Number(row.goal_value || 0),
    currentValue: 0,
    createdByUserId: row.created_by_user_id || null,
    createdAt: row.created_at || row.updated_at || new Date().toISOString(),
  };
}

function mapSdrGoal(row: BackupRow) {
  return {
    id: row.id,
    agendador: row.agendador || '',
    month: row.month || '',
    goalCount: Number(row.goal_count || 0),
    createdAt: row.created_at || row.updated_at || new Date().toISOString(),
  };
}

async function loadJson<T>(relativePath: string): Promise<T[]> {
  const response = await fetch(`${LOCAL_BACKUP_BASE}/${relativePath}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar backup local: ${relativePath}`);
  }
  return (await response.json()) as T[];
}

function buildLocalUser() {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Local Backup',
    email: 'local-backup@great.local',
    role: 'COORDENADOR_COMERCIAL',
    active: true,
    createdAt: new Date().toISOString(),
  };
}

export async function seedLocalCommercialBackup(): Promise<boolean> {
  if (!isBrowser() || !isLocalhost()) return false;

  const seededVersion = safeGetItem(LOCAL_BACKUP_MARKER_KEY);
  const currentRaw = safeGetItem('great_commercial_local_data_v1');
  const currentHasAgenda = Boolean(currentRaw && (() => {
    try {
      const parsed = JSON.parse(currentRaw) as CommercialLocalData;
      return Array.isArray(parsed?.agendaEvents) && parsed.agendaEvents.length > 0;
    } catch {
      return false;
    }
  })());
  const currentHasGoals = Boolean(currentRaw && (() => {
    try {
      const parsed = JSON.parse(currentRaw) as CommercialLocalData;
      return Array.isArray(parsed?.salesGoals) && parsed.salesGoals.length > 0
        && Array.isArray(parsed?.sdrGoals) && parsed.sdrGoals.length > 0;
    } catch {
      return false;
    }
  })());

  if (seededVersion === LOCAL_BACKUP_SEED_VERSION && currentHasAgenda && currentHasGoals) {
    return false;
  }

  const [pipelineClientsRaw, agendaEventsRaw, agendamentoLeadsRaw, commercialSettingsRaw, criativosRaw, commercialGoalsRaw, sdrGoalsRaw] = await Promise.all([
    loadJson<BackupRow>('pipeline_clients.json'),
    loadJson<BackupRow>('agenda_events.json'),
    loadJson<BackupRow>('agendamento_leads.json'),
    loadJson<BackupRow>('commercial_settings.json'),
    loadJson<BackupRow>('criativos.json'),
    loadJson<BackupRow>('commercial_goals.json'),
    loadJson<BackupRow>('sdr_goals.json'),
  ]);

  const localData: CommercialLocalData = {
    ...DEFAULT_COMMERCIAL_LOCAL_DATA,
    pipelineClients: pipelineClientsRaw.map(mapPipelineClient),
    agendaEvents: agendaEventsRaw.map(mapAgendaEvent),
    agendamentoLeads: agendamentoLeadsRaw.map(mapAgendamentoLead),
    salesGoals: commercialGoalsRaw.map(mapSalesGoal),
    sdrGoals: sdrGoalsRaw.map(mapSdrGoal),
    criativos: criativosRaw
      .map((item) => String(item?.name || '').trim().toUpperCase())
      .filter(Boolean),
    funis: ['INSTAGRAM', 'MENSAGEM(WHATSAPP)', 'FORMULARIO', 'INDICACAO'],
    catalogVersion: 1,
    teamPointer: String(
      commercialSettingsRaw.find((item) => item.setting_key === 'last_team_pointer')?.setting_value || 'team-equipe-7'
    ),
  };

  writeCommercialLocalData(localData);
  safeSetItem('great_test_session_bypass', 'true');
  safeSetItem('great_local_auth_bypass', 'true');
  safeSetItem('great_enable_localhost_fallback', 'true');
  safeSetItem('great_local_auth_user', JSON.stringify(buildLocalUser()));
  safeSetItem('great_user', JSON.stringify(buildLocalUser()));
  safeSetItem('great_selected_module', 'COMERCIAL');
  safeSetItem(LOCAL_BACKUP_MARKER_KEY, LOCAL_BACKUP_SEED_VERSION);

  return true;
}
