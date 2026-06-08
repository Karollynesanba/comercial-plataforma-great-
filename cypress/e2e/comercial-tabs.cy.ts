import { visitCommercial } from '../support/commercial-test-helpers';

describe('Abas comerciais', () => {
  it('abre dashboards e mostra os blocos principais', () => {
    visitCommercial(cy, '/comercial/dashboards');

    cy.contains('h1', /Dashboards Visuais/i).should('be.visible');
    cy.contains('h2', /Dashboard Comercial|Dashboard do M.*s Atual/i).should('be.visible');
  });

  it('abre metas comerciais', () => {
    visitCommercial(cy, '/comercial/metas');

    cy.contains('h1', /Metas Comerciais/i).should('be.visible');
    cy.contains('button', 'Adicionar Meta').should('be.visible');
  });

  it('abre relatorios de clientes perdidos', () => {
    visitCommercial(cy, '/comercial/relatorios');

    cy.contains('h1', /Relat.{0,3}rio de Clientes Perdidos/i).should('be.visible');
    cy.contains('button', 'Exportar CSV').should('be.visible');
  });

  it('abre agenda great com os controles principais', () => {
    visitCommercial(cy, '/comercial/agenda-great');

    cy.get('input[placeholder="Buscar cliente, telefone..."]').should('be.visible');
    cy.contains('button', 'Todas as Equipes').should('be.visible');
    cy.contains('button', 'Novo Evento').should('be.visible');
  });

  it('abre meta de agendamentos', () => {
    visitCommercial(cy, '/comercial/meta-agendamentos');

    cy.contains('h1', /Meta de Agendamentos/i).should('be.visible');
    cy.contains('button', /Editar/i).should('be.visible');
  });

  it('abre o pipeline comercial', () => {
    visitCommercial(cy, '/comercial/pipeline');

    cy.contains('h1', /Pipeline Comercial/i).should('be.visible');
    cy.contains('button', 'Novo Lead').should('be.visible');
  });

  it('abre o raio x closer', () => {
    visitCommercial(cy, '/comercial/raio-x-closer');

    cy.contains('h1', /Raio X - Closer/i).should('be.visible');
    cy.contains('button', 'Planilha calls').should('be.visible');
  });

  it('abre pre venda', () => {
    visitCommercial(cy, '/comercial/pre-venda');

    cy.contains('h1', /Pr.{0,2} venda|Pre venda/i).should('be.visible');
    cy.contains('button', /Salvar planilha vis.{0,2}vel/i).should('be.visible');
  });

  it('abre inteligencia operacional', () => {
    visitCommercial(cy, '/comercial/inteligencia-operacional');

    cy.contains('h1', /Inteligencia Operacional/i).should('be.visible');
    cy.contains('button', /M.{0,2}tricas Leads/i).should('be.visible');
  });

  it('abre projecao comercial', () => {
    visitCommercial(cy, '/comercial/projecao');

    cy.contains('h1', /Projecao Comercial/i).should('be.visible');
    cy.contains('h2, h3, h4', /Simulador de meta/i).should('be.visible');
  });
});
