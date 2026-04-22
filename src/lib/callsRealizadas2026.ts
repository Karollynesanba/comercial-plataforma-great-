import type { RaioXFilterState } from '@/components/comercial/RaioXFilters';

export type CloserName = 'CLED' | 'PEDRO H' | 'HERBERT' | 'CAETANO' | 'PEDRO J';
export type CallsCloserLabel = CloserName | 'TOTAL';

export interface CloserCallMetrics {
  closer: CallsCloserLabel;
  agendada: number;
  showUpRate: number;
  realizada: number;
  pitchRateFromRealized: number;
  pitch: number;
  salesPerPitchRate: number;
  vendas: number;
  valor: number;
  ticketMedio: number;
  cashCollectedRate: number;
  primeiraParcela: number;
  conversionRate: number;
}

export interface MonthCallMetrics {
  month: number;
  monthLabel: string;
  closers: CloserCallMetrics[];
}

const CLOSER_MONTHLY_CALLS: MonthCallMetrics[] = [
  {
    month: 0,
    monthLabel: 'Janeiro',
    closers: [
      row('CLED', 15, 13, 12, 3, 8300, 2200, 0.265060241),
      row('PEDRO H', 91, 71, 64, 28, 112825.75, 102711.3, 0.9103533546),
      row('HERBERT', 70, 55, 51, 3, 12198, 11998, 0.9836038695),
      row('CAETANO', 0, 0, 0, 0, 0, 0, 0),
      row('PEDRO J', 0, 0, 0, 0, 0, 0, 0),
    ],
  },
  {
    month: 1,
    monthLabel: 'Fevereiro',
    closers: [
      row('CLED', 46, 36, 24, 10, 38597, 32597, 1),
      row('PEDRO H', 87, 58, 53, 23, 72211.39, 72211.39, 1),
      row('HERBERT', 52, 33, 29, 4, 10828.7, 7597.92, 0.7016465504),
      row('CAETANO', 0, 0, 0, 0, 0, 0, 0),
      row('PEDRO J', 18, 15, 13, 6, 16506.17, 16506.17, 1),
    ],
  },
  {
    month: 2,
    monthLabel: 'Marco',
    closers: [
      row('CLED', 29, 20, 11, 2, 3103, 3103, 1),
      row('PEDRO H', 79, 50, 42, 15, 45287.21, 45287.21, 1),
      row('HERBERT', 60, 38, 24, 8, 12304, 12354, 1.004063719),
      row('CAETANO', 0, 0, 0, 0, 0, 0, 0),
      row('PEDRO J', 13, 8, 4, 1, 2892.61, 2892.61, 1),
    ],
  },
  {
    month: 3,
    monthLabel: 'Abril',
    closers: [
      row('CLED', 12, 10, 8, 1, 2000, 2000, 1),
      row('PEDRO H', 27, 18, 15, 8, 28893.24, 28893.24, 1),
      row('HERBERT', 11, 7, 7, 0, 0, 200, 0),
      row('CAETANO', 13, 11, 10, 0, 200, 200, 1),
      row('PEDRO J', 3, 2, 1, 1, 1800, 1800, 1),
    ],
  },
];

export const CLOSERS_FROM_CALLS_SHEET: CloserName[] = ['CLED', 'PEDRO H', 'HERBERT', 'CAETANO', 'PEDRO J'];

export function isCloserName(value: string): value is CloserName {
  return CLOSERS_FROM_CALLS_SHEET.includes(value as CloserName);
}

export function normalizeCloserName(value?: string | null): CloserName | null {
  if (!value) return null;

  const normalized = value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (normalized === 'CLED') return 'CLED';
  if (normalized === 'HERBERT' || normalized === 'HEBERT') return 'HERBERT';
  if (normalized === 'CAETANO') return 'CAETANO';
  if (normalized === 'PEDRO H') return 'PEDRO H';
  if (normalized === 'PEDRO J' || normalized === 'PEDRO JUAN') return 'PEDRO J';

  return null;
}

export function getCallsRealizadasEvolution() {
  return CLOSER_MONTHLY_CALLS.map((month) => ({
    month: month.monthLabel.slice(0, 3),
    ...Object.fromEntries(month.closers.map((closer) => [closer.closer, closer.vendas])),
  }));
}

export function getCallsRealizadasMetrics(filter: RaioXFilterState) {
  if (filter.mode === 'all') {
    return {
      label: 'Jan-Abr 2026',
      rows: aggregateRows(CLOSER_MONTHLY_CALLS.flatMap((month) => month.closers)),
    };
  }

  const selected = CLOSER_MONTHLY_CALLS.find((month) => month.month === filter.date.getMonth());
  return {
    label: selected?.monthLabel || filter.date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
    rows: selected?.closers || CLOSERS_FROM_CALLS_SHEET.map((closer) => row(closer, 0, 0, 0, 0, 0, 0, 0)),
  };
}

export function summarizeCallsRows(rows: CloserCallMetrics[]) {
  return aggregateRows(rows)[0];
}

function aggregateRows(rows: CloserCallMetrics[]) {
  const grouped = new Map<CallsCloserLabel, CloserCallMetrics>();
  const totals = row('CLED', 0, 0, 0, 0, 0, 0, 0);
  totals.closer = 'TOTAL';

  for (const item of rows) {
    if (item.closer === 'TOTAL') continue;

    const current = grouped.get(item.closer) || row(item.closer, 0, 0, 0, 0, 0, 0, 0);
    add(current, item);
    grouped.set(item.closer, normalize(current));
    add(totals, item);
  }

  return [normalize(totals), ...CLOSERS_FROM_CALLS_SHEET.map((closer) => grouped.get(closer) || row(closer, 0, 0, 0, 0, 0, 0, 0))];
}

function row(closer: CloserName, agendada: number, realizada: number, pitch: number, vendas: number, valor: number, primeiraParcela: number, cashCollectedRate: number): CloserCallMetrics {
  return normalize({
    closer,
    agendada,
    realizada,
    pitch,
    vendas,
    valor,
    primeiraParcela,
    cashCollectedRate,
    showUpRate: 0,
    pitchRateFromRealized: 0,
    salesPerPitchRate: 0,
    ticketMedio: 0,
    conversionRate: 0,
  });
}

function add(target: CloserCallMetrics, item: CloserCallMetrics) {
  target.agendada += item.agendada;
  target.realizada += item.realizada;
  target.pitch += item.pitch;
  target.vendas += item.vendas;
  target.valor += item.valor;
  target.primeiraParcela += item.primeiraParcela;
}

function normalize(item: CloserCallMetrics) {
  item.showUpRate = safeRate(item.realizada, item.agendada);
  item.pitchRateFromRealized = safeRate(item.pitch, item.realizada);
  item.salesPerPitchRate = safeRate(item.vendas, item.pitch);
  item.conversionRate = safeRate(item.vendas, item.realizada);
  item.ticketMedio = item.vendas ? item.valor / item.vendas : 0;
  item.cashCollectedRate = item.valor ? item.primeiraParcela / item.valor : 0;
  return item;
}

function safeRate(part: number, total: number) {
  return total ? part / total : 0;
}
