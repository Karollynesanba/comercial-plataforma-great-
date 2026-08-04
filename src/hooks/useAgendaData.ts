import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCommercialSafe } from '@/contexts/CommercialContext';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import { readCommercialLocalData, updateCommercialLocalData } from '@/lib/commercialLocalStore';
import { isCustomMeetingTitle, matchMeetingName, normalizeMeetingTitle } from '@/lib/agendaTitle';
import { normalizeAgendaColor, normalizeAgendaDateKey, normalizeAgendaTimeKey } from '@/lib/agendaDate';

const PRIMARY_AGENDA_TABLE = 'nova_agenda';
const LEGACY_AGENDA_TABLE = 'agenda_events';
const AGENDA_QUERY_KEY = ['agenda-events'];
const AGENDA_SYNC_CHANNEL = 'agenda-events-sync';
const AGENDA_SOURCE_TABLES = [PRIMARY_AGENDA_TABLE, LEGACY_AGENDA_TABLE] as const;

const CORE_EVENT_KEYS = new Set([
  'id',
  'source_table',
  'title',
  'description',
  'notes',
  'client_name',
  'client_phone',
  'clinic_name',
  'event_date',
  'event_time',
  'duration_minutes',
  'meeting_link',
  'scheduled_by',
  'lead_stage',
  'creative_source',
  'color',
  'reminder_2h_sent',
  'reminder_30min_sent',
  'created_by_user_id',
  'assigned_closer_id',
  'team_id',
  'created_at',
  'updated_at',
  'pipeline_client_id',
  'title_locked',
  'raw_record',
]);

