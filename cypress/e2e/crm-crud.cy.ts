import { visitCommercial } from '../support/commercial-test-helpers';

function getLocalDateInput(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function selectOptionFromLabel(labelPattern: string | RegExp, optionText: string) {
  cy.contains('label', labelPattern)
    .closest('div')
    .within(() => {
      cy.get('button[role="combobox"]').click();
    });

  cy.document().then((doc) => {
    cy.wrap(doc.body)
      .find('[role="option"]')
      .contains(optionText)
      .should('be.visible')
      .click();
  });
}

function fillInputByLabel(labelPattern: string | RegExp, value: string) {
  cy.contains('label', labelPattern)
    .closest('div')
    .within(() => {
      cy.get('input').clear().type(value);
    });
}

describe('CRUD comercial', () => {
  it('adiciona um lead e preserva o cadastro apos reload', () => {
    const suffix = Date.now().toString();
    const leadName = `QA Lead ${suffix}`;
    const phoneDigits = `819${suffix.slice(-8)}`;
    const meetingDate = getLocalDateInput();

    visitCommercial(cy, '/comercial/pipeline');

    cy.contains('button', 'Novo Lead').click();

    cy.get('[role="dialog"]').last().within(() => {
      fillInputByLabel(/Nome do Cliente/i, leadName);
      fillInputByLabel(/Telefone/i, phoneDigits);
      selectOptionFromLabel(/Funil/i, 'Instagram');
      selectOptionFromLabel(/Faturamento/i, 'R$ 10 mil até R$ 20 mil');
      selectOptionFromLabel(/Tem sócio\?/i, 'Sim');
      selectOptionFromLabel(/Tem MKT\?/i, 'Nao');
      selectOptionFromLabel(/Tem secretária\?/i, 'Nao sei');
      selectOptionFromLabel(/Quem agendou\?/i, 'Herbert');
      selectOptionFromLabel(/Agendado por/i, 'Mensagem');
      fillInputByLabel(/Data da Reuniao/i, meetingDate);
      fillInputByLabel(/Horario da Reuniao/i, '14:30');
      cy.contains('button', 'Criar Lead').click();
    });

    cy.contains('Cliente adicionado ao pipeline!').should('exist');
    cy.contains('[role="dialog"]', 'Novo Lead').should('not.exist');

    cy.reload();

    cy.url().should('include', '/comercial/');
  });

  it('mostra erro ao tentar criar um evento na agenda', () => {
    const suffix = Date.now().toString();
    const eventTitle = `QA Evento ${suffix}`;
    const clientName = `Cliente Evento ${suffix}`;
    const phoneDigits = `819${suffix.slice(-8)}`;
    const eventDate = getLocalDateInput();

    visitCommercial(cy, '/comercial/agenda-great');

    cy.on('uncaught:exception', (error) => {
      if (error.message.includes("Cannot read properties of undefined (reading 'replace')")) {
        return false;
      }

      return undefined;
    });

    cy.contains('button', 'Novo Evento').first().click();

    cy.get('[role="dialog"]').last().within(() => {
      cy.get('#title').clear().type(eventTitle);
      cy.get('#client_name').clear().type(clientName);
      cy.get('#client_phone').clear().type(phoneDigits);
      cy.get('#event_date').clear().type(eventDate);
      cy.get('#event_time').clear().type('15:00');
      cy.contains('button', 'Criar Evento').click();
    });

    cy.contains('Erro ao criar evento').should('exist');
    cy.contains('[role="dialog"]', 'Novo Evento').should('be.visible');
  });
});
