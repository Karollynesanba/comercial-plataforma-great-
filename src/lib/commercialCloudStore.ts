import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { DEFAULT_COMERCIAL_CRIATIVOS, DEFAULT_COMMERCIAL_LOCAL_DATA, readCommercialLocalData, type CloserDailyLog, type PreSalesDailyLog } from '@/lib/commercialLocalStore';
import type { Agendador, Equipe, Faturamento, Pacote, PagadorAnuncio, PaymentReminder, Periodo, PipelineClient, PipelineStage, PodeInvestir, SalaoOuClinica, SDRGoal, TemMkt, TemSecretaria, TemSocio, Vendedor } from '@/contexts/CommercialContext';
import type { SalesGoal } from '@/types';

export interface CommercialCloudState {
  pipelineClients: PipelineClient[];
  salesGoals: SalesGoal[];
  sdrGoals: SDRGoal[];
  preSalesDailyLogs: PreSalesDailyLog[];
  closerDailyLogs: CloserDailyLog[];
  paymentReminders: PaymentReminder[];
  criativos: string[];
  funis: string[];
  teamPointer: string;
}

export const COMMERCIAL_DATA_RESET_VERSION = 'commercial-data-reset-2026-04-29-v2';
const COMMERCIAL_DATA_RESET_SETTING_KEY = 'commercial_data_reset_version';

const DEFAULT_CLOUD_STATE: CommercialCloudState = {
  pipelineClients: [],
  salesGoals: [],
  sdrGoals: [],
  preSalesDailyLogs: [],
  closerDailyLogs: [],
  paymentReminders: [],
  criativos: [...DEFAULT_COMERCIAL_CRIATIVOS],
  funis: [],
  teamPointer: '',
};

const COMMERCIAL_GOAL_SETTING_PREFIX = 'commercial_goal:';
const SDR_GOAL_SETTING_PREFIX = 'sdr_goal:';
const COMMERCIAL_FUNIS_SETTING_KEY = 'commercial_funis_v1';
const TEST_PIPELINE_SEED_MARKER = 'SEED_TESTE_METRICAS_20260416';

const STAGE_TO_AGENDAMENTO_STATUS: Record<string, string> = {
  NOVO: 'NOVO_LEAD',
  NO_SHOW: 'NO_SHOW',
  TAXA_INTERESSE: 'TAXA_INTERESSE',
  NEGOCIACAO: 'NEGOCIACAO',
  PERDIDO: 'PERDIDO',
  FECHADO: 'FECHADO',
};