export interface AgendaEvent {
  id: string;
  source_table?: string;
  pipeline_client_id?: string | null;
  start?: string | null;
  end?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  allDay?: boolean;
  title: string;
  description: string | null;
  notes: string | null;
  client_name: string;
  client_phone: string;
  clinic_name: string | null;
  event_date: string;
  event_time: string;
  duration_minutes: number;
  meeting_link: string | null;
  scheduled_by: string | null;
  lead_stage: string | null;
  creative_source: string | null;
  color: string;
  reminder_2h_sent: boolean;
  reminder_30min_sent: boolean;
  created_by_user_id: string | null;
  assigned_closer_id: string | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
  raw_record?: Record<string, unknown>;
  assigned_closer?: {
    id: string;
    full_name: string;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
}

export type AgendaEventInsert = Omit<
  AgendaEvent,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'reminder_2h_sent'
  | 'reminder_30min_sent'
  | 'assigned_closer'
  | 'clinic_name'
  | 'scheduled_by'
  | 'lead_stage'
  | 'creative_source'
  | 'raw_record'
  | 'source_table'
> & {
  clinic_name?: string | null;
  scheduled_by?: string | null;
  lead_stage?: string | null;
  creative_source?: string | null;
  pipeline_client_id?: string | null;
  skip_related_sync?: boolean;
};
export type AgendaEventUpdate = Partial<Omit<AgendaEventInsert, 'created_by_user_id'>>;

export const EVENT_COLORS = [
  { label: 'Reuniao Marcada', value: '#3B82F6', emoji: 'azul' },
  { label: 'Call Feita', value: '#66FF00', emoji: 'verde' },
  { label: 'Call Nao Comparecida', value: '#FF0000', emoji: 'vermelho' },
  { label: 'Recontato', value: '#B000FF', emoji: 'roxo' },
  { label: 'Ficou de Confirmar', value: '#FFA500', emoji: 'laranja' },
  { label: 'No Show Remarcado', value: '#8B5A2B', emoji: 'marrom' },
  { label: 'Reunioes - Great', value: '#808080', emoji: 'cinza' },
];

const LOCAL_TEAMS = [
  { id: 'team-equipe-7', name: 'Equipe 7' },
  { id: 'team-tropa-de-elite', name: 'Tropa de Elite' },
];

type AgendaRow = Record<string, any>;

function toTrimmedString(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toOptionalString(value: unknown) {
  const text = toTrimmedString(value);
  return text || null;
}

function toNumber(value: unknown, fallback = 60) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number.parseInt(toTrimmedString(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const text = toTrimmedString(value).toLowerCase();
  if (!text) return fallback;
  if (['true', 't', '1', 'yes', 'sim', 'y'].includes(text)) return true;
  if (['false', 'f', '0', 'no', 'nao', 'n', 'não'].includes(text)) return false;
  return fallback;
}

function pickValue(record: AgendaRow, keys: string[]) {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = record[key];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return undefined;
}

function normalizeTitle(record: AgendaRow) {
  const title = toTrimmedString(
    pickValue(record, ['title', 'agenda_event_title', 'event_title', 'nome_evento', 'nome', 'client_name'])
  );
  const clientName = toTrimmedString(
    pickValue(record, ['client_name', 'nome_cliente', 'nome', 'patient_name', 'paciente'])
  );

  return title || (clientName ? `Reuniao com ${clientName}` : 'Evento sem titulo');
}

function normalizeAgendaRecord(record: AgendaRow, sourceTable: string): AgendaEvent {
  const rawRecord = Object.fromEntries(
    Object.entries(record).filter(([key, value]) => {
      if (CORE_EVENT_KEYS.has(key)) return false;
      if (value === null || value === undefined) return false;
      if (typeof value === 'string' && !value.trim()) return false;
      return true;
    })
  );

  const eventDate = normalizeAgendaDateKey(
    toTrimmedString(
      pickValue(record, [
        'event_date',
        'agenda_event_date',
        'data',
        'date',
        'scheduled_date',
        'start_date',
        'data_evento',
      ])
    )
  );
  const eventTime = normalizeAgendaTimeKey(
    toTrimmedString(
      pickValue(record, [
        'event_time',
        'agenda_event_time',
        'horario_especifico',
        'horario',
        'hour',
        'time',
        'start_time',
      ])
    )
  );
  const explicitEndTime = normalizeAgendaTimeKey(
    toTrimmedString(pickValue(record, ['end_time', 'agenda_event_end_time', 'horario_final', 'end', 'finish_time']))
  );
  const title = normalizeTitle(record);
  const clientName =
    toTrimmedString(pickValue(record, ['client_name', 'nome_cliente', 'nome', 'patient_name', 'paciente'])) ||
    title.replace(/^Reuniao com\s+/i, '').trim() ||
    'Sem nome';
  const clientPhone = formatPhoneForWhatsApp(
    toTrimmedString(pickValue(record, ['client_phone', 'telefone', 'phone', 'whatsapp', 'celular']))
  );
  const color = normalizeAgendaColor(
    toTrimmedString(pickValue(record, ['color', 'event_color', 'background_color', 'category_color']))
  );

  return {
    id: toTrimmedString(record.id || record.event_id || record.uuid || crypto.randomUUID()),
    source_table: toTrimmedString(record.source_table || sourceTable),
    pipeline_client_id: toOptionalString(record.pipeline_client_id),
    start: eventDate && eventTime ? `${eventDate}T${eventTime}` : eventDate || null,
    end: explicitEndTime && eventDate ? `${eventDate}T${explicitEndTime}` : null,
    date: eventDate || null,
    start_time: eventTime || null,
    end_time: explicitEndTime || null,
    allDay: Boolean(pickValue(record, ['allDay', 'all_day'])),
    title,
    description: toOptionalString(pickValue(record, ['description', 'descricao', 'details', 'observacoes', 'observations'])),
    notes: toOptionalString(pickValue(record, ['notes', 'observations', 'observacoes', 'anotacoes', 'anotações'])),
    client_name: clientName,
    client_phone: clientPhone,
    clinic_name: toOptionalString(pickValue(record, ['clinic_name', 'salao_ou_clinica', 'salon_name', 'company_name'])),
    event_date: eventDate,
    event_time: eventTime,
    duration_minutes: toNumber(
      pickValue(record, ['duration_minutes', 'duration', 'duracao', 'duração', 'meeting_duration']),
      60
    ),
    meeting_link: toOptionalString(pickValue(record, ['meeting_link', 'link', 'meeting_url', 'url'])),
    scheduled_by: toOptionalString(pickValue(record, ['scheduled_by', 'agendado_por', 'responsavel', 'responsável'])),
    lead_stage: toOptionalString(pickValue(record, ['lead_stage', 'stage', 'status'])),
    creative_source: toOptionalString(pickValue(record, ['creative_source', 'criativo', 'origin', 'origem'])),
    color: color || '#3B82F6',
    reminder_2h_sent: toBoolean(pickValue(record, ['reminder_2h_sent', 'lembrete_2h_enviado'])),
    reminder_30min_sent: toBoolean(pickValue(record, ['reminder_30min_sent', 'lembrete_30min_enviado'])),
    created_by_user_id: toOptionalString(pickValue(record, ['created_by_user_id', 'user_id', 'criado_por'])),
    assigned_closer_id: toOptionalString(pickValue(record, ['assigned_closer_id', 'closer_id', 'responsavel_id'])),
    team_id: toOptionalString(pickValue(record, ['team_id', 'equipe_id', 'team'])),
    created_at: toTrimmedString(pickValue(record, ['created_at', 'inserted_at', 'data_criacao'])) || new Date().toISOString(),
    updated_at: toTrimmedString(pickValue(record, ['updated_at', 'modified_at', 'data_atualizacao'])) || new Date().toISOString(),
    raw_record: rawRecord,
    assigned_closer: null,
    team: record.team_id ? LOCAL_TEAMS.find((team) => team.id === record.team_id) || null : null,
  };
}

function enrichEvent(event: AgendaEvent): AgendaEvent {
  return {
    ...event,
    title: String(event.title || event.client_name || '').trim() || event.title,
    clinic_name: event.clinic_name || event.client_name || null,
    scheduled_by: event.scheduled_by || null,
    lead_stage: event.lead_stage || null,
    creative_source: event.creative_source || null,
    assigned_closer: null,
    team: event.team_id ? LOCAL_TEAMS.find((team) => team.id === event.team_id) || null : null,
  };
}

function samePersonFilter(name: string, phone: string) {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const digits = formattedPhone.replace(/\D/g, '');
  return { formattedPhone, digits, name };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    }),
  ]);
}

