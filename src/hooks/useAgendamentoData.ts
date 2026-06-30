import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCommercialSafe } from '@/contexts/CommercialContext';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { readCommercialLocalData, syncAgendamentoLeadAutomations, updateCommercialLocalData } from '@/lib/commercialLocalStore';
import { savePipelineClientToCloud } from '@/lib/commercialCloudStore';
import { getCommercialLeadOrigin } from '@/lib/commercialOrigin';
import { agendamentoToPipeline, AGENDAMENTO_STATUS_TO_PIPELINE_STAGE } from './usePipelineAgendamentoSync';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import { COMMERCIAL_YES_NO_MAYBE_OPTIONS, commercialAnswerToDb, coerceCommercialAnswer, type CommercialYesNoMaybe } from '@/lib/commercialAnswer';
import { matchMeetingName, normalizeMeetingClientName, normalizeMeetingTitle } from '@/lib/agendaTitle';

function normalizeAgendamentoLeadAnswers(lead: AgendamentoLead): AgendamentoLead {
  return {
    ...lead,
    tem_socio: commercialAnswerToDb(lead.tem_socio),
    tem_mkt: commercialAnswerToDb(lead.tem_mkt),
    tem_secretaria: commercialAnswerToDb(lead.tem_secretaria),
  };
}

export interface AgendamentoLead {
  id: string;
  pipeline_client_id?: string | null;
  agenda_event_id?: string | null;
  data: string;
  nome: string;
  telefone: string;
  horario: 'MANHA' | 'TARDE' | 'NOITE';
  horario_especifico?: string;
  tem_socio: CommercialYesNoMaybe;
  tem_mkt: CommercialYesNoMaybe;
  tem_secretaria: CommercialYesNoMaybe;
  salao_ou_clinica: 'SALAO' | 'CLINICA' | 'NAO_INFORMADO';
  faturamento:
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
  pode_investir?: 'SIM' | 'NAO' | null;
  agendado_via?: string | null;
  funil: string;
  status: string;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  agenda_event_date?: string | null;
  agenda_event_time?: string | null;
  agenda_event_title?: string | null;
}

export type AgendamentoLeadInsert = Omit<AgendamentoLead, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id'> & { horario_especifico?: string; pode_investir?: 'SIM' | 'NAO' | null };
export type AgendamentoLeadUpdate = Partial<AgendamentoLeadInsert> & {
  agenda_event_id?: string | null;
};

export const HORARIO_OPTIONS = [
  { value: 'MANHA', label: 'MANHA' },
  { value: 'TARDE', label: 'TARDE' },
  { value: 'NOITE', label: 'NOITE' },
] as const;

export const TEM_SOCIO_OPTIONS = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Nao' },
] as const;

export const TEM_MKT_OPTIONS = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Nao' },
] as const;

export const TEM_SECRETARIA_OPTIONS = COMMERCIAL_YES_NO_MAYBE_OPTIONS;

export const SALAO_OU_CLINICA_OPTIONS = [
  { value: 'SALAO', label: 'SALAO' },
  { value: 'CLINICA', label: 'CLINICA' },
  { value: 'NAO_INFORMADO', label: 'NAO INFORMADO' },
] as const;

export const FATURAMENTO_OPTIONS = [
  { value: '0_A_10K', label: 'R$ 0 até R$ 10 mil' },
  { value: '10K_A_20K', label: 'R$ 10 mil até R$ 20 mil' },
  { value: '20K_A_30K', label: 'R$ 20 mil até R$ 30 mil' },
  { value: '30K_A_50K', label: 'R$ 30 mil até R$ 50 mil' },
  { value: '50K_A_80K', label: 'R$ 50 mil até R$ 80 mil' },
  { value: '80K_A_100K', label: 'R$ 80 mil até R$ 100 mil' },
  { value: '100K_A_150K', label: 'R$ 100 mil até R$ 150 mil' },
  { value: '150K_A_250K', label: 'R$ 150 mil até R$ 250 mil' },
  { value: '250K_A_400K', label: 'R$ 250 mil até R$ 400 mil' },
  { value: '400K_A_600K', label: 'R$ 400 mil até R$ 600 mil' },
  { value: '600K_A_1M', label: 'R$ 600 mil até R$ 1 milhão' },
  { value: '1M_PLUS', label: 'Mais de 1 milhão' },
  { value: 'NAO_INFORMADO', label: 'Nao Informado' },
] as const;