function buildTestPipelineSeed(): Partial<PipelineClient>[] {
  const base = {
    ativo: true,
    equipe: 'team-equipe-7' as Equipe,
    pacote: 'COMPLETO' as Pacote,
    periodo: 'MENSAL' as Periodo,
    pagadorAnuncio: 'CLIENTE' as PagadorAnuncio,
    temSocio: 'SIM' as TemSocio,
    temMkt: 'SIM' as TemMkt,
    temSecretaria: 'SIM' as TemSecretaria,
    podeInvestir: 'SIM' as PodeInvestir,
    followupDone: false,
  };

  const rows: Array<Partial<PipelineClient> & { day: string; time: string }> = [
    { clientName: 'Ana Vitoria Seed', clinicName: 'Ana Estetica Avancada', telefone: '5511991000001', vendedor: 'CLED', criativo: 'TRS', faturamento: '50K_A_80K', entrada: 1500, stage: 'FECHADO', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Estética e beleza', day: '2026-04-01', time: '14:00' },
    { clientName: 'Rodrigo Odonto Seed', clinicName: 'Rodrigo Odontologia', telefone: '5511991000002', vendedor: 'PEDRO_H', criativo: 'CAIXINHA 02', faturamento: '80K_A_100K', entrada: 4188, stage: 'FECHADO', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Odontologia', day: '2026-04-02', time: '17:00' },
    { clientName: 'Keli Godoy Seed', clinicName: 'Keli Godoy', telefone: '5511991000003', vendedor: 'PEDRO_H', criativo: 'CAIXINHA 02', faturamento: '80K_A_100K', entrada: 2097, stage: 'FECHADO', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Odontologia', day: '2026-04-03', time: '17:00' },
    { clientName: 'Mariana Colombo Seed', clinicName: 'Dra Mariana Colombo', telefone: '5511991000004', vendedor: 'PEDRO_H', criativo: 'CAIXINHA 02', faturamento: '100K_A_150K', entrada: 4470.93, stage: 'FECHADO', agendadoPor: 'HEBERT', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Odontologia', day: '2026-04-04', time: '17:00' },
    { clientName: 'Lucas Fisio Seed', clinicName: 'Lucas Fisioterapia', telefone: '5511991000005', vendedor: 'HERBERT', criativo: 'TRS', faturamento: '30K_A_50K', entrada: 2497, stage: 'FECHADO', agendadoPor: 'HEBERT', agendadoVia: 'GOOGLE', salaoOuClinica: 'Fisioterapia', day: '2026-04-05', time: '10:00' },
    { clientName: 'Clara Psicologia Seed', clinicName: 'Clara Psicologia', telefone: '5511991000006', vendedor: 'PEDRO_JUAN', criativo: 'CAIXA DE PERGUNTAS', faturamento: '20K_A_30K', entrada: 1800, stage: 'FECHADO', agendadoPor: 'PEDRO', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Psicologia', day: '2026-04-06', time: '19:00' },
    { clientName: 'Studio Bella Seed', clinicName: 'Studio Bella Hair', telefone: '5511991000007', vendedor: 'PEDRO_H', criativo: 'CAIXINHA 02', faturamento: '50K_A_80K', entrada: 1500, isMrr: true, mrrEntrada: 1500, mrrRemaining: 3000, stage: 'FECHADO', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Salão de beleza', day: '2026-04-07', time: '17:00' },
    { clientName: 'Nutri Prime Seed', clinicName: 'Nutri Prime', telefone: '5511991000008', vendedor: 'CLED', criativo: 'TRS', faturamento: '30K_A_50K', entrada: 200, stage: 'TAXA_INTERESSE', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Nutricionista', day: '2026-04-08', time: '14:00' },
    { clientName: 'Dental Norte Seed', clinicName: 'Dental Norte', telefone: '5511991000009', vendedor: 'CAETANO', criativo: 'EVENTO ESTETICA', faturamento: '150K_A_250K', entrada: 7500, isMrr: true, mrrEntrada: 2500, mrrRemaining: 5000, stage: 'NEGOCIACAO', agendadoPor: 'CAETANO', agendadoVia: 'INDICACAO', salaoOuClinica: 'Odontologia', day: '2026-04-09', time: '15:00' },
    { clientName: 'Reabilita Seed', clinicName: 'Reabilita Fisio', telefone: '5511991000010', vendedor: 'HERBERT', criativo: 'TOP 1 BOTOX', faturamento: '20K_A_30K', entrada: 0, stage: 'PERDIDO', lostReason: 'Sem verba no momento', agendadoPor: 'HEBERT', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Fisioterapia', day: '2026-04-10', time: '11:00' },
    { clientName: 'Lead Estetica Manha Seed', clinicName: 'Estetica Manha', telefone: '5511991000011', vendedor: 'CLED', criativo: 'TRS', faturamento: '50K_A_80K', entrada: 0, stage: 'NOVO', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Estética e beleza', day: '2026-04-11', time: '09:00' },
    { clientName: 'Lead Odonto 17h Seed', clinicName: 'Odonto 17h', telefone: '5511991000012', vendedor: 'PEDRO_H', criativo: 'CAIXINHA 02', faturamento: '80K_A_100K', entrada: 0, stage: 'NOVO', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Odontologia', day: '2026-04-12', time: '17:00' },
    { clientName: 'Lead Psicologia Noite Seed', clinicName: 'Psi Noite', telefone: '5511991000013', vendedor: 'PEDRO_JUAN', criativo: 'CAIXA DE PERGUNTAS', faturamento: '20K_A_30K', entrada: 0, stage: 'NOVO', agendadoPor: 'PEDRO', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Psicologia', day: '2026-04-13', time: '19:00' },
    { clientName: 'No Show Estetica Seed', clinicName: 'No Show Estetica', telefone: '5511991000014', vendedor: 'CLED', criativo: 'TRS', faturamento: '50K_A_80K', entrada: 0, stage: 'NO_SHOW', noShowReason: 'Nao compareceu', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Estética e beleza', day: '2026-04-14', time: '14:00' },
    { clientName: 'No Show Odonto Seed', clinicName: 'No Show Odonto', telefone: '5511991000015', vendedor: 'PEDRO_H', criativo: 'CAIXINHA 02', faturamento: '100K_A_150K', entrada: 0, stage: 'NO_SHOW', noShowReason: 'Remarcou e nao entrou', agendadoPor: 'HEBERT', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Odontologia', day: '2026-04-15', time: '17:00' },
    { clientName: 'Negociacao Estetica Seed', clinicName: 'Estetica Premium', telefone: '5511991000016', vendedor: 'CLED', criativo: 'TRS', faturamento: '50K_A_80K', entrada: 4500, isMrr: true, mrrEntrada: 1500, mrrRemaining: 3000, stage: 'NEGOCIACAO', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Estética e beleza', day: '2026-04-16', time: '14:00' },
    { clientName: 'Taxa Odonto Seed', clinicName: 'Taxa Odonto', telefone: '5511991000017', vendedor: 'PEDRO_H', criativo: 'CAIXINHA 02', faturamento: '80K_A_100K', entrada: 200, stage: 'TAXA_INTERESSE', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Odontologia', day: '2026-04-17', time: '17:00' },
    { clientName: 'Perdido Salao Seed', clinicName: 'Salao Perdido', telefone: '5511991000018', vendedor: 'PEDRO_JUAN', criativo: 'CAIXA DE PERGUNTAS', faturamento: '10K_A_20K', entrada: 0, stage: 'PERDIDO', lostReason: 'Decidiu nao investir', agendadoPor: 'PEDRO', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Salão de beleza', day: '2026-04-18', time: '19:00' },
    { clientName: 'Lead Fisio Tarde Seed', clinicName: 'Fisio Tarde', telefone: '5511991000019', vendedor: 'HERBERT', criativo: 'TOP 1 BOTOX', faturamento: '30K_A_50K', entrada: 0, stage: 'NOVO', agendadoPor: 'HEBERT', agendadoVia: 'GOOGLE', salaoOuClinica: 'Fisioterapia', day: '2026-04-19', time: '15:00' },
    { clientName: 'Lead Nutri Manha Seed', clinicName: 'Nutri Manha', telefone: '5511991000020', vendedor: 'CLED', criativo: 'TRS', faturamento: '30K_A_50K', entrada: 0, stage: 'NOVO', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Nutricionista', day: '2026-04-20', time: '10:00' },
    { clientName: 'Fechado Estetica 14h Seed', clinicName: 'Estetica 14h', telefone: '5511991000021', vendedor: 'CLED', criativo: 'TRS', faturamento: '50K_A_80K', entrada: 3200, stage: 'FECHADO', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Estética e beleza', day: '2026-04-21', time: '14:00' },
    { clientName: 'Fechado Odonto 17h Seed', clinicName: 'Odonto 17h Plus', telefone: '5511991000022', vendedor: 'PEDRO_H', criativo: 'CAIXINHA 02', faturamento: '100K_A_150K', entrada: 5890, stage: 'FECHADO', agendadoPor: 'MIGUEL', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Odontologia', day: '2026-04-22', time: '17:00' },
    { clientName: 'Fechado Psicologia 19h Seed', clinicName: 'Psi 19h', telefone: '5511991000023', vendedor: 'PEDRO_JUAN', criativo: 'CAIXA DE PERGUNTAS', faturamento: '20K_A_30K', entrada: 2500, stage: 'FECHADO', agendadoPor: 'PEDRO', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Psicologia', day: '2026-04-23', time: '19:00' },
    { clientName: 'Negociacao Odonto MRR Seed', clinicName: 'Odonto MRR', telefone: '5511991000024', vendedor: 'PEDRO_H', criativo: 'CAIXINHA 02', faturamento: '150K_A_250K', entrada: 6000, isMrr: true, mrrEntrada: 2000, mrrRemaining: 4000, stage: 'NEGOCIACAO', agendadoPor: 'HEBERT', agendadoVia: 'INSTAGRAM', salaoOuClinica: 'Odontologia', day: '2026-04-24', time: '17:00' },
    { clientName: 'Lead Odonto Livre Seed', clinicName: 'Odonto Livre', telefone: '5511991000025', vendedor: 'CAETANO', criativo: 'EVENTO ESTETICA', faturamento: '250K_A_400K', entrada: 0, stage: 'NOVO', agendadoPor: 'CAETANO', agendadoVia: 'INDICACAO', salaoOuClinica: 'Odontologia', day: '2026-04-25', time: '15:00' },
  ];

  return rows.map(({ day, time, ...row }, index) => ({
    ...base,
    ...row,
    dataEntrada: new Date(`${day}T${time}:00-03:00`),
    meetingDate: day,
    meetingTime: time,
    lastStageChange: new Date(`${day}T${time}:00-03:00`),
    notes: `${TEST_PIPELINE_SEED_MARKER} | Lead de teste ${String(index + 1).padStart(2, '0')}`,
  }));
}

function asDate(value?: string | Date | null) {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function dateOnly(value?: string | Date | null) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = asDate(value);
  return date.toISOString().slice(0, 10);
}

function toTime(value?: string | null) {
  if (!value) return null;
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
}

function toAgendaTime(value?: string | null) {
  const time = toTime(value);
  return time ? `${time}:00` : null;
}

function isoToBrazilianDate(value?: string | Date | null) {
  const iso = dateOnly(value);
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function timeToPeriod(value?: string | null) {
  const time = toTime(value);
  if (!time) return 'NAO_INFORMADO';
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'MANHA';
  if (hour < 18) return 'TARDE';
  return 'NOITE';
}

function normalizePhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function normalizePipelineFaturamento(faturamento?: string | null): Faturamento {
  switch (faturamento) {
    case '0_A_10K':
    case '0_A_15K':
    case '0_10K':
    case 'FATURA_12K':
    case 'PODE_INVESTIR':
      return '0_A_10K';
    case '10K_A_20K':
    case '15K_A_30K':
    case '15K_MAIS':
      return '10K_A_20K';
    case '20K_A_30K':
      return '20K_A_30K';
    case '30K_A_50K':
      return '30K_A_50K';
    case '50K_A_80K':
    case '50K_A_100K':
      return '50K_A_80K';
    case '80K_A_100K':
      return '80K_A_100K';
    case '100K_A_150K':
    case '100K_PLUS':
      return '100K_A_150K';
    case '150K_A_250K':
      return '150K_A_250K';
    case '250K_A_400K':
      return '250K_A_400K';
    case '400K_A_600K':
      return '400K_A_600K';
    case '600K_A_1M':
      return '600K_A_1M';
    case '1M_PLUS':
      return '1M_PLUS';
    case 'NAO_INFORMADO':
    case 'PERSONALIZADO':
    default:
      return 'NAO_INFORMADO';
  }
}

function matchPerson(recordPhone?: string | null, recordName?: string | null, targetPhone?: string | null, targetName?: string | null) {
  const recordDigits = normalizePhone(recordPhone);
  const targetDigits = normalizePhone(targetPhone);
  if (recordDigits && targetDigits && recordDigits === targetDigits) return true;
  return Boolean(recordName && targetName && recordName.trim().toLowerCase() === targetName.trim().toLowerCase());
}

function dbPipelineToLocal(row: any): PipelineClient {
  return {
    id: row.id,
    ativo: row.ativo ?? true,
    clientName: row.client_name,
    clinicName: row.clinic_name || row.client_name,
    telefone: row.telefone || undefined,
    vendedor: row.vendedor as Vendedor | undefined,
    criativo: row.criativo || 'NAO IDENTIFICADO',
    funil: row.funil || row.criativo || 'NAO IDENTIFICADO',
    equipe: (row.equipe || 'team-equipe-7') as Equipe,
    faturamento: normalizePipelineFaturamento(row.faturamento),
    faturamentoPersonalizado: row.faturamento_personalizado || undefined,
    podeInvestir: row.pode_investir as PodeInvestir | undefined,
    pacote: (row.pacote || 'COMPLETO') as Pacote,
    periodo: (row.periodo || 'MENSAL') as Periodo,
    indicacao: row.indicacao || undefined,
    entrada: Number(row.entrada || 0),
    isMrr: Boolean(row.is_mrr),
    mrrEntrada: Number(row.mrr_entrada || row.entrada || 0),
    mrrRemaining: Number(row.mrr_remaining || 0),
    dataEntrada: asDate(row.data_entrada || row.created_at),
    stage: (row.stage || 'NOVO') as PipelineStage,
    lastStageChange: row.last_stage_change ? asDate(row.last_stage_change) : undefined,
    lostReason: row.lost_reason || undefined,
    noShowReason: row.no_show_reason || undefined,
    notes: row.notes || undefined,
    agendadoPor: row.agendado_por as Agendador | undefined,
    agendadoVia: row.agendado_via || undefined,
    pagadorAnuncio: row.pagador_anuncio as PagadorAnuncio | undefined,
    temSocio: row.tem_socio as TemSocio | undefined,
    temMkt: row.tem_mkt as TemMkt | undefined,
    temSecretaria: row.tem_secretaria as TemSecretaria | undefined,
    salaoOuClinica: row.salao_ou_clinica as SalaoOuClinica | undefined,
    createdByUserId: row.created_by_user_id || 'cloud-user',
    dealValue: Number(row.entrada || 0),
    plan: row.periodo || undefined,
    creativeSource: row.criativo || undefined,
    entryDate: row.data_entrada ? asDate(row.data_entrada) : undefined,
    meetingDate: row.meeting_date || undefined,
    meetingTime: row.meeting_time ? toTime(row.meeting_time) || undefined : undefined,
    assignedSDR: row.agendado_por || undefined,
    assignedCloser: row.vendedor || undefined,
    followupDone: row.followup_done ?? false,
    createdAt: asDate(row.created_at),
  };
}

function localPipelineToDb(client: Partial<PipelineClient>, userId?: string | null) {
  return {
    ativo: client.ativo ?? true,
    client_name: client.clientName || 'Lead sem nome',
    clinic_name: client.clinicName || client.clientName || null,
    telefone: client.telefone || null,
    vendedor: client.vendedor || null,
    criativo: client.criativo || null,
    funil: client.funil || null,
    equipe: client.equipe || null,
    faturamento: normalizePipelineFaturamento(client.faturamento),
    faturamento_personalizado: client.faturamentoPersonalizado || null,
    pode_investir: client.podeInvestir || null,
    pacote: client.pacote || null,
    periodo: client.periodo || null,
    indicacao: client.indicacao || null,
    entrada: Number(client.entrada || client.dealValue || 0),
    is_mrr: client.isMrr ?? false,
    mrr_entrada: Number(client.mrrEntrada || client.entrada || 0),
    mrr_remaining: Number(client.mrrRemaining || 0),
    data_entrada: dateOnly(client.dataEntrada || client.entryDate) || dateOnly(new Date()),
    stage: client.stage || 'NOVO',
    last_stage_change: client.lastStageChange ? asDate(client.lastStageChange).toISOString() : null,
    lost_reason: client.lostReason || null,
    no_show_reason: client.noShowReason || null,
    notes: client.notes || null,
    agendado_por: client.agendadoPor || client.assignedSDR || null,
    agendado_via: client.agendadoVia || null,
    pagador_anuncio: client.pagadorAnuncio || null,
    tem_socio: client.temSocio || null,
    tem_mkt: client.temMkt || null,
    tem_secretaria: client.temSecretaria || null,
    salao_ou_clinica: client.salaoOuClinica || null,
    meeting_date: client.meetingDate || null,
    meeting_time: client.meetingTime ? toTime(client.meetingTime) : null,
    followup_done: client.followupDone ?? false,
    created_by_user_id: userId || client.createdByUserId || null,
    updated_at: new Date().toISOString(),
  };
}

function dbGoalToLocal(row: any): SalesGoal {
  return {
    id: row.id,
    month: row.month,
    goalValue: Number(row.goal_value || 0),
    currentValue: 0,
    createdByUserId: row.created_by_user_id || 'cloud-user',
    createdAt: asDate(row.created_at),
  };
}

function dbSdrGoalToLocal(row: any): SDRGoal {
  return {
    id: row.id,
    agendador: row.agendador as Agendador,
    month: row.month,
    goalCount: Number(row.goal_count || 0),
    createdAt: asDate(row.created_at),
  };
}

function settingsToSalesGoals(rows: any[]): SalesGoal[] {
  return rows
    .filter((row) => String(row.setting_key || '').startsWith(COMMERCIAL_GOAL_SETTING_PREFIX))
    .map((row) => {
      const month = String(row.setting_key).slice(COMMERCIAL_GOAL_SETTING_PREFIX.length);
      return {
        id: `setting-commercial-goal-${month}`,
        month,
        goalValue: Number(row.setting_value || 0),
        currentValue: 0,
        createdByUserId: row.updated_by_user_id || 'cloud-setting',
        createdAt: asDate(row.updated_at),
      };
    });
}

function settingsToSdrGoals(rows: any[]): SDRGoal[] {
  return rows
    .filter((row) => String(row.setting_key || '').startsWith(SDR_GOAL_SETTING_PREFIX))
    .map((row) => {
      const [agendador, month] = String(row.setting_key).slice(SDR_GOAL_SETTING_PREFIX.length).split(':');
      return {
        id: `setting-sdr-goal-${agendador}-${month}`,
        agendador: agendador as Agendador,
        month,
        goalCount: Number(row.setting_value || 0),
        createdAt: asDate(row.updated_at),
      };
    })
    .filter((goal) => Boolean(goal.agendador && goal.month));
}

function settingsToFunis(rows: any[]): string[] {
  const raw = rows.find((row) => row.setting_key === COMMERCIAL_FUNIS_SETTING_KEY)?.setting_value;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim().toUpperCase()).filter(Boolean).sort();
    }
  } catch {
    // fall through to comma-separated parsing
  }

  return String(raw)
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .sort();
}

function settingsToCriativos(rows: any[], cloudCriativos: string[]) {
  if (cloudCriativos.length > 0) return cloudCriativos;

  const persisted = rows
    .filter((row) => String(row.setting_key || '').startsWith('commercial_creative:'))
    .map((row) => String(row.setting_value || '').trim().toUpperCase())
    .filter(Boolean);

  const next = persisted.length > 0 ? persisted : [...DEFAULT_COMERCIAL_CRIATIVOS];
  return Array.from(new Set(next)).sort();
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function deleteAllRows(table: string, column: string) {
  const { data, error } = await supabase.from(table).select(column).limit(5000);
  if (error) throw error;

  const values = (data || [])
    .map((row: any) => row?.[column])
    .filter((value): value is string => Boolean(value));

  for (const group of chunk(values, 250)) {
    if (!group.length) continue;
    const { error: deleteError } = await supabase.from(table).delete().in(column, group);
    if (deleteError) throw deleteError;
  }
}

export async function resetCommercialCloudDataIfNeeded(userId?: string | null) {
  if (!isSupabaseConfigured) return false;

  const currentResetVersion = await getSetting(COMMERCIAL_DATA_RESET_SETTING_KEY);
  if (currentResetVersion === COMMERCIAL_DATA_RESET_VERSION) {
    return false;
  }

  const tablesToClear: Array<[string, string]> = [
    ['pipeline_clients', 'id'],
    ['commercial_goals', 'id'],
    ['sdr_goals', 'id'],
    ['pre_sales_daily_logs', 'id'],
    ['closer_daily_logs', 'id'],
    ['payment_reminders', 'id'],
    ['criativos', 'id'],
    ['agenda_events', 'id'],
    ['agendamento_leads', 'id'],
    ['commercial_settings', 'setting_key'],
  ];

  for (const [table, column] of tablesToClear) {
    await deleteAllRows(table, column);
  }

  await setCommercialSetting(COMMERCIAL_DATA_RESET_SETTING_KEY, COMMERCIAL_DATA_RESET_VERSION, userId);
  return true;
}

export async function resetCommercialCloudData(userId?: string | null) {
  if (!isSupabaseConfigured) return false;

  const tablesToClear: Array<[string, string]> = [
    ['pipeline_clients', 'id'],
    ['commercial_goals', 'id'],
    ['sdr_goals', 'id'],
    ['pre_sales_daily_logs', 'id'],
    ['closer_daily_logs', 'id'],
    ['payment_reminders', 'id'],
    ['criativos', 'id'],
    ['agenda_events', 'id'],
    ['agendamento_leads', 'id'],
    ['commercial_settings', 'setting_key'],
  ];

  for (const [table, column] of tablesToClear) {
    await deleteAllRows(table, column);
  }

  await setCommercialSetting(COMMERCIAL_DATA_RESET_SETTING_KEY, COMMERCIAL_DATA_RESET_VERSION, userId);
  return true;
}

function mergeSalesGoals(primary: SalesGoal[], fallback: SalesGoal[]) {
  const merged = new Map<string, SalesGoal>();
  primary.forEach((goal) => merged.set(goal.month, goal));
  fallback.forEach((goal) => merged.set(goal.month, goal));
  return Array.from(merged.values());
}

function mergeSdrGoals(primary: SDRGoal[], fallback: SDRGoal[]) {
  const merged = new Map<string, SDRGoal>();
  primary.forEach((goal) => merged.set(`${goal.agendador}:${goal.month}`, goal));
  fallback.forEach((goal) => merged.set(`${goal.agendador}:${goal.month}`, goal));
  return Array.from(merged.values());
}

function dbReminderToLocal(row: any): PaymentReminder {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clinicName: row.clinic_name || row.client_name,
    dealValue: Number(row.deal_value || 0),
    paymentDeadline: asDate(row.payment_deadline),
    dismissed: row.dismissed ?? false,
    createdAt: asDate(row.created_at),
  };
}

function dbPreSalesLogToLocal(row: any): PreSalesDailyLog {
  return {
    id: row.id,
    date: row.date,
    sdr: row.sdr,
    contacts: Number(row.contacts || 0),
    qualified: Number(row.qualified || 0),
    scheduled: Number(row.scheduled || 0),
    noShowCalls: Number(row.no_show_calls || 0),
    updatedAt: row.updated_at,
  };
}

function dbCloserLogToLocal(row: any): CloserDailyLog {
  return {
    id: row.id,
    date: row.date,
    closer: row.closer,
    agendada: Number(row.agendada || 0),
    realizada: Number(row.realizada || 0),
    pitch: Number(row.pitch || 0),
    vendas: Number(row.vendas || 0),
    valor: Number(row.valor || 0),
    primeiraParcela: Number(row.primeira_parcela || 0),
    updatedAt: row.updated_at,
  };
}

async function ensureSeedAgendaEventsFromPipeline(pipelineClients: PipelineClient[], userId?: string | null) {
  const seedClients = pipelineClients.filter((client) =>
    String(client.notes || '').includes(TEST_PIPELINE_SEED_MARKER)
  );

  if (!seedClients.length) return;

  const { data: existingEvents } = await supabase
    .from('agenda_events')
    .select('id, client_name, client_phone')
    .limit(1000);

  const existingKeys = new Set(
    (existingEvents || []).map((event: any) => `${normalizePhone(event.client_phone)}::${String(event.client_name || '').trim().toLowerCase()}`)
  );

  for (const client of seedClients) {
    const key = `${normalizePhone(client.telefone)}::${String(client.clientName || '').trim().toLowerCase()}`;
    if (existingKeys.has(key)) continue;
    await syncPipelineAutomationsToCloud(client, userId);
  }
}

async function getSetting(key: string) {
  const { data } = await supabase
    .from('commercial_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .maybeSingle();
  return data?.setting_value || '';
}

export async function getCommercialSetting(key: string) {
  if (!isSupabaseConfigured) return '';
  return getSetting(key);
}

export async function setCommercialSetting(key: string, value: string, userId?: string | null) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from('commercial_settings').upsert({
    setting_key: key,
    setting_value: value,
    updated_at: new Date().toISOString(),
    updated_by_user_id: userId ?? null,
  }, { onConflict: 'setting_key' });

  if (error) throw error;
}

async function migrateLocalDataIfNeeded(userId?: string | null) {
  if (!isSupabaseConfigured) return;
  if (await getSetting(COMMERCIAL_DATA_RESET_SETTING_KEY) === COMMERCIAL_DATA_RESET_VERSION) return;

  const migrated = await getSetting('local_commercial_migration_v1');
  if (migrated === 'done') return;

  const local = readCommercialLocalData();
  const hasLocalData =
    local.pipelineClients.length > 0 ||
    local.salesGoals.length > 0 ||
    local.sdrGoals.length > 0 ||
    local.preSalesDailyLogs.length > 0 ||
    local.closerDailyLogs.length > 0 ||
    local.criativos.length > 0;

  if (!hasLocalData) {
    try {
      await setCommercialSetting('local_commercial_migration_v1', 'done', userId);
    } catch (settingError) {
      console.warn('Migration marker could not be stored, but there was no local data to migrate.', settingError);
    }
    return;
  }

  const { count } = await supabase
    .from('pipeline_clients')
    .select('id', { count: 'exact', head: true });

  if ((count || 0) === 0) {
    if (local.pipelineClients.length) {
      await supabase.from('pipeline_clients').insert(
        local.pipelineClients.map((client) => localPipelineToDb(client, userId))
      );
    }

    if (local.salesGoals.length) {
      await supabase.from('commercial_goals').insert(
        local.salesGoals.map((goal: any) => ({
          month: goal.month,
          goal_value: Number(goal.goalValue || 0),
          created_by_user_id: userId || null,
        }))
      );
    }

    if (local.sdrGoals.length) {
      await supabase.from('sdr_goals').insert(
        local.sdrGoals.map((goal: any) => ({
          agendador: goal.agendador,
          month: goal.month,
          goal_count: Number(goal.goalCount || 0),
          created_by_user_id: userId || null,
        }))
      );
    }

    if (local.preSalesDailyLogs.length) {
      await (supabase as any).from('pre_sales_daily_logs').upsert(
        local.preSalesDailyLogs.map((log) => ({
          date: log.date,
          sdr: log.sdr,
          contacts: Number(log.contacts || 0),
          qualified: Number(log.qualified || 0),
          scheduled: Number(log.scheduled || 0),
          no_show_calls: Number(log.noShowCalls || 0),
          updated_by_user_id: userId || null,
        })),
        { onConflict: 'date,sdr' }
      );
    }

    if (local.closerDailyLogs.length) {
      await (supabase as any).from('closer_daily_logs').upsert(
        local.closerDailyLogs.map((log) => ({
          date: log.date,
          closer: log.closer,
          agendada: Number(log.agendada || 0),
          realizada: Number(log.realizada || 0),
          pitch: Number(log.pitch || 0),
          vendas: Number(log.vendas || 0),
          valor: Number(log.valor || 0),
          primeira_parcela: Number(log.primeiraParcela || 0),
          updated_by_user_id: userId || null,
        })),
        { onConflict: 'date,closer' }
      );
    }

    if (local.criativos.length) {
      await supabase.from('criativos').upsert(
        local.criativos.map((name) => ({
          name,
          is_active: true,
          created_by_user_id: userId || null,
        })),
        { onConflict: 'name' }
      );
    }

    if (local.teamPointer) {
      try {
        await setCommercialSetting('last_team_pointer', local.teamPointer, userId);
      } catch (settingError) {
        console.warn('Could not persist last team pointer during migration.', settingError);
      }
    }
  }

  try {
    await setCommercialSetting('local_commercial_migration_v1', 'done', userId);
  } catch (settingError) {
    console.warn('Migration marker could not be stored after cloud sync.', settingError);
  }
}

export async function fetchCommercialCloudState(userId?: string | null): Promise<CommercialCloudState> {
  if (!isSupabaseConfigured) return DEFAULT_CLOUD_STATE;

  await resetCommercialCloudDataIfNeeded(userId);
  await migrateLocalDataIfNeeded(userId);

  const [
    pipeline,
    goals,
    sdrGoals,
    preSalesLogs,
    closerLogs,
    reminders,
    criativos,
    settings,
    teamPointer,
  ] = await Promise.all([
    supabase.from('pipeline_clients').select('*').order('created_at', { ascending: false }),
    supabase.from('commercial_goals').select('*').order('month', { ascending: false }),
    supabase.from('sdr_goals').select('*').order('month', { ascending: false }),
    (supabase as any).from('pre_sales_daily_logs').select('*').order('date', { ascending: false }),
    (supabase as any).from('closer_daily_logs').select('*').order('date', { ascending: false }),
    supabase.from('payment_reminders').select('*').order('payment_deadline', { ascending: true }),
    supabase.from('criativos').select('*').eq('is_active', true).order('name', { ascending: true }),
    supabase.from('commercial_settings').select('setting_key, setting_value, updated_at, updated_by_user_id'),
    getSetting('last_team_pointer'),
  ]);

  if (pipeline.error) throw pipeline.error;
  if (goals.error) throw goals.error;
  if (sdrGoals.error) throw sdrGoals.error;
  if (preSalesLogs.error) throw preSalesLogs.error;
  if (closerLogs.error) throw closerLogs.error;
  if (reminders.error) throw reminders.error;
  if (criativos.error) throw criativos.error;
  if (settings.error) throw settings.error;

  const settingsRows = settings.data || [];
  const tableSalesGoals = (goals.data || []).map(dbGoalToLocal);
  const tableSdrGoals = (sdrGoals.data || []).map(dbSdrGoalToLocal);
  const pipelineClients = (pipeline.data || []).map(dbPipelineToLocal);

  await ensureSeedAgendaEventsFromPipeline(pipelineClients, userId);

  return {
    pipelineClients,
    salesGoals: mergeSalesGoals(tableSalesGoals, settingsToSalesGoals(settingsRows)),
    sdrGoals: mergeSdrGoals(tableSdrGoals, settingsToSdrGoals(settingsRows)),
    preSalesDailyLogs: (preSalesLogs.data || []).map(dbPreSalesLogToLocal),
    closerDailyLogs: (closerLogs.data || []).map(dbCloserLogToLocal),
    paymentReminders: (reminders.data || []).map(dbReminderToLocal),
    criativos: settingsToCriativos(settingsRows, (criativos.data || []).map((item) => item.name.toUpperCase())),
    funis: settingsToFunis(settingsRows),
    teamPointer: teamPointer || DEFAULT_COMMERCIAL_LOCAL_DATA.teamPointer,
  };
}

export async function savePipelineClientToCloud(client: Partial<PipelineClient>, userId?: string | null) {
  if (!isSupabaseConfigured) return null;

  const payload = localPipelineToDb(client, userId);
  const hasCloudId = typeof client.id === 'string' && /^[0-9a-f-]{36}$/i.test(client.id);

  const query = hasCloudId
    ? supabase.from('pipeline_clients').update(payload).eq('id', client.id!).select('*').single()
    : supabase.from('pipeline_clients').insert(payload).select('*').single();

  const { data, error } = await query;
  if (error) throw error;

  const savedClient = dbPipelineToLocal(data);
  try {
    await syncPipelineAutomationsToCloud(savedClient, userId);
  } catch (automationError) {
    console.warn('Pipeline saved, but agenda projection sync failed. Database trigger should keep projections aligned after migration.', automationError);
  }
  return savedClient;
}

export async function deletePipelineClientFromCloud(client: PipelineClient) {
  if (!isSupabaseConfigured) return;

  const phone = normalizePhone(client.telefone);
  await Promise.all([
    supabase.from('pipeline_clients').delete().eq('id', client.id),
    supabase.from('agenda_events').delete().or(`client_name.eq.${client.clientName},client_phone.eq.${phone}`),
    supabase.from('agendamento_leads').delete().or(`nome.eq.${client.clientName},telefone.eq.${phone}`),
  ]);
}

export async function saveSalesGoalToCloud(month: string, goalValue: number, userId?: string | null) {
  if (!isSupabaseConfigured) return;

  const normalizedGoal = Number(goalValue || 0);
  try {
    await setCommercialSetting(`${COMMERCIAL_GOAL_SETTING_PREFIX}${month}`, String(normalizedGoal), userId);
  } catch (settingError) {
    console.warn('Commercial goal settings fallback failed, continuing with official table save.', settingError);
  }

  const { error } = await supabase.from('commercial_goals').upsert({
    month,
    goal_value: normalizedGoal,
    created_by_user_id: userId || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'month' });

  if (error) {
    console.warn('Commercial goal saved in settings fallback, but commercial_goals upsert failed.', error);
  }
}

export async function saveSdrGoalToCloud(agendador: string, month: string, goalCount: number, userId?: string | null) {
  if (!isSupabaseConfigured) return;

  const normalizedGoal = Number(goalCount || 0);
  try {
    await setCommercialSetting(`${SDR_GOAL_SETTING_PREFIX}${agendador}:${month}`, String(normalizedGoal), userId);
  } catch (settingError) {
    console.warn('SDR goal settings fallback failed, continuing with official table save.', settingError);
  }

  const { error } = await supabase.from('sdr_goals').upsert({
    agendador,
    month,
    goal_count: normalizedGoal,
    created_by_user_id: userId || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'agendador,month' });

  if (error) {
    console.warn('SDR goal saved in settings fallback, but sdr_goals upsert failed.', error);
  }
}

export async function savePreSalesDailyLogToCloud(log: Omit<PreSalesDailyLog, 'id' | 'updatedAt'>, userId?: string | null) {
  if (!isSupabaseConfigured) return;
  await (supabase as any).from('pre_sales_daily_logs').upsert({
    date: log.date,
    sdr: log.sdr,
    contacts: Math.max(0, Number(log.contacts) || 0),
    qualified: Math.max(0, Number(log.qualified) || 0),
    scheduled: Math.max(0, Number(log.scheduled) || 0),
    no_show_calls: Math.max(0, Number(log.noShowCalls) || 0),
    updated_by_user_id: userId || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'date,sdr' });
}

export async function saveCloserDailyLogToCloud(log: Omit<CloserDailyLog, 'id' | 'updatedAt'>, userId?: string | null) {
  if (!isSupabaseConfigured) return;
  await (supabase as any).from('closer_daily_logs').upsert({
    date: log.date,
    closer: log.closer,
    agendada: Math.max(0, Number(log.agendada) || 0),
    realizada: Math.max(0, Number(log.realizada) || 0),
    pitch: Math.max(0, Number(log.pitch) || 0),
    vendas: Math.max(0, Number(log.vendas) || 0),
    valor: Math.max(0, Number(log.valor) || 0),
    primeira_parcela: Math.max(0, Number(log.primeiraParcela) || 0),
    updated_by_user_id: userId || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'date,closer' });
}

export async function dismissPaymentReminderInCloud(id: string, userId?: string | null) {
  if (!isSupabaseConfigured) return;
  await supabase.from('payment_reminders').update({
    dismissed: true,
    dismissed_by_user_id: userId || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

export async function addCriativoToCloud(name: string, userId?: string | null) {
  if (!isSupabaseConfigured) return;
  await supabase.from('criativos').upsert({
    name,
    is_active: true,
    created_by_user_id: userId || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'name' });
}

export async function renameCriativoInCloud(oldName: string, newName: string) {
  if (!isSupabaseConfigured) return;
  await Promise.all([
    supabase.from('criativos').update({ name: newName, updated_at: new Date().toISOString() }).eq('name', oldName),
    supabase.from('pipeline_clients').update({ criativo: newName, updated_at: new Date().toISOString() }).eq('criativo', oldName),
  ]);
}

export async function archiveCriativoInCloud(name: string) {
  if (!isSupabaseConfigured) return;
  await supabase.from('criativos').update({ is_active: false, updated_at: new Date().toISOString() }).eq('name', name);
}

export async function syncPipelineAutomationsToCloud(client: PipelineClient, userId?: string | null) {
  if (!isSupabaseConfigured) return;

  const meetingDate = dateOnly(client.meetingDate) || dateOnly(client.entryDate) || dateOnly(client.dataEntrada) || dateOnly(new Date());
  const meetingTime = toTime(client.meetingTime) || '09:00';

  const phone = normalizePhone(client.telefone);
  const agendaPayload = {
    title: `Reuniao com ${client.clientName}`,
    description: client.criativo ? `Lead do Pipeline - ${client.criativo}` : 'Lead do Pipeline',
    notes: client.notes || null,
    client_name: client.clientName,
    client_phone: phone,
    event_date: meetingDate,
    event_time: toAgendaTime(meetingTime),
    duration_minutes: 60,
    meeting_link: null,
    color: client.stage === 'NO_SHOW' || client.stage === 'PERDIDO' ? '#FF0000' : client.stage === 'FECHADO' || client.stage === 'NEGOCIACAO' || client.stage === 'TAXA_INTERESSE' ? '#66FF00' : '#3B82F6',
    reminder_2h_sent: false,
    reminder_30min_sent: false,
    created_by_user_id: null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingEvents } = await supabase
    .from('agenda_events')
    .select('id, client_name, client_phone')
    .limit(500);
  const existingEvent = (existingEvents || []).find((event) => matchPerson(event.client_phone, event.client_name, phone, client.clientName));

  if (existingEvent) {
    await supabase.from('agenda_events').update(agendaPayload).eq('id', existingEvent.id);
  } else {
    await supabase.from('agenda_events').insert(agendaPayload);
  }

  const leadPayload = {
    data: isoToBrazilianDate(meetingDate),
    nome: client.clientName,
    telefone: phone,
    horario: timeToPeriod(meetingTime),
    tem_socio: client.temSocio === 'SIM' ? 'SIM' : 'NAO',
    tem_mkt: client.temMkt === 'SIM' ? 'SIM' : 'NAO',
    tem_secretaria: client.temSecretaria === 'SIM' ? 'SIM' : 'NAO',
    salao_ou_clinica: client.salaoOuClinica || 'NAO_INFORMADO',
    faturamento: normalizePipelineFaturamento(client.faturamento),
    pode_investir: client.podeInvestir || null,
    agendado_via: client.agendadoVia || null,
    funil: client.funil || client.criativo || 'NAO IDENTIFICADO',
    status: STAGE_TO_AGENDAMENTO_STATUS[client.stage] || 'NOVO_LEAD',
    created_by_user_id: client.createdByUserId || userId || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingLeads } = await supabase
    .from('agendamento_leads')
    .select('id, nome, telefone')
    .limit(1000);
  const existingLead = (existingLeads || []).find((lead) => matchPerson(lead.telefone, lead.nome, phone, client.clientName));

  if (existingLead) {
    await supabase.from('agendamento_leads').update(leadPayload).eq('id', existingLead.id);
  } else {
    await supabase.from('agendamento_leads').insert(leadPayload);
  }
}
