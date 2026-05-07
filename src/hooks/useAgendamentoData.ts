import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCommercialSafe } from '@/contexts/CommercialContext';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { readCommercialLocalData, updateCommercialLocalData } from '@/lib/commercialLocalStore';
import { savePipelineClientToCloud } from '@/lib/commercialCloudStore';
import { agendamentoToPipeline } from './usePipelineAgendamentoSync';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import { COMMERCIAL_YES_NO_MAYBE_OPTIONS, coerceCommercialAnswer, type CommercialYesNoMaybe } from '@/lib/commercialAnswer';

function normalizeAgendamentoLeadAnswers(lead: AgendamentoLead): AgendamentoLead {
  return {
    ...lead,
    tem_socio: coerceCommercialAnswer(lead.tem_socio) || 'NAO_SEI',
    tem_mkt: coerceCommercialAnswer(lead.tem_mkt) || 'NAO_SEI',
    tem_secretaria: coerceCommercialAnswer(lead.tem_secretaria) || 'NAO_SEI',
  };
}

export interface AgendamentoLead {
  id: string;
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
}

export type AgendamentoLeadInsert = Omit<AgendamentoLead, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id'> & { horario_especifico?: string; pode_investir?: 'SIM' | 'NAO' | null };
export type AgendamentoLeadUpdate = Partial<AgendamentoLeadInsert>;

export const HORARIO_OPTIONS = [
  { value: 'MANHA', label: 'MANHA' },
  { value: 'TARDE', label: 'TARDE' },
  { value: 'NOITE', label: 'NOITE' },
] as const;

export const TEM_SOCIO_OPTIONS = COMMERCIAL_YES_NO_MAYBE_OPTIONS;

export const TEM_MKT_OPTIONS = COMMERCIAL_YES_NO_MAYBE_OPTIONS;

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

function buildLeadWithAgenda(lead: any, agendaEvents: any[]): AgendamentoLead {
  const agendaEvent = agendaEvents.find((event: any) => {
    const leadPhone = lead.telefone?.replace(/\D/g, '');
    const eventPhone = event.client_phone?.replace(/\D/g, '');
    return leadPhone && eventPhone && leadPhone === eventPhone;
  });

  return {
    ...lead,
    agenda_event_date: agendaEvent?.event_date || null,
    agenda_event_time: agendaEvent?.event_time || null,
  };
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
          return {
            ...current,
            agendamentoLeads: nextLeads,
            pipelineClients: nextPipelineClients,
          };
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

      const payload = {
        ...lead,
        telefone: formattedPhone,
        created_by_user_id: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('agendamento_leads').insert(payload).select('*').single();
      if (error) throw error;

      const newLead = data as AgendamentoLead;
      const pipelineData = agendamentoToPipeline(newLead as any, user?.id || 'cloud-user', commercial?.nextTeamInQueue || 'team-equipe-7');
      await savePipelineClientToCloud({
        ...pipelineData,
        telefone: formattedPhone,
        createdByUserId: user?.id || 'cloud-user',
        createdAt: new Date(),
        dataEntrada: new Date(),
      } as any, user?.id);

      return newLead;
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
      if (!isSupabaseConfigured) {
        const formattedPhone = updates.telefone ? formatPhoneForWhatsApp(updates.telefone) : undefined;
        updateCommercialLocalData((current) => ({
          ...current,
          agendamentoLeads: current.agendamentoLeads.map((item: any) =>
            item.id === id
              ? {
                  ...item,
                  ...updates,
                  ...(formattedPhone ? { telefone: formattedPhone } : {}),
                  updated_at: new Date().toISOString(),
                }
              : item
          ),
        }));
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return { id, ...updates } as AgendamentoLead;
      }
      const payload = {
        ...updates,
        telefone: updates.telefone ? formatPhoneForWhatsApp(updates.telefone) : undefined,
        updated_at: new Date().toISOString(),
      };
      const { data: updatedLead, error } = await supabase.from('agendamento_leads').update(payload).eq('id', id).select('*').single();
      if (error) throw error;

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
          pipelineClients: current.pipelineClients.filter((client: any) => client.id !== id),
        }));
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return;
      }
      const { data: lead } = await supabase.from('agendamento_leads').select('*').eq('id', id).maybeSingle();
      const leadDigits = String(lead?.telefone || '').replace(/\D/g, '');

      await supabase.from('agendamento_leads').delete().eq('id', id);

      if (lead) {
        const [{ data: clients }, { data: events }] = await Promise.all([
          supabase.from('pipeline_clients').select('id, client_name, telefone').limit(1000),
          supabase.from('agenda_events').select('id, client_name, client_phone').limit(1000),
        ]);

        await Promise.all([
          ...(clients || [])
            .filter((client) => client.client_name === lead.nome || (leadDigits && String(client.telefone || '').replace(/\D/g, '') === leadDigits))
            .map((client) => supabase.from('pipeline_clients').delete().eq('id', client.id)),
          ...(events || [])
            .filter((event) => event.client_name === lead.nome || (leadDigits && String(event.client_phone || '').replace(/\D/g, '') === leadDigits))
            .map((event) => supabase.from('agenda_events').delete().eq('id', event.id)),
        ]);
      }
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
        const { id, created_at, updated_at, created_by_user_id, ...leadData } = lead;
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
      const { id, created_at, updated_at, created_by_user_id, ...leadData } = lead;
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
