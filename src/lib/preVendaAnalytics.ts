import type { PipelineClient } from '@/contexts/CommercialContext';
import { getClientRevenue } from '@/lib/commercialMetrics';

export type PreVendaGroupStats = {
  name: string;
  total: number;
  scheduledRate: number;
  attended: number;
  noShow: number;
  taxaInteresse: number;
  negotiation: number;
  lost: number;
  closed: number;
  revenue: number;
  attendanceRate: number;
  noShowRate: number;
  conversionRate: number;
};

type SummarizePreVendaOptions = {
  revenueStages?: PipelineClient['stage'][];
};

export function rate(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

export function getScheduleDate(client: PipelineClient) {
  return client.meetingDate
    || (client as any).agenda_event_date
    || (client as any).data
    || client.dataEntrada
    || client.entryDate
    || client.createdAt
    || client.lastStageChange
    || null;
}

export function parseCalendarDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
  }

  const text = String(value).trim();
  if (!text) return null;

  const localDateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (localDateOnly) {
    const [, year, month, day] = localDateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getHour(client: PipelineClient) {
  const rawTime = client.meetingTime
    || (client as any).agenda_event_time
    || (client as any).horario_especifico
    || (client as any).horario
    || '';
  const match = String(rawTime).match(/^(\d{1,2})/);
  return match ? Number(match[1]) : null;
}

export function getHourLabel(hour: number | null) {
  if (hour === null || Number.isNaN(hour)) return 'Sem horario';
  return `${String(hour).padStart(2, '0')}h`;
}

export function getTurn(hour: number | null) {
  if (hour === null || Number.isNaN(hour)) return 'Sem horario';
  if (hour >= 7 && hour < 12) return 'Manha (07h-11h)';
  if (hour >= 12 && hour < 17) return 'Tarde (12h-16h)';
  if (hour >= 17 && hour <= 23) return 'Noite (17h-23h)';
  return 'Fora da janela';
}

export function getArea(client: PipelineClient) {
  if (client.salaoOuClinica === 'ESTETICA_BELEZA') return 'Estética e beleza';
  if (client.salaoOuClinica === 'FISIOTERAPIA') return 'Fisioterapia';
  if (client.salaoOuClinica === 'PSICOLOGIA') return 'Psicologia';
  if (client.salaoOuClinica === 'SALAO_BELEZA') return 'Salão de beleza';
  if (client.salaoOuClinica === 'NUTRICIONISTA') return 'Nutricionista';
  if (client.salaoOuClinica === 'ESTETICA') return 'Estética e beleza';
  if (client.salaoOuClinica === 'SALAO') return 'Salão de beleza';
  if (client.salaoOuClinica === 'ODONTOLOGIA') return 'Odontologia';

  const text = [client.clientName, client.clinicName, client.criativo, client.notes].filter(Boolean).join(' ').toLowerCase();
  if (/odonto|dent|ortodon|implante/.test(text)) return 'Odontologia';
  if (/fisio|pilates|reabilit/.test(text)) return 'Fisioterapia';
  if (/psico|terapia|terapeuta/.test(text)) return 'Psicologia';
  if (/nutri|nutric/.test(text)) return 'Nutricionista';
  if (/estet|harmoni|botox|pele|spa|laser/.test(text)) return 'Estética e beleza';
  if (/salao|beleza|cabelo|barbear|nail|unha/.test(text)) return 'Salão de beleza';
  if (client.salaoOuClinica === 'CLINICA') return 'Clinica';
  return 'Nao informado';
}

export function summarizePreVenda(
  name: string,
  clients: PipelineClient[],
  totalBase = clients.length,
  options: SummarizePreVendaOptions = {}
): PreVendaGroupStats {
  const total = clients.length;
  const noShow = clients.filter((client) => client.stage === 'NO_SHOW').length;
  const closedClients = clients.filter((client) => client.stage === 'FECHADO');
  const operationalClients = clients.filter((client) => client.stage !== 'NOVO');
  const noShowBaseClients = operationalClients.filter((client) => client.stage !== 'FECHADO');
  const noShowBaseTotal = noShowBaseClients.length;
  const attended = noShowBaseClients.filter((client) => client.stage !== 'NO_SHOW').length;
  const revenueStages = options.revenueStages || ['FECHADO'];
  const revenueClients = clients.filter((client) => revenueStages.includes(client.stage));

  return {
    name,
    total,
    scheduledRate: rate(total, totalBase),
    attended,
    noShow,
    taxaInteresse: clients.filter((client) => client.stage === 'TAXA_INTERESSE').length,
    negotiation: clients.filter((client) => client.stage === 'NEGOCIACAO').length,
    lost: clients.filter((client) => client.stage === 'PERDIDO').length,
    closed: closedClients.length,
    revenue: revenueClients.reduce((sum, client) => sum + getClientRevenue(client), 0),
    attendanceRate: rate(attended, noShowBaseTotal),
    noShowRate: rate(noShow, noShowBaseTotal),
    conversionRate: rate(closedClients.length, operationalClients.length),
  };
}

export function groupPreVenda(clients: PipelineClient[], getKey: (client: PipelineClient) => string) {
  const grouped = clients.reduce((acc, client) => {
    const key = getKey(client) || 'Nao informado';
    acc[key] = [...(acc[key] || []), client];
    return acc;
  }, {} as Record<string, PipelineClient[]>);

  return Object.entries(grouped)
    .map(([name, rows]) => summarizePreVenda(name, rows, clients.length))
    .sort((a, b) => b.conversionRate - a.conversionRate || b.total - a.total);
}
