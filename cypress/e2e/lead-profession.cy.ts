import { visitCommercial } from '../support/commercial-test-helpers';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fillInputByLabel(labelPattern: string | RegExp, value: string) {
  cy.contains('label', labelPattern)
    .closest('div')
    .within(() => {
      cy.get('input').clear().type(value);
    });
}

function selectOptionByLabel(labelPattern: string | RegExp, optionPattern: string | RegExp) {
  cy.contains('label', labelPattern)
    .closest('div')
    .within(() => {
      cy.get('button[role="combobox"]').click();
    });

  cy.document().then((doc) => {
    cy.wrap(doc.body)
      .find('[role="option"]')
      .contains(optionPattern)
      .should('be.visible')
      .click();
  });
}

function assertProfessionOptions() {
  const options = [
    'Dentista',
    'Médico',
    'Cirurgião',
    'Esteta',
    'Nutrição',
    'Psicologia',
    'Não identificado',
  ];

  cy.contains('label', 'Profissão')
    .closest('div')
    .within(() => {
      cy.get('button[role="combobox"]').click();
    });

  cy.get('[role="option"]').should('have.length', options.length);
  options.forEach((option) => {
    cy.contains('[role="option"]', option).should('be.visible');
  });

  cy.get('body').type('{esc}');
}

