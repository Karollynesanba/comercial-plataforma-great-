import { visitCommercial } from '../support/commercial-test-helpers';

describe('Relatorios', () => {
  it('carrega o relatorio de clientes perdidos', () => {
    visitCommercial(cy, '/comercial/relatorios');

    cy.contains('h1', /Relat[oó]rio de Clientes Perdidos/i).should('be.visible');
    cy.contains('button', 'Exportar CSV').should('be.visible');
    cy.contains(/Hist[oó]rico Detalhado/i).should('be.visible');
  });

  it('mantem os filtros de busca e vendedor acessiveis', () => {
    visitCommercial(cy, '/comercial/relatorios');

    cy.contains('input[placeholder="Buscar cliente ou motivo..."]').should('be.visible');
    cy.contains('Todos vendedores').should('be.visible');
    cy.contains('Filtros').should('be.visible');
  });
});
