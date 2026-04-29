import { visitCommercial } from '../support/commercial-test-helpers';

describe('Pre Venda', () => {
  it('abre o Raio X SDR com as abas principais', () => {
    visitCommercial(cy, '/comercial/pre-venda');

    cy.contains('h1', /Pr[ée] venda/i).should('be.visible');
    cy.contains('button', /Vis[ãa]o geral/i).should('be.visible');
    cy.contains('button', /M[ée]tricas Leads/i).should('be.visible');
    cy.contains('button', /M[ée]tricas de evolu[çc][ãa]o/i).should('be.visible');
  });
});
