import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthSafe } from '@/contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { deletePipelineClientFromCloud, savePipelineClientToCloud } from '@/lib/commercialCloudStore';
import { readCommercialLocalData, updateCommercialLocalData } from '@/lib/commercialLocalStore';
import { commercialAnswerToDb, coerceCommercialAnswer } from '@/lib/commercialAnswer';
import { getCommercialLeadOrigin } from '@/lib/commercialOrigin';

function normalizePipelineIdentity(client: any) {
  const phone = String(client.telefone || '').replace(/\D/g, '');
  const name = String(client.clientName || '').trim().toLowerCase();
  return { phone, name };
}

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
    criativo: getCommercialLeadOrigin({ criativo: client.criativo, funil: client.funil }),
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
    tem_socio: commercialAnswerToDb(client.temSocio),
    tem_mkt: commercialAnswerToDb(client.temMkt),
    tem_secretaria: commercialAnswerToDb(client.temSecretaria),
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
    criativo: getCommercialLeadOrigin({ criativo: client.criativo, funil: client.funil }),
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
    temSocio: coerceCommercialAnswer(client.tem_socio, 'NAO') || undefined,
    temMkt: coerceCommercialAnswer(client.tem_mkt, 'NAO') || undefined,
    temSecretaria: coerceCommercialAnswer(client.tem_secretaria) || undefined,
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
    queryKey: ['pipeline-clients-db'],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return (readCommercialLocalData().pipelineClients || []).map((client: any) => localToDb(client, user?.id));
      }

      const { data, error } = await supabase
        .from('pipeline_clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PipelineClientDB[];
    },
  });

  const refreshCommercialQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
    queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] });
    queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
    queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
  };

  const createClient = useMutation({
    mutationFn: async (client: PipelineClientInsert) => {
      const localClient = dbToLocal(client, user?.id) as any;

      if (!isSupabaseConfigured) {
        let savedLocalClient: any = null;
        updateCommercialLocalData((current) => {
          const { phone, name } = normalizePipelineIdentity(client);
          const nextClient = localToDb({ ...client, id: `pipeline-${crypto.randomUUID()}`, createdByUserId: user?.id || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any, user?.id);
          const existingIndex = current.pipelineClients.findIndex((item: any) => {
            const itemIdentity = normalizePipelineIdentity(item);
            return (phone && itemIdentity.phone === phone) || (name && itemIdentity.name === name);
          });

          if (existingIndex >= 0) {
            const nextPipelineClients = [...current.pipelineClients];
            savedLocalClient = { ...nextPipelineClients[existingIndex], ...nextClient, updatedAt: new Date().toISOString() };
            nextPipelineClients[existingIndex] = savedLocalClient;
            return {
              ...current,
              pipelineClients: nextPipelineClients,
            };
          }

          savedLocalClient = nextClient;
          return {
            ...current,
            pipelineClients: [nextClient, ...current.pipelineClients],
          };
        });
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return localToDb(savedLocalClient, user?.id);
      }

      const saved = await savePipelineClientToCloud(localClient, user?.id);
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
      if (!isSupabaseConfigured) {
        updateCommercialLocalData((current) => ({
          ...current,
          pipelineClients: current.pipelineClients.map((item: any) =>
            item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item
          ),
        }));
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return localToDb({ id, ...data } as any, user?.id);
      }
      const current = clients.find((client) => client.id === id);
      if (!current) {
        throw new Error('Lead nao encontrado');
      }
      const saved = await savePipelineClientToCloud({
        ...dbToLocal(current, user?.id),
        ...data,
        id,
        updatedAt: new Date().toISOString(),
      } as any, user?.id);
      if (!saved) throw new Error('Falha ao salvar lead');
      return localToDb(saved);
    },
    onSuccess: refreshCommercialQueries,
    onError: () => {
      toast.error('Erro ao atualizar lead');
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured) {
        updateCommercialLocalData((current) => ({
          ...current,
          pipelineClients: current.pipelineClients.filter((item: any) => item.id !== id),
        }));
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return;
      }
      const removed = clients.find((client) => client.id === id);
      if (removed) {
        await deletePipelineClientFromCloud({
          ...removed,
          id,
        } as any);
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
      if (!isSupabaseConfigured) {
        updateCommercialLocalData((current) => ({
          ...current,
          pipelineClients: current.pipelineClients.map((item: any) =>
            item.id === id
              ? {
                  ...item,
                  ...extraData,
                  stage: newStage,
                  ativo: newStage !== 'PERDIDO',
                  lostReason: newStage === 'PERDIDO' ? lostReason || item.lostReason : item.lostReason,
                  noShowReason: newStage === 'NO_SHOW' ? noShowReason || item.noShowReason : item.noShowReason,
                  lastStageChange: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : item
          ),
        }));
        window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        return localToDb({ id, ...(extraData || {}), stage: newStage } as any, user?.id);
      }
      const current = clients.find((client) => client.id === id);
      if (!current) {
        throw new Error('Lead nao encontrado');
      }
      const saved = await savePipelineClientToCloud({
        ...dbToLocal(current, user?.id),
        ...extraData,
        id,
        stage: newStage,
        ativo: newStage !== 'PERDIDO',
        lostReason: newStage === 'PERDIDO' ? lostReason || current.lost_reason || current.lostReason : current.lost_reason || current.lostReason,
        noShowReason: newStage === 'NO_SHOW' ? noShowReason || current.no_show_reason || current.noShowReason : current.no_show_reason || current.noShowReason,
        lastStageChange: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any, user?.id);
      if (!saved) throw new Error('Falha ao mover lead');
      return localToDb(saved);
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
  return undefined;
}
