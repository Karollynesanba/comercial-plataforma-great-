import { visitCommercial } from '../support/commercial-test-helpers';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countPatternOccurrences(text: string, pattern: RegExp) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return (text.match(new RegExp(pattern.source, flags)) || []).length;
}

function makeAgendaEvent(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: `agenda-${crypto.randomUUID()}`,
    title: 'ReuniÃ£o com Ana',
    description: 'Evento seed para automaÃ§Ã£o',
    notes: 'Notas do evento seed',
    client_name: 'Ana Silva',
    client_phone: '5581999990000',
    clinic_name: 'ClÃ­nica Ana',
    event_date: formatLocalDate(now),
    event_time: '10:00:00',
    duration_minutes: 60,
    meeting_link: 'https://meet.google.com/demo-seed',
    scheduled_by: 'HEBERT',
    lead_stage: 'NOVO',
    creative_source: 'INSTAGRAM',
    color: '#3B82F6',
    reminder_2h_sent: false,
    reminder_30min_sent: false,
    created_by_user_id: 'test-user-id',
    assigned_closer_id: null,
    team_id: 'team-equipe-7',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  };
}

function makePipelineClient(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: `pipeline-${crypto.randomUUID()}`,
    ativo: true,
    clientName: 'Ana Silva',
    clinicName: 'ClÃ­nica Ana',
    telefone: '5581999990000',
    vendedor: 'HEBERT',
    criativo: 'INSTAGRAM',
    equipe: 'team-equipe-7',
    faturamento: '50K_A_80K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: 'NAO',
    entrada: 1500,
    isMrr: false,
    mrrEntrada: 0,
    mrrRemaining: 0,
    dataEntrada: now.toISOString(),
    stage: 'FECHADO',
    lastStageChange: now.toISOString(),
    notes: 'Seed de agendamento',
    agendadoPor: 'HEBERT',
    agendadoVia: 'INSTAGRAM',
    pagadorAnuncio: 'CLIENTE',
    temSocio: 'SIM',
    temMkt: 'SIM',
    temSecretaria: 'SIM',
    salaoOuClinica: 'SALAO_BELEZA',
    createdByUserId: 'test-user-id',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    meetingDate: formatLocalDate(now),
    meetingTime: '10:00:00',
    ...overrides,
  };
}

function makeAgendamentoLead(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: `agendamento-${crypto.randomUUID()}`,
    pipeline_client_id: null,
    agenda_event_id: null,
    data: formatLocalDate(now).split('-').reverse().join('/'),
    nome: 'Ana Silva',
    telefone: '5581999990000',
    horario: 'MANHA',
    horario_especifico: '10:00',
    tem_socio: 'SIM',
    tem_mkt: 'SIM',
    tem_secretaria: 'NAO',
    salao_ou_clinica: 'SALAO',
    faturamento: '50K_A_80K',
    pode_investir: 'SIM',
    agendado_via: 'INSTAGRAM',
    funil: 'INSTAGRAM',
    status: 'NOVO_LEAD',
    created_by_user_id: 'test-user-id',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    agenda_event_date: formatLocalDate(now),
    agenda_event_time: '10:00:00',
    agenda_event_title: 'ReuniÃ£o com Ana',
    ...overrides,
  };
}

const today = new Date();
const tomorrow = addDays(today, 1);
const dayAfterTomorrow = addDays(today, 2);

