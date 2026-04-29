import { visitCommercial } from '../support/commercial-test-helpers';

describe('Pre Venda', () => {
  it('abre o Raio X SDR com as abas principais', () => {
    visitCommercial(cy, '/comercial/pre-venda');

    cy.contains('h1', /Pr[eé] venda/i).should('be.visible');
    cy.contains('button', /Vis[aã]o geral/i).should('be.visible');
    cy.contains('button', /Metricas Leads/i).should('be.visible');
    cy.contains('button', /Metricas de evolu/i).should('be.visible');
  });
});