export function normalizeAgendamentoFaturamento(value?: string | null): AgendamentoLead['faturamento'] {
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

export const FUNIL_OPTIONS = [
  'INSTAGRAM',
  'CAIXA DE PERGUNTAS',
  'IA',
  'PROMOCAO',
  'ATENCAO DONA',
  'JALECO',
  'NAO IDENTIFICADO',
  'INDICACAO',
  'FORMULARIO',
] as const;

export const STATUS_OPTIONS = [
  { value: 'NOVO_LEAD', label: 'Novo Lead', pipelineStage: 'NOVO' },
  { value: 'NO_SHOW', label: 'No Show', pipelineStage: 'NO_SHOW' },
  { value: 'TAXA_INTERESSE', label: 'Taxa de Interesse', pipelineStage: 'TAXA_INTERESSE' },
  { value: 'NEGOCIACAO', label: 'Negociacao', pipelineStage: 'NEGOCIACAO' },
  { value: 'PERDIDO', label: 'Perdido', pipelineStage: 'PERDIDO' },
  { value: 'FECHADO', label: 'Fechado', pipelineStage: 'FECHADO' },
] as const;

export type AgendamentoStatus = typeof STATUS_OPTIONS[number]['value'];

export const PIPELINE_STAGE_TO_STATUS: Record<string, AgendamentoStatus> = {
  NOVO: 'NOVO_LEAD',
  NO_SHOW: 'NO_SHOW',
  TAXA_INTERESSE: 'TAXA_INTERESSE',
  NEGOCIACAO: 'NEGOCIACAO',
  PERDIDO: 'PERDIDO',
  FECHADO: 'FECHADO',
};

function buildLeadWithAgenda(lead: any, agendaEvents: any[]): any {
  const leadPhone = lead.telefone?.replace(/\D/g, '');
  const leadName = matchMeetingName(lead.nome || '');
  const agendaDate = lead.agenda_event_date || null;
  const agendaTime = lead.agenda_event_time || null;

  const agendaEvent =
    (lead.agenda_event_id && agendaEvents.find((event: any) => event.id === lead.agenda_event_id)) ||
    agendaEvents.find((event: any) => {
      const eventPhone = event.client_phone?.replace(/\D/g, '');
      const eventName = matchMeetingName(event.client_name || event.title || '');
      return (
        agendaDate &&
        agendaTime &&
        String(event?.event_date || '') === String(agendaDate) &&
        normalizeAgendaTime(event?.event_time) === normalizeAgendaTime(agendaTime) &&
        (
          (leadPhone && eventPhone && leadPhone === eventPhone) ||
          (leadName && eventName && leadName === eventName)
        )
      );
    });

  return {
    ...lead,
    agenda_event_date: agendaEvent?.event_date || null,
    agenda_event_time: agendaEvent?.event_time || null,
    meetingDate: agendaEvent?.event_date || lead.agenda_event_date || null,
    meetingTime: agendaEvent?.event_time || lead.agenda_event_time || lead.horario_especifico || null,
    stage: lead.stage || AGENDAMENTO_STATUS_TO_PIPELINE_STAGE[lead.status] || 'NOVO',
    agendadoPor: lead.agendadoPor || lead.assignedSDR || null,
    creativeSource: lead.creativeSource || getCommercialLeadOrigin({ criativo: lead.criativo, funil: lead.funil }),
  };
}

function normalizePhoneDigits(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeLeadDateKey(value?: string | null) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function normalizeLeadTimeKey(value?: string | null) {
  if (!value) return '';
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
}

function buildAgendamentoIdentity(lead: {
  telefone?: string | null;
  nome?: string | null;
  data?: string | null;
  horario_especifico?: string | null;
  agenda_event_date?: string | null;
  agenda_event_time?: string | null;
  meetingDate?: string | null;
  meetingTime?: string | null;
}) {
  const phone = normalizePhoneDigits(lead.telefone);
  const name = normalizeMeetingClientName(lead.nome || '');
  const date = normalizeLeadDateKey(lead.data || lead.agenda_event_date || lead.meetingDate);
  const time = normalizeLeadTimeKey(lead.horario_especifico || lead.agenda_event_time || lead.meetingTime);
  return { phone, name, date, time };
}

function agendamentoLeadMatches(left: any, right: any) {
  const leftPipelineClientId = String(left.pipeline_client_id || '').trim();
  const rightPipelineClientId = String(right.pipeline_client_id || '').trim();
  if (leftPipelineClientId && rightPipelineClientId && leftPipelineClientId === rightPipelineClientId) {
    return true;
  }

  const leftAgendaEventId = String(left.agenda_event_id || '').trim();
  const rightAgendaEventId = String(right.agenda_event_id || '').trim();
  if (leftAgendaEventId && rightAgendaEventId && leftAgendaEventId === rightAgendaEventId) {
    return true;
  }

  const leftIdentity = buildAgendamentoIdentity(left);
  const rightIdentity = buildAgendamentoIdentity(right);
  const phoneMatch = leftIdentity.phone && rightIdentity.phone && leftIdentity.phone === rightIdentity.phone;
  const nameMatch = leftIdentity.name && rightIdentity.name && leftIdentity.name === rightIdentity.name;
  const dateMatch = !leftIdentity.date || !rightIdentity.date || leftIdentity.date === rightIdentity.date;
  const timeMatch = !leftIdentity.time || !rightIdentity.time || leftIdentity.time === rightIdentity.time;

  if (phoneMatch && dateMatch && timeMatch) return true;
  return Boolean(nameMatch && dateMatch && timeMatch);
}

function pipelineClientToAgendamentoLead(client: any, agendaEvents: any[]) {
  if (!client?.meetingDate || !client?.meetingTime) return null;

  const meetingDate = normalizeLeadDateKey(client.meetingDate);
  const meetingTime = normalizeLeadTimeKey(client.meetingTime);
  if (!meetingDate || !meetingTime) return null;

  const leadName = normalizeMeetingClientName(client.clientName || client.nome || 'Lead sem nome') || 'Lead sem nome';
  const leadPhone = formatPhoneForWhatsApp(client.telefone || '');
  const existingEvent =
    agendaEvents.find((event: any) => {
      const eventPhone = normalizePhoneDigits(event.client_phone);
      const eventName = normalizeMeetingClientName(event.client_name || event.title || '');
      return (
        String(event?.event_date || '') === meetingDate &&
        normalizeLeadTimeKey(event?.event_time) === meetingTime &&
        (
          (leadPhone && eventPhone && leadPhone.replace(/\D/g, '') === eventPhone) ||
          (leadName && eventName && leadName === eventName)
        )
      );
    }) || null;

  return {
    id: `agendamento-${client.id || crypto.randomUUID()}`,
    pipeline_client_id: client.id || null,
    agenda_event_id: existingEvent?.id || null,
    data: `${meetingDate.split('-')[2]}/${meetingDate.split('-')[1]}/${meetingDate.split('-')[0]}`,
    nome: client.clientName || leadName,
    telefone: leadPhone,
    horario: client.meetingTime
      ? Number(meetingTime.slice(0, 2)) < 12
        ? 'MANHA'
        : Number(meetingTime.slice(0, 2)) < 17
          ? 'TARDE'
          : 'NOITE'
      : 'MANHA',
    horario_especifico: meetingTime,
    tem_socio: commercialAnswerToDb(client.temSocio || client.tem_socio || 'NAO'),
    tem_mkt: commercialAnswerToDb(client.temMkt || client.tem_mkt || 'NAO'),
    tem_secretaria: commercialAnswerToDb(client.temSecretaria || client.tem_secretaria || 'NAO_SEI'),
    salao_ou_clinica: client.salaoOuClinica || client.salao_ou_clinica || 'NAO_INFORMADO',
    faturamento: normalizeAgendamentoFaturamento(client.faturamento),
    pode_investir: client.podeInvestir || client.pode_investir || null,
    agendado_via: client.agendadoVia || client.agendado_via || null,
    funil: getCommercialLeadOrigin({ criativo: client.criativo, funil: client.funil }),
    status: PIPELINE_STAGE_TO_STATUS[client.stage || 'NOVO'] || 'NOVO_LEAD',
    created_by_user_id: client.createdByUserId || client.created_by_user_id || null,
    created_at: client.createdAt ? new Date(client.createdAt).toISOString() : new Date().toISOString(),
    updated_at: client.updatedAt ? new Date(client.updatedAt).toISOString() : new Date().toISOString(),
    agenda_event_date: meetingDate,
    agenda_event_time: meetingTime,
    agenda_event_title: existingEvent?.title || `Reuniao com ${leadName}`,
    stage: client.stage || 'NOVO',
    agendadoPor: client.agendadoPor || client.assignedSDR || null,
    creativeSource: getCommercialLeadOrigin({ creativeSource: client.creativeSource, creative_source: client.creative_source, criativo: client.criativo, funil: client.funil }),
  };
}

type AgendaEventLike = {
  event_date?: string | null;
  event_time?: string | null;
  client_phone?: string | null;
  client_name?: string | null;
  title?: string | null;
  pipeline_client_id?: string | null;
};

function normalizeAgendaTime(value?: string | null) {
  if (!value) return '';
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
}

function matchesAgendaSlot(event: AgendaEventLike, date?: string | null, time?: string | null) {
  if (!date || !time) return false;
  return String(event?.event_date || '') === String(date)
    && normalizeAgendaTime(event?.event_time) === normalizeAgendaTime(time);
}

function findMatchingAgendaEvent(agendaEvents: AgendaEventLike[], target: {
  phoneDigits: string;
  leadName: string;
  previousPhoneDigits: string;
  previousLeadName: string;
  agendaDate?: string | null;
  agendaTime?: string | null;
  agendaEventId?: string | null;
}) {
  if (target.agendaEventId) {
    const byId = agendaEvents.find((event: any) => event.id === target.agendaEventId);
    if (byId) return byId;
  }

  const exactMatch = agendaEvents.find((event) => {
    const eventPhoneDigits = normalizePhoneDigits(event.client_phone);
    const eventName = matchMeetingName(event.client_name || event.title || '');
    return (
      matchesAgendaSlot(event, target.agendaDate, target.agendaTime) &&
      (
        (target.phoneDigits && eventPhoneDigits && target.phoneDigits === eventPhoneDigits) ||
        (target.previousPhoneDigits && eventPhoneDigits && target.previousPhoneDigits === eventPhoneDigits) ||
        (target.leadName && eventName && target.leadName.toLowerCase() === eventName) ||
        (target.previousLeadName && eventName && target.previousLeadName === eventName)
      )
    );
  });

  if (exactMatch) return exactMatch;

  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    }),
  ]);
}