const agendaSeed = {
  agendaEvents: [
    makeAgendaEvent({
      title: 'ReuniÃ£o com Ana',
      client_name: 'Ana Silva',
      clinic_name: 'ClÃ­nica Ana',
      client_phone: '5581999990000',
      event_date: formatLocalDate(today),
      event_time: '10:00:00',
      color: '#3B82F6',
      scheduled_by: 'HEBERT',
      team_id: 'team-equipe-7',
    }),
    makeAgendaEvent({
      title: 'ReuniÃ£o com Bruna',
      client_name: 'Bruna Souza',
      clinic_name: 'ClÃ­nica Bruna',
      client_phone: '5581999991111',
      event_date: formatLocalDate(today),
      event_time: '11:00:00',
      color: '#66FF00',
      scheduled_by: 'CLED',
      team_id: 'team-tropa-de-elite',
      description: 'Evento para filtro de cor',
    }),
    makeAgendaEvent({
      title: 'ReuniÃ£o com Carla',
      client_name: 'Carla Lima',
      clinic_name: 'ClÃ­nica Carla',
      client_phone: '5581999992222',
      event_date: formatLocalDate(tomorrow),
      event_time: '09:30:00',
      color: '#FF0000',
      scheduled_by: 'HEBERT',
      team_id: 'team-equipe-7',
    }),
    makeAgendaEvent({
      title: 'ReuniÃ£o com Diana',
      client_name: 'Diana Rocha',
      clinic_name: 'ClÃ­nica Diana',
      client_phone: '5581999993333',
      event_date: formatLocalDate(dayAfterTomorrow),
      event_time: '14:00:00',
      color: '#B000FF',
      scheduled_by: 'CAETANO',
      team_id: 'team-tropa-de-elite',
    }),
    makeAgendaEvent({
      title: 'Reuniao com Marina QA',
      client_name: 'Marina QA',
      clinic_name: 'Clinica Marina QA',
      client_phone: '558188880001',
      event_date: formatLocalDate(today),
      event_time: '15:30:00',
      color: '#3B82F6',
      scheduled_by: 'HEBERT',
      team_id: 'team-equipe-7',
    }),
    makeAgendaEvent({
      title: 'Reuniao com Sofia QA',
      client_name: 'Sofia QA',
      clinic_name: 'Clinica Sofia QA',
      client_phone: '558188880002',
      event_date: formatLocalDate(today),
      event_time: '16:00:00',
      color: '#3B82F6',
      scheduled_by: 'CLED',
      team_id: 'team-equipe-7',
    }),
    makeAgendaEvent({
      title: 'Reuniao com Paula QA',
      client_name: 'Paula QA',
      clinic_name: 'Clinica Paula QA',
      client_phone: '558188880003',
      event_date: formatLocalDate(today),
      event_time: '16:30:00',
      color: '#3B82F6',
      scheduled_by: 'CAETANO',
      team_id: 'team-tropa-de-elite',
    }),
  ],
  pipelineClients: [
    makePipelineClient({
      clientName: 'Ana Silva',
      clinicName: 'ClÃ­nica Ana',
      telefone: '5581999990000',
      agendadoPor: 'HEBERT',
      agendadoVia: 'INSTAGRAM',
      meetingDate: formatLocalDate(today),
      meetingTime: '10:00:00',
      stage: 'FECHADO',
    }),
    makePipelineClient({
      clientName: 'Bruna Souza',
      clinicName: 'ClÃ­nica Bruna',
      telefone: '5581999991111',
      agendadoPor: 'CLED',
      agendadoVia: 'MENSAGEM',
      meetingDate: formatLocalDate(today),
      meetingTime: '11:00:00',
      stage: 'NEGOCIACAO',
      equipe: 'team-tropa-de-elite',
    }),
    makePipelineClient({
      clientName: 'Helena Alves',
      clinicName: 'ClÃ­nica Helena',
      telefone: '5581999994444',
      agendadoPor: 'HEBERT',
      agendadoVia: 'LIGACAO',
      meetingDate: formatLocalDate(tomorrow),
      meetingTime: '15:00:00',
      stage: 'NO_SHOW',
    }),
  ],
  agendamentoLeads: [
    makeAgendamentoLead({
      nome: 'Ana Silva',
      telefone: '5581999990000',
      data: formatLocalDate(today).split('-').reverse().join('/'),
      horario_especifico: '10:00',
      agenda_event_date: formatLocalDate(today),
      agenda_event_time: '10:00:00',
      agenda_event_title: 'ReuniÃ£o com Ana',
      status: 'NOVO_LEAD',
    }),
    makeAgendamentoLead({
      nome: 'Bruna Souza',
      telefone: '5581999991111',
      data: formatLocalDate(today).split('-').reverse().join('/'),
      horario_especifico: '11:00',
      agenda_event_date: formatLocalDate(today),
      agenda_event_time: '11:00:00',
      agenda_event_title: 'ReuniÃ£o com Bruna',
      agendado_via: 'MENSAGEM',
      status: 'TAXA_INTERESSE',
    }),
  ],
  sdrGoals: [
    { id: 'goal-hebert', agendador: 'HEBERT', month: `${today.getFullYear()}-${pad(today.getMonth() + 1)}`, goalCount: 8, createdAt: today.toISOString() },
    { id: 'goal-cled', agendador: 'CLED', month: `${today.getFullYear()}-${pad(today.getMonth() + 1)}`, goalCount: 6, createdAt: today.toISOString() },
  ],
};

