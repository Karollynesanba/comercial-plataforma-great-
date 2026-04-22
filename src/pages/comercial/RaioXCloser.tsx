import { Fragment, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, Banknote, BarChart3, Calendar, DollarSign, Save, Target, TrendingUp, Users } from 'lucide-react';
import { RaioXFilters, filterClientByRaioX, getDefaultRaioXFilter, type RaioXFilterState } from '@/components/comercial/RaioXFilters';
import { type PipelineClient, PERIODO_OPTIONS, type Vendedor, useCommercial } from '@/contexts/CommercialContext';
import { cn, formatBRL } from '@/lib/utils';
import { getClientRevenue } from '@/lib/commercialMetrics';
import { normalizeCloserName } from '@/lib/callsRealizadas2026';
import { parseCalendarDate } from '@/lib/preVendaAnalytics';

const COLORS = ['#e10600', '#111827', '#f97316', '#0ea5e9', '#8b5cf6'];
const COMMISSION_RATE = 0.03;

const CLOSER_OPTIONS: { value: Vendedor; label: string }[] = [
  { value: 'CAETANO', label: 'Caetano' },
  { value: 'PEDRO_H', label: 'Pedro H' },
  { value: 'PEDRO_JUAN', label: 'Pedro J' },
  { value: 'CLED', label: 'Cled' },
  { value: 'HERBERT', label: 'Herbert' },
];

const PERIODO_COLORS: Record<string, string> = {
  MENSAL: '#3b82f6',
  TRIMESTRAL: '#22c55e',
  SEMESTRAL: '#f59e0b',
  TAXA_INTERESSE: '#8b5cf6',
};

interface CloserPipelineStats {
  vendedor: Vendedor;
  name: string;
  totalLeads: number;
  revenueDeals: number;
  closedContracts: number;
  interestDeals: number;
  lostCount: number;
  negotiationCount: number;
  revenueValue: number;
  averageTicket: number;
  conversionRate: number;
  commission: number;
  monthlyEvolution: { month: string; value: number; deals: number }[];
  periodoBreakdown: { periodo: string; valueKey: string; count: number; value: number }[];
}

type CloserDailyDraft = {
  agendada: string;
  realizada: string;
  pitch: string;
  vendas: string;
  valor: string;
  primeiraParcela: string;
};

type CloserSheetMetrics = {
  agendada: number;
  realizada: number;
  pitch: number;
  vendas: number;
  valor: number;
  primeiraParcela: number;
};

type WeekGroup = {
  label: string;
  dates: string[];
};

type CloserName = 'CLED' | 'PEDRO H' | 'HERBERT' | 'CAETANO' | 'PEDRO J';

const CLOSER_LABELS: Record<CloserName, string> = {
  CLED: 'Cled',
  'PEDRO H': 'Pedro H',
  HERBERT: 'Herbert',
  CAETANO: 'Caetano',
  'PEDRO J': 'Pedro J',
};

type CloserCallMetrics = CloserSheetMetrics & {
  closer: CloserName;
  showUpRate: number;
  conversionRate: number;
  ticketMedio: number;
};

const CLOSERS_FROM_CALLS_SHEET: CloserName[] = ['CLED', 'PEDRO H', 'HERBERT', 'CAETANO', 'PEDRO J'];

const emptyCloserDraft = (): CloserDailyDraft => ({
  agendada: '0',
  realizada: '0',
  pitch: '0',
  vendas: '0',
  valor: '0',
  primeiraParcela: '0',
});

const emptyCloserMetrics = (): CloserSheetMetrics => ({
  agendada: 0,
  realizada: 0,
  pitch: 0,
  vendas: 0,
  valor: 0,
  primeiraParcela: 0,
});

