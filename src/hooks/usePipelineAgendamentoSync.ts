import type { AgendamentoLead, AgendamentoLeadInsert } from './useAgendamentoData';
import type { PipelineClient, Faturamento, PipelineStage } from '@/contexts/CommercialContext';
import { coerceCommercialAnswer, type CommercialYesNoMaybe } from '@/lib/commercialAnswer';

type NormalizedFaturamento =
  | '0_A_10K'
  | '10K_A_20K'
  | '20K_A_30K'
  | '30K_A_50K'
  | '50K_A_80K'
  | '80K_A_100K'
  | '100K_A_150K'
  | '150K_A_250K'
  | '250K_A_400K'
  | '400K_A_600K'
  | '600K_A_1M'
  | '1M_PLUS'
  | 'NAO_INFORMADO';

const FATURAMENTO_ALIASES: Record<string, NormalizedFaturamento> = {
  '0_A_10K': '0_A_10K',
  '0_A_15K': '0_A_10K',
  '0_10K': '0_A_10K',
  'FATURA_12K': '0_A_10K',
  'PODE_INVESTIR': '0_A_10K',
  '10K_A_20K': '10K_A_20K',
  '15K_A_30K': '10K_A_20K',
  '15K_MAIS': '10K_A_20K',
  '20K_A_30K': '20K_A_30K',
  '30K_A_50K': '30K_A_50K',
  '50K_A_80K': '50K_A_80K',
  '50K_A_100K': '50K_A_80K',
  '80K_A_100K': '80K_A_100K',
  '100K_A_150K': '100K_A_150K',
  '100K_PLUS': '100K_A_150K',
  '150K_A_250K': '150K_A_250K',
  '250K_A_400K': '250K_A_400K',
  '400K_A_600K': '400K_A_600K',
  '600K_A_1M': '600K_A_1M',
  '1M_PLUS': '1M_PLUS',
  'NAO_INFORMADO': 'NAO_INFORMADO',
  'PERSONALIZADO': 'NAO_INFORMADO',
};

function normalizeFaturamento(value?: string | null): NormalizedFaturamento {
  if (!value) return 'NAO_INFORMADO';
  return FATURAMENTO_ALIASES[value] || FATURAMENTO_ALIASES[value.toUpperCase()] || 'NAO_INFORMADO';
}

export const AGENDAMENTO_TO_PIPELINE_FATURAMENTO: Record<string, Faturamento> = {
  '0_A_10K': '0_A_10K',
  '10K_A_20K': '10K_A_20K',
  '20K_A_30K': '20K_A_30K',
  '30K_A_50K': '30K_A_50K',
  '50K_A_80K': '50K_A_80K',
  '80K_A_100K': '80K_A_100K',
  '100K_A_150K': '100K_A_150K',
  '150K_A_250K': '150K_A_250K',
  '250K_A_400K': '250K_A_400K',
  '400K_A_600K': '400K_A_600K',
  '600K_A_1M': '600K_A_1M',
  '1M_PLUS': '1M_PLUS',
  'NAO_INFORMADO': 'NAO_INFORMADO',
  'PERSONALIZADO': 'NAO_INFORMADO',
  '0_A_15K': '0_A_10K',
  '15K_A_30K': '10K_A_20K',
  '50K_A_100K': '50K_A_80K',
  '100K_PLUS': '100K_A_150K',
};

export const PIPELINE_TO_AGENDAMENTO_FATURAMENTO: Record<string, AgendamentoLead['faturamento']> = {
  '0_A_10K': '0_A_10K',
  '10K_A_20K': '10K_A_20K',
  '20K_A_30K': '20K_A_30K',
  '30K_A_50K': '30K_A_50K',
  '50K_A_80K': '50K_A_80K',
  '80K_A_100K': '80K_A_100K',
  '100K_A_150K': '100K_A_150K',
  '150K_A_250K': '150K_A_250K',
  '250K_A_400K': '250K_A_400K',
  '400K_A_600K': '400K_A_600K',
  '600K_A_1M': '600K_A_1M',
  '1M_PLUS': '1M_PLUS',
  'NAO_INFORMADO': 'NAO_INFORMADO',
  'PERSONALIZADO': 'NAO_INFORMADO',
  '0_A_15K': '0_A_10K',
  '15K_A_30K': '10K_A_20K',
  '50K_A_100K': '50K_A_80K',
  '100K_PLUS': '100K_A_150K',
};

