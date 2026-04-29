import { visitCommercial } from '../support/commercial-test-helpers';

describe('CRM', () => {
  it('carrega o pipeline comercial com novo lead e criativos', () => {
    visitCommercial(cy, '/comercial/pipeline');

    cy.contains('h1', 'Pipeline Comercial').should('be.visible');
    cy.contains('button', 'Novo Lead').should('be.visible');
    cy.contains('button', 'Criativos').should('be.visible');
    cy.contains('button', 'Funis').should('be.visible');
    cy.contains('button', 'Zerar dados').should('be.visible');
    cy.contains('Filtros:').should('be.visible');
  });

  it('mostra funil e criativo no modal de novo lead', () => {
    visitCommercial(cy, '/comercial/pipeline');

    cy.contains('button', 'Novo Lead').click();
    cy.contains('Novo Lead').should('be.visible');
    cy.contains('label', 'Funil *').should('be.visible');
    cy.contains('label', /Criativo/).should('be.visible');
    cy.contains('Criativo (opcional com Instagram)').should('be.visible');
  });

  it('abre os diálogos de funis e criativos', () => {
    visitCommercial(cy, '/comercial/pipeline');

    cy.contains('button', 'Criativos').click();
    cy.contains('Gerenciar Criativos').should('be.visible');
    cy.get('input[placeholder="Novo criativo..."]').should('be.visible');

    cy.contains('button', 'Fechar').last().click();
    cy.contains('button', 'Funis').click();
    cy.contains('Gerenciar Funis').should('be.visible');
    cy.get('input[placeholder="Novo funil..."]').should('be.visible');
  });

  it('exibe os blocos do kanban e os KPIs', () => {
    visitCommercial(cy, '/comercial/pipeline');

    cy.contains('Receita gerada').should('be.visible');
    cy.contains(/Em negocia/i).should('be.visible');
    cy.contains(/Taxa de convers[aã]o/i).should('be.visible');
    cy.contains(/Ticket m[eé]dio/i).should('be.visible');
  });
});
