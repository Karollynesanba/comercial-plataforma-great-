import { visitCommercial } from '../support/commercial-test-helpers';

describe('Inteligencia Operacional', () => {
  it('abre a pagina e os paineis de metricas', () => {
    visitCommercial(cy, '/comercial/inteligencia-operacional');

    cy.contains('h1', /Inteligencia Operacional/i).should('be.visible');
    cy.contains('button', /Vis[ãa]o geral/i).should('be.visible');
    cy.contains('button', /M[ée]tricas Leads/i).should('be.visible');
    cy.contains('button', /M[ée]tricas de evolu[çc][ãa]o/i).should('be.visible');
  });
});
