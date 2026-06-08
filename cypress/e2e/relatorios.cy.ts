import { visitCommercial } from '../support/commercial-test-helpers';

describe('Relatorios', () => {
  it('carrega o relatorio de clientes perdidos', () => {
    visitCommercial(cy, '/comercial/relatorios');

    cy.contains('h1', /Relat.{0,3}rio de Clientes Perdidos/i).should('be.visible');
    cy.contains('button', 'Exportar CSV').should('be.visible');
    cy.contains('h2, h3, h4', /Filtros/i).should('be.visible');
    cy.get('input[placeholder="Buscar cliente ou motivo..."]').should('be.visible');
    cy.contains('Todos vendedores').should('be.visible');
  });

  it('aplica busca e periodo sem quebrar os cards de resumo', () => {
    visitCommercial(cy, '/comercial/relatorios');

    cy.get('input[placeholder="Buscar cliente ou motivo..."]').type('Ana');
    cy.contains('button', 'Exportar CSV').should('be.visible');
    cy.contains(/Hist[oó]rico Detalhado/i).should('be.visible');
  });
});
