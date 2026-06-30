import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SalesGoal } from '@/types';
import { useAuthSafe } from './AuthContext';
import { buildDashboardMetrics, endOfMonth, getClientRevenue, getCloseDate, isDateInRange, isRealContract, startOfMonth } from '@/lib/commercialMetrics';
import { type CloserDailyLog, type PreSalesDailyLog } from '@/lib/commercialLocalStore';
import { readCommercialLocalData, syncAllCommercialAutomations, updateCommercialLocalData } from '@/lib/commercialLocalStore';
import { addCriativoToCloud, archiveCriativoInCloud, deletePipelineClientFromCloud, dismissPaymentReminderInCloud, fetchCommercialCloudState, renameCriativoInCloud, resetCommercialCloudData, saveCloserDailyLogToCloud, savePipelineClientToCloud, savePreSalesDailyLogToCloud, saveSalesGoalToCloud, saveSdrGoalToCloud, setCommercialSetting, type CommercialCloudState } from '@/lib/commercialCloudStore';
import { resetGreatPlatformStorageNow } from '@/lib/safeStorage';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { safeGetItem } from '@/lib/safeStorage';
import { useQueryClient } from '@tanstack/react-query';
import { COMMERCIAL_YES_NO_MAYBE_OPTIONS, coerceCommercialAnswer, type CommercialYesNoMaybe } from '@/lib/commercialAnswer';

export type PipelineStage = 'NOVO' | 'NO_SHOW' | 'TAXA_INTERESSE' | 'NEGOCIACAO' | 'PERDIDO' | 'FECHADO';
export type Vendedor = 'HERBERT' | 'CLED' | 'PEDRO_H' | 'PEDRO_JUAN' | 'CAETANO';
export type Equipe = string;
export type Faturamento =
  | '0_A_10K'
  | '10K_A_20K'
  | '20K_A_30K'
  | '30K_A_50K'
  | '50K_A_80K'
  | '80K_A_100K'
  | '100K_A_150K'
  | '150K_A_250K'
  | '250K_A_400K'
  | '400K_A_600K'
  | '600K_A_1M'
  | '1M_PLUS'
  | '0_A_15K'
  | '15K_A_30K'
  | '50K_A_100K'
  | '100K_PLUS'
  | 'NAO_INFORMADO'
  | 'PERSONALIZADO';
export type Pacote = 'COMPLETO' | 'TRAFEGO_E_CRIATIVOS' | 'ATENDIMENTO' | 'TRAFEGO' | 'COMPLETO_NOVA_ERA' | 'TRAFEGO_ARTES_IA' | 'TRAFEGO_CONSULTORIA' | 'IA' | 'TRAFEGO_ROTEIRO' | 'TRAFEGO_IA';
export type Periodo = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'TAXA_INTERESSE';
export type PagadorAnuncio = 'CLIENTE' | 'GREAT';
export type TemSocio = CommercialYesNoMaybe;
export type TemMkt = CommercialYesNoMaybe;
export type TemSecretaria = CommercialYesNoMaybe;
export type SalaoOuClinica = string;
export type Agendador = 'PEDRO' | 'PEDRO_H' | 'PEDRO_JUAN' | 'HEBERT' | 'ALAN' | 'CLED' | 'CAETANO';
export type PodeInvestir = 'SIM' | 'NAO';
export type Funil = string;

export const FUNIL_OPTIONS = [
  'INSTAGRAM',
  'MENSAGEM(WHATSAPP)',
  'FORMULARIO',
  'INDICACAO',
] as const;

export const FUNIL_LABELS: Record<(typeof FUNIL_OPTIONS)[number], string> = {
  INSTAGRAM: 'Instagram',
  'MENSAGEM(WHATSAPP)': 'Mensagem (WhatsApp)',
  FORMULARIO: 'Forms',
  INDICACAO: 'Indicação',
};

export const CRIATIVO_REQUIRED_FUNIS = [
  'MENSAGEM(WHATSAPP)',
  'FORMULARIO',
] as const;

export const getFunilLabel = (funil?: string) => {
  if (!funil) return 'Funil';
  return FUNIL_LABELS[funil as keyof typeof FUNIL_LABELS] || funil;
};

export const TEAM_IDS = {
  EQUIPE_7: 'team-equipe-7',
  TROPA_DE_ELITE: 'team-tropa-de-elite',
} as const;

export const AGENDADOR_OPTIONS = [
  { value: 'PEDRO_JUAN' as Agendador, label: 'Pedro Juan' },
  { value: 'PEDRO_H' as Agendador, label: 'Pedro Henrique' },
  { value: 'CLED' as Agendador, label: 'Cled' },
  { value: 'HEBERT' as Agendador, label: 'Herbert' },
  { value: 'ALAN' as Agendador, label: 'Alan' },
  { value: 'CAETANO' as Agendador, label: 'Bruno' },
];

export const OFFICIAL_SDR_OPTIONS = [
  { value: 'HEBERT' as Agendador, label: 'Herbert' },
  { value: 'ALAN' as Agendador, label: 'Alan' },
];

export const OFFICIAL_SDR_VALUES = OFFICIAL_SDR_OPTIONS.map((option) => option.value);

export const TEM_SOCIO_OPTIONS = [
  { value: 'SIM' as TemSocio, label: 'Sim' },
  { value: 'NAO' as TemSocio, label: 'Nao' },
];

export const TEM_MKT_OPTIONS = [
  { value: 'SIM' as TemMkt, label: 'Sim' },
  { value: 'NAO' as TemMkt, label: 'Nao' },
];

export const TEM_SECRETARIA_OPTIONS = COMMERCIAL_YES_NO_MAYBE_OPTIONS.map((option) => ({
  value: option.value as TemSecretaria,
  label: option.label,
}));

