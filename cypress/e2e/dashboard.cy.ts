import { visitCommercial } from '../support/commercial-test-helpers';

describe('Dashboard', () => {
  it('carrega a visao geral com os principais blocos', () => {
    visitCommercial(cy, '/comercial/dashboards');

    cy.contains('h1', /Dashboards Visuais/i).should('be.visible');
    cy.contains('h2', /Dashboard Comercial|Dashboard do M.*s Atual/i).should('be.visible');
    cy.contains('h2', /Evolu/i).should('be.visible');
    cy.contains('h2', 'Onde Investir').should('be.visible');
    cy.contains(/Ranking completo dos criativos/i).should('be.visible');
  });

  it('permite trocar o periodo selecionado', () => {
    visitCommercial(cy, '/comercial/dashboards');

    cy.contains('button', /Todo o per.{0,2}odo/i).click({ force: true });
    cy.contains('[role="option"]', /M.*s espec.*fico/i).click();
    cy.contains('h2', /Dashboard do M.*s Atual/i).should('be.visible');
  });
});

