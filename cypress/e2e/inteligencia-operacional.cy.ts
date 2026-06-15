import { visitCommercial } from '../support/commercial-test-helpers';

describe('Inteligencia Operacional', () => {
  it('abre a pagina e mostra os tabs principais', () => {
    visitCommercial(cy, '/comercial/inteligencia-operacional');

    cy.contains('h1', /Inteligencia Operacional/i).should('be.visible');
    cy.contains('button', /Vis.{0,2}o geral/i).should('be.visible');
    cy.contains('button', /M.{0,2}tricas Leads/i).should('be.visible');
    cy.contains('button', /M.{0,2}tricas de evolu.{0,3}o/i).should('be.visible');
  });

  it('recalcula os indicadores apenas para o closer selecionado', () => {
    visitCommercial(cy, '/comercial/inteligencia-operacional', {
      localData: {
        pipelineClients: [
          {
            id: 'pedro-h-fechado',
            clientName: 'Lead Pedro',
            vendedor: 'PEDRO H',
            agendadoPor: 'PEDRO H',
            criativo: 'CRIATIVO PEDRO',
            funil: 'FUNIL PEDRO',
            stage: 'FECHADO',
            entrada: 1000,
            meetingDate: '2026-06-10T12:00:00.000Z',
            lastStageChange: '2026-06-11T12:00:00.000Z',
          },
          {
            id: 'herbert-fechado',
            clientName: 'Lead Herbert',
            vendedor: 'HERBERT',
            agendadoPor: 'HERBERT',
            criativo: 'CRIATIVO HERBERT',
            funil: 'FUNIL HERBERT',
            stage: 'FECHADO',
            entrada: 9000,
            meetingDate: '2026-06-10T12:00:00.000Z',
            lastStageChange: '2026-06-11T12:00:00.000Z',
          },
        ],
      },
    });

    cy.contains('button', /M.{0,2}tricas Leads/i).click();
    cy.contains('button', 'PEDRO H').click();
    cy.contains('button', /Vis.{0,2}o geral/i).click();

    cy.contains('p', 'Faturamento').parent().find('p').eq(1).should('contain', 'R$ 1.000,00');
    cy.contains('p', 'Agendamento geral').parent().find('p').eq(1).should('contain', '1');
    cy.contains('p', 'Conversão real').parent().find('p').eq(1).should('contain', '100.0%');

    cy.contains('button', /M.{0,2}tricas Leads/i).click();
    cy.contains('CRIATIVO PEDRO').should('be.visible');
    cy.contains('CRIATIVO HERBERT').should('not.exist');
  });
});