export const SALAO_OU_CLINICA_OPTIONS = [
  { value: 'ESTETICA_BELEZA' as SalaoOuClinica, label: 'Estética e beleza' },
  { value: 'FISIOTERAPIA' as SalaoOuClinica, label: 'Fisioterapia' },
  { value: 'PSICOLOGIA' as SalaoOuClinica, label: 'Psicologia' },
  { value: 'SALAO_BELEZA' as SalaoOuClinica, label: 'Salão de beleza' },
  { value: 'NUTRICIONISTA' as SalaoOuClinica, label: 'Nutricionista' },
  { value: 'ODONTOLOGIA' as SalaoOuClinica, label: 'Odontologia' },
];

export const PODE_INVESTIR_OPTIONS = [
  { value: 'SIM' as PodeInvestir, label: 'Sim' },
  { value: 'NAO' as PodeInvestir, label: 'Nao' },
];

export interface PipelineClient {
  id: string;
  ativo: boolean;
  clientName: string;
  clinicName: string;
  telefone?: string;
  vendedor?: Vendedor;
  criativo: string;
  equipe: Equipe;
  faturamento: Faturamento;
  faturamentoPersonalizado?: string;
  podeInvestir?: PodeInvestir;
  pacote: Pacote;
  periodo: Periodo;
  indicacao?: string;
  entrada: number;
  isMrr?: boolean;
  mrrEntrada?: number;
  mrrRemaining?: number;
  dataEntrada: Date;
  stage: PipelineStage;
  lastStageChange?: Date;
  lostReason?: string;
  noShowReason?: string;
  notes?: string;
  agendadoPor?: Agendador;
  agendadoVia?: string;
  pagadorAnuncio?: PagadorAnuncio;
  temSocio?: TemSocio;
  temMkt?: TemMkt;
  temSecretaria?: TemSecretaria;
  salaoOuClinica?: SalaoOuClinica;
  funil?: Funil;
  createdByUserId: string | null;
  dealValue?: number;
  plan?: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'TAXA_INTERESSE';
  creativeSource?: string;
  entryDate?: Date;
  meetingDate?: string;
  meetingTime?: string;
  paymentDeadline?: Date;
  expectedCloseDate?: Date;
  assignedSDR?: string;
  assignedCloser?: string;
  followupDone?: boolean;
  createdAt?: Date;
}

export interface PaymentReminder {
  id: string;
  clientId: string;
  clientName: string;
  clinicName: string;
  dealValue: number;
  paymentDeadline: Date;
  dismissed: boolean;
  createdAt: Date;
}

export interface SDRGoal {
  id: string;
  agendador: Agendador;
  month: string;
  goalCount: number;
  createdAt: Date;
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  NOVO: 'Novo Lead',
  NO_SHOW: 'No Show',
  TAXA_INTERESSE: 'Taxa de Interesse',
  NEGOCIACAO: 'Negociacao',
  PERDIDO: 'Perdido',
  FECHADO: 'Fechado',
};

export const STAGE_ORDER: PipelineStage[] = ['NOVO', 'NO_SHOW', 'TAXA_INTERESSE', 'NEGOCIACAO', 'PERDIDO', 'FECHADO'];

export const VENDEDOR_OPTIONS = [
  { value: 'HERBERT' as Vendedor, label: 'Herbert' },
  { value: 'CLED' as Vendedor, label: 'Cled' },
  { value: 'PEDRO_H' as Vendedor, label: 'Pedro H' },
  { value: 'PEDRO_JUAN' as Vendedor, label: 'Pedro Juan' },
  { value: 'CAETANO' as Vendedor, label: 'Bruno' },
];

export const EQUIPE_OPTIONS = [
  { value: TEAM_IDS.TROPA_DE_ELITE, label: 'Tropa de Elite' },
  { value: TEAM_IDS.EQUIPE_7, label: 'Equipe 7' },
];

export const FATURAMENTO_OPTIONS = [
  { value: '0_A_10K' as Faturamento, label: 'R$ 0 até R$ 10 mil' },
  { value: '10K_A_20K' as Faturamento, label: 'R$ 10 mil até R$ 20 mil' },
  { value: '20K_A_30K' as Faturamento, label: 'R$ 20 mil até R$ 30 mil' },
  { value: '30K_A_50K' as Faturamento, label: 'R$ 30 mil até R$ 50 mil' },
  { value: '50K_A_80K' as Faturamento, label: 'R$ 50 mil até R$ 80 mil' },
  { value: '80K_A_100K' as Faturamento, label: 'R$ 80 mil até R$ 100 mil' },
  { value: '100K_A_150K' as Faturamento, label: 'R$ 100 mil até R$ 150 mil' },
  { value: '150K_A_250K' as Faturamento, label: 'R$ 150 mil até R$ 250 mil' },
  { value: '250K_A_400K' as Faturamento, label: 'R$ 250 mil até R$ 400 mil' },
  { value: '400K_A_600K' as Faturamento, label: 'R$ 400 mil até R$ 600 mil' },
  { value: '600K_A_1M' as Faturamento, label: 'R$ 600 mil até R$ 1 milhão' },
  { value: '1M_PLUS' as Faturamento, label: 'Mais de R$ 1 milhão' },
  { value: 'NAO_INFORMADO' as Faturamento, label: 'Nao Informado' },
];

export const PACOTE_OPTIONS = [
  { value: 'COMPLETO' as Pacote, label: 'Completo' },
  { value: 'TRAFEGO_E_CRIATIVOS' as Pacote, label: 'Trafego e Criativos' },
  { value: 'ATENDIMENTO' as Pacote, label: 'Atendimento' },
  { value: 'TRAFEGO' as Pacote, label: 'Trafego' },
  { value: 'COMPLETO_NOVA_ERA' as Pacote, label: 'Completo Nova Era' },
  { value: 'TRAFEGO_ARTES_IA' as Pacote, label: 'Trafego e Artes + IA' },
  { value: 'TRAFEGO_CONSULTORIA' as Pacote, label: 'Trafego + Consultoria' },
  { value: 'IA' as Pacote, label: 'IA' },
  { value: 'TRAFEGO_ROTEIRO' as Pacote, label: 'Trafego + Roteiro' },
  { value: 'TRAFEGO_IA' as Pacote, label: 'Trafego + IA' },
];

