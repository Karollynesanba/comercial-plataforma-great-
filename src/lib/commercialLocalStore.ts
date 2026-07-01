import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { coerceCommercialAnswer } from '@/lib/commercialAnswer';
import { getCommercialLeadOrigin } from '@/lib/commercialOrigin';
import { matchMeetingName, normalizeMeetingClientName, normalizeMeetingTitle } from '@/lib/agendaTitle';

const COMMERCIAL_LOCAL_DATA_KEY = 'great_commercial_local_data_v1';
const COMMERCIAL_LOCAL_CRIATIVOS_KEY = 'great_commercial_criativos_v1';
const COMMERCIAL_LOCAL_FUNIS_KEY = 'great_commercial_funis_v1';
const COMMERCIAL_LOCAL_CATALOG_VERSION_KEY = 'great_commercial_catalog_version_v1';

export interface CommercialLocalData {
  pipelineClients: any[];
  salesGoals: any[];
  sdrGoals: any[];
  preSalesDailyLogs: PreSalesDailyLog[];
  closerDailyLogs: CloserDailyLog[];
  paymentReminders: any[];
  criativos: string[];
  funis: string[];
  catalogVersion: number;
  teamPointer: string;
  agendaEvents: any[];
  agendamentoLeads: any[];
  schedulingGeneralGoals: Record<string, number>;
  whatsappReminderLogs: any[];
  ceoFinance: CEOFinanceSettings;
}

export interface PreSalesDailyLog {
  id: string;
  date: string;
  sdr: string;
  contacts: number;
  qualified: number;
  scheduled: number;
  noShowCalls: number;
  updatedAt: string;
}

export interface CloserDailyLog {
  id: string;
  date: string;
  closer: string;
  agendada: number;
  realizada: number;
  pitch: number;
  vendas: number;
  valor: number;
  primeiraParcela: number;
  updatedAt: string;
}

export interface CEOFinanceCustomCost {
  id: string;
  name: string;
  value: number;
}

export interface CEOFinanceSettings {
  trafficInvestment: number;
  payroll: number;
  fixedCosts: number;
  commissions: number;
  renewalsRevenue: number;
  mrr: number;
  taxes: number;
  tools: number;
  customCosts: CEOFinanceCustomCost[];
}

export const DEFAULT_COMERCIAL_CRIATIVOS: string[] = [
  'FORMS/CAIXINHA EVENTO 04',
  'FORMS/ADVENTO 03',
  'BOTOX',
  'CAIXA DE PERGUNTAS',
  'FORMS/CAIXINHA OFICIAL 01',
  'FORMS/CAIXINHA',
  'NAO IDENTIFICADO',
];

export const DEFAULT_COMERCIAL_FUNIS: string[] = [
  'INSTAGRAM',
  'MENSAGEM(WHATSAPP)',
  'FORMULARIO',
  'INDICACAO',
];

export const DEFAULT_COMMERCIAL_LOCAL_DATA: CommercialLocalData = {
  pipelineClients: [],
  salesGoals: [],
  sdrGoals: [],
  preSalesDailyLogs: [],
  closerDailyLogs: [],
  paymentReminders: [],
  criativos: [...DEFAULT_COMERCIAL_CRIATIVOS],
  funis: [...DEFAULT_COMERCIAL_FUNIS],
  catalogVersion: 0,
  teamPointer: '',
  agendaEvents: [],
  agendamentoLeads: [],
  schedulingGeneralGoals: {},
  whatsappReminderLogs: [],
  ceoFinance: {
    trafficInvestment: 0,
    payroll: 0,
    fixedCosts: 0,
    commissions: 0,
    renewalsRevenue: 0,
    mrr: 0,
    taxes: 0,
    tools: 0,
    customCosts: [],
  },
};