type AgendaDbRow = Record<string, any> & { source_table?: string };

const AGENDA_UPDATE_COLUMNS = [
  'title',
  'description',
  'notes',
  'client_name',
  'client_phone',
  'clinic_name',
  'event_date',
  'event_time',
  'duration_minutes',
  'meeting_link',
  'scheduled_by',
  'lead_stage',
  'creative_source',
  'color',
  'reminder_2h_sent',
  'reminder_30min_sent',
  'created_by_user_id',
  'assigned_closer_id',
  'team_id',
  'updated_at',
] as const;

function pickAgendaUpdatePayload(previous: AgendaDbRow, updates: AgendaEventUpdate, resolvedTitle: string, currentDefaultTitle: string) {
  const clientPhone = updates.client_phone ? formatPhoneForWhatsApp(updates.client_phone) : previous.client_phone;
  return {
    title: resolvedTitle,
    description: updates.description !== undefined ? updates.description : previous.description,
    notes: updates.notes !== undefined ? updates.notes : previous.notes,
    client_name: updates.client_name !== undefined ? updates.client_name : previous.client_name,
    client_phone: clientPhone,
    clinic_name: updates.clinic_name !== undefined ? updates.clinic_name : previous.clinic_name,
    event_date: updates.event_date !== undefined ? updates.event_date : previous.event_date,
    event_time: updates.event_time !== undefined ? updates.event_time : previous.event_time,
    duration_minutes: updates.duration_minutes !== undefined ? updates.duration_minutes : previous.duration_minutes,
    meeting_link: updates.meeting_link !== undefined ? updates.meeting_link : previous.meeting_link,
    scheduled_by: updates.scheduled_by !== undefined ? updates.scheduled_by : previous.scheduled_by,
    lead_stage: updates.lead_stage !== undefined ? updates.lead_stage : previous.lead_stage,
    creative_source: updates.creative_source !== undefined ? updates.creative_source : previous.creative_source,
    color: updates.color !== undefined ? updates.color : previous.color,
    reminder_2h_sent: previous.reminder_2h_sent ?? false,
    reminder_30min_sent: previous.reminder_30min_sent ?? false,
    created_by_user_id: previous.created_by_user_id ?? null,
    assigned_closer_id: previous.assigned_closer_id ?? null,
    team_id: updates.team_id !== undefined ? updates.team_id : previous.team_id ?? null,
    updated_at: new Date().toISOString(),
  };
}

async function fetchAgendaRowById(supabaseAny: any, id: string, preferredTable?: string) {
  const tables = preferredTable
    ? [preferredTable, ...AGENDA_SOURCE_TABLES.filter((table) => table !== preferredTable)]
    : [...AGENDA_SOURCE_TABLES];

  for (const table of tables) {
    const { data, error } = await supabaseAny.from(table).select('*').eq('id', id).maybeSingle();
    if (error) {
      if (error.code === 'PGRST116') {
        continue;
      }
      throw error;
    }

    if (data) {
      return { table, row: data as AgendaDbRow };
    }
  }

  return null;
}

