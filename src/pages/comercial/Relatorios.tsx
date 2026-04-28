import React, { useMemo, useState } from 'react';
import { formatBRL } from '@/lib/utils';
import { useCommercial, VENDEDOR_OPTIONS } from '@/contexts/CommercialContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from '@/components/comercial/PeriodFilter';
import {
  AlertTriangle,
  BarChart3,
  Download,
  FileText,
  Filter,
  PieChart as PieChartIcon,
  Search,
  TrendingDown,
  Users,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from 'recharts';

const FIXED_REASONS = [
  'Valor alto',
  'Saiu para pensar',
  'Não era o que buscava',
  'Busca atendimento humano',
] as const;

const REASON_STYLES: Record<(typeof FIXED_REASONS)[number], { color: string; soft: string }> = {
  'Valor alto': { color: '#FF3B3B', soft: 'rgba(255,59,59,0.10)' },
  'Saiu para pensar': { color: '#F59E0B', soft: 'rgba(245,158,11,0.12)' },
  'Não era o que buscava': { color: '#3B82F6', soft: 'rgba(59,130,246,0.10)' },
  'Busca atendimento humano': { color: '#8B5CF6', soft: 'rgba(139,92,246,0.10)' },
};

const REASON_GRADIENT_IDS: Record<(typeof FIXED_REASONS)[number], string> = {
  'Valor alto': 'reason-valor-alto',
  'Saiu para pensar': 'reason-saiu-para-pensar',
  'Não era o que buscava': 'reason-nao-era-o-que-buscava',
  'Busca atendimento humano': 'reason-busca-atendimento-humano',
};

const REASON_ORDER = Object.fromEntries(FIXED_REASONS.map((reason, index) => [reason, index])) as Record<
  (typeof FIXED_REASONS)[number],
  number
>;

function getReasonCategory(rawReason: string | null): (typeof FIXED_REASONS)[number] {
  if (!rawReason) return 'Não era o que buscava';

  const lower = rawReason.toLowerCase();

  if (
    lower.includes('valor') ||
    lower.includes('caro') ||
    lower.includes('preço') ||
    lower.includes('orçamento') ||
    lower.includes('salgado')
  ) {
    return 'Valor alto';
  }

  if (
    lower.includes('pensar') ||
    lower.includes('analisar') ||
    lower.includes('esperar') ||
    lower.includes('decidir')
  ) {
    return 'Saiu para pensar';
  }

  if (
    lower.includes('atendimento') ||
    lower.includes('humano') ||
    lower.includes('presencial')
  ) {
    return 'Busca atendimento humano';
  }

  if (
    lower.includes('nÃƒÂ£o era') ||
    lower.includes('buscava') ||
    lower.includes('serviço') ||
    lower.includes('procurava') ||
    lower.includes('esperava')
  ) {
    return 'Não era o que buscava';
  }

  return 'Não era o que buscava';
}

export default function RelatoriosPage() {
  const { pipelineClients } = useCommercial();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>('all_time');
  const { filterByPeriod } = usePeriodFilter();

  const lostClients = useMemo(() => pipelineClients.filter((client) => client.stage === 'PERDIDO'), [pipelineClients]);

  const filteredLostClients = useMemo(() => {
    return lostClients.filter((client) => {
      const matchesSearch =
        searchQuery === '' ||
        client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.lostReason?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesVendedor = selectedVendedor === 'all' || client.vendedor === selectedVendedor;
      const matchesPeriod = filterByPeriod(client.dataEntrada, periodFilter);

      return matchesSearch && matchesVendedor && matchesPeriod;
    });
  }, [lostClients, searchQuery, selectedVendedor, periodFilter, filterByPeriod]);

  const lossReasonAnalysis = useMemo(() => {
    const reasonCounts: Record<(typeof FIXED_REASONS)[number], number> = {
      'Valor alto': 0,
      'Saiu para pensar': 0,
      'Não era o que buscava': 0,
      'Busca atendimento humano': 0,
    };

    filteredLostClients.forEach((client) => {
      const category = getReasonCategory(client.lostReason);
      reasonCounts[category] += 1;
    });

    return FIXED_REASONS.map((reason) => ({
      reason,
      count: reasonCounts[reason],
      percentage: filteredLostClients.length > 0 ? (reasonCounts[reason] / filteredLostClients.length) * 100 : 0,
    })).sort((a, b) => b.count - a.count || REASON_ORDER[a.reason] - REASON_ORDER[b.reason]);
  }, [filteredLostClients]);

  const monthlyLostTrend = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        month: format(date, 'MMM/yy', { locale: ptBR }),
        monthKey: format(date, 'yyyy-MM'),
        count: 0,
        value: 0,
      };
    });

    lostClients.forEach((client) => {
      const clientMonth = format(new Date(client.dataEntrada), 'yyyy-MM');
      const monthData = last6Months.find((m) => m.monthKey === clientMonth);
      if (monthData) {
        monthData.count += 1;
        monthData.value += client.entrada || 0;
      }
    });

    return last6Months;
  }, [lostClients]);

  const totals = useMemo(() => {
    const totalLost = filteredLostClients.length;
    const totalValue = filteredLostClients.reduce((acc, c) => acc + (c.entrada || 0), 0);
    const avgValue = totalLost > 0 ? totalValue / totalLost : 0;
    const topReason = lossReasonAnalysis[0]?.reason || 'Não era o que buscava';

    return { totalLost, totalValue, avgValue, topReason };
  }, [filteredLostClients, lossReasonAnalysis]);

  const dominantReason = lossReasonAnalysis[0]?.reason || 'Não era o que buscava';
  const dominantReasonStyle = REASON_STYLES[dominantReason];

  const exportToCSV = () => {
    const headers = ['Cliente', 'Vendedor', 'Motivo da Perda', 'Valor', 'Data', 'Criativo'];
    const rows = filteredLostClients.map((client) => [
      client.clientName,
      VENDEDOR_OPTIONS.find((v) => v.value === client.vendedor)?.label || client.vendedor,
      client.lostReason || 'Não informado',
      client.entrada?.toFixed(2) || '0',
      format(new Date(client.dataEntrada), 'dd/MM/yyyy'),
      client.criativo,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-perdidos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 bg-[#F7F7F9] pb-8">
      <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-white px-6 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-950">
            <FileText className="h-6 w-6 text-rose-500" />
            Relatório de Clientes Perdidos
          </h1>
          <p className="text-sm text-slate-500">Análise de motivos de perda e tendências</p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          className="gap-2 border-slate-200 bg-white text-slate-700 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card className="overflow-hidden border border-slate-200/80 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-slate-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <Filter className="h-4 w-4" />
            </span>
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar cliente ou motivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-2xl border-slate-200 bg-white pl-9 shadow-sm focus-visible:ring-rose-500"
                />
              </div>
            </div>
            <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
              <SelectTrigger className="h-11 w-[190px] rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-rose-500">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos vendedores</SelectItem>
                {VENDEDOR_OPTIONS.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PeriodFilter value={periodFilter} onChange={setPeriodFilter} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-12">
        <Card
          className="group relative overflow-hidden border border-rose-200/70 text-white shadow-[0_10px_30px_rgba(255,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(255,0,0,0.26)] md:col-span-8"
          style={{ background: 'linear-gradient(135deg, #FF3B3B 0%, #FF0000 100%)' }}
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.22),transparent_58%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/30" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-semibold uppercase tracking-[0.28em] text-white/90">
                Total Perdidos
              </CardTitle>
              <p className="mt-2 text-sm text-white/85">Clientes perdidos no recorte aplicado</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/18 text-white shadow-sm">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative space-y-5 pt-0">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75">
                  Base analisada
                </div>
                <div className="mt-2 text-6xl font-black tracking-tight tabular-nums leading-none transition-transform duration-300 group-hover:scale-[1.01]">
                  {totals.totalLost}
                </div>
              </div>
              <div className="rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                  Clientes perdidos
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-white">{totals.totalLost}</div>
              </div>
            </div>
            <p className="max-w-lg text-sm leading-6 text-white/85">
              Volume total de oportunidades perdidas no período filtrado.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.24em] text-white/65">
                <span>Intensidade do recorte</span>
                <span>100%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/18">
                <div className="h-full w-full rounded-full bg-white/85 transition-all duration-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-transform duration-300 hover:-translate-y-1 md:col-span-4">
          <div className="h-1.5 bg-[#8B5CF6]" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Motivo Principal</CardTitle>
            <AlertTriangle className="h-4 w-4" style={{ color: dominantReasonStyle.color }} />
          </CardHeader>
          <CardContent>
            <Badge
              variant="secondary"
              className="mb-3 rounded-full border-0 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white"
              style={{ backgroundColor: dominantReasonStyle.color }}
            >
              {totals.topReason}
            </Badge>
            <div className="text-lg font-bold truncate text-slate-950" title={totals.topReason}>
              {totals.topReason}
            </div>
            <p className="text-xs text-slate-500">{lossReasonAnalysis[0]?.percentage.toFixed(0)}% dos casos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden border border-slate-200/80 bg-white xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <PieChartIcon className="h-5 w-5 text-rose-500" />
              Distribuição por Motivo
            </CardTitle>
            <CardDescription className="text-slate-500">Motivos de perda mais frequentes</CardDescription>
          </CardHeader>
          <CardContent>
            {lossReasonAnalysis.length > 0 ? (
              <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr] xl:items-center">
                <div className="relative h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {FIXED_REASONS.map((reason) => (
                          <linearGradient id={REASON_GRADIENT_IDS[reason]} key={reason} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={REASON_STYLES[reason].color} stopOpacity={0.96} />
                            <stop offset="100%" stopColor={REASON_STYLES[reason].color} stopOpacity={0.72} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={lossReasonAnalysis}
                        dataKey="count"
                        nameKey="reason"
                        cx="50%"
                        cy="50%"
                        innerRadius={102}
                        outerRadius={148}
                        paddingAngle={4}
                        cornerRadius={12}
                        label={({ percentage }) => `${percentage.toFixed(0)}%`}
                        labelLine={false}
                      >
                        {lossReasonAnalysis.map((entry) => (
                          <Cell key={entry.reason} fill={REASON_STYLES[entry.reason].color} stroke={REASON_STYLES[entry.reason].color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name]}
                        labelFormatter={() => ''}
                        contentStyle={{
                          backgroundColor: 'rgba(255,255,255,0.96)',
                          border: '1px solid rgba(148,163,184,0.22)',
                          borderRadius: '16px',
                          boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Total</div>
                      <div className="mt-1 text-4xl font-black text-slate-950 tabular-nums">{totals.totalLost}</div>
                      <div className="mt-1 max-w-[160px] text-center text-xs text-slate-500">{dominantReason}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                  {lossReasonAnalysis.map((item) => {
                    const meta = REASON_STYLES[item.reason];
                    return (
                      <div key={item.reason} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-800">{item.reason}</div>
                            <div className="text-xs text-slate-500">{item.count} casos</div>
                          </div>
                        </div>
                        <Badge
                          className="rounded-full border-0 px-3 py-1 text-[11px] font-semibold text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          {item.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                Nenhum dado para exibir
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-slate-200/80 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <BarChart3 className="h-5 w-5 text-rose-500" />
              Tendência Mensal
            </CardTitle>
            <CardDescription className="text-slate-500">Evolução de clientes perdidos nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyLostTrend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="lostTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF3B3B" stopOpacity={0.98} />
                    <stop offset="100%" stopColor="#FF3B3B" stopOpacity={0.32} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'count') return [value, 'Clientes'];
                    return [formatBRL(value), 'Valor'];
                  }}
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.96)',
                    border: '1px solid rgba(148,163,184,0.22)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
                  }}
                />
                <Bar dataKey="count" fill="url(#lostTrendGradient)" radius={[12, 12, 4, 4]} name="count" animationDuration={900}>
                  {monthlyLostTrend.map((entry) => {
                    const isCurrentMonth = entry.monthKey === format(new Date(), 'yyyy-MM');
                    return <Cell key={entry.monthKey} fill={isCurrentMonth ? '#DC2626' : '#FF3B3B'} opacity={isCurrentMonth ? 1 : 0.78} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-slate-200/80 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Ranking de Motivos
            </CardTitle>
            <CardDescription className="text-slate-500">Motivos ordenados por frequência</CardDescription>
          </CardHeader>
          <CardContent>
            {lossReasonAnalysis.length > 0 ? (
              <div className="space-y-4">
                {lossReasonAnalysis.map((item, index) => {
                  const meta = REASON_STYLES[item.reason];
                  return (
                    <div
                      key={item.reason}
                      className="flex items-center gap-4 rounded-2xl border border-slate-100 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {index + 1}
                      </div>
                      <Badge
                        className="rounded-full border-0 px-3 py-1 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {item.reason}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%`, backgroundColor: meta.color }}
                          />
                        </div>
                      </div>
                      <div className="min-w-[92px] text-right">
                        <div className="text-sm font-bold text-slate-950 tabular-nums">{item.count}</div>
                        <div className="text-xs text-slate-500">{item.percentage.toFixed(0)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                Nenhum motivo registrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border border-slate-200/80 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-950">
            <FileText className="h-5 w-5 text-rose-500" />
            Histórico Detalhado
          </CardTitle>
          <CardDescription className="text-slate-500">
            Lista completa de clientes perdidos ({filteredLostClients.length} registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold text-slate-600">Cliente</TableHead>
                  <TableHead className="font-semibold text-slate-600">Vendedor</TableHead>
                  <TableHead className="font-semibold text-slate-600">Motivo da Perda</TableHead>
                  <TableHead className="font-semibold text-slate-600">Valor</TableHead>
                  <TableHead className="font-semibold text-slate-600">Data</TableHead>
                  <TableHead className="font-semibold text-slate-600">Criativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLostClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      Nenhum cliente perdido encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLostClients.map((client) => {
                    const reasonCategory = getReasonCategory(client.lostReason);
                    const reasonMeta = REASON_STYLES[reasonCategory];

                    return (
                      <TableRow key={client.id} className="transition-colors hover:bg-slate-50/80">
                        <TableCell className="font-medium text-slate-950">{client.clientName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700">
                            {VENDEDOR_OPTIONS.find((v) => v.value === client.vendedor)?.label || client.vendedor}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="whitespace-normal rounded-full border-0 text-white"
                            style={{ backgroundColor: reasonMeta.color }}
                          >
                            {client.lostReason || 'Não informado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-slate-800">
                          R$ {(client.entrada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-slate-700">{format(new Date(client.dataEntrada), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
                            {client.criativo}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

