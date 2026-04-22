import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CommissionConfig {
  id: string;
  config_key: string;
  config_value: number;
  label: string;
  category: 'commercial' | 'operational' | 'ia';
  description: string | null;
  updated_at: string;
  updated_by_user_id: string | null;
}

// Fetch all commission configs
export function useCommissionConfigs() {
  return useQuery({
    queryKey: ['commission-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_config')
        .select('*')
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as CommissionConfig[];
    },
  });
}

// Get commission rate by key (with fallback)
export function useCommissionRate(key: string, fallback: number = 0) {
  const { data: configs } = useCommissionConfigs();
  const config = configs?.find(c => c.config_key === key);
  return config?.config_value ?? fallback;
}

// Hook to get all rates as an object for easy access
export function useCommissionRates() {
  const { data: configs, isLoading } = useCommissionConfigs();
  
  const rates = configs?.reduce((acc, config) => {
    acc[config.config_key] = config.config_value;
    return acc;
  }, {} as Record<string, number>) || {};

  // Sem fallback financeiro: se nao estiver configurado no banco, nao deve virar metrica real.
  const defaultRates = {
    HERBERT_RATE: 0,
    CLED_DIRECT_RATE: 0,
    CLED_BONUS_RATE: 0,
    RENEWAL_RATE: 0,
    PRODUCT_SALES_RATE: 0,
    GESTOR_COUNT: 0,
    IA_AGENDA_SALES_RATE: 0,
    IA_AGENDA_RECURRENCE_RATE: 0,
    IA_RENEWAL_RATE: 0,
  };

  return {
    rates: { ...defaultRates, ...rates },
    isLoading,
  };
}

// Update a commission config
export function useUpdateCommissionConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      config_key, 
      config_value,
      label,
      description,
    }: { 
      config_key: string; 
      config_value: number;
      label?: string;
      description?: string;
    }) => {
      const updateData: any = {
        config_value,
        updated_by_user_id: user?.id,
      };
      
      if (label !== undefined) updateData.label = label;
      if (description !== undefined) updateData.description = description;

      const { data, error } = await supabase
        .from('commission_config')
        .update(updateData)
        .eq('config_key', config_key)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-config'] });
    },
  });
}

// Create a new commission config
export function useCreateCommissionConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (config: Omit<CommissionConfig, 'id' | 'updated_at' | 'updated_by_user_id'>) => {
      const { data, error } = await supabase
        .from('commission_config')
        .insert({
          ...config,
          updated_by_user_id: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-config'] });
    },
  });
}

// Delete a commission config
export function useDeleteCommissionConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config_key: string) => {
      const { error } = await supabase
        .from('commission_config')
        .delete()
        .eq('config_key', config_key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-config'] });
    },
  });
}
