import { visitCommercial } from '../support/commercial-test-helpers';

describe('Metas', () => {
  it('carrega metas comerciais e metas dos SDRs', () => {
    visitCommercial(cy, '/comercial/metas');

    cy.contains('h1', 'Metas Comerciais').should('be.visible');
    cy.contains('button', 'Editar Meta').should('exist');
    cy.contains('Metas dos SDRs').should('be.visible');
  });

  it('mostra os graficos e cards de meta', () => {
    visitCommercial(cy, '/comercial/metas');

    cy.contains('Vendas por Dia').should('be.visible');
    cy.contains('Vendas por Criativo').should('be.visible');
    cy.contains('Distribuicao por Plano').should('be.visible');
    cy.contains('Projecao do Mes').should('be.visible');
  });
});
