type CommercialSessionOptions = {
  email?: string;
  name?: string;
  role?: string;
  userId?: string;
};

const SUPABASE_STORAGE_KEY = 'supabase.auth.token';
const SUPABASE_AUTH_KEY = 'sb-bwucqiqnxwdqapunbwip-auth-token';

export function buildCommercialSession(options: CommercialSessionOptions = {}) {
  const now = Math.floor(Date.now() / 1000);
  const email = options.email || 'cledinhosport10@gmail.com';
  const name = options.name || 'Cled';
  const role = options.role || 'COORDENADOR_COMERCIAL';
  const userId = options.userId || 'test-user-id';

  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_at: now + 86400,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      phone: '',
      created_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      user_metadata: {
        full_name: name,
      },
    },
    provider_token: null,
    provider_refresh_token: null,
  };
}

export function seedCommercialAuth(win: Window, options: CommercialSessionOptions = {}) {
  const session = buildCommercialSession(options);
  const user = {
    id: session.user.id,
    email: session.user.email,
    name: options.name || 'Cled',
    role: options.role || 'COORDENADOR_COMERCIAL',
    active: true,
    createdAt: new Date().toISOString(),
  };

  // Supabase v2 reads the session from sb-<project-ref>-auth-token.
  win.localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(session));
  win.localStorage.setItem(SUPABASE_AUTH_KEY, JSON.stringify(session));
  win.localStorage.setItem('great_user', JSON.stringify(user));
  win.localStorage.setItem('great_selected_module', 'COMERCIAL');
}

export function visitCommercial(
  cy: any,
  path: string,
  options: CommercialSessionOptions = {}
) {
  cy.visit(path, {
    onBeforeLoad(win) {
      seedCommercialAuth(win, options);
    },
  });
}
