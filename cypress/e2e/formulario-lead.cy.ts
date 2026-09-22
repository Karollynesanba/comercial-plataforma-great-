import { visitCommercial } from '../support/commercial-test-helpers';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fillInputByLabel(labelPattern: string | RegExp, value: string) {
  cy.contains('label', labelPattern)
    .closest('div')
    .within(() => cy.get('input').clear().type(value));
}

function selectOptionByLabel(labelPattern: string | RegExp, optionPattern: string | RegExp) {
  cy.contains('label', labelPattern)
    .closest('div')
    .within(() => cy.get('button[role="combobox"]').click());
  cy.document().then((doc) => {
    cy.wrap(doc.body)
      .find('[role="option"]')
      .contains(optionPattern)
      .should('be.visible')
      .click();
  });
}

function fillRequiredLeadFields(name: string) {
  fillInputByLabel(/Nome do Cliente/i, name);
  fillInputByLabel(/Telefone/i, `819${Date.now().toString().slice(-8)}`);
  selectOptionByLabel(/Funil/i, /Indica[cç][aã]o/i);
  selectOptionByLabel(/Faturamento/i, /^R\$ 10 mil/);
  selectOptionByLabel(/Tem s[oó]cio\?/i, /^Sim$/i);
  selectOptionByLabel(/Tem MKT\?/i, /^Nao$/i);
  selectOptionByLabel(/Tem secret[aá]ria\?/i, /Nao sei/i);
  selectOptionByLabel(/Quem agendou\?/i, /^Alan$/i);
  selectOptionByLabel(/Agendado por/i, /^Mensagem$/i);
  fillInputByLabel(/Data da Reuniao/i, today());
  fillInputByLabel(/Horario da Reuniao/i, '14:30');
}