describe('Profissão do lead', () => {
  it('envia a profissão escolhida ao criar um Novo Lead', () => {
    const suffix = Date.now().toString().slice(-8);
    const leadName = `QA Profissao ${suffix}`;
    const phoneDigits = `819${suffix}`;
    let capturedLeadPayload: Record<string, unknown> | null = null;

    visitCommercial(cy, '/comercial/pipeline');

    cy.intercept('POST', '**/rest/v1/rpc/commercial_pipeline_client_upsert_secure', (req) => {
      const payload = req.body?.payload || {};

      if (payload.client_name !== leadName) {
        req.reply({
          statusCode: 200,
          body: {
            id: crypto.randomUUID(),
            ativo: payload.ativo ?? true,
            client_name: payload.client_name || 'Lead sem nome',
            clinic_name: payload.clinic_name || payload.client_name || null,
            telefone: payload.telefone || null,
            profession: payload.profession || null,
            vendedor: payload.vendedor || null,
            criativo: payload.criativo || null,
            funil: payload.funil || null,
            equipe: payload.equipe || null,
            faturamento: payload.faturamento || null,
            faturamento_personalizado: payload.faturamento_personalizado || null,
            pode_investir: payload.pode_investir || null,
            pacote: payload.pacote || null,
            periodo: payload.periodo || null,
            indicacao: payload.indicacao || null,
            entrada: payload.entrada || 0,
            is_mrr: payload.is_mrr ?? false,
            mrr_entrada: payload.mrr_entrada || 0,
            mrr_remaining: payload.mrr_remaining || 0,
            data_entrada: payload.data_entrada || new Date().toISOString(),
            stage: payload.stage || 'NOVO',
            last_stage_change: payload.last_stage_change || null,
            lost_reason: payload.lost_reason || null,
            no_show_reason: payload.no_show_reason || null,
            notes: payload.notes || null,
            agendado_por: payload.agendado_por || null,
            agendado_via: payload.agendado_via || null,
            pagador_anuncio: payload.pagador_anuncio || null,
            tem_socio: payload.tem_socio || null,
            tem_mkt: payload.tem_mkt || null,
            tem_secretaria: payload.tem_secretaria || null,
            salao_ou_clinica: payload.salao_ou_clinica || null,
            meeting_date: payload.meeting_date || null,
            meeting_time: payload.meeting_time || null,
            followup_done: payload.followup_done ?? false,
            created_by_user_id: payload.created_by_user_id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
        return;
      }

      capturedLeadPayload = payload;

      expect(payload.profession).to.eq('Dentista');
      expect(payload.client_name).to.eq(leadName);
      expect(payload.telefone).to.include(phoneDigits);

      req.reply({
        statusCode: 200,
        body: {
          id: crypto.randomUUID(),
          ativo: true,
          client_name: payload.client_name,
          clinic_name: payload.clinic_name,
          telefone: payload.telefone,
          profession: payload.profession,
          vendedor: payload.vendedor,
          criativo: payload.criativo,
          funil: payload.funil,
          equipe: payload.equipe,
          faturamento: payload.faturamento,
          faturamento_personalizado: payload.faturamento_personalizado,
          pode_investir: payload.pode_investir,
          pacote: payload.pacote,
          periodo: payload.periodo,
          indicacao: payload.indicacao,
          entrada: payload.entrada,
          is_mrr: payload.is_mrr,
          mrr_entrada: payload.mrr_entrada,
          mrr_remaining: payload.mrr_remaining,
          data_entrada: payload.data_entrada,
          stage: payload.stage,
          last_stage_change: payload.last_stage_change,
          lost_reason: payload.lost_reason,
          no_show_reason: payload.no_show_reason,
          notes: payload.notes,
          agendado_por: payload.agendado_por,
          agendado_via: payload.agendado_via,
          pagador_anuncio: payload.pagador_anuncio,
          tem_socio: payload.tem_socio,
          tem_mkt: payload.tem_mkt,
          tem_secretaria: payload.tem_secretaria,
          salao_ou_clinica: payload.salao_ou_clinica,
          meeting_date: payload.meeting_date,
          meeting_time: payload.meeting_time,
          followup_done: payload.followup_done,
          created_by_user_id: payload.created_by_user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    });

    cy.contains('button', 'Novo Lead').click();
    cy.contains('[role="dialog"]', 'Novo Lead').should('be.visible');

    assertProfessionOptions();

    cy.get('[role="dialog"]').last().within(() => {
      fillInputByLabel(/Nome do Cliente/i, leadName);
      fillInputByLabel(/Telefone/i, phoneDigits);
      selectOptionByLabel(/Profissão/i, 'Dentista');
      selectOptionByLabel(/Funil/i, 'Instagram');
      selectOptionByLabel(/Faturamento/i, /^R\$ 10 mil/);
      selectOptionByLabel(/Tem s[oó]cio\?/i, 'Sim');
      selectOptionByLabel(/Tem MKT\?/i, 'Nao');
      selectOptionByLabel(/Tem secret[aá]ria\?/i, 'Nao sei');
      selectOptionByLabel(/Quem agendou\?/i, 'Herbert');
      selectOptionByLabel(/Agendado por/i, 'Mensagem');
      fillInputByLabel(/Data da Reuniao/i, formatLocalDate());
      fillInputByLabel(/Horario da Reuniao/i, '14:30');
      cy.contains('button', 'Criar Lead').click();
    });

    cy.wrap(null, { timeout: 10000 }).should(() => {
      expect(capturedLeadPayload).to.include({
        client_name: leadName,
        profession: 'Dentista',
      });
    });
  });

  it('exibe a profissão no painel do lead do agendamento sem nova consulta', () => {
    const meetingDate = formatLocalDate();
    const pipelineClientId = crypto.randomUUID();
    const agendaEventId = crypto.randomUUID();

    visitCommercial(cy, '/comercial/agenda-great', {
      localData: {
        pipelineClients: [
          {
            id: pipelineClientId,
            ativo: true,
            clientName: 'Marina Profissao QA',
            clinicName: 'Clinica Marina Profissao QA',
            telefone: '558188881234',
            profession: 'Psicologia',
            criativo: 'INSTAGRAM',
            funil: 'INSTAGRAM',
            equipe: 'team-equipe-7',
            faturamento: '50K_A_80K',
            pacote: 'COMPLETO',
            periodo: 'MENSAL',
            entrada: 0,
            stage: 'NOVO',
            agendadoPor: 'HEBERT',
            agendadoVia: 'MENSAGEM',
            temSocio: 'SIM',
            temMkt: 'NAO',
            temSecretaria: 'NAO_SEI',
            meetingDate,
            meetingTime: '10:30',
            createdByUserId: 'test-user-id',
          },
        ],
        agendaEvents: [
          {
            id: agendaEventId,
            pipeline_client_id: pipelineClientId,
            title: 'Reuniao com Marina Profissao QA',
            client_name: 'Marina Profissao QA',
            client_phone: '558188881234',
            event_date: meetingDate,
            event_time: '10:30:00',
            duration_minutes: 60,
            color: '#3B82F6',
            reminder_2h_sent: false,
            reminder_30min_sent: false,
            created_by_user_id: 'test-user-id',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        agendamentoLeads: [
          {
            id: `agendamento-${agendaEventId}`,
            pipeline_client_id: pipelineClientId,
            agenda_event_id: agendaEventId,
            data: meetingDate.split('-').reverse().join('/'),
            nome: 'Marina Profissao QA',
            telefone: '558188881234',
            profession: 'Psicologia',
            horario: 'MANHA',
            horario_especifico: '10:30',
            tem_socio: 'SIM',
            tem_mkt: 'NAO',
            tem_secretaria: 'NAO_SEI',
            salao_ou_clinica: 'NAO_INFORMADO',
            faturamento: '50K_A_80K',
            agendado_via: 'MENSAGEM',
            funil: 'INSTAGRAM',
            status: 'NOVO_LEAD',
            created_by_user_id: 'test-user-id',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            agenda_event_date: meetingDate,
            agenda_event_time: '10:30:00',
            agenda_event_title: 'Reuniao com Marina Profissao QA',
          },
        ],
      },
    });

    cy.get('body')
      .contains(/Reuni.{0,2}o com Marina Profissao QA/i)
      .first()
      .scrollIntoView()
      .click({ force: true });

    cy.contains('Painel do lead').should('be.visible');
    cy.contains('p', 'PROFISSÃO')
      .closest('div')
      .within(() => {
        cy.contains('Psicologia').should('be.visible');
      });
  });
});
