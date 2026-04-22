import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { savePipelineClientToCloud } from '@/lib/commercialCloudStore';
import { agendamentoToPipeline } from './usePipelineAgendamentoSync';

function onlyDigits(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

export function useSyncMissingLeads() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const syncMissingLeads = useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured) throw new Error('Supabase nao configurado');

      const [{ data: agendamentoLeads, error: leadsError }, { data: pipelineClients, error: clientsError }, { data: pointerSetting }] = await Promise.all([
        supabase.from('agendamento_leads').select('*').limit(2000),
        supabase.from('pipeline_clients').select('*').limit(2000),
        supabase.from('commercial_settings').select('setting_value').eq('setting_key', 'last_team_pointer').maybeSingle(),
      ]);
      if (leadsError) throw leadsError;
      if (clientsError) throw clientsError;

      const missingLeads = (agendamentoLeads || []).filter((lead: any) => {
        const leadPhone = onlyDigits(lead.telefone);
        const leadName = String(lead.nome || '').trim().toLowerCase();

        return !(pipelineClients || []).some((client: any) => {
          const clientPhone = onlyDigits(client.telefone);
          const clientName = String(client.client_name || '').trim().toLowerCase();
          return (leadPhone && clientPhone === leadPhone) || (leadName && clientName === leadName);
        });
      });

      for (const lead of missingLeads) {
        const pipelineData = agendamentoToPipeline(lead as any, user?.id || 'cloud-user', pointerSetting?.setting_value || 'team-equipe-7');
        await savePipelineClientToCloud({
          ...pipelineData,
          createdByUserId: user?.id || 'cloud-user',
          createdAt: new Date(),
          dataEntrada: new Date(),
          telefone: lead.telefone,
        } as any, user?.id);
      }

      return { synced: missingLeads.length, total: (agendamentoLeads || []).length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });

      if (result.synced > 0) {
        toast.success(`${result.synced} leads sincronizados com o pipeline!`);
      } else {
        toast.info('Todos os leads ja estao sincronizados.');
      }
    },
    onError: () => {
      toast.error('Erro ao sincronizar leads');
    },
  });

  return { syncMissingLeads };
}
