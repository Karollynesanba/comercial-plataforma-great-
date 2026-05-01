import { visitCommercial } from '../support/commercial-test-helpers';

const persistedPipelineClient = {
  id: 'pipeline-persisted-seed',
  ativo: true,
  clientName: 'Cliente Persistente Seed',
  clinicName: 'Clinica Persistente Seed',
  telefone: '11999990000',
  vendedor: 'HERBERT',
  criativo: 'INSTAGRAM',
  equipe: 'team-equipe-7',
  faturamento: '50K_A_80K',
  pacote: 'COMPLETO',
  periodo: 'MENSAL',
  indicacao: 'NAO',
  entrada: 1500,
  isMrr: false,
  mrrEntrada: 0,
  mrrRemaining: 0,
  dataEntrada: new Date().toISOString(),
  stage: 'FECHADO',
  lastStageChange: new Date().toISOString(),
  notes: 'Seed persistente para teste',
  agendadoPor: 'HEBERT',
  agendadoVia: 'INSTAGRAM',
  pagadorAnuncio: 'CLIENTE',
  temSocio: 'SIM',
  temMkt: 'SIM',
  temSecretaria: 'SIM',
  salaoOuClinica: 'SALAO_BELEZA',
  createdByUserId: 'test-user-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Persistencia global', () => {
  it('mantem dados apos reload sem voltar para zero', () => {
    visitCommercial(cy, '/comercial/pipeline', {
      localData: {
        pipelineClients: [persistedPipelineClient],
      },
    });

    cy.contains('Cliente Persistente Seed').should('exist');

    cy.reload();

    cy.contains('Cliente Persistente Seed').should('exist');
  });

  it('mostra valor vendido diferente de zero quando existe lead fechado salvo', () => {
    visitCommercial(cy, '/comercial/metas', {
      localData: {
        pipelineClients: [persistedPipelineClient],
      },
    });

    cy.get('body').should('contain.text', 'Total Vendido');
    cy.get('body').should('contain.text', 'R$ 1.500,00');
  });
});
