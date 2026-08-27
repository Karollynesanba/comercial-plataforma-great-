import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserRole, Module, ActivityLog, Team } from '@/types';
import { COMMERCIAL_LOGIN_EMAILS, COMMERCIAL_LOGIN_PASSWORD, TEAM_USERS, canEditPlatform, getUserByEmail, getUserByName, isCoordinator } from '@/lib/userMapping';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safeStorage';
import { buildLocalUser } from '@/lib/localBackupBootstrap';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  hasDualAccess: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  selectedModule: Module | null;
  selectModule: (module: Module) => void;
  getModule: () => Module | null;
  hasAccess: (requiredModule: Module) => boolean;
  users: User[];
  addUser: (user: Omit<User, 'id' | 'createdAt'> & { password: string }) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  teams: Team[];
  addTeam: (name: string) => void;
  updateTeam: (id: string, name: string) => void;
  deleteTeam: (id: string) => void;
  activityLogs: ActivityLog[];
  logActivity: (action: string, entity: string, entityId?: string, details?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

const INITIAL_USERS: (User & { password: string })[] = Object.values(TEAM_USERS).map((entry) => ({
  id: entry.email,
  name: entry.name,
  email: entry.email,
  role: entry.role as UserRole,
  active: true,
  createdAt: new Date(),
  password: COMMERCIAL_LOGIN_PASSWORD,
}));

const INITIAL_TEAMS: Team[] = [];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Store both roles from database
  const [commercialRole, setCommercialRole] = useState<string | null>(null);
  const [users, setUsers] = useState<(User & { password: string })[]>(INITIAL_USERS);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<Module | null>('COMERCIAL');

  function createLocalAuthState(authUser: User) {
    const now = new Date().toISOString();
    const fakeSupabaseUser = {
      id: authUser.id,
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: { full_name: authUser.name },
      role: 'authenticated',
      email: authUser.email,
      created_at: now,
      confirmed_at: now,
      last_sign_in_at: now,
      factors: [],
    } as SupabaseUser;

    const fakeSession = {
      access_token: 'great-local-session',
      refresh_token: 'great-local-session',
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      token_type: 'bearer',
      user: fakeSupabaseUser,
    } as Session;

    setUser(authUser);
    setSupabaseUser(fakeSupabaseUser);
    setSession(fakeSession);
    safeSetItem('great_user', JSON.stringify(authUser));
    safeSetItem('great_selected_module', 'COMERCIAL');
    safeSetItem('great_local_auth_bypass', 'true');
    safeSetItem('great_local_auth_user', JSON.stringify(authUser));
    safeRemoveItem('great_test_session_bypass');
  }

  async function syncCommercialProfile(authUser: User) {
    if (!isSupabaseConfigured) return;

    const mappedUser = getUserByEmail(authUser.email);
    console.info('[auth] syncing commercial profile', {
      email: authUser.email,
      userId: authUser.id,
      commercialRole: mappedUser?.role || null,
    });
    await supabase
      .from('profiles')
      .update({
        full_name: authUser.name,
        email: authUser.email,
        commercial_role: mappedUser?.role === 'SDR' || mappedUser?.role === 'CLOSER' || mappedUser?.role === 'COORDENADOR_COMERCIAL'
          ? mappedUser.role
          : null,
      })
      .eq('id', authUser.id);
  }

  function withTimeout<T>(thenable: PromiseLike<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      Promise.resolve(thenable),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout:${label}`)), ms)
      ),
    ]);
  }

  // Sync internal user from supabase session
  const syncInternalUser = useCallback(async (supabaseUserData: SupabaseUser | null) => {
    if (!supabaseUserData) {
      setUser(null);
      setCommercialRole(null);
      safeRemoveItem('great_user');
      return;
    }

    const email = supabaseUserData.email?.toLowerCase();
    const foundUser = users.find(u => u.email.toLowerCase() === email && u.active);
    const mappedUser = email ? getUserByEmail(email) : undefined;

    // IMPORTANT: Never block the UI waiting for remote role/profile queries.
    // Set a baseline internal user immediately so routing can proceed.
    // (We refine roles below when/if backend queries succeed.)
    if (email) {
      const baselineRole: UserRole =
        (mappedUser?.role as UserRole) ||
        (foundUser?.role as UserRole) ||
        'SETOR_COMERCIAL';
      const baselineUser: User = {
        id: supabaseUserData.id,
        email: supabaseUserData.email || '',
        name:
          (mappedUser?.name as string) ||
          (foundUser?.name as string) ||
          supabaseUserData.user_metadata?.full_name ||
          supabaseUserData.email ||
          '',
        role: baselineRole,
        active: true,
        createdAt: new Date(),
        teamId: (foundUser as any)?.teamId,
      };

      setUser(prev => {
        if (prev?.id === baselineUser.id) return prev;
        return baselineUser;
      });
    }

    // Check if user has admin role in user_roles table
    let hasAdminRole = false;
    try {
      const { data: roleData } = await withTimeout(
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', supabaseUserData.id)
          .eq('role', 'admin')
          .maybeSingle(),
        4000,
        'check_admin_role'
      );
      
      hasAdminRole = !!roleData;
    } catch (error) {
      console.error('Error checking admin role:', error);
    }

    // Fetch the commercial role from database
    let dbCommercialRole: string | null = null;

    try {
      const { data: profile } = await withTimeout(
        supabase
          .from('profiles')
          .select('full_name, commercial_role')
          .eq('id', supabaseUserData.id)
          .maybeSingle(),
        4000,
        'fetch_profile_roles'
      );
      
      dbCommercialRole = profile?.commercial_role || null;
      setCommercialRole(dbCommercialRole);
    } catch (error) {
      console.error('Error fetching profile roles:', error);
      setCommercialRole(null);
    }

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      
      // Determine primary role
      let finalRole = userWithoutPassword.role;
      if (mappedUser?.role) {
        finalRole = mappedUser.role as UserRole;
      }
      if (hasAdminRole) {
        finalRole = 'ADMIN';
      } else if (dbCommercialRole === 'COORDENADOR_COMERCIAL') {
        finalRole = 'COORDENADOR_COMERCIAL';
      } else if (dbCommercialRole) {
        finalRole = dbCommercialRole as UserRole;
      }
      
      // IMPORTANT: Always use the Supabase user ID (UUID) instead of internal mock IDs
      const userWithCorrectId: User = {
        ...userWithoutPassword,
        id: supabaseUserData.id,
        role: finalRole,
      };
      setUser(userWithCorrectId);
      safeSetItem('great_user', JSON.stringify(userWithCorrectId));
      void syncCommercialProfile(userWithCorrectId).catch((error) => {
        console.warn('Could not sync commercial profile.', error);
      });
    } else {
      // User exists in Supabase but not in internal users list - fetch from database
      let role: UserRole = (mappedUser?.role as UserRole) || 'SETOR_COMERCIAL';
      if (hasAdminRole) {
        role = 'ADMIN';
      } else if (dbCommercialRole === 'COORDENADOR_COMERCIAL') {
        role = 'COORDENADOR_COMERCIAL';
      } else if (dbCommercialRole) {
        role = dbCommercialRole as UserRole;
      } else if (mappedUser?.role) {
        role = mappedUser.role as UserRole;
      }

      let profileName: string | null = null;
      try {
        const { data: profile } = await withTimeout(
          supabase
            .from('profiles')
            .select('full_name')
            .eq('id', supabaseUserData.id)
            .maybeSingle(),
          4000,
          'fetch_profile_name'
        );
        profileName = profile?.full_name ?? null;
      } catch (err) {
        console.error('Error fetching profile name:', err);
      }

      const newUser: User = {
        id: supabaseUserData.id,
        email: supabaseUserData.email || '',
        name: profileName || mappedUser?.name || supabaseUserData.user_metadata?.full_name || supabaseUserData.email || '',
        role,
        active: true,
        createdAt: new Date(),
      };
      setUser(newUser);
      safeSetItem('great_user', JSON.stringify(newUser));
      void syncCommercialProfile(newUser).catch((error) => {
        console.warn('Could not sync commercial profile.', error);
      });
    }
  }, [users]);

  // Initialize auth state listener - use ref to avoid dependency on syncInternalUser
  const syncInternalUserRef = React.useRef(syncInternalUser);
  syncInternalUserRef.current = syncInternalUser;

  useEffect(() => {
    let mounted = true;
    let authSyncDone = false;

    const testAuthBypass = safeGetItem('great_test_session_bypass') === 'true';
    if (testAuthBypass) {
      const storedUser = safeGetItem('great_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as User;
          setUser(parsedUser);
          setSupabaseUser({
            id: parsedUser.id,
            aud: 'authenticated',
            app_metadata: {},
            user_metadata: { full_name: parsedUser.name },
            role: 'authenticated',
            email: parsedUser.email,
            created_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            factors: [],
          } as SupabaseUser);
          setSession({
            access_token: 'test-session-bypass',
            refresh_token: 'test-session-bypass',
            expires_at: Math.floor(Date.now() / 1000) + 86400,
            token_type: 'bearer',
            user: {
              id: parsedUser.id,
              aud: 'authenticated',
              app_metadata: {},
              user_metadata: { full_name: parsedUser.name },
              role: 'authenticated',
              email: parsedUser.email,
              created_at: new Date().toISOString(),
              confirmed_at: new Date().toISOString(),
              last_sign_in_at: new Date().toISOString(),
              factors: [],
            } as SupabaseUser,
          } as Session);
        } catch (error) {
          console.error('Failed to parse test auth user:', error);
        }
      } else if (isLocalhost) {
        createLocalAuthState(buildLocalUser());
      }
      setIsLoading(false);
      return () => {};
    }

    const localAuthBypass = safeGetItem('great_local_auth_bypass') === 'true';
    const shouldHonorLocalAuthBypass =
      localAuthBypass || isLocalhost || safeGetItem('great_enable_localhost_fallback') === 'true' || safeGetItem('great_test_session_bypass') === 'true';
    if (shouldHonorLocalAuthBypass) {
      const storedUser = safeGetItem('great_local_auth_user') || safeGetItem('great_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as User;
          createLocalAuthState(parsedUser);
        } catch (error) {
          console.error('Failed to parse local auth user:', error);
        }
      } else if (isLocalhost) {
        createLocalAuthState(buildLocalUser());
      }
      setIsLoading(false);
      return () => {};
    }
    
    // Safety timeout - prevent infinite loading state
    const safetyTimeout = setTimeout(() => {
      if (mounted && !authSyncDone) {
        console.warn('Auth sync timeout - forcing loading to complete');
        setIsLoading(false);
      }
    }, 8000); // 8 second max wait
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, currentSession?.user?.email);
        
        setSession(currentSession);
        setSupabaseUser(currentSession?.user ?? null);

        // Never keep the whole app blocked waiting for profile/role sync.
        if (mounted) {
          authSyncDone = true;
          setIsLoading(false);
        }
        
        if (currentSession?.user) {
          // Fire-and-forget; syncInternalUser sets a baseline user immediately.
          void syncInternalUserRef.current(currentSession.user).catch((err) => {
            console.error('Error syncing user:', err);
          });
        } else {
          setUser(null);
          setCommercialRole(null);
          safeRemoveItem('great_user');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (!mounted) return;
      
      setSession(existingSession);
      setSupabaseUser(existingSession?.user ?? null);

      if (mounted) {
        authSyncDone = true;
        setIsLoading(false);
      }

      if (existingSession?.user) {
        void syncInternalUserRef.current(existingSession.user).catch((err) => {
          console.error('Error syncing initial user:', err);
        });
      }
    }).catch(err => {
      console.error('Error getting session:', err);
      if (mounted) {
        authSyncDone = true;
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []); // Empty deps - use ref for syncInternalUser

  const logActivity = useCallback((action: string, entity: string, entityId?: string, details?: string) => {
    if (!user) return;
    
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      entity,
      entityId,
      details,
      createdAt: new Date(),
    };
    
    setActivityLogs(prev => [log, ...prev].slice(0, 500)); // Keep last 500 logs
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const mappedUser = getUserByEmail(normalizedEmail);
      const localPasswordOk = password === COMMERCIAL_LOGIN_PASSWORD;
      const localEmailOk = COMMERCIAL_LOGIN_EMAILS.some(allowedEmail => allowedEmail.toLowerCase() === normalizedEmail);
      const localEmailMatch = mappedUser || localEmailOk;
      const canUseLocalAuth = localEmailMatch && localPasswordOk;

      console.info('[auth] login attempt', {
        email: normalizedEmail,
        localEmailMatch: Boolean(localEmailMatch),
        canUseLocalAuth,
        isSupabaseConfigured,
        hostname: isBrowser ? window.location.hostname : 'server',
      });

      if (canUseLocalAuth) {
        const localUser = mappedUser ?? getUserByEmail(normalizedEmail);
        if (!localUser) {
          return { success: false, error: 'Email não autorizado para login interno.' };
        }
        const authUser: User = {
          id: localUser.email,
          email: localUser.email,
          name: localUser.name,
          role: localUser.role as UserRole,
          active: true,
          createdAt: new Date(),
        };

        createLocalAuthState(authUser);
        console.info('[auth] local auth session created', {
          email: authUser.email,
          userId: authUser.id,
        });
        return { success: true };
      }

      if (localEmailMatch && !localPasswordOk) {
        return { success: false, error: 'Senha incorreta. Use Great2026! para esses acessos.' };
      }

      if (!isSupabaseConfigured) {
        return { success: false, error: 'Login indisponível neste ambiente. Use os acessos internos.' };
      }

      // Try to sign in with Supabase directly for non-commercial access only.
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        6000,
        'sign_in'
      );

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Email ou senha incorretos.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Email não confirmado. Verifique sua caixa de entrada.' };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.info('[auth] supabase login successful', {
          email: data.user.email,
          userId: data.user.id,
        });
        // Log the login activity
        const log: ActivityLog = {
          id: crypto.randomUUID(),
          userId: data.user.id,
          userName: data.user.user_metadata?.full_name || data.user.email || '',
          userRole: 'SETOR_COMERCIAL' as UserRole,
          action: 'LOGIN',
          entity: 'Session',
          details: `Login realizado às ${new Date().toLocaleTimeString('pt-BR')}`,
          createdAt: new Date(),
        };
        setActivityLogs(prev => [log, ...prev].slice(0, 500));
      }

      return { success: true };
    } catch (error: any) {
      const message = String(error?.message || error || 'Erro inesperado ao fazer login.');
      const passwordOk = password === COMMERCIAL_LOGIN_PASSWORD;

      if (isLocalhost && passwordOk) {
        const fallbackUser: User = {
          id: email.trim().toLowerCase() || 'local-user',
          email: email.trim().toLowerCase(),
          name: email.split('@')[0] || 'Usuário Great',
          role: 'SETOR_COMERCIAL',
          active: true,
          createdAt: new Date(),
        };
        createLocalAuthState(fallbackUser);
        return { success: true };
      }

      if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('timeout:sign_in')) {
        return { success: false, error: 'Falha de conexão ao tentar autenticar. Tente o login interno ou verifique a rede.' };
      }
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (!supabase) {
        return { success: false, error: 'Cadastro indisponível neste ambiente. Use o login com os acessos internos.' };
      }

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return { success: false, error: 'Este email já está cadastrado.' };
        }
        
        return { success: false, error: error.message };
      }

      // Add user to internal users list
      if (data.user) {
        const newUser: User & { password: string } = {
          id: data.user.id,
          email: data.user.email || email,
          name: name,
          password: password, // Store for internal lookup
          role: 'SETOR_COMERCIAL' as UserRole,
          active: true,
          createdAt: new Date(),
        };
        setUsers(prev => [...prev, newUser]);
      }

      return { success: true };
    } catch (error: any) {
      const message = String(error?.message || error || 'Erro inesperado ao criar conta.');
      if (message.toLowerCase().includes('failed to fetch')) {
        return { success: false, error: 'Falha de conexão ao tentar criar conta. Tente novamente em instantes.' };
      }
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      const log: ActivityLog = {
        id: crypto.randomUUID(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'LOGOUT',
        entity: 'Session',
        details: `Logout realizado às ${new Date().toLocaleTimeString('pt-BR')}`,
        createdAt: new Date(),
      };
      setActivityLogs(prev => [log, ...prev].slice(0, 500));
    }

    await supabase.auth.signOut();

    setUser(null);
    setSupabaseUser(null);
    setSession(null);
    setSelectedModule('COMERCIAL');
    safeRemoveItem('great_user');
    safeRemoveItem('great_selected_module');
    safeRemoveItem('great_local_auth_bypass');
    safeRemoveItem('great_local_auth_user');
  }, [user]);

  const selectModule = useCallback((module: Module) => {
    setSelectedModule(module);
    safeSetItem('great_selected_module', module);
    
    if (user) {
      const log: ActivityLog = {
        id: crypto.randomUUID(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'MODULE_SWITCH',
        entity: 'Module',
        details: `Acessou módulo ${module}`,
        createdAt: new Date(),
      };
      setActivityLogs(prev => [log, ...prev].slice(0, 500));
    }
  }, [user]);

  const getModule = useCallback((): Module | null => {
    if (!user) return null;
    return 'COMERCIAL';
  }, [user]);

  const hasAccess = useCallback((module: Module): boolean => {
    if (!user) return false;
    return module === 'COMERCIAL';
  }, [user]);

  const addUser = useCallback((userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => {
    const newUser = {
      ...userData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setUsers(prev => [...prev, newUser]);
    logActivity('USER_CREATED', 'User', newUser.id, `Usuário ${newUser.name} (${newUser.email}) criado`);
  }, [logActivity]);

  const updateUser = useCallback((id: string, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    logActivity('USER_UPDATED', 'User', id, `Usuário atualizado`);
  }, [logActivity]);

  const deleteUser = useCallback((id: string) => {
    const userToDelete = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    logActivity('USER_DELETED', 'User', id, `Usuário ${userToDelete?.name} removido`);
  }, [users, logActivity]);

  const addTeam = useCallback((name: string) => {
    const newTeam: Team = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
    };
    setTeams(prev => [...prev, newTeam]);
    logActivity('TEAM_CREATED', 'Team', newTeam.id, `Equipe "${name}" criada`);
  }, [logActivity]);

  const updateTeam = useCallback((id: string, name: string) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, name } : t));
    logActivity('TEAM_UPDATED', 'Team', id, `Equipe atualizada para "${name}"`);
  }, [logActivity]);

  const deleteTeam = useCallback((id: string) => {
    const teamToDelete = teams.find(t => t.id === id);
    setTeams(prev => prev.filter(t => t.id !== id));
    // Remove team from users
    setUsers(prev => prev.map(u => u.teamId === id ? { ...u, teamId: undefined } : u));
    logActivity('TEAM_DELETED', 'Team', id, `Equipe "${teamToDelete?.name}" removida`);
  }, [teams, logActivity]);

  const isAuthenticated = !!session && !!supabaseUser;
  const isAdmin = user?.role === 'ADMIN';
  const canEdit =
    canEditPlatform(user?.email || '', user?.role || '') ||
    commercialRole === 'COORDENADOR_COMERCIAL' ||
    isCoordinator(user?.email || '', user?.role || '') ||
    !!getUserByName(user?.name || '')?.role && getUserByName(user?.name || '')?.role === 'COORDENADOR_COMERCIAL';
  const hasDualAccess = false;

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isAuthenticated,
        isLoading,
        isAdmin,
        canEdit,
        hasDualAccess,
        login,
        signUp,
        logout,
        selectedModule,
        selectModule,
        getModule,
        hasAccess,
        users: users.map(({ password, ...u }) => u),
        addUser,
        updateUser,
        deleteUser,
        teams,
        addTeam,
        updateTeam,
        deleteTeam,
        activityLogs,
        logActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Safe version that returns null if outside provider
export function useAuthSafe() {
  const context = useContext(AuthContext);
  return context ?? null;
}
