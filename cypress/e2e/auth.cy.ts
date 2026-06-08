const COMMERCIAL_EMAIL = 'cledinhosport10@gmail.com';
const COMMERCIAL_PASSWORD = 'Great2026!';

describe('Autenticacao comercial', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/login');
  });

  it('faz login com credenciais internas e encerra a sessao', () => {
    cy.contains('h2', 'Acesse sua conta').should('be.visible');

    cy.get('input[placeholder="seu@email.com"]').type(COMMERCIAL_EMAIL);
    cy.get('input[type="password"]').type(COMMERCIAL_PASSWORD, { log: false });
    cy.contains('button', 'Entrar').click();

    cy.url().should('include', '/comercial/dashboards');
    cy.contains('button', 'Sair').click();
    cy.url().should('include', '/login');
    cy.contains('h2', 'Acesse sua conta').should('be.visible');
  });

  it('mostra erro quando a senha interna esta incorreta', () => {
    cy.get('input[placeholder="seu@email.com"]').type(COMMERCIAL_EMAIL);
    cy.get('input[type="password"]').type('SenhaErrada123', { log: false });
    cy.contains('button', 'Entrar').click();

    cy.contains(/Senha incorreta|Email ou senha incorretos/i).should('be.visible');
    cy.url().should('include', '/login');
  });
});
