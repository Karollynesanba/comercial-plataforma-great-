type CommercialSessionOptions = {
  email?: string;
  name?: string;
  role?: string;
  userId?: string;
};

export function buildCommercialSession(options: CommercialSessionOptions = {}) {
  const email = options.email || 'cledinhosport10@gmail.com';
  const name = options.name || 'Cled';
  const role = options.role || 'COORDENADOR_COMERCIAL';
  const userId = options.userId || 'test-user-id';
  return {
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
  };
}

export function seedCommercialAuth(win: Window, options: CommercialSessionOptions = {}) {
  buildCommercialSession(options);
  const user = {
    id: options.userId || 'test-user-id',
    email: options.email || 'cledinhosport10@gmail.com',
    name: options.name || 'Cled',
    role: options.role || 'COORDENADOR_COMERCIAL',
    active: true,
    createdAt: new Date().toISOString(),
  };

  win.localStorage.setItem('great_user', JSON.stringify(user));
  win.localStorage.setItem('great_selected_module', 'COMERCIAL');
  win.localStorage.setItem('great_test_session_bypass', 'true');
}

export function visitCommercial(
  cy: Cypress.cy,
  path: string,
  options: CommercialSessionOptions = {}
) {
  cy.intercept('GET', /^https:\/\/bwucqiqnxwdqapunbwip\.supabase\.co\/rest\/v1\/.*/, {
    statusCode: 200,
    body: [],
  });

  cy.visit(path, {
    onBeforeLoad(win) {
      seedCommercialAuth(win, options);
    },
  });
}
