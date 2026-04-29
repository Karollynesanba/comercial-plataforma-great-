import { visitCommercial } from '../support/commercial-test-helpers';

describe('Dashboard', () => {
  it('carrega a visao geral com os principais blocos', () => {
    visitCommercial(cy, '/comercial/dashboards');

    cy.contains('h1', /Dashboards Visuais/i).should('be.visible');
    cy.contains('h2', /Dashboard Comercial/i).should('be.visible');
    cy.contains('h2', /Evolu/i).should('be.visible');
    cy.contains('h2', 'Onde Investir').should('be.visible');
    cy.contains(/Ranking completo dos criativos/i).should('be.visible');
  });

  it('permite trocar o periodo selecionado', () => {
    visitCommercial(cy, '/comercial/dashboards');

    cy.contains('button', 'Todo o período').click({ force: true });
    cy.contains('Mês específico').click({ force: true });
    cy.contains('h2', /Dashboard do M[eê]s Atual/i).should('be.visible');
  });
});