function sortAgendaEvents(events: AgendaEvent[]) {
  return [...events].sort((a, b) => {
    const dateCompare = a.event_date.localeCompare(b.event_date);
    if (dateCompare !== 0) return dateCompare;

    const timeCompare = a.event_time.localeCompare(b.event_time);
    if (timeCompare !== 0) return timeCompare;

    return a.title.localeCompare(b.title);
  });
}

function mergeAgendaEvents(primary: AgendaEvent[], legacy: AgendaEvent[], fallback: AgendaEvent[]) {
  const merged = new Map<string, AgendaEvent>();

  const put = (event: AgendaEvent) => {
    const current = merged.get(event.id);
    if (!current) {
      merged.set(event.id, event);
      return;
    }

    if (current.source_table !== PRIMARY_AGENDA_TABLE && event.source_table === PRIMARY_AGENDA_TABLE) {
      merged.set(event.id, event);
      return;
    }

    if (current.source_table === event.source_table) {
      merged.set(event.id, event);
    }
  };

  sortAgendaEvents([...fallback, ...legacy, ...primary]).forEach(put);
  return sortAgendaEvents(Array.from(merged.values()));
}

function upsertAgendaEventLocally(event: AgendaEvent) {
  updateCommercialLocalData((current) => {
    const exists = current.agendaEvents.some((item: any) => item.id === event.id);
    return {
      ...current,
      agendaEvents: exists
        ? current.agendaEvents.map((item: any) => (item.id === event.id ? event : item))
        : [event, ...current.agendaEvents],
    };
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('great-commercial-local-data-updated'));
  }
}

