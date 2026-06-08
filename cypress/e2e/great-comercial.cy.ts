import { visitCommercial } from '../support/commercial-test-helpers';

describe('Testes Great-Comercial', () => {
  it('mostra busca, notificacoes e temas no topo', () => {
    visitCommercial(cy, '/comercial/dashboards');

    cy.contains('button', 'Buscar...').should('be.visible').click();
    cy.get('input[placeholder="Buscar acoes comerciais..."]').should('be.visible');
    cy.get('body').type('{esc}');

    cy.get('button[aria-label="Alternar tema"]').click({ force: true });
    cy.contains('Claro').should('be.visible');
    cy.contains('Escuro').should('be.visible');
    cy.contains('Sistema').should('be.visible');
    cy.get('body').type('{esc}');

    cy.get('button[aria-label="Notificacoes"]').click({ force: true });
    cy.contains('h3', 'Notificacoes').should('be.visible');
  });

  it('abre a command palette pelo atalho visual de busca', () => {
    visitCommercial(cy, '/comercial/dashboards');

    cy.contains('button', 'Buscar...').click();
    cy.get('input[placeholder="Buscar acoes comerciais..."]').should('be.visible');
    cy.contains('Ir para Dashboard Comercial').should('be.visible');
  });

  it('mantem o acesso ao login e ao cadastro com a mensagem de confirmacao', () => {
    cy.visit('/login');

    cy.contains('h2', 'Acesse sua conta').should('be.visible');
    cy.contains('button', 'Criar conta').click();
    cy.contains('h2', 'Criar conta').should('be.visible');
    cy.contains('button', 'Fazer login').should('be.visible');
  });
});
