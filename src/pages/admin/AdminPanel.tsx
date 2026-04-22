import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Activity,
  Shield,
  Search,
  UserPlus,
  Clock,
  LogIn,
  LogOut,
  Settings,
  RefreshCw,
  UsersRound,
  Building2,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAdminProfiles,
  useAdminTeams,
  useActivityLogs,
  useUpdateProfile,
  useUpdateUserRole,
  useCreateUser,
  useUpdateUserCredentials,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useLogActivity,
  useTeamMemberCounts,
  type AdminProfile,
} from '@/hooks/useAdminData';
import type { Database } from '@/integrations/supabase/types';

type CommercialRole = Database['public']['Enums']['commercial_role'];
type OperationalRole = Database['public']['Enums']['operational_role'];
type Team = Database['public']['Tables']['teams']['Row'];

const COMMERCIAL_ROLE_LABELS: Record<CommercialRole, string> = {
  'SDR': 'SDR',
  'CLOSER': 'Closer',
  'COORDENADOR_COMERCIAL': 'Coordenador/Head Comercial',
};

const OPERATIONAL_ROLE_LABELS: Record<OperationalRole, string> = {
  'COORDENADOR_RED': 'Coordenador/Head',
  'GESTOR': 'Gestor de Tráfego',
  'ATENDENTE': 'Atendente',
  'DESIGN': 'Design',
  'EDITOR_VIDEO': 'Editor de Vídeo',
  'EQUIPE_DESIGN': 'Equipe Design',
  'EQUIPE_TECH': 'Equipe Tech',
};