(['S1', 'S2'] as const).forEach((formulario) => {
  it(`salva ${formulario} no cadastro e mantém a seleção exclusiva`, () => {
    const leadName = `QA Formulario ${formulario} ${Date.now()}`;
    visitCommercial(cy, '/comercial/pipeline');

    cy.intercept('POST', '**/rest/v1/rpc/commercial_pipeline_client_upsert_secure', (req) => {
      const payload = req.body?.payload || {};
      if (payload.client_name === leadName) {
        req.alias = 'saveLead';
      }
      req.reply({
        statusCode: 200,
        body: {
          ...payload,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    });

    cy.contains('button', 'Novo Lead').click();
    cy.get('[role="dialog"]').last().within(() => {
      fillRequiredLeadFields(leadName);

      cy.get(`#formulario-${formulario.toLowerCase()}`).click();
      cy.get('#formulario-s1').should('have.attr', 'aria-checked', formulario === 'S1' ? 'true' : 'false');
      cy.get('#formulario-s2').should('have.attr', 'aria-checked', formulario === 'S2' ? 'true' : 'false');

      if (formulario === 'S1') {
        cy.contains('label', 'Formulário').scrollIntoView();
        cy.screenshot('novo-lead-formulario-s1', { capture: 'viewport' });
      }

      cy.contains('button', 'Criar Lead').click();
    });

    cy.wait('@saveLead', { timeout: 15000 }).then(({ request }) => {
      expect(request.body.payload).to.include({
        client_name: leadName,
        formulario,
      });
    });
  });
});

describe('Formulário na Agenda', () => {
  function agendaSeed(formulario?: 'S1' | 'S2', formularioAntigoNoEvento?: 'S1' | 'S2') {
    const pipelineClientId = crypto.randomUUID();
    const agendaEventId = crypto.randomUUID();
    const clientName = formulario ? `Lead ${formulario}` : 'Lead Antigo';
    const phone = formulario ? '5581999991001' : '5581999991002';
    return {
      pipelineClients: [{
        id: pipelineClientId,
        ativo: true,
        clientName,
        clinicName: 'Clinica QA',
        telefone: phone,
        formulario,
        funil: 'INDICACAO',
        criativo: 'INDICACAO',
        equipe: 'team-equipe-7',
        faturamento: '10K_A_20K',
        pacote: 'COMPLETO',
        periodo: 'MENSAL',
        entrada: 0,
        stage: 'NOVO',
        agendadoPor: 'ALAN',
        meetingDate: today(),
        meetingTime: '08:30',
        createdByUserId: 'test-user-id',
      }],
      agendaEvents: [{
        id: agendaEventId,
        pipeline_client_id: pipelineClientId,
        title: `Reuniao com ${clientName}`,
        description: 'Evento de teste do formulario',
        notes: null,
        client_name: clientName,
        client_phone: phone,
        clinic_name: 'Clinica QA',
        event_date: today(),
        event_time: '08:30:00',
        duration_minutes: 60,
        meeting_link: null,
        scheduled_by: 'ALAN',
        formulario: formularioAntigoNoEvento,
        lead_stage: 'NOVO',
        creative_source: 'INDICACAO',
        color: '#3B82F6',
        reminder_2h_sent: false,
        reminder_30min_sent: false,
        created_by_user_id: 'test-user-id',
        assigned_closer_id: null,
        team_id: 'team-equipe-7',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }],
      agendamentoLeads: [{
        id: crypto.randomUUID(),
        pipeline_client_id: pipelineClientId,
        agenda_event_id: agendaEventId,
        data: today().split('-').reverse().join('/'),
        nome: clientName,
        telefone: phone,
        horario: 'MANHA',
        horario_especifico: '08:30',
        tem_socio: 'SIM',
        tem_mkt: 'NAO',
        tem_secretaria: 'NAO_SEI',
        faturamento: '10K_A_20K',
        funil: 'INDICACAO',
        status: 'NOVO_LEAD',
        created_by_user_id: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agenda_event_date: today(),
        agenda_event_time: '08:30:00',
        agenda_event_title: `Reuniao com ${clientName}`,
      }],
      salesGoals: [{
        id: crypto.randomUUID(),
        month: today().slice(0, 7),
        goalValue: 1,
        createdByUserId: 'test-user-id',
        createdAt: new Date().toISOString(),
      }],
      sdrGoals: [{
        id: crypto.randomUUID(),
        agendador: 'ALAN',
        month: today().slice(0, 7),
        goalCount: 1,
        createdAt: new Date().toISOString(),
      }],
    };
  }

  it('exibe responsável e formulário em preto no card', () => {
    const seed = agendaSeed('S1');
    visitCommercial(cy, '/comercial/agenda-great', { localData: seed });
    cy.window().then((win) => {
      const local = JSON.parse(win.localStorage.getItem('great_commercial_local_data_v1') || '{}');
      expect(local.pipelineClients.find((client: any) => client.id === seed.pipelineClients[0].id)?.formulario).to.eq('S1');
    });

    cy.contains('p', 'Alan • S1', { timeout: 10000 })
      .should('be.visible')
      .and('have.class', 'text-black');
    cy.screenshot('agenda-card-alan-s1', { capture: 'viewport' });
  });

  it('mantém apenas o responsável em registros antigos', () => {
    const seed = agendaSeed();
    visitCommercial(cy, '/comercial/agenda-great', { localData: seed });

    cy.contains('p', /^Alan$/, { timeout: 10000 }).should('be.visible');
    cy.contains(/undefined|null|Alan\s*•\s*$/i).should('not.exist');
  });

  it('mostra o valor atual do lead após mudar de S1 para S2', () => {
    const seed = agendaSeed('S2', 'S1');
    visitCommercial(cy, '/comercial/agenda-great', { localData: seed });

    cy.contains('p', 'Alan • S2', { timeout: 10000 }).should('be.visible');
    cy.contains('p', 'Alan • S1').should('not.exist');
  });

  it('mantém o campo utilizável em tela pequena', () => {
    cy.viewport(390, 844);
    visitCommercial(cy, '/comercial/pipeline');
    cy.contains('button', 'Novo Lead').click();

    cy.contains('label', 'Formulário').scrollIntoView().should('be.visible');
    cy.get('#formulario-s1').should('be.visible').click();
    cy.get('#formulario-s2').should('be.visible').click();
    cy.get('#formulario-s1').should('have.attr', 'aria-checked', 'false');
    cy.get('#formulario-s2').should('have.attr', 'aria-checked', 'true');
    cy.screenshot('novo-lead-formulario-mobile', { capture: 'viewport' });
  });
});
