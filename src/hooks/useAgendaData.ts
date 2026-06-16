import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import { readCommercialLocalData, updateCommercialLocalData } from '@/lib/commercialLocalStore';
import { isCustomMeetingTitle, matchMeetingName, normalizeMeetingTitle } from '@/lib/agendaTitle';

export interface AgendaEvent {
  id: string;
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
  'id' | 'created_at' | 'updated_at' | 'reminder_2h_sent' | 'reminder_30min_sent' | 'assigned_closer' | 'clinic_name' | 'scheduled_by' | 'lead_stage' | 'creative_source'
> & {
  clinic_name?: string | null;
  scheduled_by?: string | null;
  lead_stage?: string | null;
  creative_source?: string | null;
  skip_related_sync?: boolean;
};
export type AgendaEventUpdate = Partial<Omit<AgendaEventInsert, 'created_by_user_id'>>;

export const EVENT_COLORS = [
  { label: 'Reuniao Marcada', value: '#3B82F6', emoji: 'azul' },
  { label: 'Call Feita', value: '#66FF00', emoji: 'verde' },
  { label: 'Call Nao Comparecida', value: '#FF0000', emoji: 'vermelho' },
  { label: 'Recontato', value: '#B000FF', emoji: 'roxo' },
  { label: 'Ficou de Confirmar', value: '#FFA500', emoji: 'laranja' },
  { label: 'No Show Remarcado', value: '#C8A27A', emoji: 'marrom' },
  { label: 'Reunioes - Great', value: '#808080', emoji: 'cinza' },
];

const LOCAL_TEAMS = [
  { id: 'team-equipe-7', name: 'Equipe 7' },
  { id: 'team-tropa-de-elite', name: 'Tropa de Elite' },
];

function enrichEvent(event: any): AgendaEvent {
  return {
    ...event,
    title: normalizeMeetingTitle(event.title || event.client_name || '') || event.title,
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

  const target = samePersonFilter(event.client_name, event.client_phone);
  const eventPipelineClientId = (event as any).pipeline_client_id || null;
  const { data: clients } = await supabase.from('pipeline_clients').select('id, client_name, telefone').limit(1000);
  const { data: linkedEvents } = await supabase
    .from('agenda_events')
    .select('id, pipeline_client_id')
    .eq('pipeline_client_id', eventPipelineClientId || '')
    .limit(10);

  const matchingClients = (clients || []).filter((client) => {
    const clientDigits = String(client.telefone || '').replace(/\D/g, '');
    return matchMeetingName(client.client_name || '') === matchMeetingName(target.name || '') || (target.digits && clientDigits === target.digits);
  });
  const selectedClient =
    (eventPipelineClientId
      ? matchingClients.find((client) => client.id === eventPipelineClientId) || null
      : null) ||
    matchingClients.find((client) => String(client.telefone || '').replace(/\D/g, '') === target.digits) ||
    matchingClients.find((client) => matchMeetingName(client.client_name || '') === matchMeetingName(target.name || '')) ||
    null;
  const linkedPipelineClientId = selectedClient?.id || eventPipelineClientId || null;

  if (linkedPipelineClientId) {
    const anotherLinkedEvent = (linkedEvents || []).find((item) => item.id !== event.id);
    if (anotherLinkedEvent) {
      return;
    }
    await supabase.from('agenda_events').update({
      pipeline_client_id: linkedPipelineClientId,
      updated_at: new Date().toISOString(),
    } as any).eq('id', event.id);
  }
}

export function useAgendaData() {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['agenda-events'],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return (readCommercialLocalData().agendaEvents || []).map(enrichEvent);
      }
      const { data, error } = await withTimeout(
        supabase
          .from('agenda_events')
          .select('*')
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true }),
        7000,
        'agenda_events'
      );
      if (error) throw error;
      return (data || []).map(enrichEvent);
    },
  });

  const createEvent = useMutation({
    mutationFn: async (event: AgendaEventInsert) => {
      const { skip_related_sync, ...payloadBase } = event as AgendaEventInsert & { skip_related_sync?: boolean };
      if (!isSupabaseConfigured) {
        const payload = {
          ...payloadBase,
          title: normalizeMeetingTitle(payloadBase.title || payloadBase.client_name || '') || payloadBase.title,
          title_locked: isCustomMeetingTitle(payloadBase.title || payloadBase.client_name || '', payloadBase.client_name),
          id: `agenda-${crypto.randomUUID()}`,
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
        title: normalizeMeetingTitle(payloadBase.title || payloadBase.client_name || '') || payloadBase.title,
        title_locked: isCustomMeetingTitle(payloadBase.title || payloadBase.client_name || '', payloadBase.client_name),
        client_phone: formatPhoneForWhatsApp(payloadBase.client_phone),
        reminder_2h_sent: false,
        reminder_30min_sent: false,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('agenda_events').insert(payload).select('*').single();
      if (error) throw error;

      const newEvent = enrichEvent(data);
      if (!skip_related_sync) {
        await syncRelatedRecords(newEvent);
      }
      return newEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      toast.success('Evento criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar evento');
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: AgendaEventUpdate & { id: string }) => {
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

      const { data: previous, error: previousError } = await supabase.from('agenda_events').select('*').eq('id', id).single();
      if (previousError) throw previousError;
      if (!previous) {
        throw new Error('Evento nao encontrado');
      }

      const previousTitle = String(previous.title || '').trim();
      const previousClientName = String(previous.client_name || '').trim();
      const explicitTitle = typeof updates.title === 'string' ? String(updates.title).trim() : '';
      const resolvedTitle = explicitTitle
        ? normalizeMeetingTitle(explicitTitle) || previousTitle || normalizeMeetingTitle(previousClientName) || `Reuniao com ${previousClientName || 'Lead sem nome'}`
        : previousTitle || normalizeMeetingTitle(previousClientName) || `Reuniao com ${previousClientName || 'Lead sem nome'}`;
      const currentDefaultTitle = `Reuniao com ${String(updates.client_name || previous.client_name || 'Lead sem nome').trim()}`;

      const payload = {
        ...previous,
        ...updates,
        title: resolvedTitle,
        title_locked:
          Boolean((previous as any).title_locked) ||
          resolvedTitle !== currentDefaultTitle,
        client_phone: updates.client_phone ? formatPhoneForWhatsApp(updates.client_phone) : previous.client_phone,
        updated_at: new Date().toISOString(),
      };

      const optimisticEvent = enrichEvent(payload);
      upsertAgendaEventLocally(optimisticEvent);
      queryClient.setQueryData<AgendaEvent[]>(['agenda-events'], (current = []) =>
        current.some((item) => item.id === optimisticEvent.id)
          ? current.map((item) => (item.id === optimisticEvent.id ? optimisticEvent : item))
          : [optimisticEvent, ...current]
      );

      const { data, error } = await supabase.from('agenda_events').update(payload).eq('id', id).select('*').single();
      if (error) throw error;

      const updatedEvent = enrichEvent(data);
      upsertAgendaEventLocally(updatedEvent);
      await syncRelatedRecords(updatedEvent);
      return updatedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      toast.success('Evento atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar evento');
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured) {
        updateCommercialLocalData((current) => ({
          ...current,
          agendaEvents: current.agendaEvents.filter((item: any) => item.id !== id),
        }));
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return;
      }
      const { error } = await supabase.from('agenda_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Evento excluido com sucesso!');
    },
    onError: () => {
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
