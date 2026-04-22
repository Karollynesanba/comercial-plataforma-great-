import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CommercialGoal {
  id: string;
  month: string;
  goal_value: number;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SDRGoalDB {
  id: string;
  agendador: string;
  month: string;
  goal_count: number;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all commercial goals
export function useCommercialGoals() {
  return useQuery({
    queryKey: ['commercial-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_goals')
        .select('*')
        .order('month', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}

// Get goal for a specific month
export function useCommercialGoal(month: string) {
  const { data: goals } = useCommercialGoals();
  return goals?.find(g => g.month === month) || null;
}

// Get current month goal value (for CEO Dashboard)
export function useCurrentMonthGoal() {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const { data: goals, isLoading } = useCommercialGoals();
  
  const goal = goals?.find(g => g.month === currentMonth);
  return {
    goalValue: goal?.goal_value ?? 0,
    isLoading,
    goal,
  };
}

// Create or update commercial goal
export function useUpsertCommercialGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ month, goalValue }: { month: string; goalValue: number }) => {
      // First try to find existing
      const { data: existing } = await supabase
        .from('commercial_goals')
        .select('id')
        .eq('month', month)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from('commercial_goals')
          .update({ 
            goal_value: goalValue,
            updated_at: new Date().toISOString(),
          })
          .eq('month', month)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('commercial_goals')
          .insert({
            month,
            goal_value: goalValue,
            created_by_user_id: user?.id,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-goals'] });
      queryClient.invalidateQueries({ queryKey: ['ceo-metrics'] });
    },
  });
}

// Fetch all SDR goals from database
export function useSDRGoalsDB() {
  return useQuery({
    queryKey: ['sdr-goals-db'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sdr_goals')
        .select('*')
        .order('month', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}

// Create or update SDR goal
export function useUpsertSDRGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ agendador, month, goalCount }: { agendador: string; month: string; goalCount: number }) => {
      const { data: existing } = await supabase
        .from('sdr_goals')
        .select('id')
        .eq('agendador', agendador)
        .eq('month', month)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from('sdr_goals')
          .update({ goal_count: goalCount, updated_at: new Date().toISOString() })
          .eq('agendador', agendador)
          .eq('month', month)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('sdr_goals')
          .insert({ agendador, month, goal_count: goalCount, created_by_user_id: user?.id })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-goals-db'] });
    },
  });
}
