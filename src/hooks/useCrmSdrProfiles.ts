import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import type { CrmSdrProfile } from '@/lib/crmSdrFilter';

export function useCrmSdrProfiles() {
  return useQuery({
    queryKey: ['crm-sdr-profiles'],
    queryFn: async () => {
      if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');
      const { data } = await fetchAllRows<CrmSdrProfile>((from, to) => supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('commercial_role', 'SDR')
        .order('id')
        .range(from, to));
      return data;
    },
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}