export function useAgendamentoData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const commercial = useCommercialSafe();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['agendamento-leads'],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return (readCommercialLocalData().agendamentoLeads || []).map((lead: any) => normalizeAgendamentoLeadAnswers(lead)) as AgendamentoLead[];
      }
      const [{ data: agendamentoLeads, error: leadsError }, { data: agendaEvents, error: agendaError }] = await withTimeout(
        Promise.all([
          supabase.from('agendamento_leads').select('*').order('created_at', { ascending: false }),
          supabase.from('agenda_events').select('*').order('event_date', { ascending: true }),
        ]),
        7000,
        'agendamento_leads'
      );
      if (leadsError) throw leadsError;
      if (agendaError) throw agendaError;

      return (agendamentoLeads || []).map((lead: any) => buildLeadWithAgenda(
        normalizeAgendamentoLeadAnswers({
          ...lead,
          faturamento: normalizeAgendamentoFaturamento(lead.faturamento),
        }),
        agendaEvents || []
      ));
    },
  });

  const createLead = useMutation({
    mutationFn: async (lead: AgendamentoLeadInsert) => {
      if (!isSupabaseConfigured) {
        const formattedPhone = formatPhoneForWhatsApp(lead.telefone);
        const newLead = {
          id: `agendamento-${crypto.randomUUID()}`,
          ...lead,
          telefone: formattedPhone,
          created_by_user_id: user?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as AgendamentoLead;

        updateCommercialLocalData((current) => {
          const exists = current.agendamentoLeads.some((item: any) =>
            String(item.telefone || '').replace(/\D/g, '') === formattedPhone.replace(/\D/g, '')
          );
          const nextLeads = exists
            ? current.agendamentoLeads.map((item: any) =>
                String(item.telefone || '').replace(/\D/g, '') === formattedPhone.replace(/\D/g, '')
                  ? newLead
                  : item
              )
            : [newLead, ...current.agendamentoLeads];
          const pipelineData = agendamentoToPipeline(newLead as any, user?.id || 'cloud-user', commercial?.nextTeamInQueue || 'team-equipe-7');
          const nextPipelineClients = exists
            ? current.pipelineClients
            : [{ ...pipelineData, id: `pipeline-${crypto.randomUUID()}`, createdByUserId: user?.id || 'cloud-user', createdAt: new Date(), dataEntrada: new Date() }, ...current.pipelineClients];
          const synced = syncAgendamentoLeadAutomations({
            ...current,
            agendamentoLeads: nextLeads,
            pipelineClients: nextPipelineClients,
          }, newLead, pipelineData);
          return synced;
        });
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));

        return newLead;
      }

      const formattedPhone = formatPhoneForWhatsApp(lead.telefone);
      const { data: existingLeads } = await supabase.from('agendamento_leads').select('id, telefone').limit(1000);
      const duplicate = (existingLeads || []).find((item: any) => item.telefone.replace(/\D/g, '') === formattedPhone.replace(/\D/g, ''));

      if (duplicate) {
        throw new Error('DUPLICATE:Esse lead ja foi cadastrado. Edite o lead existente.');
      }

      const pipelineData = agendamentoToPipeline(
        {
          ...lead,
          telefone: formattedPhone,
        } as any,
        user?.id || 'cloud-user',
        commercial?.nextTeamInQueue || 'team-equipe-7'
      );

      const savedPipeline = await savePipelineClientToCloud({
        ...pipelineData,
        telefone: formattedPhone,
        createdByUserId: user?.id || 'cloud-user',
        createdAt: new Date(),
        dataEntrada: new Date(),
      } as any, user?.id);

      const payload = {
        ...lead,
        telefone: formattedPhone,
        pipeline_client_id: savedPipeline?.id || null,
        created_by_user_id: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('agendamento_leads')
        .upsert(payload as any, { onConflict: 'pipeline_client_id' })
        .select('*')
        .single();
      if (error) throw error;

      return data as AgendamentoLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Lead adicionado com sucesso!');
    },
    onError: (error) => {
      const message = error instanceof Error && error.message.startsWith('DUPLICATE:')
        ? error.message.replace('DUPLICATE:', '')
        : 'Erro ao adicionar lead';
      toast.error(message);
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & AgendamentoLeadUpdate) => {
      const { agenda_event_date, agenda_event_time, agenda_event_title, agenda_event_id, ...dbUpdates } = updates as AgendamentoLeadUpdate & {
        agenda_event_date?: string | null;
        agenda_event_time?: string | null;
        agenda_event_title?: string | null;
        agenda_event_id?: string | null;
      };

      if (!isSupabaseConfigured) {
        const { agenda_event_id, ...safeDbUpdates } = dbUpdates as AgendamentoLeadUpdate & { agenda_event_id?: string | null };
        const formattedPhone = safeDbUpdates.telefone ? formatPhoneForWhatsApp(safeDbUpdates.telefone) : undefined;
        updateCommercialLocalData((current) => {
          const nextLeads = current.agendamentoLeads.map((item: any) =>
            item.id === id
              ? {
                  ...item,
                  ...safeDbUpdates,
                  ...(formattedPhone ? { telefone: formattedPhone } : {}),
                  updated_at: new Date().toISOString(),
                }
              : item
          );
          const updatedLead = nextLeads.find((item: any) => item.id === id);
          const fallbackPipelineClientId = (updatedLead as any)?.pipeline_client_id || (nextLeads.find((item: any) => item.id === id) as any)?.pipeline_client_id || null;
          const fallbackPipelineClient = fallbackPipelineClientId
            ? current.pipelineClients.find((client: any) => client.id === fallbackPipelineClientId)
            : null;
          const synced = updatedLead
            ? syncAgendamentoLeadAutomations(
                {
                  ...current,
                  agendamentoLeads: nextLeads,
                },
                updatedLead,
                fallbackPipelineClient,
                agenda_event_id || (updatedLead as any)?.agenda_event_id || null,
                { allowPersonMatch: false }
              )
            : { ...current, agendamentoLeads: nextLeads };
          return synced;
        });
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return { id, ...safeDbUpdates } as AgendamentoLead;
      }
      const { data: previousLead } = await supabase.from('agendamento_leads').select('*').eq('id', id).single();

      const payload = {
        ...dbUpdates,
        telefone: dbUpdates.telefone ? formatPhoneForWhatsApp(dbUpdates.telefone) : undefined,
        updated_at: new Date().toISOString(),
      };
      const { data: updatedLead, error } = await supabase.from('agendamento_leads').update(payload).eq('id', id).select('*').single();
      if (error) throw error;

      const leadPhone = formatPhoneForWhatsApp(updatedLead.telefone || dbUpdates.telefone || '');
      const leadPhoneDigits = normalizePhoneDigits(leadPhone);
      const leadName = normalizeMeetingClientName(updatedLead.nome || '');
      const previousLeadPhoneDigits = normalizePhoneDigits(previousLead?.telefone);
      const previousLeadName = matchMeetingName(previousLead?.nome || '');
      const linkedAgendaEventId = agenda_event_id || (previousLead as any)?.agenda_event_id || (updatedLead as any)?.agenda_event_id || null;
      const agendaDate = agenda_event_date || updatedLead.data || null;
      const agendaTime = agenda_event_time || updatedLead.horario_especifico || null;

      try {
        if (agendaDate && agendaTime) {
          const { data: agendaEvents, error: agendaError } = await supabase.from('agenda_events').select('*').limit(1000);
          if (agendaError) throw agendaError;

          const matchingEvent = findMatchingAgendaEvent(agendaEvents || [], {
            phoneDigits: leadPhoneDigits,
            leadName,
            previousPhoneDigits: previousLeadPhoneDigits,
            previousLeadName,
            agendaDate,
            agendaTime,
            agendaEventId: linkedAgendaEventId,
          });

          const explicitAgendaTitle = normalizeMeetingTitle(agenda_event_title || '') || '';
          const existingAgendaTitle = String(matchingEvent?.title || '').trim();
          const defaultAgendaTitle = normalizeMeetingTitle(leadName || updatedLead.nome || 'Lead') || `Reuniao com ${leadName || updatedLead.nome || 'Lead'}`;
          const nextAgendaTitle = explicitAgendaTitle || existingAgendaTitle || defaultAgendaTitle;
          const nextAgendaPipelineClientId = matchingEvent?.pipeline_client_id || (linkedAgendaEventId ? (updatedLead as any)?.pipeline_client_id || null : null);

          const agendaPayload = {
            ...(matchingEvent || {}),
            pipeline_client_id: nextAgendaPipelineClientId,
            title: nextAgendaTitle,
            description: matchingEvent?.description || (updatedLead.funil ? `Lead de Agendamento - ${updatedLead.funil}` : 'Lead de Agendamento'),
            notes: matchingEvent?.notes ?? updatedLead.notes ?? null,
            client_name: leadName || normalizeMeetingClientName(matchingEvent?.client_name) || 'Lead sem nome',
            client_phone: matchingEvent?.client_phone || leadPhone || '',
            clinic_name: matchingEvent?.clinic_name || updatedLead.clinic_name || leadName || 'Lead sem nome',
            event_date: matchingEvent?.event_date || agendaDate,
            event_time: matchingEvent?.event_time || (agendaTime.length === 5 ? `${agendaTime}:00` : agendaTime),
            duration_minutes: matchingEvent?.duration_minutes || 60,
            meeting_link: matchingEvent?.meeting_link || null,
            scheduled_by: matchingEvent?.scheduled_by || updatedLead.agendado_por || null,
            lead_stage: matchingEvent?.lead_stage || AGENDAMENTO_STATUS_TO_PIPELINE_STAGE[updatedLead.status] || 'NOVO',
            creative_source: matchingEvent?.creative_source || updatedLead.funil || null,
            color: matchingEvent?.color || '#3B82F6',
            reminder_2h_sent: matchingEvent?.reminder_2h_sent || false,
            reminder_30min_sent: matchingEvent?.reminder_30min_sent || false,
            created_by_user_id: matchingEvent?.created_by_user_id || updatedLead.created_by_user_id || user?.id || null,
            assigned_closer_id: matchingEvent?.assigned_closer_id || null,
            created_at: matchingEvent?.created_at || updatedLead.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (matchingEvent?.id) {
            const { error: updateAgendaError } = await supabase.from('agenda_events').update(agendaPayload as any).eq('id', matchingEvent.id);
            if (updateAgendaError) throw updateAgendaError;
          } else {
            const { error: insertAgendaError } = await supabase.from('agenda_events').insert(agendaPayload as any);
            if (insertAgendaError) throw insertAgendaError;
          }
        }

        const linkedPipelineClientId = (updatedLead as any)?.pipeline_client_id || (previousLead as any)?.pipeline_client_id || null;
        const linkedPipelineClient = linkedPipelineClientId
          ? commercial?.pipelineClients.find((client) => client.id === linkedPipelineClientId)
          : null;

        if (linkedPipelineClient && commercial?.updatePipelineClient) {
          commercial.updatePipelineClient(linkedPipelineClient.id, {
            clientName: leadName || updatedLead.nome,
            clinicName: updatedLead.clinic_name || leadName || updatedLead.nome,
            telefone: leadPhone || linkedPipelineClient.telefone,
            meetingDate: agendaDate || undefined,
            meetingTime: agendaTime || undefined,
            temSocio: coerceCommercialAnswer(updatedLead.tem_socio, 'NAO'),
            temMkt: coerceCommercialAnswer(updatedLead.tem_mkt, 'NAO'),
            temSecretaria: coerceCommercialAnswer(updatedLead.tem_secretaria, 'NAO_SEI'),
            salaoOuClinica: updatedLead.salao_ou_clinica || linkedPipelineClient.salaoOuClinica,
            agendadoVia: updatedLead.agendado_via || linkedPipelineClient.agendadoVia,
            agendadoPor: updatedLead.agendado_por || linkedPipelineClient.agendadoPor,
          });
        } else if (linkedPipelineClient) {
          await savePipelineClientToCloud({
            ...linkedPipelineClient,
            clientName: leadName || updatedLead.nome,
            clinicName: updatedLead.clinic_name || leadName || updatedLead.nome,
            telefone: leadPhone || linkedPipelineClient.telefone,
            meetingDate: agendaDate || undefined,
            meetingTime: agendaTime || undefined,
            temSocio: coerceCommercialAnswer(updatedLead.tem_socio, 'NAO'),
            temMkt: coerceCommercialAnswer(updatedLead.tem_mkt, 'NAO'),
            temSecretaria: coerceCommercialAnswer(updatedLead.tem_secretaria, 'NAO_SEI'),
            salaoOuClinica: updatedLead.salao_ou_clinica || linkedPipelineClient.salaoOuClinica,
            agendadoVia: updatedLead.agendado_via || linkedPipelineClient.agendadoVia,
            agendadoPor: updatedLead.agendado_por || linkedPipelineClient.agendadoPor,
          }, user?.id);
        }
      } catch (syncError) {
        console.error('Falha ao sincronizar agenda/pipeline do lead atualizado', syncError);
      }

      return updatedLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar lead');
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured) {
        updateCommercialLocalData((current) => ({
          ...current,
          agendamentoLeads: current.agendamentoLeads.filter((item: any) => item.id !== id),
        }));
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return;
      }

      await supabase.from('agendamento_leads').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Lead removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover lead');
    },
  });

  const duplicateLead = useMutation({
    mutationFn: async (lead: AgendamentoLead) => {
      if (!isSupabaseConfigured) {
        const {
          id,
          created_at,
          updated_at,
          created_by_user_id,
          pipeline_client_id,
          agenda_event_id,
          agenda_event_date,
          agenda_event_time,
          agenda_event_title,
          ...leadData
        } = lead as AgendamentoLead & Record<string, any>;
        const duplicated: AgendamentoLead = {
          ...leadData,
          id: `agendamento-${crypto.randomUUID()}`,
          created_by_user_id: user?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        updateCommercialLocalData((current) => ({
          ...current,
          agendamentoLeads: [duplicated, ...current.agendamentoLeads],
        }));
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));

        return duplicated;
      }
      const {
        id,
        created_at,
        updated_at,
        created_by_user_id,
        pipeline_client_id,
        agenda_event_id,
        agenda_event_date,
        agenda_event_time,
        agenda_event_title,
        ...leadData
      } = lead as AgendamentoLead & Record<string, any>;
      const payload = {
        ...leadData,
        created_by_user_id: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      const { data: duplicated, error } = await supabase.from('agendamento_leads').insert(payload).select('*').single();
      if (error) throw error;

      return duplicated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Lead duplicado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao duplicar lead');
    },
  });

  return {
    leads,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    duplicateLead,
  };
}