const STAGE_TO_AGENDAMENTO_STATUS: Record<string, string> = {
  NOVO: 'NOVO_LEAD',
  NO_SHOW: 'NO_SHOW',
  TAXA_INTERESSE: 'TAXA_INTERESSE',
  NEGOCIACAO: 'NEGOCIACAO',
  PERDIDO: 'PERDIDO',
  FECHADO: 'FECHADO',
};

const AGENDAMENTO_STATUS_TO_STAGE: Record<string, string> = {
  NOVO_LEAD: 'NOVO',
  NO_SHOW: 'NO_SHOW',
  TAXA_INTERESSE: 'TAXA_INTERESSE',
  NEGOCIACAO: 'NEGOCIACAO',
  PERDIDO: 'PERDIDO',
  FECHADO: 'FECHADO',
};

function onlyDigits(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function normalizePhone(value?: string | null) {
  const digits = onlyDigits(value);
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function peopleMatch(recordPhone: string | null | undefined, recordName: string | null | undefined, targetPhone: string, targetName: string) {
  const recordDigits = normalizePhone(recordPhone);
  if (recordDigits && targetPhone && recordDigits === targetPhone) return true;
  return Boolean(recordName && targetName && matchMeetingName(recordName) === matchMeetingName(targetName));
}

type AgendaEventLike = {
  event_date?: string | null;
  event_time?: string | null;
  client_phone?: string | null;
  client_name?: string | null;
};

function sameAgendaSlot(event: AgendaEventLike, date?: string | null, time?: string | null) {
  if (!date || !time) return false;
  return String(event?.event_date || '') === String(date) && toTime(event?.event_time) === toTime(time);
}

function findAgendaEventForSync(events: AgendaEventLike[], phone: string, name: string, date?: string | null, time?: string | null) {
  const exactMatch = events.find((event) =>
    sameAgendaSlot(event, date, time) && peopleMatch(event.client_phone, event.client_name, phone, name)
  );

  if (exactMatch) return exactMatch;
  return null;
}

function toLocalIsoDate(value?: string | Date | null) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function isoToBrazilianDate(value?: string | Date | null) {
  const isoDate = toLocalIsoDate(value);
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function brazilianToIsoDate(value?: string | null) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [day, month, year] = value.split('/');
  if (!day || !month || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function toTime(value?: string | null) {
  if (!value) return '';
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function toAgendaTime(value?: string | null) {
  const time = toTime(value);
  return time ? `${time}:00` : '';
}

function timeToPeriod(value?: string | null) {
  if (!value) return 'NAO_INFORMADO';
  const hour = Number(toTime(value).slice(0, 2));
  if (hour < 12) return 'MANHA';
  if (hour < 18) return 'TARDE';
  return 'NOITE';
}

function leadTimeToAgendaTime(lead: any) {
  if (lead.horario_especifico) return toAgendaTime(lead.horario_especifico);
  return '';
}

function normalizeFaturamento(value?: string | null) {
  switch (value) {
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

function normalizeBooleanAnswer(value?: string | null) {
  return coerceCommercialAnswer(value) || 'NAO_SEI';
}

function getStoredLeadOrigin(input: { creative_source?: string | null; criativo?: string | null; funil?: string | null }) {
  return getCommercialLeadOrigin(input);
}

function agendaColorForStage(stage?: string | null) {
  if (stage === 'NO_SHOW') return '#FF0000';
  if (stage === 'FECHADO' || stage === 'NEGOCIACAO' || stage === 'TAXA_INTERESSE') return '#66FF00';
  return '#3B82F6';
}

export function syncPipelineClientAutomations(current: CommercialLocalData, client: any): CommercialLocalData {
  const phone = normalizePhone(client.telefone);
  const clientName = normalizeMeetingClientName(client.clientName || client.nome || 'Lead sem nome') || 'Lead sem nome';
  const clinicName = client.clinicName || client.clinic_name || clientName;
  const meetingDate = toLocalIsoDate(client.meetingDate);
  const meetingTime = toTime(client.meetingTime);
  const now = new Date().toISOString();

  if (!meetingDate || !meetingTime) {
    const nextAgendaEvents = current.agendaEvents.filter((event: any) =>
      event.pipeline_client_id !== client.id && !peopleMatch(event.client_phone, event.client_name, phone, clientName)
    );
    const nextAgendamentoLeads = current.agendamentoLeads.filter((lead: any) =>
      lead.pipeline_client_id !== client.id && !peopleMatch(lead.telefone, lead.nome, phone, clientName)
    );
    return {
      ...current,
      agendaEvents: nextAgendaEvents,
      agendamentoLeads: nextAgendamentoLeads,
    };
  }

  const agendaEvent = {
    pipeline_client_id: client.id,
    id: `agenda-${crypto.randomUUID()}`,
    title: normalizeMeetingTitle(clientName) || `Reuniao com ${clientName}`,
    description: `Lead do Pipeline - ${getStoredLeadOrigin({ criativo: client.criativo, funil: client.funil })}`,
    notes: client.notes ?? null,
    client_name: clientName,
    client_phone: phone || '',
    clinic_name: clinicName,
    event_date: meetingDate,
    event_time: toAgendaTime(meetingTime),
    duration_minutes: 60,
    meeting_link: null,
    scheduled_by: client.agendadoPor || client.assignedSDR || null,
    lead_stage: client.stage || 'NOVO',
    creative_source: getStoredLeadOrigin({ criativo: client.criativo, funil: client.funil }) || null,
    color: agendaColorForStage(client.stage),
    reminder_2h_sent: false,
    reminder_30min_sent: false,
    created_by_user_id: client.createdByUserId || 'local-user',
    assigned_closer_id: null,
    created_at: now,
    updated_at: now,
  };

  const agendamentoLead = {
    pipeline_client_id: client.id,
    id: `agendamento-${crypto.randomUUID()}`,
    data: isoToBrazilianDate(meetingDate),
    nome: clientName,
    telefone: phone || '',
    horario: timeToPeriod(meetingTime),
    horario_especifico: meetingTime,
    tem_socio: coerceCommercialAnswer(client.temSocio, 'NAO'),
    tem_mkt: coerceCommercialAnswer(client.temMkt, 'NAO'),
    tem_secretaria: coerceCommercialAnswer(client.temSecretaria) || 'NAO_SEI',
    salao_ou_clinica: client.salaoOuClinica || 'NAO_INFORMADO',
    faturamento: normalizeFaturamento(client.faturamento),
    pode_investir: client.podeInvestir || null,
    agendado_via: client.agendadoVia || null,
    funil: getStoredLeadOrigin({ criativo: client.criativo, funil: client.funil, creative_source: null }) || 'NAO IDENTIFICADO',
    status: STAGE_TO_AGENDAMENTO_STATUS[client.stage] || 'NOVO_LEAD',
    created_by_user_id: client.createdByUserId || 'local-user',
    created_at: now,
    updated_at: now,
    agenda_event_date: meetingDate,
    agenda_event_time: toAgendaTime(meetingTime),
  };

  return {
    ...current,
    agendaEvents: [
      agendaEvent,
      ...current.agendaEvents.filter((event: any) =>
        event.pipeline_client_id !== client.id && !peopleMatch(event.client_phone, event.client_name, phone, clientName)
      ),
    ],
    agendamentoLeads: [
      agendamentoLead,
      ...current.agendamentoLeads.filter((lead: any) =>
        lead.pipeline_client_id !== client.id && !peopleMatch(lead.telefone, lead.nome, phone, clientName)
      ),
    ],
  };
}

export function syncAgendamentoLeadAutomations(
  current: CommercialLocalData,
  lead: any,
  fallbackPipelineClient?: any,
  agendaEventId?: string | null,
  options?: { allowPersonMatch?: boolean; syncPipeline?: boolean }
): CommercialLocalData {
  const phone = normalizePhone(lead.telefone);
  const clientName = normalizeMeetingClientName(lead.nome || fallbackPipelineClient?.clientName || 'Lead sem nome') || 'Lead sem nome';
  const clinicName = lead.clinic_name || fallbackPipelineClient?.clinicName || fallbackPipelineClient?.clinic_name || clientName;
  const meetingDate = brazilianToIsoDate(lead.data || lead.agenda_event_date);
  const agendaTime = leadTimeToAgendaTime(lead);
  const meetingTime = agendaTime.slice(0, 5);
  const agendaStage = AGENDAMENTO_STATUS_TO_STAGE[lead.status] || fallbackPipelineClient?.stage || 'NOVO';
  const now = new Date().toISOString();
  const allowPersonMatch = options?.allowPersonMatch !== false;
  const syncPipeline = options?.syncPipeline !== false;

  if (!meetingDate || !agendaTime) {
    const targetEventId = agendaEventId || current.agendaEvents.find((event: any) =>
      peopleMatch(event.client_phone, event.client_name, phone, clientName)
    )?.id;
    const nextAgendaEvents = current.agendaEvents.filter((event: any) =>
      event.id !== targetEventId && event.pipeline_client_id !== lead.pipeline_client_id && !peopleMatch(event.client_phone, event.client_name, phone, clientName)
    );
    const nextAgendamentoLeads = current.agendamentoLeads.filter((item: any) =>
      item.id !== lead.id && item.pipeline_client_id !== lead.pipeline_client_id && !peopleMatch(item.telefone, item.nome, phone, clientName)
    );
    return {
      ...current,
      agendaEvents: nextAgendaEvents,
      agendamentoLeads: nextAgendamentoLeads,
    };
  }

  const existingEvent = agendaEventId
    ? current.agendaEvents.find((event: any) => event.id === agendaEventId)
    : findAgendaEventForSync(current.agendaEvents, phone, clientName, meetingDate, meetingTime);

  const agendaEvent = {
    ...(existingEvent || {}),
    id: existingEvent?.id || `agenda-${crypto.randomUUID()}`,
    title: String(existingEvent?.title || '').trim() || `Reuniao com ${clientName}`,
    description: existingEvent?.description || `Lead de Agendamento - ${getStoredLeadOrigin({ criativo: fallbackPipelineClient?.criativo, funil: lead.funil })}`,
    notes: existingEvent?.notes ?? lead.notes ?? null,
    client_name: existingEvent?.client_name || clientName,
    client_phone: existingEvent?.client_phone || phone || '',
    clinic_name: existingEvent?.clinic_name || clinicName,
    event_date: existingEvent?.event_date || meetingDate,
    event_time: existingEvent?.event_time || agendaTime,
    duration_minutes: existingEvent?.duration_minutes || 60,
    meeting_link: existingEvent?.meeting_link || null,
    scheduled_by: existingEvent?.scheduled_by || lead.agendado_por || fallbackPipelineClient?.agendadoPor || null,
    lead_stage: existingEvent?.lead_stage || agendaStage,
    creative_source: existingEvent?.creative_source || getStoredLeadOrigin({ criativo: fallbackPipelineClient?.criativo, funil: lead.funil, creative_source: existingEvent?.creative_source }) || null,
    color: existingEvent?.color || agendaColorForStage(agendaStage),
    reminder_2h_sent: existingEvent?.reminder_2h_sent || false,
    reminder_30min_sent: existingEvent?.reminder_30min_sent || false,
    created_by_user_id: lead.created_by_user_id || existingEvent?.created_by_user_id || 'local-user',
    assigned_closer_id: existingEvent?.assigned_closer_id || null,
    created_at: existingEvent?.created_at || now,
    updated_at: now,
  };

  const resolvedAgendaEventId = agendaEvent.id;
  const nextAgendamentoLeads = current.agendamentoLeads.map((item: any) => {
    if (item.id !== lead.id) return item;
    return {
      ...item,
      pipeline_client_id: lead.pipeline_client_id || item.pipeline_client_id || fallbackPipelineClient?.id || null,
      data: isoToBrazilianDate(meetingDate),
      nome: clientName,
      telefone: phone || item.telefone,
      horario: timeToPeriod(meetingTime),
      horario_especifico: meetingTime,
      tem_socio: coerceCommercialAnswer(lead.tem_socio, 'NAO'),
      tem_mkt: coerceCommercialAnswer(lead.tem_mkt, 'NAO'),
      tem_secretaria: coerceCommercialAnswer(lead.tem_secretaria) || 'NAO_SEI',
      salao_ou_clinica: lead.salaoOuClinica || item.salao_ou_clinica || 'NAO_INFORMADO',
      faturamento: normalizeFaturamento(lead.faturamento),
      pode_investir: lead.pode_investir || item.pode_investir || null,
      agendado_via: lead.agendado_via || item.agendado_via || null,
      funil: getStoredLeadOrigin({ criativo: fallbackPipelineClient?.criativo, funil: lead.funil }) || item.funil,
      status: STAGE_TO_AGENDAMENTO_STATUS[lead.stage] || item.status || 'NOVO_LEAD',
      created_by_user_id: lead.created_by_user_id || item.created_by_user_id || 'local-user',
      updated_at: now,
      agenda_event_id: resolvedAgendaEventId,
      agenda_event_date: meetingDate,
      agenda_event_time: toAgendaTime(meetingTime),
      agenda_event_title: agendaEvent.title,
    };
  });

  if (!syncPipeline) {
    return {
      ...current,
      agendaEvents: existingEvent
        ? current.agendaEvents.map((event: any) => event.id === existingEvent.id ? agendaEvent : event)
        : [agendaEvent, ...current.agendaEvents],
      agendamentoLeads: nextAgendamentoLeads,
      pipelineClients: current.pipelineClients,
    };
  }

  return {
    ...current,
    agendaEvents: existingEvent
      ? current.agendaEvents.map((event: any) => event.id === existingEvent.id ? agendaEvent : event)
      : [agendaEvent, ...current.agendaEvents],
    agendamentoLeads: nextAgendamentoLeads,
    pipelineClients: current.pipelineClients.map((client: any) => {
      const targetPipelineClientId = lead.pipeline_client_id || fallbackPipelineClient?.id || null;
      if (targetPipelineClientId) {
        if (client.id !== targetPipelineClientId) return client;
      } else if (!allowPersonMatch || !peopleMatch(client.telefone, client.clientName, phone, clientName)) {
        return client;
      }

      return {
        ...client,
        clientName,
        telefone: phone || client.telefone,
        criativo: getStoredLeadOrigin({ criativo: client.criativo, funil: lead.funil }),
        faturamento: normalizeFaturamento(lead.faturamento),
        meetingDate,
        meetingTime,
    temSocio: coerceCommercialAnswer(lead.tem_socio, 'NAO'),
    temMkt: coerceCommercialAnswer(lead.tem_mkt, 'NAO'),
    temSecretaria: coerceCommercialAnswer(lead.tem_secretaria) || 'NAO_SEI',
        salaoOuClinica: lead.salao_ou_clinica || client.salaoOuClinica,
      };
    }),
  };
}

export function syncAllCommercialAutomations(current: CommercialLocalData): CommercialLocalData {
  return current.pipelineClients.reduce(
    (next: CommercialLocalData, client: any) => syncPipelineClientAutomations(next, client),
    current
  );
}

export function readCommercialLocalData(): CommercialLocalData {
  const raw = safeGetItem(COMMERCIAL_LOCAL_DATA_KEY);
  const criativosRaw = safeGetItem(COMMERCIAL_LOCAL_CRIATIVOS_KEY);
  const funisRaw = safeGetItem(COMMERCIAL_LOCAL_FUNIS_KEY);
  const catalogVersionRaw = safeGetItem(COMMERCIAL_LOCAL_CATALOG_VERSION_KEY);
  const storedCatalogVersion = Number(catalogVersionRaw || 0) || 0;

  if (!raw) {
    const criativos = normalizeUniqueList(parseStringList(criativosRaw) || [...DEFAULT_COMERCIAL_CRIATIVOS]);
    const funis = normalizeUniqueList(parseStringList(funisRaw) || [...DEFAULT_COMERCIAL_FUNIS]);
    return {
      ...DEFAULT_COMMERCIAL_LOCAL_DATA,
      criativos,
      funis,
      catalogVersion: storedCatalogVersion > 0 ? storedCatalogVersion : (criativos.length > 0 || funis.length > 0 ? 1 : 0),
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const localCriativos = parseStringList(criativosRaw);
    const localFunis = parseStringList(funisRaw);
    const parsedVersion = Number(parsed.catalogVersion || storedCatalogVersion || 0) || 0;
    return {
      ...DEFAULT_COMMERCIAL_LOCAL_DATA,
      ...parsed,
      criativos: normalizeUniqueList(localCriativos.length > 0 ? localCriativos : (parsed.criativos || DEFAULT_COMERCIAL_CRIATIVOS)),
      funis: normalizeUniqueList(localFunis.length > 0 ? localFunis : (parsed.funis || [...DEFAULT_COMERCIAL_FUNIS])),
      catalogVersion: parsedVersion > 0 ? parsedVersion : ((localCriativos.length > 0 || localFunis.length > 0 || (parsed.criativos?.length || 0) > 0 || (parsed.funis?.length || 0) > 0) ? 1 : 0),
    };
  } catch {
    const criativos = normalizeUniqueList(parseStringList(criativosRaw) || [...DEFAULT_COMERCIAL_CRIATIVOS]);
    const funis = normalizeUniqueList(parseStringList(funisRaw) || [...DEFAULT_COMERCIAL_FUNIS]);
    return {
      ...DEFAULT_COMMERCIAL_LOCAL_DATA,
      criativos,
      funis,
      catalogVersion: storedCatalogVersion > 0 ? storedCatalogVersion : (criativos.length > 0 || funis.length > 0 ? 1 : 0),
    };
  }
}

export function writeCommercialLocalData(data: CommercialLocalData) {
  safeSetItem(COMMERCIAL_LOCAL_DATA_KEY, JSON.stringify(data));
  safeSetItem(COMMERCIAL_LOCAL_CRIATIVOS_KEY, JSON.stringify(data.criativos || []));
  safeSetItem(COMMERCIAL_LOCAL_FUNIS_KEY, JSON.stringify(data.funis || []));
  safeSetItem(COMMERCIAL_LOCAL_CATALOG_VERSION_KEY, String(data.catalogVersion || 0));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('great-commercial-local-data-updated'));
  }
}

export function clearCommercialLocalData() {
  safeRemoveItem(COMMERCIAL_LOCAL_DATA_KEY);
  safeRemoveItem(COMMERCIAL_LOCAL_CRIATIVOS_KEY);
  safeRemoveItem(COMMERCIAL_LOCAL_FUNIS_KEY);
  safeRemoveItem(COMMERCIAL_LOCAL_CATALOG_VERSION_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('great-commercial-local-data-updated'));
  }
}
function parseStringList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return Array.from(new Set(parsed.map((item) => String(item).trim().toUpperCase()).filter(Boolean)));
    }
  } catch {
    return raw
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
}

function normalizeUniqueList(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => String(item).trim().toUpperCase()).filter(Boolean))).sort();
}

export function updateCommercialLocalData(
  updater: (current: CommercialLocalData) => CommercialLocalData
): CommercialLocalData {
  const next = updater(readCommercialLocalData());
  writeCommercialLocalData(next);
  return next;
}


