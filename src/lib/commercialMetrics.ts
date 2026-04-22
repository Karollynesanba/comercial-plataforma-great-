import type { PipelineClient } from '@/contexts/CommercialContext';
import type { AgendaEvent } from '@/hooks/useAgendaData';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DashboardMetrics {
  totalRevenue: number;
  contractCount: number;
  averageTicket: number;
  conversionRate: number;
  negotiationValue: number;
  leadCount: number;
  wonCount: number;
  metaHitPercent: number;
}

const REAL_CONTRACT_PERIODS = new Set(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL']);

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isDateInRange(value: Date | string | null | undefined, range: DateRange) {
  if (!value) return false;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed >= range.start && parsed <= range.end;
}

export function getLeadCreatedDate(client: PipelineClient) {
  return client.dataEntrada || client.entryDate || client.createdAt || null;
}

export function getCloseDate(client: PipelineClient) {
  return client.lastStageChange || null;
}

export function isWonClient(client: PipelineClient) {
  return client.stage === 'FECHADO';
}

export function isTaxaClient(client: PipelineClient) {
  return client.periodo === 'TAXA_INTERESSE';
}

export function isRealContract(client: PipelineClient) {
  return isWonClient(client) && REAL_CONTRACT_PERIODS.has(client.periodo);
}

export function getClientRevenue(client: PipelineClient) {
  return Number(client.entrada || client.dealValue || 0);
}

export function getWonClientsInRange(clients: PipelineClient[], range: DateRange) {
  return clients.filter((client) => isWonClient(client) && isDateInRange(getCloseDate(client), range));
}

export function getCreatedClientsInRange(clients: PipelineClient[], range: DateRange) {
  return clients.filter((client) => isDateInRange(getLeadCreatedDate(client), range));
}

export function buildDashboardMetrics(
  clients: PipelineClient[],
  goalValue: number,
  range: DateRange
): DashboardMetrics {
  const createdClients = getCreatedClientsInRange(clients, range);
  const wonClients = getWonClientsInRange(clients, range);
  const realContracts = wonClients.filter(isRealContract);
  const totalRevenue = wonClients.reduce((sum, client) => sum + getClientRevenue(client), 0);
  const averageTicket = realContracts.length > 0
    ? realContracts.reduce((sum, client) => sum + getClientRevenue(client), 0) / realContracts.length
    : 0;
  const negotiationValue = createdClients
    .filter((client) => client.stage === 'NEGOCIACAO')
    .reduce((sum, client) => sum + getClientRevenue(client), 0);
  const conversionRate = createdClients.length > 0
    ? (realContracts.length / createdClients.length) * 100
    : 0;

  return {
    totalRevenue,
    contractCount: realContracts.length,
    averageTicket,
    conversionRate,
    negotiationValue,
    leadCount: createdClients.length,
    wonCount: wonClients.length,
    metaHitPercent: goalValue > 0 ? (totalRevenue / goalValue) * 100 : 0,
  };
}

export function getAgendaMeetingsInRange(events: AgendaEvent[], range: DateRange) {
  return events.filter((event) => isDateInRange(`${event.event_date}T${event.event_time}`, range));
}

export function getSuccessfulMeetings(events: AgendaEvent[], clients: PipelineClient[], range: DateRange) {
  const meetings = getAgendaMeetingsInRange(events, range);
  const phoneToWon = new Set(
    getWonClientsInRange(clients, range)
      .map((client) => (client.telefone || '').replace(/\D/g, ''))
      .filter(Boolean)
  );

  return meetings.filter((event) => phoneToWon.has((event.client_phone || '').replace(/\D/g, '')));
}