const roleColors: Record<string, string> = {
  'admin': 'bg-primary/20 text-primary border-primary/30',
  'user': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'SDR': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'CLOSER': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'COORDENADOR_COMERCIAL': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'COORDENADOR_RED': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'GESTOR': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'ATENDENTE': 'bg-green-500/20 text-green-400 border-green-500/30',
  'DESIGN': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'EDITOR_VIDEO': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'EQUIPE_DESIGN': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'EQUIPE_TECH': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const actionIcons: Record<string, React.ElementType> = {
  'LOGIN': LogIn,
  'LOGOUT': LogOut,
  'MODULE_SWITCH': RefreshCw,
  'USER_CREATED': UserPlus,
  'USER_UPDATED': Settings,
  'USER_DELETED': Trash2,
  'TEAM_CREATED': UsersRound,
  'TEAM_UPDATED': UsersRound,
  'TEAM_DELETED': UsersRound,
  'ROLE_UPDATED': Crown,
};

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
  return `${Math.floor(seconds / 86400)}d atrás`;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  
  // Data hooks
  const { data: profiles, isLoading: profilesLoading } = useAdminProfiles();
  const { data: teams, isLoading: teamsLoading } = useAdminTeams();
  const { data: activityLogs, isLoading: logsLoading } = useActivityLogs();
  
  // Mutation hooks
  const updateProfile = useUpdateProfile();
  const updateUserRole = useUpdateUserRole();
  const createUser = useCreateUser();
  const updateUserCredentials = useUpdateUserCredentials();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const logActivity = useLogActivity();
  
  // Team member counts
  const teamMemberCounts = useTeamMemberCounts(profiles);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityUserFilter, setActivityUserFilter] = useState<string>('all');
  const [teamSearch, setTeamSearch] = useState('');
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddTeamDialogOpen, setIsAddTeamDialogOpen] = useState(false);
  const [isEditTeamDialogOpen, setIsEditTeamDialogOpen] = useState(false);
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AdminProfile | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  
  // Form state for editing
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    new_email: '',
    new_password: '',
    commercial_role: '' as CommercialRole | '',
    operational_role: '' as OperationalRole | '',
    team_id: '',
    is_active: true,
    is_admin: false,
  });
  
  // Form state for adding new user
  const [newUserData, setNewUserData] = useState({
    full_name: '',
    email: '',
    password: '',
    commercial_role: '' as CommercialRole | '',
    operational_role: '' as OperationalRole | '',
    team_id: '',
  });

  const filteredProfiles = (profiles || []).filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.commercial_role?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const filteredLogs = (activityLogs || []).filter(log => {
    // Filter by user
    if (activityUserFilter !== 'all' && log.user_id !== activityUserFilter) {
      return false;
    }
    // Filter by search term
    return log.user_name.toLowerCase().includes(activitySearch.toLowerCase()) ||
      log.action.toLowerCase().includes(activitySearch.toLowerCase()) ||
      log.entity.toLowerCase().includes(activitySearch.toLowerCase()) ||
      (log.details?.toLowerCase().includes(activitySearch.toLowerCase()) ?? false);
  });

  // Get unique users from activity logs for the filter dropdown
  const activityUsers = activityLogs
    ? Array.from(new Map(activityLogs.map(log => [log.user_id, { id: log.user_id, name: log.user_name }])).values())
    : [];

  const filteredTeams = (teams || []).filter(t =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!newUserData.email || !newUserData.password || !newUserData.full_name) {
      return;
    }
    
    await createUser.mutateAsync({
      email: newUserData.email,
      password: newUserData.password,
      full_name: newUserData.full_name,
      team_id: newUserData.team_id || undefined,
      commercial_role: newUserData.commercial_role || null,
      operational_role: null,
    });
    
    setNewUserData({
      full_name: '',
      email: '',
      password: '',
      commercial_role: '',
      operational_role: '',
      team_id: '',
    });
    setIsAddUserDialogOpen(false);
  };

  const handleEditUser = async () => {
    if (!selectedProfile) return;
    
    // Update profile basic info
    await updateProfile.mutateAsync({
      id: selectedProfile.id,
      updates: {
        full_name: formData.full_name,
        commercial_role: formData.commercial_role || null,
        operational_role: null,
        team_id: formData.team_id || null,
        is_active: formData.is_active,
      },
    });
    
    // Update email/password via edge function if changed
    if (formData.new_email || formData.new_password) {
      await updateUserCredentials.mutateAsync({
        user_id: selectedProfile.id,
        email: formData.new_email || undefined,
        password: formData.new_password || undefined,
      });
    }
    
    // Update admin role if changed
    const wasAdmin = selectedProfile.user_role === 'admin';
    if (formData.is_admin !== wasAdmin) {
      await updateUserRole.mutateAsync({
        userId: selectedProfile.id,
        role: formData.is_admin ? 'admin' : 'user',
      });
    }
    
    // Log activity
    logActivity.mutate({
      action: 'USER_UPDATED',
      entity: 'profiles',
      entity_id: selectedProfile.id,
      details: `Usuário ${formData.full_name} atualizado`,
    });
    
    setIsEditDialogOpen(false);
    setSelectedProfile(null);
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    await createTeam.mutateAsync(newTeamName.trim());
    
    logActivity.mutate({
      action: 'TEAM_CREATED',
      entity: 'teams',
      details: `Equipe "${newTeamName.trim()}" criada`,
    });
    
    setNewTeamName('');
    setIsAddTeamDialogOpen(false);
  };

  const handleEditTeam = async () => {
    if (!selectedTeam || !newTeamName.trim()) return;
    await updateTeam.mutateAsync({ id: selectedTeam.id, name: newTeamName.trim() });
    
    logActivity.mutate({
      action: 'TEAM_UPDATED',
      entity: 'teams',
      entity_id: selectedTeam.id,
      details: `Equipe atualizada para "${newTeamName.trim()}"`,
    });
    
    setNewTeamName('');
    setSelectedTeam(null);
    setIsEditTeamDialogOpen(false);
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;
    await deleteTeam.mutateAsync(selectedTeam.id);
    
    logActivity.mutate({
      action: 'TEAM_DELETED',
      entity: 'teams',
      entity_id: selectedTeam.id,
      details: `Equipe "${selectedTeam.name}" removida`,
    });
    
    setSelectedTeam(null);
    setIsDeleteTeamDialogOpen(false);
  };

  const openEditDialog = (profile: AdminProfile) => {
    setSelectedProfile(profile);
    setFormData({
      full_name: profile.full_name,
      email: profile.email,
      new_email: '',
      new_password: '',
      commercial_role: profile.commercial_role || '',
      operational_role: profile.operational_role || '',
      team_id: profile.team_id || '',
      is_active: profile.is_active ?? true,
      is_admin: profile.user_role === 'admin',
    });
    setIsEditDialogOpen(true);
  };

  const openEditTeamDialog = (team: Team) => {
    setSelectedTeam(team);
    setNewTeamName(team.name);
    setIsEditTeamDialogOpen(true);
  };

  const openDeleteTeamDialog = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteTeamDialogOpen(true);
  };

  const getTeamName = (teamId?: string | null) => {
    if (!teamId) return '-';
    const team = teams?.find(t => t.id === teamId);
    return team?.name || '-';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/login');
  };

  const activeUsersCount = profiles?.filter(p => p.is_active).length || 0;
  const todaysLogsCount = activityLogs?.filter(l => 
    new Date(l.created_at).toDateString() === new Date().toDateString()
  ).length || 0;
  const todaysLoginsCount = activityLogs?.filter(l => 
    l.action === 'LOGIN' && 
    new Date(l.created_at).toDateString() === new Date().toDateString()
  ).length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/select-module')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo variant="full" size="md" />
        </div>
        <div className="flex items-center gap-3">
          <Badge className={roleColors['admin']}>
            <Shield className="h-3 w-3 mr-1" />
            Administrador
          </Badge>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Painel de Administração</h1>
          <p className="text-muted-foreground">
            Gerencie usuários, equipes, acessos e monitore atividades do sistema.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Usuários</p>
                  {profilesLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{profiles?.length || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  {profilesLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{activeUsersCount}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Equipes</p>
                  {teamsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{teams?.length || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Atividades Hoje</p>
                  {logsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{todaysLogsCount}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Logins Hoje</p>
                  {logsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{todaysLoginsCount}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-surface-2">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2">
              <Building2 className="h-4 w-4" />
              Equipes
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Atividades
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gerenciar Usuários</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuários..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                  <Button onClick={() => setIsAddUserDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {profilesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {profile.user_role === 'admin' && (
                                <Crown className="h-4 w-4 text-primary" />
                              )}
                              {profile.full_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {profile.user_role === 'admin' && (
                                <Badge className={cn('border text-xs', roleColors['admin'])}>
                                  Admin
                                </Badge>
                              )}
                              {profile.commercial_role && (
                                <Badge className={cn('border text-xs', roleColors[profile.commercial_role])}>
                                  {COMMERCIAL_ROLE_LABELS[profile.commercial_role]}
                                </Badge>
                              )}
                              {!profile.commercial_role && profile.user_role !== 'admin' && (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getTeamName(profile.team_id)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={profile.is_active ? 'success' : 'outline'}>
                              {profile.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditDialog(profile)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredProfiles.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum usuário encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gerenciar Equipes</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar equipes..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                  <Button onClick={() => { setNewTeamName(''); setIsAddTeamDialogOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Equipe
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome da Equipe</TableHead>
                        <TableHead>Membros</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeams.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-purple-400" />
                              </div>
                              {team.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {teamMemberCounts[team.id] || 0} membros
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(team.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditTeamDialog(team)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openDeleteTeamDialog(team)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredTeams.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Nenhuma equipe encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Registro de Atividades</CardTitle>
                <div className="flex items-center gap-3">
                  <Select value={activityUserFilter} onValueChange={setActivityUserFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {activityUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar atividades..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Nenhuma atividade registrada</p>
                        </div>
                      ) : (
                        filteredLogs.map((log) => {
                          const ActionIcon = actionIcons[log.action] || Activity;
                          return (
                            <div
                              key={log.id}
                              className="flex items-start gap-4 p-4 rounded-xl bg-surface-2 border border-border"
                            >
                              <div className="h-10 w-10 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                                <ActionIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{log.user_name}</span>
                                  <span className="text-xs text-muted-foreground">({log.user_email})</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {log.details || `${log.action} - ${log.entity}`}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground">
                                  {formatTimeAgo(log.created_at)}
                                </p>
                                <p className="text-xs text-muted-foreground/70">
                                  {formatDate(log.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input
                value={newUserData.full_name}
                onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha *</Label>
                <Input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Equipe *</Label>
              <Select
                value={newUserData.team_id}
                onValueChange={(value) => setNewUserData({ ...newUserData, team_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  {(teams || []).map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Função Comercial</Label>
                <Select
                  value={newUserData.commercial_role || "none"}
                  onValueChange={(value) => setNewUserData({ ...newUserData, commercial_role: value === "none" ? undefined : value as CommercialRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {Object.entries(COMMERCIAL_ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddUser} 
              disabled={createUser.isPending || !newUserData.email || !newUserData.password || !newUserData.full_name}
            >
              {createUser.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email atual</Label>
                <Input
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            
            {/* Credentials Section */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium text-sm text-muted-foreground">Alterar Credenciais (opcional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Novo Email</Label>
                  <Input
                    type="email"
                    value={formData.new_email}
                    onChange={(e) => setFormData({ ...formData, new_email: e.target.value })}
                    placeholder="Deixe vazio para manter"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    value={formData.new_password}
                    onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                    placeholder="Mín. 6 caracteres"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role Comercial</Label>
                <Select
                  value={formData.commercial_role || "none"}
                  onValueChange={(value) => setFormData({ ...formData, commercial_role: value === "none" ? '' : value as CommercialRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {Object.entries(COMMERCIAL_ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select
                value={formData.team_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, team_id: value === "none" ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {(teams || []).map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Usuário ativo</Label>
              </div>
              
              <div className="flex items-center gap-3">
                <Switch
                  id="is_admin"
                  checked={formData.is_admin}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_admin: checked })}
                />
                <Label htmlFor="is_admin" className="flex items-center gap-1">
                  <Crown className="h-4 w-4 text-primary" />
                  Administrador
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditUser} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Dialog */}
      <Dialog open={isAddTeamDialogOpen} onOpenChange={setIsAddTeamDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Nova Equipe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da equipe</Label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Ex: Equipe Alpha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTeamDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTeam} disabled={createTeam.isPending}>
              {createTeam.isPending ? 'Criando...' : 'Criar Equipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={isEditTeamDialogOpen} onOpenChange={setIsEditTeamDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Equipe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da equipe</Label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTeamDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditTeam} disabled={updateTeam.isPending}>
              {updateTeam.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation Dialog */}
      <Dialog open={isDeleteTeamDialogOpen} onOpenChange={setIsDeleteTeamDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Remover Equipe
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Tem certeza que deseja remover a equipe <strong>{selectedTeam?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Os membros serão desvinculados mas não removidos.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteTeamDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={deleteTeam.isPending}>
              {deleteTeam.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
