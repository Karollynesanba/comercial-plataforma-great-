import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthSafe } from '@/contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { savePipelineClientToCloud, syncPipelineAutomationsToCloud } from '@/lib/commercialCloudStore';

export interface PipelineClientDB {
  id: string;
  ativo: boolean | null;
  client_name: string;
  clinic_name: string | null;
  telefone: string | null;
  vendedor: string | null;
  criativo: string | null;
  equipe: string | null;
  faturamento: string | null;
  pacote: string | null;
  periodo: string | null;
  indicacao: string | null;
  entrada: number | null;
  data_entrada: string | null;
  stage: string | null;
  last_stage_change: string | null;
  lost_reason: string | null;
  no_show_reason: string | null;
  notes: string | null;
  agendado_por: string | null;
  pagador_anuncio: string | null;
  tem_socio: string | null;
  tem_mkt: string | null;
  tem_secretaria: string | null;
  meeting_date: string | null;
  meeting_time: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type PipelineClientInsert = Omit<PipelineClientDB, 'id' | 'created_at' | 'updated_at'>;
export type PipelineClientUpdate = Partial<PipelineClientInsert>;

function localToDb(client: any): PipelineClientDB {
  return {
    id: client.id,
    ativo: client.ativo ?? true,
    client_name: client.clientName || '',
    clinic_name: client.clinicName || null,
    telefone: client.telefone || null,
    vendedor: client.vendedor || null,
    criativo: client.criativo || null,
    equipe: client.equipe || null,
    faturamento: client.faturamento || null,
    pacote: client.pacote || null,
    periodo: client.periodo || null,
    indicacao: client.indicacao || null,
    entrada: client.entrada ?? null,
    data_entrada: client.dataEntrada || client.entryDate || null,
    stage: client.stage || 'NOVO',
    last_stage_change: client.lastStageChange || null,
    lost_reason: client.lostReason || null,
    no_show_reason: client.noShowReason || null,
    notes: client.notes || null,
    agendado_por: client.agendadoPor || null,
    pagador_anuncio: client.pagadorAnuncio || null,
    tem_socio: client.temSocio || null,
    tem_mkt: client.temMkt || null,
    tem_secretaria: client.temSecretaria || null,
    meeting_date: client.meetingDate || null,
    meeting_time: client.meetingTime || null,
    created_by_user_id: client.createdByUserId || null,
    created_at: client.createdAt || new Date().toISOString(),
    updated_at: client.updatedAt || new Date().toISOString(),
  };
}

function dbToLocal(client: Partial<PipelineClientDB>, userId?: string | null) {
  return {
    ativo: client.ativo ?? true,
    clientName: client.client_name || '',
    clinicName: client.clinic_name || client.client_name || '',
    telefone: client.telefone || '',
    vendedor: client.vendedor || undefined,
    criativo: client.criativo || 'NAO IDENTIFICADO',
    equipe: client.equipe || '',
    faturamento: client.faturamento || 'NAO_INFORMADO',
    pacote: client.pacote || 'COMPLETO',
    periodo: client.periodo || 'MENSAL',
    indicacao: client.indicacao || '',
    entrada: client.entrada || 0,
    dataEntrada: client.data_entrada || client.created_at || undefined,
    stage: client.stage || 'NOVO',
    lastStageChange: client.last_stage_change || undefined,
    lostReason: client.lost_reason || undefined,
    noShowReason: client.no_show_reason || undefined,
    notes: client.notes || undefined,
    agendadoPor: client.agendado_por || undefined,
    pagadorAnuncio: client.pagador_anuncio || undefined,
    temSocio: client.tem_socio || undefined,
    temMkt: client.tem_mkt || undefined,
    temSecretaria: client.tem_secretaria || undefined,
    meetingDate: client.meeting_date || undefined,
    meetingTime: client.meeting_time || undefined,
    createdByUserId: client.created_by_user_id || userId || 'local-user',
    createdAt: client.created_at || new Date().toISOString(),
    updatedAt: client.updated_at || new Date().toISOString(),
  };
}

export function usePipelineData() {
  const queryClient = useQueryClient();
  const authContext = useAuthSafe();
  const user = authContext?.user;

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['pipeline-clients'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await supabase
        .from('pipeline_clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PipelineClientDB[];
    },
  });

  const refreshCommercialQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] });
    queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
    queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
  };

  const createClient = useMutation({
    mutationFn: async (client: PipelineClientInsert) => {
      const saved = await savePipelineClientToCloud(dbToLocal(client, user?.id) as any, user?.id);
      if (!saved) throw new Error('Supabase nao configurado');
      return localToDb(saved);
    },
    onSuccess: () => {
      refreshCommercialQueries();
      toast.success('Lead criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar lead');
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PipelineClientUpdate }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase nao configurado');
      const { data: updatedClient, error } = await supabase
        .from('pipeline_clients')
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      await syncPipelineAutomationsToCloud(dbToLocal(updatedClient, user?.id) as any, user?.id);
      return updatedClient as PipelineClientDB;
    },
    onSuccess: refreshCommercialQueries,
    onError: () => {
      toast.error('Erro ao atualizar lead');
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured) throw new Error('Supabase nao configurado');
      const { data: removed } = await supabase.from('pipeline_clients').select('*').eq('id', id).maybeSingle();
      await supabase.from('pipeline_clients').delete().eq('id', id);

      if (removed) {
        const phone = String(removed.telefone || '').replace(/\D/g, '');
        const [{ data: events }, { data: leads }] = await Promise.all([
          supabase.from('agenda_events').select('id, client_name, client_phone').limit(1000),
          supabase.from('agendamento_leads').select('id, nome, telefone').limit(1000),
        ]);
        await Promise.all([
          ...(events || [])
            .filter((event) => event.client_name === removed.client_name || (phone && String(event.client_phone || '').replace(/\D/g, '') === phone))
            .map((event) => supabase.from('agenda_events').delete().eq('id', event.id)),
          ...(leads || [])
            .filter((lead) => lead.nome === removed.client_name || (phone && String(lead.telefone || '').replace(/\D/g, '') === phone))
            .map((lead) => supabase.from('agendamento_leads').delete().eq('id', lead.id)),
        ]);
      }
    },
    onSuccess: () => {
      refreshCommercialQueries();
      toast.success('Lead removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover lead');
    },
  });

  const moveClient = useMutation({
    mutationFn: async ({
      id,
      newStage,
      lostReason,
      noShowReason,
      extraData,
    }: {
      id: string;
      newStage: string;
      lostReason?: string;
      noShowReason?: string;
      extraData?: PipelineClientUpdate;
    }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase nao configurado');
      const payload = {
        ...(extraData || {}),
        stage: newStage,
        ativo: newStage !== 'PERDIDO',
        lost_reason: newStage === 'PERDIDO' ? lostReason || null : undefined,
        no_show_reason: newStage === 'NO_SHOW' ? noShowReason || null : undefined,
        last_stage_change: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data: updatedClient, error } = await supabase
        .from('pipeline_clients')
        .update(payload as any)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      await syncPipelineAutomationsToCloud(dbToLocal(updatedClient, user?.id) as any, user?.id);
      return updatedClient as PipelineClientDB;
    },
    onSuccess: refreshCommercialQueries,
    onError: () => {
      toast.error('Erro ao mover lead');
    },
  });

  return {
    clients,
    isLoading,
    error,
    createClient,
    updateClient,
    deleteClient,
    moveClient,
  };
}

export function usePipelineRealtime() {
  return () => {};
}
