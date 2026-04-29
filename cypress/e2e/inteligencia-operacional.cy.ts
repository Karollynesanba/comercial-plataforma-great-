import { visitCommercial } from '../support/commercial-test-helpers';

describe('Inteligencia Operacional', () => {
  it('abre a pagina e os paines de metricas', () => {
    visitCommercial(cy, '/comercial/inteligencia-operacional');

    cy.contains('h1', /Inteligencia Operacional/i).should('be.visible');
    cy.contains('button', /Vis[aã]o geral/i).should('be.visible');
    cy.contains('button', /Metricas Leads/i).should('be.visible');
    cy.contains('button', /Metricas de evolu/i).should('be.visible');
  });
});