export const PERIODO_OPTIONS = [
  { value: 'MENSAL' as Periodo, label: '30 Dias' },
  { value: 'TRIMESTRAL' as Periodo, label: '90 Dias' },
  { value: 'SEMESTRAL' as Periodo, label: '180 Dias' },
  { value: 'TAXA_INTERESSE' as Periodo, label: 'Taxa de Interesse' },
];

export const PAGADOR_ANUNCIO_OPTIONS = [
  { value: 'CLIENTE' as PagadorAnuncio, label: 'Cliente' },
  { value: 'GREAT' as PagadorAnuncio, label: 'Great' },
];

export const INDICACAO_OPTIONS = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Nao' },
];

export const LOST_REASON_OPTIONS = ['Sem orcamento', 'Nao respondeu', 'Fechou com concorrente', 'Nao faz sentido agora', 'Outro'];

interface CommercialContextType {
  pipelineClients: PipelineClient[];
  salesGoals: SalesGoal[];
  currentGoal: SalesGoal | null;
  isHydrating: boolean;
  paymentReminders: PaymentReminder[];
  criativos: string[];
  funis: string[];
  nextTeamInQueue: Equipe;
  sdrGoals: SDRGoal[];
  preSalesDailyLogs: PreSalesDailyLog[];
  closerDailyLogs: CloserDailyLog[];
  getNextTeamLabel: () => string;
  addPipelineClient: (client: Omit<PipelineClient, 'id' | 'createdByUserId'>, skipAgendamentoSync?: boolean) => Promise<void>;
  updatePipelineClient: (id: string, data: Partial<PipelineClient>) => void;
  movePipelineClient: (id: string, newStage: PipelineStage, lostReason?: string, extraData?: Partial<PipelineClient>) => void;
  deletePipelineClient: (id: string) => void;
  setSalesGoal: (month: string, goalValue: number) => Promise<void>;
  setSDRGoal: (agendador: Agendador, month: string, goalCount: number) => Promise<void>;
  upsertPreSalesDailyLog: (log: Omit<PreSalesDailyLog, 'id' | 'updatedAt'>) => void;
  upsertCloserDailyLog: (log: Omit<CloserDailyLog, 'id' | 'updatedAt'>) => void;
  dismissReminder: (id: string) => void;
  addCriativo: (criativo: string) => void;
  updateCriativo: (oldCriativo: string, newCriativo: string) => void;
  deleteCriativo: (criativo: string) => void;
  addFunil: (funil: string) => void;
  updateFunil: (oldFunil: string, newFunil: string) => void;
  deleteFunil: (funil: string) => void;
  resetCommercialData: () => Promise<void>;
  getGoalStats: () => {
    totalSold: number;
    remaining: number;
    projection: number;
    dailyNeeded: number;
    percentAchieved: number;
    daysRemaining: number;
    totalBusinessDays: number;
    businessDaysPassed: number;
    status: 'ok' | 'risk' | 'danger';
  };
  getPipelineStats: () => {
    totalValue: number;
    negotiationValue: number;
    closedValue: number;
    conversionRate: number;
    averageTicket: number;
    leadCount: number;
  };
  getStatsByVendedor: (vendedor: Vendedor) => {
    totalLeads: number;
    closedValue: number;
    closedCount: number;
    conversionRate: number;
  };
  getSDRStats: (agendador: Agendador, month?: string) => {
    scheduledCount: number;
    closedCount: number;
    goalCount: number;
    percentAchieved: number;
  };
}

const CommercialContext = createContext<CommercialContextType | undefined>(undefined);
const currentMonth = new Date().toISOString().slice(0, 7);
const EMPTY_COMMERCIAL_STATE: CommercialCloudState = {
  pipelineClients: [],
  salesGoals: [],
  sdrGoals: [],
  preSalesDailyLogs: [],
  closerDailyLogs: [],
  paymentReminders: [],
  criativos: [],
  funis: [],
  teamPointer: TEAM_IDS.EQUIPE_7,
};

function shouldPreferLocalCommercialData() {
  return safeGetItem('great_test_session_bypass') === 'true';
}

function normalizePipelineClientKey(client: any) {
  const phone = String(client.telefone || '').replace(/\D/g, '');
  const name = String(client.clientName || '').trim().toLowerCase();
  return `${phone}::${name}`;
}

function toTimestamp(value?: string | Date | null) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function preferLatestRecord<T extends { updated_at?: string | Date | null }>(current: T | undefined, incoming: T): T {
  if (!current) return incoming;
  return toTimestamp(incoming.updated_at) >= toTimestamp(current.updated_at) ? incoming : current;
}