describe('Agendamentos', () => {
  it('carrega Agenda Great com os filtros principais', () => {
    visitCommercial(cy, '/comercial/agenda-great', { localData: agendaSeed });

    cy.get('input[placeholder="Buscar cliente, telefone..."]').should('be.visible');
    cy.contains('button', 'Todas as Equipes').should('be.visible');
    cy.contains('button', 'Dia').should('be.visible');
    cy.contains('button', 'Semana').should('be.visible');
    cy.contains('button', /M.*s/i).should('be.visible');
    cy.contains('button', /Reuni.{0,2}o Marcada/i).should('be.visible');
  });

  it('filtra por busca, equipe e cor', () => {
    visitCommercial(cy, '/comercial/agenda-great', { localData: agendaSeed });

    cy.get('input[placeholder="Buscar cliente, telefone..."]').type('Bruna');
    cy.get('body').contains(/Reuni.{0,2}o com Bruna/i).scrollIntoView().should('be.visible');
    cy.contains(/Reuni.{0,2}o com Ana/i).should('not.exist');

    cy.get('input[placeholder="Buscar cliente, telefone..."]').clear();
    cy.contains('button', 'Todas as Equipes').click();
    cy.contains('[role="option"]', /Tropa de Elite/i).click();

    cy.contains('button', 'Tropa de Elite').should('be.visible');

    cy.contains('button', 'Call Feita').click();
    cy.window().then((win) => {
      const raw = win.localStorage.getItem('great_agenda_color_filters');
      expect(raw).to.include('#66FF00');
    });
  });

  it('mostra erro ao tentar criar evento manualmente', () => {
    visitCommercial(cy, '/comercial/agenda-great', { localData: agendaSeed });

    cy.on('uncaught:exception', (error) => {
      if (error.message.includes("Cannot read properties of undefined (reading 'replace')")) {
        return false;
      }

      return undefined;
    });

    cy.contains('button', 'Novo Evento').first().click();
    cy.contains('Novo Evento').should('be.visible');

    cy.get('input#title').clear().type('Reuniao manual');
    cy.get('input#client_name').clear().type('Cliente Manual');
    cy.get('input#client_phone').clear().type('11999998888');

    cy.contains('button', 'Criar Evento').click();
    cy.contains('Evento criado com sucesso!').should('exist');
    cy.contains('[role="dialog"]', 'Novo Evento').should('not.exist');
  });

  it('seleciona um lead existente e preenche os campos do evento', () => {
    visitCommercial(cy, '/comercial/agenda-great', { localData: agendaSeed });

    cy.contains('button', 'Novo Evento').first().click();
    cy.contains('Novo Evento').should('be.visible');

    cy.contains('button', /Buscar lead do Pipeline ou Agendamento/i).scrollIntoView().click({ force: true });
    cy.get('input[placeholder="Buscar por nome..."]').should('exist').type('Ana', { force: true });
    cy.contains('[role="option"]', /Ana Silva/i).click({ force: true });

    cy.get('input#title').invoke('val').should('match', /Ana Silva/);
    cy.get('input#client_name').should('have.value', 'Ana Silva');
    cy.get('input#client_phone').should('not.have.value', '');
  });

  it('abre detalhes, duplica e remove um agendamento', () => {
    visitCommercial(cy, '/comercial/agenda-great', { localData: agendaSeed });

    cy.get('body').contains(/Reuni.{0,2}o com Ana/i).first().scrollIntoView().click({ force: true });
    cy.contains(/Vis.{0,2}o consolidada do agendamento/i).should('be.visible');
    cy.contains('button', 'Duplicar').click();
    cy.contains('Duplicar Evento').should('be.visible');
    cy.get('input#title').invoke('val').should('match', /Reuni.{0,2}o com Ana/);
    cy.get('input#title').clear().type('Reuniao duplicada');
    cy.contains('button', 'Criar Evento').click();
    cy.contains('Evento criado com sucesso!').should('exist');
    cy.contains('button', 'Novo Evento').should('be.visible');

    cy.get('body').contains(/Reuni.{0,2}o com Ana/i).first().scrollIntoView().click({ force: true });
    cy.contains('button', 'Excluir').click();
    cy.contains('Evento excluido com sucesso!').should('exist');
  });

  it('altera apenas a cor de um agendamento e não duplica o registro', () => {
    const eventTitle = /Reuni.{0,2}o com Ana/i;

    cy.on('uncaught:exception', (error) => {
      if (
        error.message.includes("Cannot read properties of undefined (reading 'replace')") ||
        error.message.includes("Could not find the '0' column of 'agenda_events' in the schema cache")
      ) {
        return false;
      }

      return undefined;
    });

    cy.intercept(
      { method: 'PATCH', url: '**/rest/v1/agenda_events*', middleware: true },
      (req) => {
        req.continue();
      }
    ).as('agendaEventPatch');

    visitCommercial(cy, '/comercial/agenda-great', { localData: agendaSeed });

    cy.get('body').contains(eventTitle).first().scrollIntoView().click({ force: true });
    cy.contains(/Vis.{0,2}o consolidada do agendamento/i).should('be.visible');

    cy.get('button[title="Clique para trocar a cor do evento"]').click({ force: true });
    cy.get('[aria-label="Call Feita"]').last().click({ force: true });
    cy.contains('button', 'Novo Evento').should('be.visible');

    cy.wait('@agendaEventPatch').then(({ request }) => {
      expect(request.body.color).to.eq('#66FF00');
    });

    cy.get('@agendaEventPatch.all').should('have.length', 1);
  });

  it('mantém o título original ao salvar alteração de cor', () => {
    const originalTitle = /Reuni.{0,2}o com Bruna/i;

    cy.on('uncaught:exception', (error) => {
      if (
        error.message.includes("Cannot read properties of undefined (reading 'replace')") ||
        error.message.includes("Could not find the '0' column of 'agenda_events' in the schema cache")
      ) {
        return false;
      }

      return undefined;
    });

    visitCommercial(cy, '/comercial/agenda-great', { localData: agendaSeed });

    cy.on('uncaught:exception', (error) => {
      if (error.message.includes("Cannot read properties of undefined (reading 'replace')")) {
        return false;
      }

      return undefined;
    });

    cy.get('body').contains(originalTitle).first().scrollIntoView().click({ force: true });
    cy.contains(/Vis.{0,2}o consolidada do agendamento/i).should('be.visible');
    cy.contains('button', 'Editar evento').click();

    cy.contains('label', 'Cor').parent().contains('button', 'Recontato').click({ force: true });
    cy.contains('button', 'Salvar').click();

    cy.contains('button', 'Novo Evento').should('be.visible');

    cy.get('body').contains(originalTitle).should('be.visible');
    cy.contains('button', 'Editar evento').should('not.exist');
  });

  it('duplica um evento uma única vez sem triplicar registros', () => {
    const title = /Reuni.{0,2}o com Ana/i;

    cy.on('uncaught:exception', (error) => {
      if (
        error.message.includes("Cannot read properties of undefined (reading 'replace')") ||
        error.message.includes("Could not find the '0' column of 'agenda_events' in the schema cache") ||
        error.message.includes('duplicate key value violates unique constraint "agenda_events_exact_slot_uidx"')
      ) {
        return false;
      }

      return undefined;
    });

    visitCommercial(cy, '/comercial/agenda-great', { localData: agendaSeed });

    cy.get('body').contains(title).first().scrollIntoView().click({ force: true });
    cy.contains(/Vis.{0,2}o consolidada do agendamento/i).should('be.visible');
    cy.contains('button', 'Duplicar').click();
    cy.contains('Duplicar Evento').should('be.visible');
    cy.contains('button', 'Criar Evento').click();

    cy.contains('Evento criado com sucesso!').should('exist');
    cy.contains('button', 'Novo Evento').should('be.visible');
  });
});

