import { visitCommercial } from '../support/commercial-test-helpers';

describe('Metas', () => {
  it('carrega a tela de metas com os blocos principais', () => {
    visitCommercial(cy, '/comercial/metas');

    cy.contains('h1', 'Metas Comerciais').should('exist');
    cy.contains('button', 'Adicionar Meta').should('exist');
    cy.contains('button', 'Adicionar Metas').should('exist');
    cy.contains('p', 'Total Vendido').should('exist');
    cy.contains('p', 'Faltam').should('exist');
  });

  it('exibe os gráficos e o painel de metas dos SDRs', () => {
    visitCommercial(cy, '/comercial/metas');

    cy.contains('Projeção do Mês').should('exist');
    cy.contains('Vendas por Dia').should('exist');
    cy.contains('Vendas por Criativo').should('exist');
    cy.contains('Distribuição por Plano').should('exist');
    cy.contains('Metas dos SDRs').should('exist');
  });

  it('mostra os indicadores operacionais da meta', () => {
    visitCommercial(cy, '/comercial/metas');

    cy.contains('Necessário/Dia').should('exist');
    cy.contains('Dias Úteis Restantes').should('exist');
    cy.contains('Em Negociação').should('exist');
  });
});
