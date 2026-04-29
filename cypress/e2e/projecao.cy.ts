import { visitCommercial } from '../support/commercial-test-helpers';

describe('Projecao', () => {
  it('abre Projecao Comercial e mostra o simulador do funil', () => {
    visitCommercial(cy, '/comercial/projecao');

    cy.contains('h1', /Projecao Comercial/i).should('be.visible');
    cy.contains(/Simulador manual do funil/i).should('be.visible');
    cy.contains(/Resultado da simulacao/i).should('be.visible');
    cy.contains(/Cenarios necessarios para bater a meta/i).should('be.visible');
  });
});
