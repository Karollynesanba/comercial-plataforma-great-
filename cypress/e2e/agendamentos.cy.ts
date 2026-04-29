import { visitCommercial } from '../support/commercial-test-helpers';

describe('Agendamentos', () => {
  it('abre Agenda Great com busca, equipe e visao dia/semana/mes', () => {
    visitCommercial(cy, '/comercial/agenda-great');

    cy.contains('Buscar cliente, telefone...').should('be.visible');
    cy.contains('Todas as Equipes').should('be.visible');
    cy.contains('button', 'Dia').should('be.visible');
    cy.contains('button', 'Semana').should('be.visible');
    cy.contains('button', /M[eé]s/i).should('be.visible');
  });

  it('abre Meta de Agendamentos com cards por pessoa', () => {
    visitCommercial(cy, '/comercial/meta-agendamentos');

    cy.contains('h1', 'Meta de Agendamentos').should('be.visible');
    cy.contains('Meta Geral').should('be.visible');
    cy.contains('Metas por pessoa que agenda').should('be.visible');
    cy.contains('Dashboard de agendamentos').should('be.visible');
  });
});