export const AGENDAMENTO_STATUS_TO_PIPELINE_STAGE: Record<string, PipelineStage> = {
  'NOVO_LEAD': 'NOVO',
  'NO_SHOW': 'NO_SHOW',
  'TAXA_INTERESSE': 'TAXA_INTERESSE',
  'NEGOCIACAO': 'NEGOCIACAO',
  'PERDIDO': 'PERDIDO',
  'FECHADO': 'FECHADO',
  'NOSHOW': 'NO_SHOW',
  'REMARCAÃ‡ÃƒO': 'NOVO',
  'FOLLOW UP': 'NEGOCIACAO',
  'VENDA PERDIDA': 'PERDIDO',
  'LEAD DESQUALIFICADO': 'PERDIDO',
  'ENTRAR EM CONTATO': 'NOVO',
  'INTERESSEIRO': 'NEGOCIACAO',
  'FUP - ONE LEVEL': 'NEGOCIACAO',
  'SEM RESPOSTA - PÃ“S': 'NO_SHOW',
  'REEMBOLSO': 'PERDIDO',
  'ARROGANTE': 'PERDIDO',
  'OUTRA PROPOSTA': 'NEGOCIACAO',
  'FICOU DE DAR RESP': 'NEGOCIACAO',
  'FECHOU COM OUTRO': 'PERDIDO',
  'VIU CNPJ': 'NEGOCIACAO',
  'PAGOU TAXA DE INT': 'TAXA_INTERESSE',
  'NÃƒO FECHOU': 'PERDIDO',
};

export const PIPELINE_STAGE_TO_AGENDAMENTO_STATUS: Record<PipelineStage, string> = {
  'NOVO': 'NOVO_LEAD',
  'NO_SHOW': 'NO_SHOW',
  'TAXA_INTERESSE': 'TAXA_INTERESSE',
  'NEGOCIACAO': 'NEGOCIACAO',
  'PERDIDO': 'PERDIDO',
  'FECHADO': 'FECHADO',
};

function mapTemSocioToAgendamento(temSocio?: CommercialYesNoMaybe): CommercialYesNoMaybe {
  return coerceCommercialAnswer(temSocio) || 'NAO_SEI';
}

function mapTemMktToAgendamento(temMkt?: CommercialYesNoMaybe): CommercialYesNoMaybe {
  return coerceCommercialAnswer(temMkt) || 'NAO_SEI';
}

function mapTemSecretariaToAgendamento(temSecretaria?: CommercialYesNoMaybe): CommercialYesNoMaybe {
  return coerceCommercialAnswer(temSecretaria) || 'NAO_SEI';
}

export function agendamentoToPipeline(
  lead: AgendamentoLead | AgendamentoLeadInsert,
  userId: string,
  nextTeam: string = ''
): Omit<PipelineClient, 'id' | 'createdByUserId'> {
  const stage = 'status' in lead && lead.status
    ? AGENDAMENTO_STATUS_TO_PIPELINE_STAGE[lead.status] || 'NOVO'
    : 'NOVO';

  return {
    ativo: true,
    clientName: lead.nome,
    clinicName: lead.nome,
    vendedor: undefined,
    criativo: lead.funil || 'NÃƒO IDENTIFICADO',
    equipe: nextTeam,
    faturamento: normalizeFaturamento(lead.faturamento) as Faturamento,
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: '',
    entrada: 0,
    dataEntrada: new Date(),
    stage,
    lostReason: stage === 'PERDIDO' ? ('status' in lead ? lead.status : undefined) : undefined,
    temSocio: coerceCommercialAnswer(lead.tem_socio) || 'NAO_SEI',
    temMkt: coerceCommercialAnswer(lead.tem_mkt) || 'NAO_SEI',
    temSecretaria: coerceCommercialAnswer(lead.tem_secretaria) || 'NAO_SEI',
  };
}

export function pipelineToAgendamento(
  client: Omit<PipelineClient, 'id' | 'createdByUserId'> | PipelineClient
): AgendamentoLeadInsert {
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

  return {
    data: dateStr,
    nome: client.clientName,
    telefone: client.telefone || '',
    horario: 'MANHA',
    tem_socio: mapTemSocioToAgendamento(client.temSocio),
    tem_mkt: mapTemMktToAgendamento(client.temMkt),
    tem_secretaria: mapTemSecretariaToAgendamento(client.temSecretaria),
    salao_ou_clinica: 'NAO_INFORMADO',
    faturamento: normalizeFaturamento(client.faturamento) as AgendamentoLead['faturamento'],
    funil: client.criativo || 'NÃƒO IDENTIFICADO',
    status: PIPELINE_STAGE_TO_AGENDAMENTO_STATUS[client.stage] || 'ENTRAR EM CONTATO',
  };
}