function mergeCommercialSnapshots(remote: CommercialCloudState, local: ReturnType<typeof readCommercialLocalData>): CommercialCloudState {
  const mergedPipelineClients = new Map<string, any>();
  for (const client of remote.pipelineClients) {
    mergedPipelineClients.set(normalizePipelineClientKey(client), client);
  }
  for (const client of local.pipelineClients) {
    const key = normalizePipelineClientKey(client);
    mergedPipelineClients.set(key, preferLatestRecord(mergedPipelineClients.get(key), client));
  }

  const mergedAgendaEvents = new Map<string, any>();
  for (const event of remote.agendaEvents || []) {
    const key = `${String(event.client_phone || '').replace(/\D/g, '')}::${String(event.client_name || '').trim().toLowerCase()}`;
    mergedAgendaEvents.set(key, event);
  }
  for (const event of local.agendaEvents) {
    const key = `${String(event.client_phone || '').replace(/\D/g, '')}::${String(event.client_name || '').trim().toLowerCase()}`;
    mergedAgendaEvents.set(key, preferLatestRecord(mergedAgendaEvents.get(key), event));
  }

  const mergedAgendamentoLeads = new Map<string, any>();
  for (const lead of remote.agendamentoLeads || []) {
    const key = `${String(lead.telefone || '').replace(/\D/g, '')}::${String(lead.nome || '').trim().toLowerCase()}`;
    mergedAgendamentoLeads.set(key, lead);
  }
  for (const lead of local.agendamentoLeads) {
    const key = `${String(lead.telefone || '').replace(/\D/g, '')}::${String(lead.nome || '').trim().toLowerCase()}`;
    mergedAgendamentoLeads.set(key, preferLatestRecord(mergedAgendamentoLeads.get(key), lead));
  }

  const useLocalCatalog = (local.catalogVersion || 0) > (remote.catalogVersion || 0);

  return {
    ...remote,
    pipelineClients: Array.from(mergedPipelineClients.values()),
    salesGoals: mergeSalesGoals(remote.salesGoals || [], local.salesGoals || []),
    sdrGoals: mergeSdrGoals(remote.sdrGoals || [], local.sdrGoals || []),
    criativos: Array.from(new Set((useLocalCatalog ? local.criativos : remote.criativos).map((item) => String(item || '').trim().toUpperCase()).filter(Boolean))).sort(),
    funis: Array.from(new Set((useLocalCatalog ? local.funis : remote.funis).map((item) => String(item || '').trim().toUpperCase()).filter(Boolean))).sort(),
    catalogVersion: useLocalCatalog ? (local.catalogVersion || 0) : (remote.catalogVersion || 0),
    agendaEvents: Array.from(mergedAgendaEvents.values()),
    agendamentoLeads: Array.from(mergedAgendamentoLeads.values()),
  } as CommercialCloudState & { agendaEvents: any[]; agendamentoLeads: any[] };
}

function revivePipelineClient(client: any): PipelineClient {
  return {
    ...client,
    dataEntrada: client.dataEntrada ? new Date(client.dataEntrada) : undefined,
    lastStageChange: client.lastStageChange ? new Date(client.lastStageChange) : undefined,
    entryDate: client.entryDate ? new Date(client.entryDate) : undefined,
    paymentDeadline: client.paymentDeadline ? new Date(client.paymentDeadline) : undefined,
    expectedCloseDate: client.expectedCloseDate ? new Date(client.expectedCloseDate) : undefined,
    createdAt: client.createdAt ? new Date(client.createdAt) : undefined,
  };
}

function normalizePipelineClientAnswers(client: any) {
  return {
    ...client,
    temSocio: coerceCommercialAnswer(client.temSocio, 'NAO'),
    temMkt: coerceCommercialAnswer(client.temMkt, 'NAO'),
    temSecretaria: coerceCommercialAnswer(client.temSecretaria, 'NAO_SEI'),
  };
}

function reviveSalesGoal(goal: any): SalesGoal {
  return {
    ...goal,
    createdAt: goal.createdAt ? new Date(goal.createdAt) : new Date(),
  };
}

function reviveReminder(reminder: any): PaymentReminder {
  return {
    ...reminder,
    paymentDeadline: reminder.paymentDeadline ? new Date(reminder.paymentDeadline) : new Date(),
    createdAt: reminder.createdAt ? new Date(reminder.createdAt) : new Date(),
  };
}

function reviveSdrGoal(goal: any): SDRGoal {
  return {
    ...goal,
    createdAt: goal.createdAt ? new Date(goal.createdAt) : new Date(),
  };
}

function countBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function CommercialProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const authContext = useAuthSafe();
  const user = authContext?.user;
  const supabaseUser = authContext?.supabaseUser;
  const session = authContext?.session;
  const logActivity = authContext?.logActivity ?? (() => {});
  const [cloudState, setCloudState] = useState<CommercialCloudState>(EMPTY_COMMERCIAL_STATE);
  const [isHydrating, setIsHydrating] = useState(true);

  const refreshCommercialState = useCallback(async () => {
    if (!isSupabaseConfigured || shouldPreferLocalCommercialData()) {
      const local = readCommercialLocalData();
      setCloudState({
        ...EMPTY_COMMERCIAL_STATE,
        ...syncAllCommercialAutomations(local),
      });
      return;
    }

    try {
      const next = await fetchCommercialCloudState(user?.id);
      setCloudState({
        ...syncAllCommercialAutomations({
          ...next,
          teamPointer: next.teamPointer || TEAM_IDS.EQUIPE_7,
        }),
      });
    } catch (error) {
      console.warn('Cloud commercial state read failed.', error);
      setCloudState({
        ...EMPTY_COMMERCIAL_STATE,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
    queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
    queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      await refreshCommercialState();
      if (!cancelled) {
        setIsHydrating(false);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [refreshCommercialState]);

  useEffect(() => {
    const handleLocalUpdate = () => {
      void refreshCommercialState();
    };

    window.addEventListener('great-commercial-local-data-updated', handleLocalUpdate);
    return () => {
      window.removeEventListener('great-commercial-local-data-updated', handleLocalUpdate);
    };
  }, [refreshCommercialState]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('commercial-shared-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline_clients' }, () => void refreshCommercialState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_events' }, () => void refreshCommercialState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamento_leads' }, () => void refreshCommercialState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commercial_goals' }, () => void refreshCommercialState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sdr_goals' }, () => void refreshCommercialState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_sales_daily_logs' }, () => void refreshCommercialState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'closer_daily_logs' }, () => void refreshCommercialState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_reminders' }, () => void refreshCommercialState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'criativos' }, () => void refreshCommercialState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commercial_settings' }, () => void refreshCommercialState())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshCommercialState]);

  const pipelineClients = useMemo(
    () => cloudState.pipelineClients.map((client) => revivePipelineClient(normalizePipelineClientAnswers(client))),
    [cloudState.pipelineClients]
  );
  const salesGoals = useMemo(() => cloudState.salesGoals.map(reviveSalesGoal), [cloudState.salesGoals]);
  const sdrGoals = useMemo(() => cloudState.sdrGoals.map(reviveSdrGoal), [cloudState.sdrGoals]);
  const preSalesDailyLogs = cloudState.preSalesDailyLogs;
  const closerDailyLogs = cloudState.closerDailyLogs;
  const paymentReminders = useMemo(() => cloudState.paymentReminders.map(reviveReminder), [cloudState.paymentReminders]);
  const criativos = cloudState.criativos;
  const funis = cloudState.funis?.length ? cloudState.funis : [...FUNIL_OPTIONS];
  const lastTeamPointer = cloudState.teamPointer || TEAM_IDS.EQUIPE_7;

  const nextTeamInQueue: string = lastTeamPointer === TEAM_IDS.TROPA_DE_ELITE
    ? TEAM_IDS.EQUIPE_7
    : TEAM_IDS.TROPA_DE_ELITE;

  const getNextTeamLabel = useCallback(() => {
    const team = EQUIPE_OPTIONS.find((option) => option.value === nextTeamInQueue);
    return team?.label || 'Equipe';
  }, [nextTeamInQueue]);

  const currentGoal = salesGoals.find((goal) => goal.month === currentMonth) || null;

  const addPipelineClient = useCallback(async (client: Omit<PipelineClient, 'id' | 'createdByUserId'>) => {
    const newClient: PipelineClient = {
      ...client,
      id: `pipeline-${crypto.randomUUID()}`,
      createdByUserId: user?.id || null,
      createdAt: new Date(),
      dataEntrada: client.dataEntrada || new Date(),
    };

    console.info('[commercial] addPipelineClient called', {
      userId: user?.id || null,
      supabaseUserId: supabaseUser?.id || null,
      hasSession: Boolean(session),
      clientName: newClient.clientName,
      stage: newClient.stage,
      meetingDate: newClient.meetingDate,
      meetingTime: newClient.meetingTime,
    });

    setCloudState((current) => ({
      ...current,
      pipelineClients: current.pipelineClients.some((item) => item.id === newClient.id)
        ? current.pipelineClients.map((item) => (item.id === newClient.id ? newClient : item))
        : [newClient, ...current.pipelineClients],
    }));

    try {
      const savedClient = await savePipelineClientToCloud(newClient, user?.id);
      if (!savedClient) {
        throw new Error('cloud_save_returned_empty_result');
      }

      setCloudState((current) => ({
        ...current,
        pipelineClients: current.pipelineClients.some((item) => item.id === newClient.id)
          ? current.pipelineClients.map((item) => (item.id === newClient.id ? savedClient : item))
          : current.pipelineClients.some((item) => item.id === savedClient.id)
            ? current.pipelineClients.map((item) => (item.id === savedClient.id ? savedClient : item))
            : [savedClient, ...current.pipelineClients],
      }));

      void refreshCommercialState().catch((refreshError) => {
        console.warn('Lead created, but refreshCommercialState failed after save.', refreshError);
      });

      try {
        logActivity('CLIENT_CREATED', 'Pipeline', savedClient.id, `Cliente ${savedClient.clientName} criado`);
      } catch (activityError) {
        console.warn('Lead created, but activity log failed after save.', activityError);
      }
    } catch (error) {
      console.warn('Lead save cloud sync failed or timed out.', error);
      await refreshCommercialState().catch((refreshError) => {
        console.warn('Lead save failed, and refresh also failed.', refreshError);
      });
      throw error;
    }
  }, [logActivity, refreshCommercialState, session, supabaseUser?.id, user?.id]);

  const updatePipelineClient = useCallback((id: string, data: Partial<PipelineClient>) => {
    const previousClient = pipelineClients.find((client) => client.id === id);
    if (!previousClient) return;
    const updatedClient = { ...previousClient, ...data };

    setCloudState((current) => ({
      ...current,
      pipelineClients: current.pipelineClients.map((client) => client.id === id ? updatedClient : client),
    }));
    void Promise.race([
      savePipelineClientToCloud(updatedClient, user?.id),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout:update_pipeline_client')), 8000)),
    ])
      .then(refreshCommercialState)
      .catch((error) => {
        console.warn('Pipeline client update cloud sync failed or timed out.', error);
      });
  }, [pipelineClients, refreshCommercialState, user?.id]);

  const movePipelineClient = useCallback((id: string, newStage: PipelineStage, lostReason?: string, extraData?: Partial<PipelineClient>) => {
    const previousClient = pipelineClients.find((client) => client.id === id);
    if (!previousClient) return;
    const updatedClient: PipelineClient = {
      ...previousClient,
      ...extraData,
      stage: newStage,
      ativo: newStage !== 'PERDIDO',
      lostReason: newStage === 'PERDIDO' ? lostReason || previousClient.lostReason : previousClient.lostReason,
      lastStageChange: new Date(),
    };

    setCloudState((current) => ({
      ...current,
      pipelineClients: current.pipelineClients.map((client) => client.id === id ? updatedClient : client),
    }));
    void Promise.race([
      savePipelineClientToCloud(updatedClient, user?.id),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout:move_pipeline_client')), 8000)),
    ])
      .then(refreshCommercialState)
      .catch((error) => {
        console.warn('Pipeline client move cloud sync failed or timed out.', error);
      });
  }, [pipelineClients, refreshCommercialState, user?.id]);

  const deletePipelineClient = useCallback((id: string) => {
    const removed = pipelineClients.find((client) => client.id === id);
    setCloudState((current) => ({
      ...current,
      pipelineClients: current.pipelineClients.filter((client) => client.id !== id),
    }));
    if (removed) {
      void deletePipelineClientFromCloud(removed)
        .then(refreshCommercialState)
        .catch((error) => {
          console.warn('Pipeline client delete cloud sync failed or timed out.', error);
        });
    }
  }, [pipelineClients, refreshCommercialState]);

  const setSalesGoal = useCallback(async (month: string, goalValue: number) => {
    const nextGoal = (() => {
      const currentGoals = cloudState.salesGoals;
      const existing = currentGoals.find((goal) => goal.month === month);
      return existing
        ? currentGoals.map((goal) => goal.month === month ? { ...goal, goalValue } : goal)
        : [...currentGoals, { id: `goal-${crypto.randomUUID()}`, month, goalValue, currentValue: 0, createdByUserId: user?.id || 'cloud-user', createdAt: new Date() }];
    })();

    setCloudState((current) => ({
      ...current,
      salesGoals: nextGoal,
    }));
    updateCommercialLocalData((current) => ({
      ...current,
      salesGoals: nextGoal,
    }));
    try {
      await saveSalesGoalToCloud(month, goalValue, user?.id);
      await refreshCommercialState();
    } catch (error) {
      await refreshCommercialState();
      throw error;
    }
  }, [cloudState.salesGoals, refreshCommercialState, user?.id]);

  const setSDRGoal = useCallback(async (agendador: Agendador, month: string, goalCount: number) => {
    const nextGoals = (() => {
      const currentGoals = cloudState.sdrGoals;
      const existing = currentGoals.find((goal) => goal.agendador === agendador && goal.month === month);
      return existing
        ? currentGoals.map((goal) => goal.agendador === agendador && goal.month === month ? { ...goal, goalCount } : goal)
        : [...currentGoals, { id: `sdr-goal-${crypto.randomUUID()}`, agendador, month, goalCount, createdAt: new Date() }];
    })();

    setCloudState((current) => ({
      ...current,
      sdrGoals: nextGoals,
    }));
    updateCommercialLocalData((current) => ({
      ...current,
      sdrGoals: nextGoals,
    }));
    try {
      await saveSdrGoalToCloud(agendador, month, goalCount, user?.id);
      await refreshCommercialState();
    } catch (error) {
      await refreshCommercialState();
      throw error;
    }
  }, [refreshCommercialState, user?.id]);

  const upsertPreSalesDailyLog = useCallback((log: Omit<PreSalesDailyLog, 'id' | 'updatedAt'>) => {
    const normalized = {
      ...log,
      contacts: Math.max(0, Number(log.contacts) || 0),
      qualified: Math.max(0, Number(log.qualified) || 0),
      scheduled: Math.max(0, Number(log.scheduled) || 0),
      noShowCalls: Math.max(0, Number(log.noShowCalls) || 0),
      updatedAt: new Date().toISOString(),
    };

    setCloudState((current) => {
      const existing = current.preSalesDailyLogs.find((item) => item.date === log.date && item.sdr === log.sdr);
      const preSalesDailyLogs = existing
        ? current.preSalesDailyLogs.map((item) => item.id === existing.id ? { ...item, ...normalized } : item)
        : [{ id: `pre-sales-log-${crypto.randomUUID()}`, ...normalized }, ...current.preSalesDailyLogs];
      return { ...current, preSalesDailyLogs };
    });
    updateCommercialLocalData((current) => {
      const existing = current.preSalesDailyLogs.find((item) => item.date === log.date && item.sdr === log.sdr);
      const preSalesDailyLogs = existing
        ? current.preSalesDailyLogs.map((item) => item.id === existing.id ? { ...item, ...normalized } : item)
        : [{ id: `pre-sales-log-${crypto.randomUUID()}`, ...normalized }, ...current.preSalesDailyLogs];
      return { ...current, preSalesDailyLogs };
    });
    void savePreSalesDailyLogToCloud(log, user?.id)
      .catch((error) => {
        console.warn('Pre-sales log not saved to cloud, keeping local backup.', error);
      })
      .finally(() => refreshCommercialState());
  }, [refreshCommercialState, user?.id]);

  const upsertCloserDailyLog = useCallback((log: Omit<CloserDailyLog, 'id' | 'updatedAt'>) => {
    const normalized = {
      ...log,
      agendada: Math.max(0, Number(log.agendada) || 0),
      realizada: Math.max(0, Number(log.realizada) || 0),
      pitch: Math.max(0, Number(log.pitch) || 0),
      vendas: Math.max(0, Number(log.vendas) || 0),
      valor: Math.max(0, Number(log.valor) || 0),
      primeiraParcela: Math.max(0, Number(log.primeiraParcela) || 0),
      updatedAt: new Date().toISOString(),
    };

    setCloudState((current) => {
      const existing = current.closerDailyLogs.find((item) => item.date === log.date && item.closer === log.closer);
      const closerDailyLogs = existing
        ? current.closerDailyLogs.map((item) => item.id === existing.id ? { ...item, ...normalized } : item)
        : [{ id: `closer-log-${crypto.randomUUID()}`, ...normalized }, ...current.closerDailyLogs];
      return { ...current, closerDailyLogs };
    });
    void saveCloserDailyLogToCloud(log, user?.id).then(refreshCommercialState);
  }, [refreshCommercialState, user?.id]);

  const dismissReminder = useCallback((id: string) => {
    setCloudState((current) => ({
      ...current,
      paymentReminders: current.paymentReminders.map((reminder) => reminder.id === id ? { ...reminder, dismissed: true } : reminder),
    }));
    void dismissPaymentReminderInCloud(id, user?.id).then(refreshCommercialState);
  }, [cloudState.sdrGoals, refreshCommercialState, user?.id]);

  const syncCatalogVersionToCloud = useCallback((version: number) => {
    return setCommercialSetting('commercial_catalog_version_v1', String(version || 0), user?.id);
  }, [user?.id]);

  const addCriativo = useCallback((criativo: string) => {
    const normalized = criativo.trim().toUpperCase();
    if (!normalized) return;

    setCloudState((current) => ({
      ...current,
      criativos: current.criativos.includes(normalized) ? current.criativos : [...current.criativos, normalized].sort(),
    }));
    const nextLocal = updateCommercialLocalData((current) => ({
      ...current,
      catalogVersion: (current.catalogVersion || 0) + 1,
      criativos: current.criativos.includes(normalized) ? current.criativos : [...current.criativos, normalized].sort(),
    }));
    void Promise.race([
      addCriativoToCloud(normalized, user?.id),
      syncCatalogVersionToCloud(nextLocal.catalogVersion || 1),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout:add_criativo')), 8000)),
    ])
      .then(refreshCommercialState)
      .catch((error) => {
        console.warn('Criativo saved locally but cloud sync failed or timed out.', error);
      });
  }, [cloudState.sdrGoals, refreshCommercialState, user?.id]);

  const updateCriativo = useCallback((oldCriativo: string, newCriativo: string) => {
    const normalized = newCriativo.trim().toUpperCase();
    if (!normalized) return;

    setCloudState((current) => ({
      ...current,
      criativos: current.criativos.map((criativo) => criativo === oldCriativo ? normalized : criativo),
      pipelineClients: current.pipelineClients.map((client) => client.criativo === oldCriativo ? { ...client, criativo: normalized } : client),
    }));
    const nextLocal = updateCommercialLocalData((current) => ({
      ...current,
      catalogVersion: (current.catalogVersion || 0) + 1,
      criativos: current.criativos.map((criativo) => criativo === oldCriativo ? normalized : criativo),
      pipelineClients: current.pipelineClients.map((client: any) => client.criativo === oldCriativo ? { ...client, criativo: normalized } : client),
    }));
    void Promise.race([
      renameCriativoInCloud(oldCriativo, normalized),
      syncCatalogVersionToCloud(nextLocal.catalogVersion || 1),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout:rename_criativo')), 8000)),
    ])
      .then(refreshCommercialState)
      .catch((error) => {
        console.warn('Criativo rename persisted locally but cloud sync failed or timed out.', error);
      });
  }, [refreshCommercialState]);

  const deleteCriativo = useCallback((criativo: string) => {
    setCloudState((current) => ({
      ...current,
      criativos: current.criativos.filter((item) => item !== criativo),
    }));
    const nextLocal = updateCommercialLocalData((current) => ({
      ...current,
      catalogVersion: (current.catalogVersion || 0) + 1,
      criativos: current.criativos.filter((item) => item !== criativo),
    }));
    void Promise.race([
      archiveCriativoInCloud(criativo),
      syncCatalogVersionToCloud(nextLocal.catalogVersion || 1),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout:archive_criativo')), 8000)),
    ])
      .then(refreshCommercialState)
      .catch((error) => {
        console.warn('Criativo archive persisted locally but cloud sync failed or timed out.', error);
      });
  }, [refreshCommercialState]);

  const syncFunisToCloud = useCallback((nextFunis: string[]) => {
    setCloudState((current) => ({
      ...current,
      funis: nextFunis,
    }));
    const nextLocal = updateCommercialLocalData((current) => ({
      ...current,
      catalogVersion: (current.catalogVersion || 0) + 1,
      funis: nextFunis,
    }));
    void Promise.race([
      setCommercialSetting('commercial_funis_v1', JSON.stringify(nextFunis), user?.id),
      syncCatalogVersionToCloud(nextLocal.catalogVersion || 1),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout:set_funis')), 8000)),
    ])
      .then(refreshCommercialState)
      .catch((error) => {
        console.warn('Funis saved locally but cloud sync failed or timed out.', error);
      });
  }, [refreshCommercialState, user?.id]);

  const addFunil = useCallback((funil: string) => {
    const normalized = funil.trim().toUpperCase();
    if (!normalized) return;

    const nextFunis = Array.from(new Set([...(funis || []), normalized])).sort();
    syncFunisToCloud(nextFunis);
  }, [funis, syncFunisToCloud]);

  const updateFunil = useCallback((oldFunil: string, newFunil: string) => {
    const normalized = newFunil.trim().toUpperCase();
    if (!normalized) return;

    const nextFunis = (funis || []).map((item) => (item === oldFunil ? normalized : item));
    setCloudState((current) => ({
      ...current,
      funis: nextFunis,
      pipelineClients: current.pipelineClients.map((client) => (client.funil === oldFunil ? { ...client, funil: normalized } : client)),
    }));
    const nextLocal = updateCommercialLocalData((current) => ({
      ...current,
      catalogVersion: (current.catalogVersion || 0) + 1,
      funis: nextFunis,
      pipelineClients: current.pipelineClients.map((client: any) => (client.funil === oldFunil ? { ...client, funil: normalized } : client)),
    }));
    void Promise.race([
      setCommercialSetting('commercial_funis_v1', JSON.stringify(nextFunis), user?.id),
      syncCatalogVersionToCloud(nextLocal.catalogVersion || 1),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout:update_funis')), 8000)),
    ])
      .then(() => {
        void Promise.all([
          ...pipelineClients.filter((client) => client.funil === oldFunil).map((client) => savePipelineClientToCloud({ ...client, funil: normalized }, user?.id)),
        ]).then(refreshCommercialState);
      })
      .catch((error) => {
        console.warn('Funil update persisted locally but cloud sync failed or timed out.', error);
      });
  }, [funis, pipelineClients, refreshCommercialState, user?.id]);

  const deleteFunil = useCallback((funil: string) => {
    const usage = pipelineClients.filter((client) => client.funil === funil).length;
    if (usage > 0) return;

    const nextFunis = (funis || []).filter((item) => item !== funil);
    const nextLocal = updateCommercialLocalData((current) => ({
      ...current,
      catalogVersion: (current.catalogVersion || 0) + 1,
      funis: nextFunis,
    }));
    void Promise.race([
      setCommercialSetting('commercial_funis_v1', JSON.stringify(nextFunis), user?.id),
      syncCatalogVersionToCloud(nextLocal.catalogVersion || 1),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout:delete_funis')), 8000)),
    ])
      .then(refreshCommercialState)
      .catch((error) => {
        console.warn('Funil delete persisted locally but cloud sync failed or timed out.', error);
      });
  }, [funis, pipelineClients]);

  const resetCommercialData = useCallback(async () => {
    setCloudState(EMPTY_COMMERCIAL_STATE);
    queryClient.clear();
    resetGreatPlatformStorageNow();

    if (isSupabaseConfigured) {
      await resetCommercialCloudData(user?.id);
    }

    await refreshCommercialState();
  }, [queryClient, refreshCommercialState, user?.id]);

  const getGoalStats = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const today = new Date(year, month, now.getDate());
    const totalBusinessDays = countBusinessDays(monthStart, monthEnd);
    const businessDaysPassed = countBusinessDays(monthStart, today);
    const businessDaysRemaining = countBusinessDays(new Date(year, month, now.getDate() + 1), monthEnd);
    const metrics = buildDashboardMetrics(pipelineClients, currentGoal?.goalValue || 0, { start: monthStart, end: monthEnd });
    const totalSold = metrics.totalRevenue;
    const goalValue = currentGoal?.goalValue || 0;
    const remaining = Math.max(0, goalValue - totalSold);
    const dailyAverage = businessDaysPassed > 0 ? totalSold / businessDaysPassed : 0;
    const projection = dailyAverage * totalBusinessDays;
    const dailyNeeded = businessDaysRemaining > 0 ? remaining / businessDaysRemaining : remaining;
    const percentAchieved = goalValue > 0 ? (totalSold / goalValue) * 100 : 0;
    const expectedProgress = totalBusinessDays > 0 ? (businessDaysPassed / totalBusinessDays) * 100 : 0;
    let status: 'ok' | 'risk' | 'danger' = 'ok';

    if (percentAchieved < expectedProgress * 0.8) {
      status = 'danger';
    } else if (percentAchieved < expectedProgress) {
      status = 'risk';
    }

    return {
      totalSold,
      remaining,
      projection,
      dailyNeeded,
      percentAchieved,
      daysRemaining: businessDaysRemaining,
      totalBusinessDays,
      businessDaysPassed,
      status,
    };
  }, [currentGoal, pipelineClients]);

  const getPipelineStats = useCallback(() => {
    const activeClients = pipelineClients.filter((client) => client.stage !== 'PERDIDO' && client.ativo);
    const metrics = buildDashboardMetrics(pipelineClients, currentGoal?.goalValue || 0, { start: startOfMonth(), end: endOfMonth() });
    const totalValue = activeClients.reduce((sum, client) => sum + getClientRevenue(client), 0);
    const leadCount = pipelineClients.length;

    return {
      totalValue,
      negotiationValue: metrics.negotiationValue,
      closedValue: metrics.totalRevenue,
      conversionRate: metrics.conversionRate,
      averageTicket: metrics.averageTicket,
      leadCount,
    };
  }, [currentGoal, pipelineClients]);

  const getStatsByVendedor = useCallback((vendedor: Vendedor) => {
    const vendedorClients = pipelineClients.filter((client) => client.vendedor === vendedor);
    const closedClients = vendedorClients.filter(isRealContract);
    const totalLeads = vendedorClients.length;
    const closedValue = closedClients.reduce((sum, client) => sum + getClientRevenue(client), 0);
    const closedCount = closedClients.length;
    const conversionRate = totalLeads > 0 ? (closedCount / totalLeads) * 100 : 0;

    return {
      totalLeads,
      closedValue,
      closedCount,
      conversionRate,
    };
  }, [pipelineClients]);

  const getSDRStats = useCallback((agendador: Agendador, month?: string) => {
    const targetMonth = month || currentMonth;
    const [year, monthNumber] = targetMonth.split('-').map(Number);
    const monthStart = new Date(year, monthNumber - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, monthNumber, 0, 23, 59, 59, 999);
    const scheduledLeads = pipelineClients.filter((client) => {
      if (client.agendadoPor !== agendador) return false;
      const scheduleDate = client.meetingDate || client.dataEntrada || client.entryDate || client.createdAt || client.lastStageChange;
      return isDateInRange(scheduleDate, { start: monthStart, end: monthEnd });
    });
    const scheduledCount = scheduledLeads.length;
    const goalData = sdrGoals.find((goal) => goal.agendador === agendador && goal.month === targetMonth);
    const goalCount = goalData?.goalCount || 0;
    const percentAchieved = goalCount > 0 ? (scheduledCount / goalCount) * 100 : 0;

    return {
      scheduledCount,
      closedCount: scheduledCount,
      goalCount,
      percentAchieved,
    };
  }, [pipelineClients, sdrGoals]);

  const value = useMemo<CommercialContextType>(() => ({
    pipelineClients,
    salesGoals,
    currentGoal,
    isHydrating,
    paymentReminders,
    criativos,
    funis,
    nextTeamInQueue,
      sdrGoals,
      preSalesDailyLogs,
      closerDailyLogs,
      getNextTeamLabel,
    addPipelineClient,
    updatePipelineClient,
    movePipelineClient,
    deletePipelineClient,
    setSalesGoal,
      setSDRGoal,
      upsertPreSalesDailyLog,
      upsertCloserDailyLog,
      dismissReminder,
    addCriativo,
    updateCriativo,
    deleteCriativo,
    addFunil,
    updateFunil,
    deleteFunil,
    resetCommercialData,
    getGoalStats,
    getPipelineStats,
    getStatsByVendedor,
    getSDRStats,
  }), [
    addCriativo,
    addPipelineClient,
    criativos,
    funis,
    currentGoal,
    isHydrating,
    deleteCriativo,
    addFunil,
    updateFunil,
    deleteFunil,
    resetCommercialData,
    deletePipelineClient,
    dismissReminder,
    getGoalStats,
    getNextTeamLabel,
    getPipelineStats,
    getSDRStats,
    getStatsByVendedor,
    movePipelineClient,
    nextTeamInQueue,
    paymentReminders,
    pipelineClients,
    salesGoals,
    sdrGoals,
      preSalesDailyLogs,
      closerDailyLogs,
      setSDRGoal,
      setSalesGoal,
      upsertPreSalesDailyLog,
      upsertCloserDailyLog,
      updateCriativo,
    updatePipelineClient,
  ]);

  return <CommercialContext.Provider value={value}>{children}</CommercialContext.Provider>;
}

export function useCommercial() {
  const context = useContext(CommercialContext);
  if (context === undefined) {
    throw new Error('useCommercial must be used within a CommercialProvider');
  }
  return context;
}

export function useCommercialSafe() {
  return useContext(CommercialContext);
}
