import { visitCommercial } from '../support/commercial-test-helpers';

describe('Raio X Closer', () => {
  beforeEach(() => {
    visitCommercial(cy, '/comercial/raio-x-closer');
  });

  it('carrega a tela de Raio X Closer', () => {
    cy.contains('h1', /Raio X - Closer/i).should('be.visible');
    cy.contains('Planilha de calls').should('be.visible');
    cy.contains('button', 'Planilha calls').should('be.visible');
    cy.contains('button', 'Comparativo').should('be.visible');
    cy.contains('button', /Comiss/i).should('be.visible');
  });

  it('troca para a aba de comparativo', () => {
    cy.contains('button', 'Comparativo').click();
    cy.contains('button', 'Comparativo').should('have.attr', 'data-state', 'active');
    cy.contains(/Closer/i).should('be.visible');
  });

  it('troca para a aba de comissoes', () => {
    cy.contains('button', /Comiss/i).click();
    cy.contains('button', /Comiss/i).should('have.attr', 'data-state', 'active');
    cy.contains(/Comiss/i).should('be.visible');
  });
});
