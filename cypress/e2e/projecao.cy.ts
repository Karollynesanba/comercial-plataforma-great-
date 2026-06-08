import { visitCommercial } from '../support/commercial-test-helpers';

describe('Projecao', () => {
  it('abre Projecao Comercial e mostra o simulador do funil', () => {
    visitCommercial(cy, '/comercial/projecao');

    cy.contains('h1', /Projecao Comercial/i).should('be.visible');
    cy.contains('Caminho até a meta').should('be.visible');
    cy.contains('Simulador de meta').should('be.visible');
    cy.contains('Resultado da simulação').should('be.visible');
    cy.contains('Meta planejada').should('be.visible');
  });
});
