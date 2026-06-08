import { visitCommercial } from '../support/commercial-test-helpers';

describe('Inteligencia Operacional', () => {
  it('abre a pagina e mostra os tabs principais', () => {
    visitCommercial(cy, '/comercial/inteligencia-operacional');

    cy.contains('h1', /Inteligencia Operacional/i).should('be.visible');
    cy.contains('button', /Vis.{0,2}o geral/i).should('be.visible');
    cy.contains('button', /M.{0,2}tricas Leads/i).should('be.visible');
    cy.contains('button', /M.{0,2}tricas de evolu.{0,3}o/i).should('be.visible');
  });
});
