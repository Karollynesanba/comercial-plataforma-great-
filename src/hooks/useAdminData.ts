import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];
type UserRole = Database['public']['Tables']['user_roles']['Row'];
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type CommercialRole = Database['public']['Enums']['commercial_role'];
type OperationalRole = Database['public']['Enums']['operational_role'];

export interface AdminProfile extends Profile {
  user_role?: 'admin' | 'user';
  team?: Team | null;
}

// Fetch all profiles with their roles and teams
export function useAdminProfiles() {
  return useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, teams(*)');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Merge profiles with their roles (prioritize admin role if user has multiple roles)
      const profilesWithRoles: AdminProfile[] = (profiles || []).map(profile => {
        const userRoles = roles?.filter(r => r.user_id === profile.id) || [];
        const hasAdminRole = userRoles.some(r => r.role === 'admin');
        return {
          ...profile,
          user_role: hasAdminRole ? 'admin' : (userRoles[0]?.role as 'admin' | 'user' | undefined),
          team: (profile as any).teams || null,
        };
      });

      return profilesWithRoles;
    },
  });
}

// Fetch all teams
export function useAdminTeams() {
  return useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Team[];
    },
  });
}

// Fetch activity logs
export function useActivityLogs() {
  return useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });
}

// Update profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Profile> 
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Usuário atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar usuário: ' + error.message);
    },
  });
}

// Update user role mutation
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      role 
    }: { 
      userId: string; 
      role: 'admin' | 'user' 
    }) => {
      // First check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Role atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar role: ' + error.message);
    },
  });
}

// Create user mutation (via edge function)
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      full_name: string;
      team_id?: string;
      commercial_role?: CommercialRole | null;
      operational_role?: OperationalRole | null;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: userData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Usuário criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar usuário: ' + error.message);
    },
  });
}

// Update user credentials (email/password) via edge function
export function useUpdateUserCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: {
      user_id: string;
      email?: string;
      password?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: userData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Credenciais atualizadas com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar credenciais: ' + error.message);
    },
  });
}

// Create team mutation
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('teams')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Equipe criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar equipe: ' + error.message);
    },
  });
}

// Update team mutation
export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('teams')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Equipe atualizada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar equipe: ' + error.message);
    },
  });
}

// Delete team mutation
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Equipe removida com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao remover equipe: ' + error.message);
    },
  });
}

// Log activity mutation
export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: {
      action: string;
      entity: string;
      entity_id?: string;
      details?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          user_name: profile?.full_name || 'Unknown',
          user_email: profile?.email || user.email || 'Unknown',
          ...log,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

// Get member count per team
export function useTeamMemberCounts(profiles: AdminProfile[] | undefined) {
  const counts: Record<string, number> = {};
  
  if (profiles) {
    profiles.forEach(profile => {
      if (profile.team_id) {
        counts[profile.team_id] = (counts[profile.team_id] || 0) + 1;
      }
    });
  }

  return counts;
}
