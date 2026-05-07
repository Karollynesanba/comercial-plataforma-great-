import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import { mapAgendaTeamToPipeline } from '@/lib/teamMapping';
import { readCommercialLocalData, updateCommercialLocalData } from '@/lib/commercialLocalStore';

export interface AgendaEvent {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  client_name: string;
  client_phone: string;
  event_date: string;
  event_time: string;
  duration_minutes: number;
  meeting_link: string | null;
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
  'id' | 'created_at' | 'updated_at' | 'reminder_2h_sent' | 'reminder_30min_sent' | 'assigned_closer'
>;
export type AgendaEventUpdate = Partial<Omit<AgendaEventInsert, 'created_by_user_id'>>;

export const EVENT_COLORS = [
  { label: 'Reuniao Marcada', value: '#3B82F6', emoji: 'azul' },
  { label: 'Call Feita', value: '#66FF00', emoji: 'verde' },
  { label: 'Call Nao Comparecida', value: '#FF0000', emoji: 'vermelho' },
  { label: 'Recontato', value: '#B000FF', emoji: 'roxo' },
  { label: 'Ficou de Confirmar', value: '#FFA500', emoji: 'laranja' },
  { label: 'Reunioes - Great', value: '#808080', emoji: 'cinza' },
];

const LOCAL_TEAMS = [
  { id: 'team-equipe-7', name: 'Equipe 7' },
  { id: 'team-tropa-de-elite', name: 'Tropa de Elite' },
];

function enrichEvent(event: any): AgendaEvent {
  return {
    ...event,
    assigned_closer: null,
    team: event.team_id ? LOCAL_TEAMS.find((team) => team.id === event.team_id) || null : null,
  };
}

function samePersonFilter(name: string, phone: string) {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const digits = formattedPhone.replace(/\D/g, '');
  return { formattedPhone, digits, name };
}

function colorToPipelineStage(color?: string | null) {
  switch (String(color || '').toUpperCase()) {
    case '#FF0000':
      return 'NO_SHOW';
    case '#66FF00':
      return 'NEGOCIACAO';
    case '#FFA500':
      return 'TAXA_INTERESSE';
    case '#B000FF':
      return 'NEGOCIACAO';
    case '#3B82F6':
      return 'NOVO';
    case '#808080':
      return 'NEGOCIACAO';
    default:
      return null;
  }
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
  const [{ data: clients }, { data: leads }] = await Promise.all([
    supabase.from('pipeline_clients').select('id, client_name, telefone').limit(1000),
    supabase.from('agendamento_leads').select('id, nome, telefone').limit(1000),
  ]);

  const matchingClients = (clients || []).filter((client) => {
    const clientDigits = String(client.telefone || '').replace(/\D/g, '');
    return client.client_name === target.name || (target.digits && clientDigits === target.digits);
  });
  const matchingLeads = (leads || []).filter((lead) => {
    const leadDigits = String(lead.telefone || '').replace(/\D/g, '');
    return lead.nome === target.name || (target.digits && leadDigits === target.digits);
  });

  const selectedClient =
    (eventPipelineClientId
      ? matchingClients.find((client) => client.id === eventPipelineClientId) || null
      : null) ||
    matchingClients.find((client) => String(client.telefone || '').replace(/\D/g, '') === target.digits) ||
    matchingClients.find((client) => client.client_name === target.name) ||
    null;

  const selectedLead =
    matchingLeads.find((lead) => String(lead.telefone || '').replace(/\D/g, '') === target.digits) ||
    matchingLeads.find((lead) => lead.nome === target.name) ||
    null;

  const pipelineStage = colorToPipelineStage(event.color);
  const linkedPipelineClientId = selectedClient?.id || eventPipelineClientId || null;

  if (linkedPipelineClientId) {
    await supabase.from('agenda_events').update({
      pipeline_client_id: linkedPipelineClientId,
      updated_at: new Date().toISOString(),
    } as any).eq('id', event.id);
  }

  await Promise.all([
    ...(selectedClient
      ? [supabase.from('pipeline_clients').update({
      meeting_date: event.event_date,
      meeting_time: event.event_time.slice(0, 5),
      notes: event.notes,
      equipe: mapAgendaTeamToPipeline(event.team_id) || selectedClient.equipe,
      ...(pipelineStage ? { stage: pipelineStage } : {}),
      ...(pipelineStage === 'NO_SHOW'
        ? { no_show_reason: event.notes || event.description || 'Agendamento marcado como No Show' }
        : { no_show_reason: null }),
      updated_at: new Date().toISOString(),
    }).eq('id', selectedClient.id)]
      : []),
    ...(selectedLead
      ? [supabase.from('agendamento_leads').update({
      ...(pipelineStage ? { status: pipelineStage } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', selectedLead.id)]
      : []),
  ]);

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
      if (!isSupabaseConfigured) {
        const payload = {
          ...event,
          id: `agenda-${crypto.randomUUID()}`,
          client_phone: formatPhoneForWhatsApp(event.client_phone),
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
        ...event,
        client_phone: formatPhoneForWhatsApp(event.client_phone),
        reminder_2h_sent: false,
        reminder_30min_sent: false,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('agenda_events').insert(payload).select('*').single();
      if (error) throw error;

      const newEvent = enrichEvent(data);
      await syncRelatedRecords(newEvent);
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

      const payload = {
        ...previous,
        ...updates,
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
