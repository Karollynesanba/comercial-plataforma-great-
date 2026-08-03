type CommercialSessionOptions = {
  email?: string;
  name?: string;
  role?: string;
  userId?: string;
  localData?: CommercialLocalDataSeed;
};

type CommercialLocalDataSeed = {
  pipelineClients?: Array<Record<string, unknown>>;
  agendaEvents?: Array<Record<string, unknown>>;
  agendamentoLeads?: Array<Record<string, unknown>>;
  salesGoals?: Array<Record<string, unknown>>;
  commercialSettings?: Array<Record<string, unknown>>;
  criativos?: Array<string>;
  funis?: Array<string>;
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
  Object.keys(win.localStorage)
    .filter((key) => key === 'supabase.auth.token' || key.startsWith('sb-') || key === 'great_agenda_color_filters')
    .forEach((key) => win.localStorage.removeItem(key));

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
  win.localStorage.setItem('great_local_auth_bypass', 'true');
  win.localStorage.setItem('great_local_auth_user', JSON.stringify(user));
}

export function seedCommercialLocalData(win: Window, seed: CommercialLocalDataSeed) {
  const current = win.localStorage.getItem('great_commercial_local_data_v1');
  const base = current ? JSON.parse(current) : {};
  const next = {
    pipelineClients: [],
    salesGoals: [],
    sdrGoals: [],
    preSalesDailyLogs: [],
    closerDailyLogs: [],
    paymentReminders: [],
    criativos: [],
    funis: [],
    teamPointer: '',
    agendaEvents: [],
    agendamentoLeads: [],
    schedulingGeneralGoals: {},
    whatsappReminderLogs: [],
    ceoFinance: {
      trafficInvestment: 0,
      payroll: 0,
      fixedCosts: 0,
      commissions: 0,
      renewalsRevenue: 0,
      mrr: 0,
      taxes: 0,
      tools: 0,
      customCosts: [],
    },
    ...base,
    ...seed,
  };

  win.localStorage.setItem('great_commercial_local_data_v1', JSON.stringify(next));
}