export default function RaioXCloser() {
  const { pipelineClients, closerDailyLogs, upsertCloserDailyLog } = useCommercial();
  const [filter, setFilter] = useState<RaioXFilterState>(getDefaultRaioXFilter);
  const [drafts, setDrafts] = useState<Record<string, CloserDailyDraft>>({});

  const visibleDates = useMemo(() => {
    const existingDates = Array.from(new Set(
      closerDailyLogs
        .filter((log) => filterClientByRaioX(log.date, filter))
        .map((log) => log.date)
    ));

    return getDateRange(filter, existingDates);
  }, [closerDailyLogs, filter]);
  const weekGroups = useMemo(() => groupDatesByWeek(visibleDates), [visibleDates]);

  const pipelineStats = useMemo(
    () => buildCloserPipelineStats(pipelineClients, filter),
    [pipelineClients, filter]
  );

  useEffect(() => {
    const nextDrafts = visibleDates.reduce((acc, date) => {
      CLOSERS_FROM_CALLS_SHEET.forEach((closer) => {
        const key = `${date}:${closer}`;
        const existing = closerDailyLogs.find((log) => log.date === date && log.closer === closer);
        acc[key] = existing
          ? {
              agendada: String(existing.agendada || 0),
              realizada: String(existing.realizada || 0),
              pitch: String(existing.pitch || 0),
              vendas: String(existing.vendas || 0),
              valor: String(existing.valor || 0),
              primeiraParcela: String(existing.primeiraParcela || 0),
            }
          : emptyCloserDraft();
      });
      return acc;
    }, {} as Record<string, CloserDailyDraft>);

    setDrafts(nextDrafts);
  }, [closerDailyLogs, visibleDates]);

  const getSheetMetrics = (date: string, closer: CloserName) => getCloserDraftMetrics(drafts[`${date}:${closer}`]);
  const getCloserTotals = (dates: string[], closer: CloserName) =>
    dates.reduce((acc, date) => addCloserMetrics(acc, getSheetMetrics(date, closer)), emptyCloserMetrics());
  const getCombinedCloserTotals = (dates: string[]) =>
    CLOSERS_FROM_CALLS_SHEET.reduce((acc, closer) => addCloserMetrics(acc, getCloserTotals(dates, closer)), emptyCloserMetrics());
  const editableGrandTotals = useMemo(() => getCombinedCloserTotals(visibleDates), [drafts, visibleDates]);
  const closerCallStats = useMemo(
    () => CLOSERS_FROM_CALLS_SHEET.map((closer) => buildCloserCallMetrics(closer, getCloserTotals(visibleDates, closer))),
    [drafts, visibleDates]
  );
  const monthlyEvolution = useMemo(() => buildCloserLogEvolution(closerDailyLogs), [closerDailyLogs]);

  const updateCloserDraft = (date: string, closer: CloserName, field: keyof CloserDailyDraft, value: string) => {
    const key = `${date}:${closer}`;
    setDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] || emptyCloserDraft()),
        [field]: value,
      },
    }));
  };

  const saveCloserLog = (date: string, closer: CloserName) => {
    const draft = drafts[`${date}:${closer}`] || emptyCloserDraft();
    upsertCloserDailyLog({
      date,
      closer,
      agendada: parseSheetNumber(draft.agendada),
      realizada: parseSheetNumber(draft.realizada),
      pitch: parseSheetNumber(draft.pitch),
      vendas: parseSheetNumber(draft.vendas),
      valor: parseSheetNumber(draft.valor),
      primeiraParcela: parseSheetNumber(draft.primeiraParcela),
    });
  };

  const saveAllVisibleRows = () => {
    visibleDates.forEach((date) => {
      CLOSERS_FROM_CALLS_SHEET.forEach((closer) => saveCloserLog(date, closer));
    });
  };

  const totals = useMemo(() => {
    const leads = pipelineStats.reduce((sum, item) => sum + item.totalLeads, 0);
    const revenueDeals = pipelineStats.reduce((sum, item) => sum + item.revenueDeals, 0);
    const closedContracts = pipelineStats.reduce((sum, item) => sum + item.closedContracts, 0);
    const revenue = pipelineStats.reduce((sum, item) => sum + item.revenueValue, 0);
    const commission = pipelineStats.reduce((sum, item) => sum + item.commission, 0);

    return {
      leads,
      revenueDeals,
      closedContracts,
      revenue,
      commission,
      averageTicket: revenueDeals > 0 ? revenue / revenueDeals : 0,
      conversionRate: leads > 0 ? revenueDeals / leads : 0,
    };
  }, [pipelineStats]);

  const radarData = useMemo(() => {
    const maxLeads = Math.max(...pipelineStats.map((item) => item.totalLeads), 1);
    const maxDeals = Math.max(...pipelineStats.map((item) => item.revenueDeals), 1);
    const maxRevenue = Math.max(...pipelineStats.map((item) => item.revenueValue), 1);
    const maxTicket = Math.max(...pipelineStats.map((item) => item.averageTicket), 1);
    const maxConversion = Math.max(...pipelineStats.map((item) => item.conversionRate), 1);

    return [
      { metric: 'Leads', ...Object.fromEntries(pipelineStats.map((item) => [item.name, (item.totalLeads / maxLeads) * 100])) },
      { metric: 'Vendas', ...Object.fromEntries(pipelineStats.map((item) => [item.name, (item.revenueDeals / maxDeals) * 100])) },
      { metric: 'Faturamento', ...Object.fromEntries(pipelineStats.map((item) => [item.name, (item.revenueValue / maxRevenue) * 100])) },
      { metric: 'Ticket', ...Object.fromEntries(pipelineStats.map((item) => [item.name, (item.averageTicket / maxTicket) * 100])) },
      { metric: 'Conversao', ...Object.fromEntries(pipelineStats.map((item) => [item.name, (item.conversionRate / maxConversion) * 100])) },
    ];
  }, [pipelineStats]);

  const comparisonBarData = useMemo(
    () => pipelineStats.map((item) => ({
      name: item.name,
      Faturamento: item.revenueValue,
      Leads: item.totalLeads,
      Vendas: item.revenueDeals,
    })),
    [pipelineStats]
  );

  const commissionRows = useMemo(
    () => [...pipelineStats].sort((a, b) => b.commission - a.commission || b.revenueValue - a.revenueValue),
    [pipelineStats]
  );

  return (
    <div className="space-y-7 animate-in">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Raio X closer</p>
          <h1 className="mt-2 flex items-center gap-3 text-4xl font-black tracking-tight text-slate-950">
            <TrendingUp className="h-8 w-8 text-primary" />
            Raio X - Closer
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
            Planilha de calls, comparativo de vendedores e comissões dos closers oficiais.
          </p>
        </div>
        <RaioXFilters value={filter} onChange={setFilter} />
      </section>

      <Tabs defaultValue="planilha" className="space-y-6">
        <TabsList className="h-auto rounded-[1.4rem] bg-slate-100 p-1">
          <TabsTrigger value="planilha" className="rounded-[1.1rem] px-5 py-2.5">Planilha calls</TabsTrigger>
          <TabsTrigger value="comparativo" className="rounded-[1.1rem] px-5 py-2.5">Comparativo</TabsTrigger>
          <TabsTrigger value="comissoes" className="rounded-[1.1rem] px-5 py-2.5">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="planilha" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Agendadas" value={editableGrandTotals.agendada} detail="Planilha editável" />
            <MetricCard label="Realizadas" value={editableGrandTotals.realizada} detail={`${toPct(rate(editableGrandTotals.realizada, editableGrandTotals.agendada))} show up`} tone="success" />
            <MetricCard label="Com pitch" value={editableGrandTotals.pitch} detail={`${toPct(rate(editableGrandTotals.pitch, editableGrandTotals.realizada))} das realizadas`} />
            <MetricCard label="Vendas" value={editableGrandTotals.vendas} detail={`${toPct(rate(editableGrandTotals.vendas, editableGrandTotals.realizada))} conversão`} tone="success" />
            <MetricCard label="Valor vendido" value={formatBRL(editableGrandTotals.valor)} detail={`Ticket ${formatBRL(editableGrandTotals.vendas ? editableGrandTotals.valor / editableGrandTotals.vendas : 0)}`} tone="success" />
          </div>

          <Card className="relative left-1/2 w-[calc(100vw-360px)] -translate-x-1/2 rounded-[2rem] border-red-100 shadow-sm max-[1100px]:left-0 max-[1100px]:w-full max-[1100px]:translate-x-0">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Save className="h-5 w-5 text-primary" />
                    Calls Realizadas | Abril 2026
                  </CardTitle>
                  <CardDescription>
                    Planilha editável para preenchimento diário dos closers oficiais. As semanas e os totais são calculados automaticamente e ficam salvos na plataforma.
                  </CardDescription>
                </div>
                <Button className="gap-2" onClick={saveAllVisibleRows}>
                  <Save className="h-4 w-4" />
                  Salvar planilha visível
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-2xl border bg-background">
                <Table className="min-w-[2500px] text-xs">
                  <TableHeader>
                    <TableRow className="bg-slate-950 text-white hover:bg-slate-950">
                      <TableHead className="sticky left-0 z-20 w-[92px] bg-slate-950 text-white">Período</TableHead>
                      {CLOSERS_FROM_CALLS_SHEET.map((closer) => (
                        <TableHead key={closer} className="border-l-2 border-red-600 text-center text-white" colSpan={9}>
                          {CLOSER_LABELS[closer]}
                        </TableHead>
                      ))}
                      <TableHead className="border-l-2 border-red-600 text-center text-white" colSpan={9}>Total</TableHead>
                    </TableRow>
                    <TableRow className="bg-red-600 text-white hover:bg-red-600">
                      <TableHead className="sticky left-0 z-20 bg-red-600 text-white">Dia</TableHead>
                      {CLOSERS_FROM_CALLS_SHEET.map((closer) => <CloserMetricHeader key={closer} />)}
                      <CloserMetricHeader />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <CloserAggregatedRow label="TOTAL" dates={visibleDates} drafts={drafts} strong />
                    {weekGroups.map((week) => (
                      <Fragment key={week.label}>
                        <CloserAggregatedRow label={week.label} dates={week.dates} drafts={drafts} />
                        {week.dates.map((date) => (
                          <TableRow key={date}>
                            <TableCell className="sticky left-0 z-10 bg-background font-semibold">{formatDateBR(date)}</TableCell>
                            {CLOSERS_FROM_CALLS_SHEET.map((closer) => (
                              <EditableCloserBlock
                                key={`${date}:${closer}`}
                                draft={drafts[`${date}:${closer}`] || emptyCloserDraft()}
                                onChange={(field, value) => updateCloserDraft(date, closer, field, value)}
                                onBlur={() => saveCloserLog(date, closer)}
                              />
                            ))}
                            <ReadonlyCloserBlock metrics={CLOSERS_FROM_CALLS_SHEET.reduce((acc, closer) => addCloserMetrics(acc, getSheetMetrics(date, closer)), emptyCloserMetrics())} />
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {closerCallStats.map((closer) => (
              <Card key={closer.closer} className="rounded-[1.8rem] border-slate-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    {closer.closer}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricLine label="Agendadas" value={closer.agendada} />
                  <MetricLine label="Realizadas" value={closer.realizada} />
                  <MetricLine label="Pitch" value={closer.pitch} />
                  <MetricLine label="Vendas" value={closer.vendas} success />
                  <MetricLine label="Conversão" value={toPct(closer.conversionRate)} />
                  <MetricLine label="Valor" value={formatBRL(closer.valor)} success />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Ranking da planilha - {getFilterLabel(filter)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CloserTable rows={closerCallStats} />
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Evolução de vendas por closer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthlyEvolution}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {CLOSERS_FROM_CALLS_SHEET.map((closer, index) => (
                    <Line key={closer} type="monotone" dataKey={closer} stroke={COLORS[index % COLORS.length]} strokeWidth={2.5} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparativo" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Leads" value={totals.leads} detail="Entrada no pipeline" />
            <MetricCard label="Vendas" value={totals.revenueDeals} detail="Fechado + Taxa de interesse" tone="success" />
            <MetricCard label="Contratos fechados" value={totals.closedContracts} detail="Somente coluna Fechado" tone="success" />
            <MetricCard label="Faturamento" value={formatBRL(totals.revenue)} detail={`Ticket ${formatBRL(totals.averageTicket)}`} tone="success" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-[2rem] border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Comparativo de habilidades
                </CardTitle>
                <CardDescription>Performance relativa entre closers oficiais.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    {pipelineStats.map((item, index) => (
                      <Radar
                        key={item.vendedor}
                        name={item.name}
                        dataKey={item.name}
                        stroke={COLORS[index % COLORS.length]}
                        fill={COLORS[index % COLORS.length]}
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Faturamento por vendedor
                </CardTitle>
                <CardDescription>Valores vindos apenas do pipeline filtrado.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={comparisonBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={78} />
                    <Tooltip formatter={(value: number, name: string) => name === 'Faturamento' ? [formatBRL(value), name] : [value, name]} />
                    <Bar dataKey="Faturamento" fill="#e10600" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {pipelineStats.map((stat, index) => (
              <Card key={stat.vendedor} className="overflow-hidden rounded-[1.8rem] border-slate-100 shadow-sm">
                <div className="h-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{stat.name}</CardTitle>
                  <CardDescription>Closer oficial</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricLine label="Faturamento" value={formatBRL(stat.revenueValue)} success />
                  <MetricLine label="Vendas" value={stat.revenueDeals} success />
                  <MetricLine label="Taxa interesse" value={stat.interestDeals} />
              <MetricLine label="Conversão" value={toPct(stat.conversionRate)} />
                  <MetricLine label="Ticket" value={formatBRL(stat.averageTicket)} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Vendas por Período x Vendedor
              </CardTitle>
              <CardDescription>Distribuicao de planos vendidos por cada closer.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {pipelineStats.map((stat) => {
                  const chartData = stat.periodoBreakdown.filter((item) => item.count > 0);
                  return (
                    <div key={stat.vendedor} className="rounded-[1.4rem] border border-slate-100 p-5">
                      <p className="mb-3 text-center text-sm font-bold text-slate-900">{stat.name}</p>
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={42}
                              outerRadius={74}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ percent }) => `${(Number(percent) * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={entry.valueKey} fill={PERIODO_COLORS[entry.valueKey] || COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatBRL(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-[280px] items-center justify-center rounded-2xl bg-slate-50 text-sm font-medium text-slate-400">
                          Sem vendas no período
                        </div>
                      )}
                      {chartData.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                          {chartData.map((item) => (
                            <div key={item.valueKey} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                              <span className="font-semibold text-slate-600">{item.periodo}</span>
                              <span className="font-black text-slate-950">{item.count} venda(s)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comissoes" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard label="Base comissionável" value={formatBRL(totals.revenue)} detail="Fechado + Taxa de interesse" tone="success" />
            <MetricCard label="Comissão total" value={formatBRL(totals.commission)} detail="3% sobre valor vendido" tone="success" />
            <MetricCard label="Vendas consideradas" value={totals.revenueDeals} detail="Quantidade de vendas comissionáveis" />
          </div>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                Comissões dos closers
              </CardTitle>
              <CardDescription>
                Cada closer recebe 3% do valor vendido. Entram no cálculo leads em Taxa de Interesse e Fechado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Closer</TableHead>
                    <TableHead className="text-center">Taxa de interesse</TableHead>
                    <TableHead className="text-center">Fechados</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-right">Valor vendido</TableHead>
                    <TableHead className="text-right">Comissão 3%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionRows.map((stat) => (
                    <TableRow key={stat.vendedor}>
                      <TableCell className="font-bold text-slate-950">{stat.name}</TableCell>
                      <TableCell className="text-center">{stat.interestDeals}</TableCell>
                      <TableCell className="text-center">{stat.closedContracts}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-700">{stat.revenueDeals}</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(stat.revenueValue)}</TableCell>
                      <TableCell className="text-right font-black text-primary">{formatBRL(stat.commission)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-red-50/70">
                    <TableCell className="font-black">TOTAL</TableCell>
                    <TableCell />
                    <TableCell className="text-center font-black">{totals.closedContracts}</TableCell>
                    <TableCell className="text-center font-black">{totals.revenueDeals}</TableCell>
                    <TableCell className="text-right font-black">{formatBRL(totals.revenue)}</TableCell>
                    <TableCell className="text-right font-black text-primary">{formatBRL(totals.commission)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function buildCloserPipelineStats(clients: PipelineClient[], filter: RaioXFilterState): CloserPipelineStats[] {
  return CLOSER_OPTIONS.map((closer) => {
    const targetCloser = normalizeCloserName(closer.value) ?? closer.value;
    const leads = clients.filter((client) => normalizeCloserName(client.vendedor) === targetCloser && clientMatchesFilter(getEntryDate(client), filter));
    const revenueClients = clients.filter((client) => {
      if (normalizeCloserName(client.vendedor) !== targetCloser) return false;
      if (client.stage !== 'FECHADO' && client.stage !== 'TAXA_INTERESSE') return false;
      return clientMatchesFilter(getClosingDate(client), filter);
    });
    const closedContracts = revenueClients.filter((client) => client.stage === 'FECHADO');
    const interestDeals = revenueClients.filter((client) => client.stage === 'TAXA_INTERESSE');
    const revenueValue = revenueClients.reduce((sum, client) => sum + getClientRevenue(client), 0);
    const periodoBreakdown = PERIODO_OPTIONS.map((periodo) => {
      const periodClients = revenueClients.filter((client) => client.periodo === periodo.value);
      return {
        periodo: periodo.label,
        valueKey: periodo.value,
        count: periodClients.length,
        value: periodClients.reduce((sum, client) => sum + getClientRevenue(client), 0),
      };
    });

    return {
      vendedor: closer.value,
      name: closer.label,
      totalLeads: leads.length,
      revenueDeals: revenueClients.length,
      closedContracts: closedContracts.length,
      interestDeals: interestDeals.length,
      lostCount: leads.filter((client) => client.stage === 'PERDIDO').length,
      negotiationCount: leads.filter((client) => client.stage === 'NEGOCIACAO').length,
      revenueValue,
      averageTicket: revenueClients.length > 0 ? revenueValue / revenueClients.length : 0,
      conversionRate: leads.length > 0 ? revenueClients.length / leads.length : 0,
      commission: revenueValue * COMMISSION_RATE,
      monthlyEvolution: buildMonthlyEvolution(clients, closer.value),
      periodoBreakdown,
    };
  });
}

function buildMonthlyEvolution(clients: PipelineClient[], vendedor: Vendedor) {
  const now = new Date();
  const targetCloser = normalizeCloserName(vendedor) ?? vendedor;
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const label = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    const monthClients = clients.filter((client) => {
      if (normalizeCloserName(client.vendedor) !== targetCloser) return false;
      if (client.stage !== 'FECHADO' && client.stage !== 'TAXA_INTERESSE') return false;
      const closeDate = getClosingDate(client);
      if (!closeDate) return false;
      return closeDate.getMonth() === date.getMonth() && closeDate.getFullYear() === date.getFullYear();
    });

    return {
      month: label.charAt(0).toUpperCase() + label.slice(1),
      value: monthClients.reduce((sum, client) => sum + getClientRevenue(client), 0),
      deals: monthClients.length,
    };
  });
}

function clientMatchesFilter(date: Date | undefined, filter: RaioXFilterState) {
  if (filter.mode === 'all') return true;
  if (!date) return false;
  const parsed = parseCalendarDate(date);
  return parsed ? filterClientByRaioX(parsed.toISOString(), filter) : false;
}

function getEntryDate(client: PipelineClient) {
  return toDate(client.dataEntrada ?? client.entryDate ?? client.createdAt);
}

function getClosingDate(client: PipelineClient) {
  return toDate(client.lastStageChange);
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateBR(date: string) {
  return date.split('-').reverse().join('/');
}

function startOfWeekMonday(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function getDateRange(filter: RaioXFilterState, existingDates: string[]) {
  if (filter.mode === 'all') {
    return existingDates.length > 0 ? [...existingDates].sort() : getDateRange({ mode: 'month', date: new Date(2026, 3, 1) }, []);
  }

  const start = new Date(filter.date.getFullYear(), filter.date.getMonth(), filter.date.getDate());
  const end = new Date(start);

  if (filter.mode === 'month') {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  }

  if (filter.mode === 'week') {
    const weekStart = startOfWeekMonday(filter.date);
    start.setTime(weekStart.getTime());
    end.setTime(weekStart.getTime());
    end.setDate(weekStart.getDate() + 6);
  }

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function groupDatesByWeek(dates: string[]): WeekGroup[] {
  const groups: Record<string, string[]> = {};

  dates.forEach((date) => {
    const parsed = new Date(`${date}T12:00:00`);
    const weekKey = toIsoDate(startOfWeekMonday(parsed));
    groups[weekKey] = [...(groups[weekKey] || []), date];
  });

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, weekDates], index) => ({
      label: `Semana ${index + 1}`,
      dates: weekDates.sort(),
    }));
}

function parseSheetNumber(value: string | number | undefined) {
  if (typeof value === 'number') return Math.max(0, value || 0);
  const normalized = String(value || '0')
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return Math.max(0, Number(normalized) || 0);
}

function rate(part: number, total: number) {
  return total > 0 ? part / total : 0;
}

function addCloserMetrics(a: CloserSheetMetrics, b: CloserSheetMetrics): CloserSheetMetrics {
  return {
    agendada: a.agendada + b.agendada,
    realizada: a.realizada + b.realizada,
    pitch: a.pitch + b.pitch,
    vendas: a.vendas + b.vendas,
    valor: a.valor + b.valor,
    primeiraParcela: a.primeiraParcela + b.primeiraParcela,
  };
}

function buildCloserCallMetrics(closer: CloserName, metrics: CloserSheetMetrics): CloserCallMetrics {
  return {
    closer,
    ...metrics,
    showUpRate: rate(metrics.realizada, metrics.agendada),
    conversionRate: rate(metrics.vendas, metrics.realizada),
    ticketMedio: metrics.vendas > 0 ? metrics.valor / metrics.vendas : 0,
  };
}

function buildCloserLogEvolution(logs: { date: string; closer: string; vendas: number }[]) {
  const monthKeys = Array.from(new Set(logs.map((log) => String(log.date || '').slice(0, 7)).filter(Boolean))).sort();
  return monthKeys.map((monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const label = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    const rows = logs.filter((log) => String(log.date || '').startsWith(monthKey));

    return {
      month: label.charAt(0).toUpperCase() + label.slice(1),
      ...Object.fromEntries(
        CLOSERS_FROM_CALLS_SHEET.map((closer) => [
          closer,
          rows
            .filter((log) => log.closer === closer)
            .reduce((sum, log) => sum + (Number(log.vendas) || 0), 0),
        ])
      ),
    };
  });
}

function getFilterLabel(filter: RaioXFilterState) {
  if (filter.mode === 'all') return 'Todo o período';
  return filter.date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

function getCloserDraftMetrics(draft: CloserDailyDraft | undefined): CloserSheetMetrics {
  return {
    agendada: parseSheetNumber(draft?.agendada),
    realizada: parseSheetNumber(draft?.realizada),
    pitch: parseSheetNumber(draft?.pitch),
    vendas: parseSheetNumber(draft?.vendas),
    valor: parseSheetNumber(draft?.valor),
    primeiraParcela: parseSheetNumber(draft?.primeiraParcela),
  };
}

function CloserMetricHeader() {
  return (
    <>
      <TableHead className="border-l-2 border-red-800 px-2 text-center text-white">SE agendada</TableHead>
      <TableHead className="px-2 text-center text-white">SE realizada</TableHead>
      <TableHead className="px-1 text-center text-white">Pitch</TableHead>
      <TableHead className="px-1 text-center text-white">Vendas</TableHead>
      <TableHead className="px-2 text-center text-white">Valor</TableHead>
      <TableHead className="px-2 text-center text-white">Ticket médio</TableHead>
      <TableHead className="px-2 text-center text-white">Cash collected</TableHead>
      <TableHead className="px-2 text-center text-white">Valor 1ª parcela</TableHead>
      <TableHead className="px-2 text-center text-white">Taxa de conversão</TableHead>
    </>
  );
}

function EditableCloserBlock({
  draft,
  onChange,
  onBlur,
}: {
  draft: CloserDailyDraft;
  onChange: (field: keyof CloserDailyDraft, value: string) => void;
  onBlur: () => void;
}) {
  const metrics = getCloserDraftMetrics(draft);

  return (
    <>
      <EditableNumberCell value={draft.agendada} onChange={(value) => onChange('agendada', value)} onBlur={onBlur} separated />
      <EditableNumberCell value={draft.realizada} onChange={(value) => onChange('realizada', value)} onBlur={onBlur} />
      <EditableNumberCell value={draft.pitch} onChange={(value) => onChange('pitch', value)} onBlur={onBlur} />
      <EditableNumberCell value={draft.vendas} onChange={(value) => onChange('vendas', value)} onBlur={onBlur} />
      <EditableNumberCell value={draft.valor} onChange={(value) => onChange('valor', value)} onBlur={onBlur} />
      <FormulaCell value={formatBRL(metrics.vendas ? metrics.valor / metrics.vendas : 0)} />
      <FormulaCell value={toPct(rate(metrics.primeiraParcela, metrics.valor))} />
      <EditableNumberCell value={draft.primeiraParcela} onChange={(value) => onChange('primeiraParcela', value)} onBlur={onBlur} />
      <FormulaCell value={toPct(rate(metrics.vendas, metrics.realizada))} />
    </>
  );
}

function ReadonlyCloserBlock({ metrics }: { metrics: CloserSheetMetrics }) {
  return (
    <>
      <ReadonlySheetCell value={metrics.agendada} separated />
      <ReadonlySheetCell value={metrics.realizada} />
      <ReadonlySheetCell value={metrics.pitch} />
      <ReadonlySheetCell value={metrics.vendas} />
      <ReadonlySheetCell value={formatBRL(metrics.valor)} />
      <ReadonlySheetCell value={formatBRL(metrics.vendas ? metrics.valor / metrics.vendas : 0)} />
      <ReadonlySheetCell value={toPct(rate(metrics.primeiraParcela, metrics.valor))} />
      <ReadonlySheetCell value={formatBRL(metrics.primeiraParcela)} />
      <ReadonlySheetCell value={toPct(rate(metrics.vendas, metrics.realizada))} />
    </>
  );
}

function CloserAggregatedRow({
  label,
  dates,
  drafts,
  strong,
}: {
  label: string;
  dates: string[];
  drafts: Record<string, CloserDailyDraft>;
  strong?: boolean;
}) {
  const totalsByCloser = CLOSERS_FROM_CALLS_SHEET.map((closer) =>
    dates.reduce((acc, date) => addCloserMetrics(acc, getCloserDraftMetrics(drafts[`${date}:${closer}`])), emptyCloserMetrics())
  );
  const total = totalsByCloser.reduce((acc, metrics) => addCloserMetrics(acc, metrics), emptyCloserMetrics());

  return (
    <TableRow className={strong ? 'bg-red-700 font-bold text-white hover:bg-red-700' : 'border-y-2 border-red-700 bg-red-600 font-bold text-white hover:bg-red-600'}>
      <TableCell className={cn('sticky left-0 z-10 text-white', strong ? 'bg-red-700' : 'bg-red-600')}>
        {label}
      </TableCell>
      {totalsByCloser.map((metrics, index) => (
        <ReadonlyCloserBlock key={CLOSERS_FROM_CALLS_SHEET[index]} metrics={metrics} />
      ))}
      <ReadonlyCloserBlock metrics={total} />
    </TableRow>
  );
}

function EditableNumberCell({ value, onChange, onBlur, separated }: { value: string; onChange: (value: string) => void; onBlur: () => void; separated?: boolean }) {
  return (
    <TableCell className={separated ? 'border-l-2 border-red-100 px-2 py-3 text-center' : 'px-2 py-3 text-center'}>
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="mx-auto h-10 w-full min-w-[84px] max-w-[110px] rounded-full px-2 text-center text-sm font-semibold tabular-nums"
      />
    </TableCell>
  );
}

function ReadonlySheetCell({ value, separated }: { value: string | number; separated?: boolean }) {
  return (
    <TableCell className={separated ? 'border-l-2 border-red-100 px-2 py-3 text-center font-semibold tabular-nums' : 'px-2 py-3 text-center font-semibold tabular-nums'}>
      {value}
    </TableCell>
  );
}

function FormulaCell({ value }: { value: string | number }) {
  return (
    <TableCell className="bg-slate-50 px-2 py-3 text-center font-bold tabular-nums text-slate-700">
      {value}
    </TableCell>
  );
}

function CloserTable({ rows }: { rows: CloserCallMetrics[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Closer</TableHead>
          <TableHead className="text-center">Agendadas</TableHead>
          <TableHead className="text-center">Realizadas</TableHead>
          <TableHead className="text-center">Pitch</TableHead>
          <TableHead className="text-center">Vendas</TableHead>
          <TableHead className="text-center">Show up</TableHead>
          <TableHead className="text-center">Conversão</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="text-right">Ticket</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...rows].sort((a, b) => b.valor - a.valor || b.vendas - a.vendas).map((closer) => (
          <TableRow key={closer.closer}>
            <TableCell className="font-semibold text-slate-900">{closer.closer}</TableCell>
            <TableCell className="text-center">{closer.agendada}</TableCell>
            <TableCell className="text-center">{closer.realizada}</TableCell>
            <TableCell className="text-center">{closer.pitch}</TableCell>
            <TableCell className="text-center font-bold text-emerald-700">{closer.vendas}</TableCell>
            <TableCell className="text-center">{toPct(closer.showUpRate)}</TableCell>
            <TableCell className="text-center">
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                {toPct(closer.conversionRate)}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-bold">{formatBRL(closer.valor)}</TableCell>
            <TableCell className="text-right">{formatBRL(closer.ticketMedio)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MetricCard({ label, value, detail, tone = 'default' }: { label: string; value: string | number; detail: string; tone?: 'default' | 'success' }) {
  const toneClass = tone === 'success' ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-100 bg-white';
  return (
    <div className={`rounded-[1.6rem] border p-5 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{detail}</p>
    </div>
  );
}

function MetricLine({ label, value, success = false }: { label: string; value: string | number; success?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={cn(success ? 'text-emerald-700' : 'text-slate-950', 'font-bold')}>{value}</span>
    </div>
  );
}

function toPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
