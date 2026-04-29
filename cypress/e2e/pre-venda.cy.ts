import { visitCommercial } from '../support/commercial-test-helpers';

describe('Pre Venda', () => {
  it('abre o Raio X SDR com os blocos principais', () => {
    visitCommercial(cy, '/comercial/pre-venda');

    cy.contains('h1', /Pré venda/i).should('be.visible');
    cy.contains('button', 'Mês').should('be.visible');
    cy.contains('button', 'Salvar planilha visível').should('be.visible');
    cy.contains('Daily SDR | 2026').should('be.visible');
    cy.contains('Contatos no período').should('be.visible');
  });
});