export function visitCommercial(
  cy: Cypress.cy,
  path: string,
  options: CommercialSessionOptions = {}
) {
  const normalizePathname = (pathname: string) =>
    pathname === '/comercial/dashboard' ? '/comercial/dashboards' : pathname;
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  const normalizePipelineSeed = (client: Record<string, any>) => ({
    id: client.id || `pipeline-${crypto.randomUUID()}`,
    ativo: client.ativo ?? true,
    client_name: client.client_name || client.clientName || 'Lead sem nome',
    clinic_name: client.clinic_name || client.clinicName || client.client_name || client.clientName || null,
    telefone: client.telefone || null,
    profession: client.profession || null,
    vendedor: client.vendedor || null,
    criativo: client.criativo || client.funil || null,
    funil: client.funil || client.criativo || null,
    equipe: client.equipe || null,
    faturamento: client.faturamento || null,
    faturamento_personalizado: client.faturamento_personalizado || client.faturamentoPersonalizado || null,
    pode_investir: client.pode_investir || client.podeInvestir || null,
    pacote: client.pacote || null,
    periodo: client.periodo || null,
    indicacao: client.indicacao || null,
    entrada: client.entrada || 0,
    is_mrr: client.is_mrr ?? client.isMrr ?? false,
    mrr_entrada: client.mrr_entrada ?? client.mrrEntrada ?? client.entrada ?? 0,
    mrr_remaining: client.mrr_remaining ?? client.mrrRemaining ?? 0,
    data_entrada: client.data_entrada || (client.dataEntrada ? new Date(client.dataEntrada).toISOString() : new Date().toISOString()),
    stage: client.stage || 'NOVO',
    last_stage_change: client.last_stage_change || (client.lastStageChange ? new Date(client.lastStageChange).toISOString() : null),
    notes: client.notes || null,
    agendado_por: client.agendado_por || client.agendadoPor || null,
    agendado_via: client.agendado_via || client.agendadoVia || null,
    pagador_anuncio: client.pagador_anuncio || client.pagadorAnuncio || null,
    tem_socio: client.tem_socio || client.temSocio || null,
    tem_mkt: client.tem_mkt || client.temMkt || null,
    tem_secretaria: client.tem_secretaria || client.temSecretaria || null,
    salao_ou_clinica: client.salao_ou_clinica || client.salaoOuClinica || null,
    created_by_user_id: client.created_by_user_id || client.createdByUserId || null,
    created_at: client.created_at || (client.createdAt ? new Date(client.createdAt).toISOString() : new Date().toISOString()),
    updated_at: client.updated_at || (client.updatedAt ? new Date(client.updatedAt).toISOString() : new Date().toISOString()),
    meeting_date: client.meeting_date || client.meetingDate || null,
    meeting_time: client.meeting_time || client.meetingTime || null,
    followup_done: client.followup_done ?? client.followupDone ?? false,
  });
  const normalizeSdrGoalSeed = (goal: Record<string, any>) => ({
    id: goal.id || `sdr-goal-${crypto.randomUUID()}`,
    agendador: goal.agendador,
    month: goal.month,
    goal_count: goal.goal_count ?? goal.goalCount ?? 0,
    created_at: goal.created_at || (goal.createdAt ? new Date(goal.createdAt).toISOString() : new Date().toISOString()),
    updated_at: goal.updated_at || (goal.updatedAt ? new Date(goal.updatedAt).toISOString() : new Date().toISOString()),
  });
  const normalizeCommercialGoalSeed = (goal: Record<string, any>) => ({
    id: goal.id || `commercial-goal-${crypto.randomUUID()}`,
    month: goal.month,
    goal_value: goal.goal_value ?? goal.goalValue ?? 0,
    created_at: goal.created_at || (goal.createdAt ? new Date(goal.createdAt).toISOString() : new Date().toISOString()),
    updated_at: goal.updated_at || (goal.updatedAt ? new Date(goal.updatedAt).toISOString() : new Date().toISOString()),
    created_by_user_id: goal.created_by_user_id || goal.createdByUserId || null,
  });
  const seededState = {
    pipelineClients: clone(options.localData?.pipelineClients || []).map(normalizePipelineSeed),
    agendaEvents: clone(options.localData?.agendaEvents || []),
    agendamentoLeads: clone(options.localData?.agendamentoLeads || []),
    salesGoals: clone((options.localData as any)?.salesGoals || []).map(normalizeCommercialGoalSeed),
    sdrGoals: clone((options.localData as any)?.sdrGoals || []).map(normalizeSdrGoalSeed),
    criativos: clone((options.localData as any)?.criativos || []),
    funis: clone((options.localData as any)?.funis || []),
    commercialSettings: [
      ...clone((options.localData as any)?.commercialSettings || []),
      ...(((options.localData as any)?.funis?.length || 0) > 0
        ? [{
            setting_key: 'commercial_funis_v1',
            setting_value: JSON.stringify((options.localData as any).funis),
            updated_at: new Date().toISOString(),
            updated_by_user_id: null,
          }]
        : []),
    ],
  };

  cy.intercept(
    {
      method: /GET|POST|PATCH|PUT|DELETE|HEAD/,
      url: /^https:\/\/bwucqiqnxwdqapunbwip\.supabase\.co\/rest\/v1\/.*/,
    },
    (req) => {
      const requestUrl = new URL(req.url);
      const tableName = decodeURIComponent(requestUrl.pathname.split('/rest/v1/')[1] || '');
      const eqValue = (key: string) => {
        const raw = requestUrl.searchParams.get(key);
        return raw?.startsWith('eq.') ? decodeURIComponent(raw.slice(3)) : null;
      };
      const parseBody = () => {
        if (!req.body) return {};
        if (typeof req.body === 'string') {
          try {
            return JSON.parse(req.body);
          } catch {
            return {};
          }
        }
        return Array.isArray(req.body) ? req.body[0] : req.body;
      };

      const replyRows = (rows: unknown[]) => {
        req.reply({
          statusCode: 200,
          body: rows,
        });
      };

      if (req.method === 'GET' || req.method === 'HEAD') {
        if (tableName === 'pipeline_clients') {
          replyRows(seededState.pipelineClients);
          return;
        }
        if (tableName === 'commercial_goals') {
          replyRows(seededState.salesGoals);
          return;
        }
        if (tableName === 'agenda_events') {
          replyRows(seededState.agendaEvents);
          return;
        }
        if (tableName === 'agendamento_leads') {
          replyRows(seededState.agendamentoLeads);
          return;
        }
        if (tableName === 'sdr_goals') {
          replyRows(seededState.sdrGoals);
          return;
        }
        if (tableName === 'criativos') {
          replyRows(seededState.criativos.map((name: string) => ({
            name,
            is_active: true,
            updated_at: new Date().toISOString(),
          })));
          return;
        }
        if (tableName === 'pre_sales_daily_logs' || tableName === 'closer_daily_logs' || tableName === 'payment_reminders') {
          replyRows([]);
          return;
        }
        if (tableName === 'commercial_settings') {
          replyRows(seededState.commercialSettings);
          return;
        }

        req.reply({
          statusCode: 200,
          body: [],
        });
        return;
      }

      if (tableName === 'agenda_events') {
        if (req.method === 'POST') {
          const body = parseBody();
          const row = {
            id: body.id || `agenda-${crypto.randomUUID()}`,
            reminder_2h_sent: body.reminder_2h_sent ?? false,
            reminder_30min_sent: body.reminder_30min_sent ?? false,
            created_at: body.created_at || new Date().toISOString(),
            updated_at: body.updated_at || new Date().toISOString(),
            ...body,
          };
          seededState.agendaEvents = [row, ...seededState.agendaEvents.filter((item: any) => item.id !== row.id)];
          replyRows([row]);
          return;
        }

        if (req.method === 'PATCH' || req.method === 'PUT') {
          const id = eqValue('id');
          const body = parseBody();
          const updated = seededState.agendaEvents.map((item: any) =>
            id && item.id === id ? { ...item, ...body, updated_at: new Date().toISOString() } : item
          );
          seededState.agendaEvents = updated;
          replyRows(updated.filter((item: any) => !id || item.id === id));
          return;
        }

        if (req.method === 'DELETE') {
          const id = eqValue('id');
          seededState.agendaEvents = seededState.agendaEvents.filter((item: any) => !id || item.id !== id);
          replyRows([]);
          return;
        }
      }

      if (tableName === 'agendamento_leads') {
        if (req.method === 'POST') {
          const body = parseBody();
          const row = {
            id: body.id || `agendamento-${crypto.randomUUID()}`,
            created_at: body.created_at || new Date().toISOString(),
            updated_at: body.updated_at || new Date().toISOString(),
            ...body,
          };
          seededState.agendamentoLeads = [row, ...seededState.agendamentoLeads.filter((item: any) => item.id !== row.id)];
          replyRows([row]);
          return;
        }

        if (req.method === 'PATCH' || req.method === 'PUT') {
          const id = eqValue('id');
          const body = parseBody();
          const updated = seededState.agendamentoLeads.map((item: any) =>
            id && item.id === id ? { ...item, ...body, updated_at: new Date().toISOString() } : item
          );
          seededState.agendamentoLeads = updated;
          replyRows(updated.filter((item: any) => !id || item.id === id));
          return;
        }

        if (req.method === 'DELETE') {
          const id = eqValue('id');
          seededState.agendamentoLeads = seededState.agendamentoLeads.filter((item: any) => !id || item.id !== id);
          replyRows([]);
          return;
        }
      }

      if (tableName === 'pipeline_clients') {
        if (req.method === 'POST') {
          const body = parseBody();
          const row = {
            id: body.id || `pipeline-${crypto.randomUUID()}`,
            created_at: body.created_at || new Date().toISOString(),
            updated_at: body.updated_at || new Date().toISOString(),
            ...body,
          };
          seededState.pipelineClients = [row, ...seededState.pipelineClients.filter((item: any) => item.id !== row.id)];
          replyRows([row]);
          return;
        }

        if (req.method === 'PATCH' || req.method === 'PUT') {
          const id = eqValue('id');
          const body = parseBody();
          const updated = seededState.pipelineClients.map((item: any) =>
            id && item.id === id ? { ...item, ...body, updated_at: new Date().toISOString() } : item
          );
          seededState.pipelineClients = updated;
          replyRows(updated.filter((item: any) => !id || item.id === id));
          return;
        }

        if (req.method === 'DELETE') {
          const id = eqValue('id');
          seededState.pipelineClients = seededState.pipelineClients.filter((item: any) => !id || item.id !== id);
          replyRows([]);
          return;
        }
      }

      if (tableName === 'sdr_goals') {
        if (req.method === 'POST') {
          const body = parseBody();
          const row = {
            id: body.id || `sdr-goal-${crypto.randomUUID()}`,
            created_at: body.created_at || new Date().toISOString(),
            updated_at: body.updated_at || new Date().toISOString(),
            ...body,
          };
          const existingIndex = seededState.sdrGoals.findIndex((item: any) => item.agendador === row.agendador && item.month === row.month);
          if (existingIndex >= 0) {
            seededState.sdrGoals[existingIndex] = row;
          } else {
            seededState.sdrGoals = [row, ...seededState.sdrGoals];
          }
          replyRows([row]);
          return;
        }
      }

      if (tableName === 'commercial_goals') {
        if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
          const body = parseBody();
          const row = {
            id: body.id || `commercial-goal-${crypto.randomUUID()}`,
            month: body.month,
            goal_value: body.goal_value ?? body.goalValue ?? 0,
            created_at: body.created_at || new Date().toISOString(),
            updated_at: body.updated_at || new Date().toISOString(),
            created_by_user_id: body.created_by_user_id || null,
          };
          const existingIndex = seededState.salesGoals.findIndex((item: any) => item.month === row.month);
          if (existingIndex >= 0) {
            seededState.salesGoals[existingIndex] = row;
          } else {
            seededState.salesGoals = [row, ...seededState.salesGoals];
          }
          replyRows([row]);
          return;
        }
      }

      if (tableName === 'commercial_settings') {
        if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
          const body = parseBody();
          const row = {
            setting_key: body.setting_key,
            setting_value: body.setting_value,
            updated_at: body.updated_at || new Date().toISOString(),
            updated_by_user_id: body.updated_by_user_id || null,
          };
          const existingIndex = seededState.commercialSettings.findIndex((item: any) => item.setting_key === row.setting_key);
          if (existingIndex >= 0) {
            seededState.commercialSettings[existingIndex] = row;
          } else {
            seededState.commercialSettings = [row, ...seededState.commercialSettings];
          }
          replyRows([row]);
          return;
        }
      }

      req.reply({
        statusCode: 200,
        body: [],
      });
    }
  );

  cy.visit('/login');
  cy.window().then((win) => {
    seedCommercialAuth(win, options);
    if (options.localData) {
      seedCommercialLocalData(win, options.localData);
    }
  });
  cy.reload();

  cy.location('pathname', { timeout: 20000 }).should((pathname) => {
    expect(normalizePathname(pathname)).to.eq('/comercial/dashboards');
  });

  if (path === '/comercial/dashboards') {
    return;
  }

  const targetPath = path as CommercialRoute;
  const target = commercialRouteMap[targetPath];

  if (target?.menu) {
    cy.contains('aside button', target.menu, { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
  }

  if (target?.submenu) {
    cy.contains('aside a', target.submenu, { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
  }

  cy.location('pathname', { timeout: 10000 }).should((pathname) => {
    expect(normalizePathname(pathname)).to.eq(path);
  });
}

type CommercialRoute =
  | '/comercial/dashboards'
  | '/comercial/metas'
  | '/comercial/relatorios'
  | '/comercial/agenda-great'
  | '/comercial/meta-agendamentos'
  | '/comercial/pipeline'
  | '/comercial/raio-x-closer'
  | '/comercial/pre-venda'
  | '/comercial/inteligencia-operacional'
  | '/comercial/projecao';

const commercialRouteMap: Record<CommercialRoute, { menu?: string; submenu?: string }> = {
  '/comercial/dashboards': {},
  '/comercial/metas': { menu: 'Dashboard Comercial', submenu: 'Metas' },
  '/comercial/relatorios': { menu: 'Dashboard Comercial', submenu: 'Relatórios' },
  '/comercial/agenda-great': { menu: 'Agendamentos', submenu: 'Agenda Great' },
  '/comercial/meta-agendamentos': { menu: 'Agendamentos', submenu: 'Meta de Agendamentos' },
  '/comercial/pipeline': { menu: 'Agendamentos', submenu: 'CRM' },
  '/comercial/raio-x-closer': { menu: 'Raio X', submenu: 'Closer' },
  '/comercial/pre-venda': { menu: 'Raio X', submenu: 'Pre venda' },
  '/comercial/inteligencia-operacional': { submenu: 'Inteligencia Operacional' },
  '/comercial/projecao': { submenu: 'Projeção' },
};

export function openCommercialRoute(
  cy: Cypress.cy,
  path: CommercialRoute,
  options: CommercialSessionOptions = {}
) {
  visitCommercial(cy, path, options);
}

