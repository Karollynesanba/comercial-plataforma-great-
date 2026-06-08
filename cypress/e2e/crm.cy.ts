import { visitCommercial } from '../support/commercial-test-helpers';

describe('CRM', () => {
  it('carrega o pipeline comercial com os principais controles', () => {
    visitCommercial(cy, '/comercial/pipeline');

    cy.contains('h1', 'Pipeline Comercial').should('exist');
    cy.contains('button', 'Novo Lead').should('exist');
    cy.contains('button', 'Criativos').should('exist');
    cy.contains('button', 'Funis').should('exist');
    cy.contains('a', 'Planilha Leads').should('exist');
    cy.contains('span', 'Filtros:').should('exist');
  });

  it('abre o modal de novo lead com os campos essenciais', () => {
    visitCommercial(cy, '/comercial/pipeline');

    cy.contains('button', 'Novo Lead').click();

    cy.contains('[role="dialog"]', 'Novo Lead').should('exist');
    cy.contains('label', 'Nome do Cliente').should('exist');
    cy.contains('label', 'Telefone (WhatsApp) *').should('exist');
    cy.contains('label', 'Funil *').should('exist');
    cy.contains('label', 'Faturamento').should('exist');
    cy.contains('label', 'Quem agendou?').should('exist');
    cy.contains('label', 'Agendado por').should('exist');
    cy.contains('label', 'Data da Reuniao *').should('exist');
    cy.contains('label', 'Horario da Reuniao *').should('exist');
  });

  it('abre os modais de criativos e funis', () => {
    visitCommercial(cy, '/comercial/pipeline');

    cy.contains('button', 'Criativos').click();
    cy.contains('[role="dialog"]', 'Gerenciar Criativos').should('exist');
    cy.get('input[placeholder="Novo criativo..."]').should('exist');

    cy.contains('button', 'Fechar').last().click();

    cy.contains('button', 'Funis').click();
    cy.contains('[role="dialog"]', 'Gerenciar Funis').should('exist');
    cy.get('input[placeholder="Novo funil..."]').should('exist');
  });

  it('exibe KPIs e colunas principais do pipeline', () => {
    visitCommercial(cy, '/comercial/pipeline');

    cy.contains('Receita gerada').should('exist');
    cy.contains('Em negociação').should('exist');
    cy.contains('Taxa de conversão').should('exist');
    cy.contains('Ticket médio').should('exist');
    cy.contains('Novo Lead').should('exist');
  });
});

