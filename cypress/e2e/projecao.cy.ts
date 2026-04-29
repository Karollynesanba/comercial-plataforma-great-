import { visitCommercial } from '../support/commercial-test-helpers';

describe('Projecao', () => {
  it('abre Projecao Comercial e mostra o simulador do funil', () => {
    visitCommercial(cy, '/comercial/projecao');

    cy.contains('h1', /Projecao Comercial/i).should('be.visible');
    cy.contains(/Caminho at[eé] a meta/i).should('be.visible');
    cy.contains(/Simulador de meta/i).should('be.visible');
    cy.contains(/Resultado da simul[aã]cao/i).should('be.visible');
    cy.contains(/Meta planejada/i).should('be.visible');
  });
});