async function syncRelatedRecords(event: AgendaEvent) {
  if (!isSupabaseConfigured) return;

  try {
    const supabaseAny = supabase as any;
    const targetTable = event.source_table || PRIMARY_AGENDA_TABLE;
    const target = samePersonFilter(event.client_name, event.client_phone);
    const eventPipelineClientId = event.pipeline_client_id || null;

    const { data: clients } = await supabaseAny.from('pipeline_clients').select('id, client_name, telefone').limit(1000);
    const { data: linkedEvents } = await supabaseAny
      .from(targetTable)
      .select('id, pipeline_client_id')
      .eq('pipeline_client_id', eventPipelineClientId || '')
      .limit(10);

    const matchingClients = (clients || []).filter((client: any) => {
      const clientDigits = String(client.telefone || '').replace(/\D/g, '');
      return (
        matchMeetingName(client.client_name || '') === matchMeetingName(target.name || '') ||
        (target.digits && clientDigits === target.digits)
      );
    });

    const selectedClient =
      (eventPipelineClientId
        ? matchingClients.find((client: any) => client.id === eventPipelineClientId) || null
        : null) ||
      matchingClients.find((client: any) => String(client.telefone || '').replace(/\D/g, '') === target.digits) ||
      matchingClients.find((client: any) => matchMeetingName(client.client_name || '') === matchMeetingName(target.name || '')) ||
      null;
    const linkedPipelineClientId = selectedClient?.id || eventPipelineClientId || null;

    if (linkedPipelineClientId) {
      const anotherLinkedEvent = (linkedEvents || []).find((item: any) => item.id !== event.id);
      if (anotherLinkedEvent) {
        return;
      }

      await supabaseAny
        .from(targetTable)
        .update({
          pipeline_client_id: linkedPipelineClientId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);
    }
  } catch (error) {
    console.warn('Agenda related sync skipped for event', event.id, error);
  }
}

async function fetchAgendaTable(tableName: string) {
  const supabaseAny = supabase as any;
  const { data, error } = await withTimeout(supabaseAny.from(tableName).select('*'), 8000, tableName);
  if (error) throw error;
  return (data || []).map((row: AgendaRow) => enrichEvent(normalizeAgendaRecord(row, tableName)));
}

export function useAgendaData() {
  const queryClient = useQueryClient();
  const commercial = useCommercialSafe();
  const agendaChannelNameRef = useRef(`agenda-events-sync-${Math.random().toString(36).slice(2)}`);
  const commercialFallbackEvents = (commercial?.agendaEvents || []).map((event: any) =>
    enrichEvent(normalizeAgendaRecord(event, LEGACY_AGENDA_TABLE))
  );
  const localFallbackEvents = (readCommercialLocalData().agendaEvents || []).map((event: any) =>
    enrichEvent(normalizeAgendaRecord(event, LEGACY_AGENDA_TABLE))
  );
  const fallbackEvents = commercialFallbackEvents.length > 0 ? commercialFallbackEvents : localFallbackEvents;

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: AGENDA_QUERY_KEY,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return fallbackEvents;
      }

      try {
        const [primaryResult, legacyResult] = await Promise.allSettled([
          fetchAgendaTable(PRIMARY_AGENDA_TABLE),
          fetchAgendaTable(LEGACY_AGENDA_TABLE),
        ]);

        const primaryEvents = primaryResult.status === 'fulfilled' ? primaryResult.value : [];
        const legacyEvents = legacyResult.status === 'fulfilled' ? legacyResult.value : [];

        if (primaryResult.status === 'rejected') {
          console.warn('Agenda query failed for nova_agenda.', primaryResult.reason);
        }

        if (legacyResult.status === 'rejected') {
          console.warn('Agenda query failed for agenda_events.', legacyResult.reason);
        }

        const mergedRemoteEvents = mergeAgendaEvents(primaryEvents, legacyEvents, fallbackEvents);
        return mergedRemoteEvents.length > 0 ? mergedRemoteEvents : fallbackEvents;
      } catch (queryError) {
        console.warn('Agenda query failed, falling back to commercial/local cache.', queryError);
        return fallbackEvents;
      }
    },
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const refreshAgenda = () => {
      queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY });
    };

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshAgenda();
      }
    };

    const channel = (supabase as any)
      .channel(agendaChannelNameRef.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: PRIMARY_AGENDA_TABLE }, refreshAgenda)
      .on('postgres_changes', { event: '*', schema: 'public', table: LEGACY_AGENDA_TABLE }, refreshAgenda)
      .subscribe();

    window.addEventListener('focus', refreshAgenda);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', refreshAgenda);
      document.removeEventListener('visibilitychange', handleVisibility);
      void (supabase as any).removeChannel(channel);
    };
  }, [queryClient]);

  const createEvent = useMutation({
    mutationFn: async (event: AgendaEventInsert) => {
      const { skip_related_sync, ...payloadBase } = event as AgendaEventInsert & { skip_related_sync?: boolean };
      const supabaseAny = supabase as any;

      if (!isSupabaseConfigured) {
        const payload = {
          ...payloadBase,
          title: String(payloadBase.title || payloadBase.client_name || '').trim() || payloadBase.title,
          id: `agenda-${crypto.randomUUID()}`,
          source_table: LEGACY_AGENDA_TABLE,
          client_phone: formatPhoneForWhatsApp(payloadBase.client_phone),
          reminder_2h_sent: false,
          reminder_30min_sent: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as AgendaEvent;

        updateCommercialLocalData((current) => ({
          ...current,
          agendaEvents: [payload, ...current.agendaEvents],
        }));
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return enrichEvent(payload);
      }

      const payload = {
        ...payloadBase,
        title: String(payloadBase.title || payloadBase.client_name || '').trim() || payloadBase.title,
        client_phone: formatPhoneForWhatsApp(payloadBase.client_phone),
        reminder_2h_sent: false,
        reminder_30min_sent: false,
        updated_at: new Date().toISOString(),
      };

      const insertIntoTable = async (tableName: string) => {
        const { data, error } = await supabaseAny.from(tableName).insert(payload).select('*').single();
        if (error) throw error;
        return enrichEvent(normalizeAgendaRecord(data, tableName));
      };

      try {
        const newEvent = await insertIntoTable(PRIMARY_AGENDA_TABLE);
        if (!skip_related_sync) {
          await syncRelatedRecords(newEvent);
        }
        return newEvent;
      } catch (primaryError) {
        console.warn('Agenda insert failed in nova_agenda, trying agenda_events as fallback.', primaryError);
        const fallbackEvent = await insertIntoTable(LEGACY_AGENDA_TABLE);
        if (!skip_related_sync) {
          await syncRelatedRecords(fallbackEvent);
        }
        return fallbackEvent;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      toast.success('Evento criado com sucesso!');
    },
    onError: (mutationError) => {
      console.error('Erro ao criar evento na agenda.', mutationError);
      toast.error('Erro ao criar evento');
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: AgendaEventUpdate & { id: string }) => {
      const supabaseAny = supabase as any;
      const currentEvent = events.find((item) => item.id === id);
      const sourceTable = currentEvent?.source_table || PRIMARY_AGENDA_TABLE;

      if (!isSupabaseConfigured) {
        let updated: AgendaEvent | null = null;
        updateCommercialLocalData((current) => {
          const nextEvents = current.agendaEvents.map((item: any) => {
            if (item.id !== id) return item;
            updated = enrichEvent({
              ...item,
              ...updates,
              title: normalizeMeetingTitle(updates.title || item.title || item.client_name || ''),
              title_locked:
                Boolean((item as any).title_locked) ||
                isCustomMeetingTitle(
                  normalizeMeetingTitle(updates.title || item.title || item.client_name || '') || item.title,
                  updates.client_name || item.client_name,
                ),
              client_phone: updates.client_phone ? formatPhoneForWhatsApp(updates.client_phone) : item.client_phone,
              updated_at: new Date().toISOString(),
            });
            return updated;
          });
          return { ...current, agendaEvents: nextEvents };
        });
        if (!updated) throw new Error('Evento nao encontrado');
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return updated;
      }

      const resolvedCurrent = await fetchAgendaRowById(supabaseAny, id, sourceTable);
      if (!resolvedCurrent) {
        throw new Error('Evento nao encontrado');
      }
      const { table: resolvedTable, row: previous } = resolvedCurrent;

      const previousTitle = String(previous.title || '').trim();
      const previousClientName = String(previous.client_name || '').trim();
      const explicitTitle = typeof updates.title === 'string' ? String(updates.title).trim() : '';
      const resolvedTitle = explicitTitle ? explicitTitle : previousTitle || `Reuniao com ${previousClientName || 'Lead sem nome'}`;
      const currentDefaultTitle = `Reuniao com ${String(updates.client_name || previous.client_name || 'Lead sem nome').trim()}`;

      const payload = pickAgendaUpdatePayload(previous, updates, resolvedTitle, currentDefaultTitle);

      const optimisticEvent = enrichEvent(normalizeAgendaRecord(payload, sourceTable));
      upsertAgendaEventLocally(optimisticEvent);
      queryClient.setQueryData<AgendaEvent[]>(AGENDA_QUERY_KEY, (current = []) =>
        current.some((item) => item.id === optimisticEvent.id)
          ? current.map((item) => (item.id === optimisticEvent.id ? optimisticEvent : item))
          : [optimisticEvent, ...current]
      );

      let data: any = null;
      let error: any = null;
      let tableUsed = resolvedTable;
      for (const table of [resolvedTable, ...AGENDA_SOURCE_TABLES.filter((table) => table !== resolvedTable)]) {
        const result = await supabaseAny.from(table).update(payload).eq('id', id).select('*').maybeSingle();
        data = result.data;
        error = result.error;
        tableUsed = table;

        if (!error && data) {
          break;
        }

        if (error && error.code !== 'PGRST116') {
          break;
        }
      }

      if (error) throw error;
      if (!data) throw new Error('Evento nao encontrado');

      const updatedEvent = enrichEvent(normalizeAgendaRecord(data, tableUsed));
      upsertAgendaEventLocally(updatedEvent);
      await syncRelatedRecords(updatedEvent);
      return updatedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      toast.success('Evento atualizado com sucesso!');
    },
    onError: (mutationError) => {
      console.error('Erro ao atualizar evento na agenda.', mutationError);
      toast.error('Erro ao atualizar evento');
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const supabaseAny = supabase as any;
      const currentEvent = events.find((item) => item.id === id);
      const sourceTable = currentEvent?.source_table || PRIMARY_AGENDA_TABLE;

      if (!isSupabaseConfigured) {
        updateCommercialLocalData((current) => ({
          ...current,
          agendaEvents: current.agendaEvents.filter((item: any) => item.id !== id),
        }));
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return;
      }

      const deletions = [supabaseAny.from(sourceTable).delete().eq('id', id)];

      if (currentEvent?.pipeline_client_id) {
        deletions.push(supabaseAny.from('agendamento_leads').delete().eq('pipeline_client_id', currentEvent.pipeline_client_id));
      } else {
        deletions.push(
          supabaseAny
            .from('agendamento_leads')
            .delete()
            .eq('agenda_event_id', id)
        );
      }

      const results = await Promise.all(deletions);
      const mutationError = results.find((result) => result.error)?.error;
      if (mutationError) throw mutationError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY });
      toast.success('Evento excluido com sucesso!');
    },
    onError: (mutationError) => {
      console.error('Erro ao excluir evento na agenda.', mutationError);
      toast.error('Erro ao excluir evento');
    },
  });

  return {
    events,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
