import { useMemo, useState, type ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, BrainCircuit, CheckCircle2, Clock, DollarSign, Flame, Lightbulb, Target, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { STAGE_LABELS, useCommercial, type PipelineClient } from '@/contexts/CommercialContext';
import { RaioXFilters, filterClientByRaioX, getDefaultRaioXFilter, type RaioXFilterState } from '@/components/comercial/RaioXFilters';
import { formatBRL } from '@/lib/utils';
import { getArea, getHour, getHourLabel, getScheduleDate, getTurn, groupPreVenda, parseCalendarDate, summarizePreVenda, type PreVendaGroupStats } from '@/lib/preVendaAnalytics';
import { CLOSERS_FROM_CALLS_SHEET, isCloserName, normalizeCloserName, type CloserCallMetrics, type CloserName } from '@/lib/callsRealizadas2026';
import { getClientRevenue, isRealContract } from '@/lib/commercialMetrics';
import { getCommercialLeadOrigin } from '@/lib/commercialOrigin';

const COLORS = ['#e10600', '#fb7185', '#f97316', '#f59e0b', '#10b981', '#0ea5e9', '#6366f1', '#8b5cf6'];
const CLOSER_ORDER = new Map<CloserName, number>(CLOSERS_FROM_CALLS_SHEET.map((closer, index) => [closer, index]));
const SPECIALIST_LABELS: Record<string, string> = {
  CAETANO: 'Bruno',
  HEBERT: 'Herbert',
  ALAN: 'Alan',
};

function getSpecialistDisplayName(value?: string | null) {
  if (!value) return 'Sem closer';
  return SPECIALIST_LABELS[value] || value;
}
export default function InteligenciaOperacional() {
  const { pipelineClients, closerDailyLogs } = useCommercial();
  const [filter, setFilter] = useState<RaioXFilterState>(() => ({ ...getDefaultRaioXFilter(), mode: 'all' }));
  const [specialistFilter, setSpecialistFilter] = useState('Todos');
  const [activeTab, setActiveTab] = useState('overview');

  const realPipelineClients = useMemo(() => pipelineClients, [pipelineClients]);

  const clients = useMemo(
    () => realPipelineClients.filter((client) => {
      const scheduleDate = parseCalendarDate(getScheduleDate(client));
      return scheduleDate ? filterClientByRaioX(scheduleDate.toISOString(), filter) : false;
    }),
    [filter, realPipelineClients]
  );

  const specialistOptions = useMemo(() => ['Todos', ...CLOSERS_FROM_CALLS_SHEET, 'ALAN'], []);
  const specialistClients = useMemo(() => (
    specialistFilter === 'Todos'
      ? clients
      : specialistFilter === 'ALAN'
        ? clients.filter((client) => client.agendadoPor === 'ALAN' || client.assignedSDR === 'ALAN')
      : clients.filter((client) => normalizeCloserName(client.assignedCloser || client.vendedor) === specialistFilter)
  ), [clients, specialistFilter]);
  const specialistScopedClients = useMemo(() => specialistClients.filter((client) => client.stage !== 'NOVO'), [specialistClients]);

  const overview = useMemo(() => summarizePreVenda('Geral', specialistClients), [specialistClients]);
  const overviewScheduledTotal = specialistClients.length;
  const overviewOpenLeads = specialistClients.filter((client) => client.stage === 'NOVO').length;
  const overviewCompletedClients = specialistClients.filter((client) => client.stage !== 'NOVO');
  const overviewCompletedTotal = overviewCompletedClients.length;
  const overviewStageBreakdown = useMemo(() => {
    const stageOrder: PipelineClient['stage'][] = ['NO_SHOW', 'TAXA_INTERESSE', 'NEGOCIACAO', 'PERDIDO', 'FECHADO'];
    return stageOrder.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage],
      count: specialistClients.filter((client) => client.stage === stage).length,
    }));
  }, [specialistClients]);
  const callSheet = useMemo(() => buildCallsFromEditableSheet(closerDailyLogs, filter), [closerDailyLogs, filter]);
  const callCloserRows = useMemo(() => {
    const rows = callSheet.rows;
    if (specialistFilter === 'ALAN') return [];
    return isCloserName(specialistFilter)
      ? rows.filter((row) => row.closer === specialistFilter)
      : rows;
  }, [callSheet.rows, specialistFilter]);
  const callSheetStats = useMemo(() => summarizeCloserRows(callCloserRows), [callCloserRows]);

  const creativeStats = useMemo(() => groupPreVenda(specialistClients, (client) => getCommercialLeadOrigin({ criativo: client.criativo, funil: client.funil, creativeSource: client.creativeSource })).slice(0, 12), [specialistClients]);
  const bestCreative = useMemo(
    () => [...creativeStats].sort((a, b) => b.conversionRate - a.conversionRate || b.closed - a.closed || b.revenue - a.revenue)[0],
    [creativeStats]
  );
  const closerAnalysisClients = useMemo(() => specialistClients.filter((client) => client.stage !== 'NOVO'), [specialistClients]);
  const closerCreativeStats = useMemo(() => buildCloserCreativeStats(closerAnalysisClients), [closerAnalysisClients]);
  const bestCloserCreative = closerCreativeStats[0];
  const hourStats = useMemo(() => groupPreVenda(specialistClients, (client) => getHourLabel(getHour(client))).sort((a, b) => Number(a.name.replace(/\D/g, '') || 99) - Number(b.name.replace(/\D/g, '') || 99)), [specialistClients]);
  const turnStats = useMemo(() => groupPreVenda(specialistClients, (client) => getTurn(getHour(client))), [specialistClients]);
  const areaStats = useMemo(() => groupPreVenda(specialistClients, getArea), [specialistClients]);
  const areaHourStats = useMemo(() => groupPreVenda(specialistClients, (client) => `${getArea(client)} - ${getHourLabel(getHour(client))}`).slice(0, 12), [specialistClients]);
  const stageStats = useMemo(() => groupPreVenda(specialistClients, (client) => STAGE_LABELS[client.stage]), [specialistClients]);
  const packageStats = useMemo(() => groupPreVenda(specialistClients, (client) => readableValue(client.pacote)), [specialistClients]);
  const periodStats = useMemo(() => groupPreVenda(specialistClients, (client) => readableValue(client.periodo || client.plan || 'Nao informado')), [specialistClients]);
  const leadFunnelStats = useMemo(() => summarizePreVenda('Métricas Leads', specialistClients), [specialistClients]);
  const leadCreativeStats = useMemo(() => groupPreVenda(specialistClients, (client) => getCommercialLeadOrigin({ criativo: client.criativo, funil: client.funil, creativeSource: client.creativeSource })).slice(0, 12), [specialistClients]);
  const leadCloserHourStats = useMemo(() => buildCloserBreakdownStats(specialistScopedClients, (client) => getHourLabel(getHour(client))).slice(0, 18), [specialistScopedClients]);
  const leadCloserAreaStats = useMemo(() => buildCloserBreakdownStats(specialistScopedClients, getArea).slice(0, 18), [specialistScopedClients]);
  const perfectCloserScenarios = useMemo(() => buildPerfectCloserScenarios(specialistScopedClients), [specialistScopedClients]);
  const selectedCloserDeepDive = useMemo(() => (
    specialistFilter !== 'Todos'
      ? buildCloserDeepDiveSummary(specialistScopedClients, specialistFilter as CloserName) || {
          closer: specialistFilter as CloserName,
          total: 0,
          attended: 0,
          noShow: 0,
          closed: 0,
          revenue: 0,
          conversionRate: 0,
          ticketMedio: 0,
          bestCreative: null,
          bestHour: null,
          bestArea: null,
          bestFaturamento: null,
          bestScenario: null,
        }
      : null
  ), [specialistScopedClients, specialistFilter]);
  const callsHourStats = useMemo(() => groupPreVenda(specialistScopedClients, (client) => getHourLabel(getHour(client))).sort((a, b) => Number(a.name.replace(/\D/g, '') || 99) - Number(b.name.replace(/\D/g, '') || 99)), [specialistScopedClients]);
  const callsTurnStats = useMemo(() => groupPreVenda(specialistScopedClients, (client) => getTurn(getHour(client))), [specialistScopedClients]);
  const sellerStats = useMemo(() => (
    groupPreVenda(specialistScopedClients, (client) => normalizeCloserName(client.assignedCloser || client.vendedor) || 'Sem closer oficial')
      .sort((a, b) => compareCloserLabels(a.name, b.name))
  ), [specialistScopedClients]);
  const sellerPerformanceStats = useMemo(() => buildSellerPerformanceStats(specialistScopedClients), [specialistScopedClients]);
  const teamStats = useMemo(() => groupPreVenda(specialistClients, (client) => readableValue(client.equipe || 'Sem equipe')), [specialistClients]);
  const indicationStats = useMemo(() => groupPreVenda(specialistClients, (client) => readableValue(client.indicacao || 'Nao informado')), [specialistClients]);
  const adPayerStats = useMemo(() => groupPreVenda(specialistClients, (client) => readableValue(client.pagadorAnuncio || 'Nao informado')), [specialistClients]);
  const investIntentStats = useMemo(() => groupPreVenda(specialistClients, (client) => client.podeInvestir === 'SIM' ? 'Pode investir' : client.podeInvestir === 'NAO' ? 'Nao pode investir' : 'Nao informado'), [specialistClients]);

  const mrrStats = useMemo(() => {
    const forecastDate = filter.mode === 'all' ? new Date() : filter.date;
    const mrrDeals = specialistClients.filter((client) => client.stage === 'FECHADO' && client.isMrr);
    const entradaColetada = mrrDeals.reduce((sum, client) => sum + Number(client.mrrEntrada || client.entrada || 0), 0);
    const mrrTotalRestante = mrrDeals.reduce((sum, client) => sum + getMrrRemainingTotal(client), 0);
    const mrrPlanejadoFuturo = specialistClients.reduce(
      (sum, client) => sum + getPlannedMrrForMonth(client, forecastDate),
      0
    );
    const ticketMrr = mrrDeals.length > 0 ? (entradaColetada + mrrTotalRestante) / mrrDeals.length : 0;
    return { deals: mrrDeals.length, entradaColetada, mrrTotalRestante, mrrPlanejadoFuturo, ticketMrr };
  }, [filter.date, filter.mode, specialistClients]);

  const bestHourByConversion = useMemo(() => [...hourStats].sort((a, b) => b.conversionRate - a.conversionRate || b.closed - a.closed)[0], [hourStats]);
  const busiestHour = useMemo(() => [...hourStats].sort((a, b) => b.total - a.total)[0], [hourStats]);
  const worstHourByNoShow = useMemo(
    () => [...hourStats].sort((a, b) => b.noShow - a.noShow || b.noShowRate - a.noShowRate || b.total - a.total)[0],
    [hourStats]
  );

  const monthlyEvolution = useMemo(() => {
    const now = new Date();
    const months: {
      month: string;
      revenue: number;
      deals: number;
      avgTicket: number;
      conversionRate: number;
      revenueChange: number | null;
      ticketChange: number | null;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const rangeStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
      const rangeEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthClients = specialistClients.filter((client) => {
        const scheduleDate = getScheduleDate(client);
        const parsed = parseCalendarDate(scheduleDate);
        return !!parsed && parsed >= rangeStart && parsed <= rangeEnd;
      });
      const operationalMonthClients = monthClients.filter((client) => client.stage !== 'NOVO');
      const closedInMonth = specialistClients.filter((client) => {
        if (client.stage !== 'FECHADO') return false;
        const closeDate = client.lastStageChange ? new Date(client.lastStageChange) : null;
        return closeDate && !Number.isNaN(closeDate.getTime()) && closeDate >= rangeStart && closeDate <= rangeEnd;
      });
      const realContracts = closedInMonth.filter(isRealContract);
      const revenue = closedInMonth.reduce((sum, client) => sum + getClientRevenue(client), 0);
      const deals = realContracts.length;
      const avgTicket = deals > 0 ? realContracts.reduce((sum, client) => sum + getClientRevenue(client), 0) / deals : 0;
      const conversionRate = operationalMonthClients.length > 0 ? (deals / operationalMonthClients.length) * 100 : 0;
      const previous = months[months.length - 1];

      months.push({
        month: date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').replace(/^./, (char) => char.toUpperCase()),
        revenue,
        deals,
        avgTicket,
        conversionRate,
        revenueChange: previous && previous.revenue > 0 ? ((revenue - previous.revenue) / previous.revenue) * 100 : null,
        ticketChange: previous && previous.avgTicket > 0 ? ((avgTicket - previous.avgTicket) / previous.avgTicket) * 100 : null,
      });
    }

    return months;
  }, [specialistClients]);

  const evolutionGrowth = useMemo(() => {
    if (monthlyEvolution.length < 2) return { revenue: 0, deals: 0, avgTicket: 0 };
    const current = monthlyEvolution[monthlyEvolution.length - 1];
    const previous = monthlyEvolution[monthlyEvolution.length - 2];

    return {
      revenue: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : current.revenue > 0 ? 100 : 0,
      deals: previous.deals > 0 ? ((current.deals - previous.deals) / previous.deals) * 100 : current.deals > 0 ? 100 : 0,
      avgTicket: previous.avgTicket > 0 ? ((current.avgTicket - previous.avgTicket) / previous.avgTicket) * 100 : current.avgTicket > 0 ? 100 : 0,
    };
  }, [monthlyEvolution]);

  const evolutionConversionRate = monthlyEvolution[monthlyEvolution.length - 1]?.conversionRate || 0;
  const selectedTicketAverage = overview.closed > 0 ? overview.revenue / overview.closed : 0;

  const investmentRecommendations = useMemo(() => {
    const recommendations: { title: string; description: string; priority: 'Alta' | 'Media' | 'Info'; icon: ReactNode }[] = [];
    const bestCreative = [...creativeStats].sort((a, b) => b.revenue - a.revenue || b.closed - a.closed)[0];

    if (bestCreative) {
      recommendations.push({
        title: `Criativo com maior faturamento: "${bestCreative.name}"`,
        description: `Gerou ${formatBRL(bestCreative.revenue)} com ${bestCreative.closed} venda(s). Considere aumentar investimento nesse funil.`,
        priority: 'Alta',
        icon: <Lightbulb className="h-5 w-5 text-amber-600" />,
      });
    }

    if (overview.closed > 0) {
      recommendations.push({
        title: 'Ticket medio no recorte dos fechados',
        description: `Media de ${formatBRL(selectedTicketAverage)} considerando ${overview.closed} fechamento(s) no recorte selecionado.`,
        priority: 'Alta',
        icon: <Target className="h-5 w-5 text-emerald-600" />,
      });
    }

    if (evolutionGrowth.revenue < 0) {
      recommendations.push({
        title: 'Atencao: queda no faturamento',
        description: `Faturamento caiu ${Math.abs(evolutionGrowth.revenue).toFixed(1)}% contra o mes anterior. Revise captacao, criativos e follow-up.`,
        priority: 'Alta',
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      });
    }

    if (evolutionConversionRate < 15) {
      recommendations.push({
        title: 'Taxa de conversao baixa',
        description: `Apenas ${evolutionConversionRate.toFixed(1)}% dos leads do mes atual estao convertendo. Invista em qualificacao e melhoria de pitch.`,
        priority: 'Media',
        icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Operacao estavel',
        description: 'Nao ha alerta critico nos dados atuais. Continue monitorando criativo, ticket e comparecimento.',
        priority: 'Info',
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      });
    }

    return recommendations;
  }, [creativeStats, evolutionConversionRate, evolutionGrowth.revenue, overview.closed, selectedTicketAverage]);

  const creativeChart = creativeStats.map((item) => ({
    name: item.name,
    agendamentos: item.total,
    conversao: Number(item.conversionRate.toFixed(1)),
  }));

  const sellerPerformanceChart = sellerPerformanceStats.map((item) => ({
    name: getSpecialistDisplayName(item.closer),
    receita: item.revenue,
    fechados: item.closed,
    conversao: Number(item.conversionRate.toFixed(1)),
    melhorHorario: item.bestHour,
    melhorHorarioQtd: item.bestHourClosed,
  }));

const hourChart = hourStats.map((item) => ({
    name: item.name,
    agendamentos: item.total,
    conversao: Number(item.conversionRate.toFixed(1)),
  }));
  const callsHourChart = callsHourStats.map((item) => ({
    name: item.name,
    agendamentos: item.total,
    conversao: Number(item.conversionRate.toFixed(1)),
  }));

  return (
    <div className="space-y-7 animate-in">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Intelligence hub</p>
          <h1 className="mt-2 flex items-center gap-3 text-4xl font-black tracking-tight text-slate-950">
            <BrainCircuit className="h-8 w-8 text-primary" />
            Inteligencia Operacional
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
            Dashboards separados para métricas leads e métricas de evolução, todos alimentados pelo pipeline comercial.
          </p>
        </div>
        <RaioXFilters value={filter} onChange={setFilter} />
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-100 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="h-auto flex-wrap justify-start rounded-[1.5rem] bg-[#f4f4f5] p-1.5">
            <TabsTrigger value="overview" className="rounded-[1.1rem] px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">Visao geral</TabsTrigger>
            <TabsTrigger value="calls" className="rounded-[1.1rem] px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">Métricas Leads</TabsTrigger>
            <TabsTrigger value="evolution" className="rounded-[1.1rem] px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">Métricas de evolução</TabsTrigger>
          </TabsList>

          {activeTab === 'calls' && (
            <div className="flex flex-wrap gap-2 px-1">
              {specialistOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSpecialistFilter(option)}
                  className={specialistFilter === option
                    ? 'rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white'
                    : 'rounded-full border border-slate-100 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-950'}
                >
                  {getSpecialistDisplayName(option)}
                </button>
              ))}
            </div>
          )}
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <DashboardGrid>
            <MetricCard label="Faturamento" value={formatBRL(overview.revenue)} detail="Receita fechada no recorte" tone="success" />
            <MetricCard label="Agendamento geral" value={overviewScheduledTotal} detail={`${overviewOpenLeads} leads em aberto e ${overviewCompletedTotal} já movimentados`} />
            <MetricCard label="Agendamento concluído" value={overviewCompletedTotal} detail={`${overview.attendanceRate.toFixed(1)}% comparecimento entre os movimentados`} tone="success" />
            <MetricCard label="Conversão real" value={`${overview.conversionRate.toFixed(1)}%`} detail={`${overview.closed} contrato(s) fechado(s)`} tone="success" />
            <MetricCard label="No show" value={`${overview.noShowRate.toFixed(1)}%`} detail={`${overview.noShow} lead(s) faltaram`} tone="danger" />
          </DashboardGrid>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <StatusBreakdownCard
                title="Agendamento geral"
                value={overviewScheduledTotal}
                detail={`${overviewOpenLeads} leads em aberto no pipeline`}
                accent="info"
                items={[
                  { label: 'Novo lead', value: overviewOpenLeads },
                  { label: 'Total no pipeline', value: overviewScheduledTotal },
                ]}
              />
            </div>
            <div className="xl:col-span-2">
              <StatusBreakdownCard
                title="Agendamentos concluídos"
                value={overviewCompletedTotal}
                detail={`${overview.attendanceRate.toFixed(1)}% compareceram e ${overview.noShowRate.toFixed(1)}% faltaram`}
                accent="success"
                items={overviewStageBreakdown.map((item) => ({ label: item.label, value: item.count }))}
              />
            </div>
          </div>

          <DashboardGrid>
            <MetricCard label="MRR planejado futuro" value={formatBRL(mrrStats.mrrPlanejadoFuturo)} detail="Soma da próxima parcela de cada contrato MRR no próximo ciclo" tone="success" />
            <MetricCard label="Entrada MRR coletada" value={formatBRL(mrrStats.entradaColetada)} detail="Valor presente coletado em contratos MRR" />
            <MetricCard label="Contratos MRR fechados" value={mrrStats.deals} detail="Clientes MRR na coluna Fechado" />
            <MetricCard label="Ticket médio MRR total" value={formatBRL(mrrStats.ticketMrr)} detail="Entrada + restante dividido por contratos MRR" />
          </DashboardGrid>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.75fr]">
            <ChartPanel title="Faturamento e conversao por criativo" subtitle="Volume de leads e conversao por origem/funil." icon={<Flame className="h-5 w-5 text-primary" />}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={creativeChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="agendamentos" name="Agendamentos" radius={[8, 8, 0, 0]}>
                    {creativeChart.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                  <Bar dataKey="conversao" name="Conversao %" radius={[8, 8, 0, 0]} fill="#111827" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <Card className="rounded-[2rem] border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Insights rapidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <InsightCard label="Horario que mais converte" value={bestHourByConversion?.name || 'Sem dados'} detail={bestHourByConversion ? `${bestHourByConversion.conversionRate.toFixed(1)}% com ${bestHourByConversion.closed} fechado(s)` : 'Sem fechamentos no periodo'} />
              <InsightCard label="Horario com mais agendamento" value={busiestHour?.name || 'Sem dados'} detail={busiestHour ? `${busiestHour.total} agendamento(s)` : 'Sem agendamentos no periodo'} />
              <InsightCard label="Horario com mais No Show" value={worstHourByNoShow?.name || 'Sem dados'} detail={worstHourByNoShow ? `${worstHourByNoShow.noShow} no show (${worstHourByNoShow.noShowRate.toFixed(1)}%)` : 'Sem registros de No Show no periodo'} />
              <InsightCard label="Melhor criativo/funil" value={bestCreative?.name || 'Sem dados'} detail={bestCreative ? `${bestCreative.conversionRate.toFixed(1)}% de conversao com ${bestCreative.closed} fechado(s)` : 'Sem dados de criativo'} />
              <InsightCard label="Ticket medio no recorte" value={formatBRL(selectedTicketAverage)} detail={overview.closed > 0 ? `${overview.closed} fechamento(s) no recorte` : 'Sem fechamentos no periodo'} />
              <InsightCard label="Melhor closer x criativo" value={bestCloserCreative ? `${getSpecialistDisplayName(bestCloserCreative.closer)} x ${bestCloserCreative.creative}` : 'Sem dados'} detail={bestCloserCreative ? `${bestCloserCreative.conversionRate.toFixed(1)}% de conversao e ${formatBRL(bestCloserCreative.revenue)}` : 'Sem fechamento por closer'} />
            </CardContent>
          </Card>
          </div>

          <CloserCreativeTable rows={closerCreativeStats} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <ChartPanel
              title="Performance por vendedor"
              subtitle="Receita e quantidade de fechamentos por vendedor, com o horário em que cada um mais converte."
              icon={<BarChart3 className="h-5 w-5 text-primary" />}
            >
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={sellerPerformanceChart} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `R$ ${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip
                    formatter={(value, name, props) => {
                      if (name === 'receita') return [formatBRL(Number(value)), 'Receita'];
                      if (name === 'fechados') return [value, 'Fechamentos'];
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload as typeof sellerPerformanceChart[number] | undefined;
                      if (!item) return label;
                      if (!item.melhorHorario) return `${label} | Melhor horário: sem dados`;
                      return `${label} | Melhor horário: ${item.melhorHorario} (${item.melhorHorarioQtd} fechamentos)`;
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="right" dataKey="receita" name="Receita" radius={[8, 8, 0, 0]} fill="#16a34a">
                    {sellerPerformanceChart.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                  <Bar yAxisId="left" dataKey="fechados" name="Fechamentos" radius={[8, 8, 0, 0]} fill="#111827" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <Card className="rounded-[2rem] border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Melhor horário por vendedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sellerPerformanceChart.map((seller) => (
                  <div key={seller.name} className="rounded-[1.1rem] border border-slate-100 bg-[#f7f7f8] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{seller.name}</p>
                        <p className="text-xs text-slate-500">{seller.fechados} fechamento(s)</p>
                      </div>
                      <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                        {seller.melhorHorario || 'Sem dados'}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Receita</span>
                      <span className="font-bold text-slate-950">{formatBRL(seller.receita)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Conversão</span>
                      <span className="font-bold text-slate-950">{seller.conversao.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calls" className="mt-0 space-y-6">
          <SectionHeader title="Dashboard de Métricas Leads" subtitle="Leitura dos cards reais do pipeline: criativo/funil, comparecimento, no show, conversao, horario, area de atuacao e closer oficial." />
          <DashboardGrid>
            <MetricCard label="Agendamentos" value={leadFunnelStats.total} detail="Base do pipeline filtrado" />
            <MetricCard label="Taxa de comp." value={`${leadFunnelStats.attendanceRate.toFixed(1)}%`} detail={`${leadFunnelStats.attended} lead(s) compareceram`} tone="success" />
            <MetricCard label="Taxa de No Show" value={`${leadFunnelStats.noShowRate.toFixed(1)}%`} detail={`${leadFunnelStats.noShow} lead(s) faltaram`} tone="danger" />
            <MetricCard label="Taxa de conversao" value={`${leadFunnelStats.conversionRate.toFixed(1)}%`} detail={`${leadFunnelStats.closed} fechado(s) no pipeline`} tone="success" />
            <MetricCard label="Receita fechada" value={formatBRL(leadFunnelStats.revenue)} detail={`Ticket ${formatBRL(leadFunnelStats.closed > 0 ? leadFunnelStats.revenue / leadFunnelStats.closed : 0)}`} tone="success" />
          </DashboardGrid>

          {selectedCloserDeepDive ? (
            <CloserDeepDiveCard summary={selectedCloserDeepDive} />
          ) : null}

          <PerfectScenarioCards rows={perfectCloserScenarios} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LeadMetricTable title="Taxa de agendamento por criativo/funil" icon={<Flame className="h-5 w-5 text-primary" />} rows={leadCreativeStats} firstColumn="Criativo/funil" />
            <CloserBreakdownTable title="Taxa de conversao por horario por closer" rows={leadCloserHourStats} secondColumn="Horario" />
            <div className="xl:col-span-2">
              <CloserBreakdownTable title="Taxa de conversao por area de atuacao por closer" rows={leadCloserAreaStats} secondColumn="Area" />
            </div>
          </div>

          <SectionHeader title="Base de calls dos closers" subtitle="Apoio vindo da planilha de calls preenchida pelos closers. As taxas de leads acima continuam ligadas ao kanban." />
          <DashboardGrid>
            <MetricCard label="SE agendada" value={callSheetStats.agendada} detail={`Planilha ${callSheet.label}`} />
            <MetricCard label="SE realizada" value={callSheetStats.realizada} detail={`${toPct(callSheetStats.showUpRate)} show up`} tone="success" />
            <MetricCard label="SE + pitch" value={callSheetStats.pitch} detail={`${toPct(callSheetStats.pitchRateFromRealized)} das realizadas`} />
            <MetricCard label="Vendas" value={callSheetStats.vendas} detail={`${toPct(callSheetStats.conversionRate)} conversao`} tone="success" />
            <MetricCard label="Valor total" value={formatBRL(callSheetStats.valor)} detail={`Ticket ${formatBRL(callSheetStats.ticketMedio)}`} tone="success" />
            <MetricCard label="Cash collected" value={formatBRL(callSheetStats.primeiraParcela)} detail={`${toPct(callSheetStats.cashCollectedRate)} do valor`} />
          </DashboardGrid>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
            <CallsCloserTable rows={callCloserRows} title={`Calls por closer - ${callSheet.label}`} />
            <ChartPanel title="Conversao por horario" subtitle="Horarios literais que mais geram fechamento no pipeline filtrado." icon={<Clock className="h-5 w-5 text-primary" />}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={callsHourChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="agendamentos" name="Agendamentos" radius={[8, 8, 0, 0]} fill="#e10600" />
                  <Bar dataKey="conversao" name="Conversao %" radius={[8, 8, 0, 0]} fill="#111827" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <StatsTable title="Manha x tarde x noite" icon={<Activity className="h-5 w-5 text-primary" />} rows={callsTurnStats} firstColumn="Periodo" compact />
            <CloserCreativeConversionTable rows={closerCreativeStats.filter((row) => specialistFilter === 'Todos' || row.closer === specialistFilter)} />
          </div>
        </TabsContent>

        <TabsContent value="evolution" className="mt-0 space-y-6">
          <SectionHeader title="Métricas de evolução" subtitle="Evolução de faturamento, vendas, ticket médio, conversão e recomendações de investimento com base no pipeline." />
          <DashboardGrid>
            <MetricCard
              label="Crescimento faturamento"
              value={`${evolutionGrowth.revenue > 0 ? '+' : ''}${evolutionGrowth.revenue.toFixed(1)}%`}
              detail="Comparado ao mês anterior"
              tone={evolutionGrowth.revenue >= 0 ? 'success' : 'danger'}
            />
            <MetricCard
              label="Crescimento vendas"
              value={`${evolutionGrowth.deals > 0 ? '+' : ''}${evolutionGrowth.deals.toFixed(1)}%`}
              detail="Contratos reais mês contra mês"
              tone={evolutionGrowth.deals >= 0 ? 'success' : 'danger'}
            />
            <MetricCard
              label="Var. ticket médio"
              value={`${evolutionGrowth.avgTicket > 0 ? '+' : ''}${evolutionGrowth.avgTicket.toFixed(1)}%`}
              detail="Ticket médio dos contratos reais"
              tone={evolutionGrowth.avgTicket >= 0 ? 'success' : 'danger'}
            />
            <MetricCard
              label="Taxa de conversão"
              value={`${evolutionConversionRate.toFixed(1)}%`}
              detail="Mês atual: fechados / leads"
              tone={evolutionConversionRate >= 15 ? 'success' : 'danger'}
            />
          </DashboardGrid>

          <ChartPanel title="Evolução mensal" subtitle="Faturamento e número de vendas mês a mês." icon={<TrendingUp className="h-5 w-5 text-primary" />}>
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={monthlyEvolution}>
                <defs>
                  <linearGradient id="evolutionRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => name === 'Faturamento' ? formatBRL(Number(value)) : value} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Faturamento" stroke="#22c55e" strokeWidth={2} fill="url(#evolutionRevenue)" />
                <Bar yAxisId="right" dataKey="deals" name="Vendas" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Evolução do ticket médio" subtitle="Valor médio por venda mês a mês." icon={<DollarSign className="h-5 w-5 text-primary" />}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${(Number(value) / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(value) => formatBRL(Number(value))} />
                <Line type="monotone" dataKey="avgTicket" name="Ticket médio" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 5 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
                <Lightbulb className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Onde investir</h2>
                <p className="text-sm font-medium text-slate-500">Recomendações baseadas nos dados reais do pipeline.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {investmentRecommendations.map((rec) => (
                <Card key={rec.title} className="rounded-[1.5rem] border-l-4 border-l-primary border-slate-100 shadow-sm">
                  <CardContent className="flex gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                      {rec.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-950">{rec.title}</h3>
                        <Badge variant="outline" className={rec.priority === 'Alta' ? 'border-amber-300 text-amber-700' : rec.priority === 'Média' ? 'border-red-300 text-red-700' : 'border-emerald-300 text-emerald-700'}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{rec.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

type CloserCreativeStats = {
  key: string;
  closer: CloserName;
  creative: string;
  total: number;
  closed: number;
  revenue: number;
  conversionRate: number;
  ticketMedio: number;
};

type CloserBreakdownStats = PreVendaGroupStats & {
  key: string;
  closer: CloserName;
  segment: string;
};

type PerfectCloserScenario = {
  closer: CloserName;
  area: string;
  faturamento: string;
  hour: string;
  total: number;
  closed: number;
  revenue: number;
  conversionRate: number;
  noShow: number;
  noShowRate: number;
};

type CloserDeepDiveSummary = {
  closer: CloserName;
  total: number;
  attended: number;
  noShow: number;
  closed: number;
  revenue: number;
  conversionRate: number;
  ticketMedio: number;
  bestCreative: PreVendaGroupStats | null;
  bestHour: PreVendaGroupStats | null;
  bestArea: PreVendaGroupStats | null;
  bestFaturamento: PreVendaGroupStats | null;
  bestScenario: PerfectCloserScenario | null;
};

type SellerPerformanceStats = {
  closer: CloserName;
  total: number;
  closed: number;
  revenue: number;
  conversionRate: number;
  bestHour: string | null;
  bestHourClosed: number;
};

function buildCloserBreakdownStats(clients: PipelineClient[], getSegment: (client: PipelineClient) => string): CloserBreakdownStats[] {
  const grouped = new Map<string, PipelineClient[]>();

  clients.forEach((client) => {
    const closer = normalizeCloserName(client.assignedCloser || client.vendedor);
    if (!closer) return;

    const segment = readableValue(getSegment(client) || 'Nao informado');
    const key = `${closer}__${segment}`;
    grouped.set(key, [...(grouped.get(key) || []), client]);
  });

  return Array.from(grouped.entries())
    .map(([key, rows]) => {
      const closer = normalizeCloserName(rows[0]?.assignedCloser || rows[0]?.vendedor) as CloserName;
      const segment = key.split('__')[1] || 'Nao informado';
      return {
        ...summarizePreVenda(segment, rows, clients.length),
        key,
        closer,
        segment,
      };
    })
    .sort((a, b) => compareCloserLabels(a.closer, b.closer) || b.conversionRate - a.conversionRate || b.closed - a.closed || b.revenue - a.revenue || b.total - a.total);
  }

function buildPerfectCloserScenarios(clients: PipelineClient[]): PerfectCloserScenario[] {
  const byCloser = new Map<CloserName, PipelineClient[]>();

  clients.forEach((client) => {
    const closer = normalizeCloserName(client.assignedCloser || client.vendedor);
    if (!closer) return;
    byCloser.set(closer, [...(byCloser.get(closer) || []), client]);
  });

  return Array.from(byCloser.entries())
    .map(([closer, closerClients]) => {
      const grouped = new Map<string, PipelineClient[]>();

      closerClients.forEach((client) => {
        const area = getArea(client);
        const faturamento = readableFaturamento(client.faturamento);
        const hour = getHourLabel(getHour(client));
        const key = `${area}__${faturamento}__${hour}`;
        grouped.set(key, [...(grouped.get(key) || []), client]);
      });

      const scenarios = Array.from(grouped.entries()).map(([key, rows]) => {
        const [area, faturamento, hour] = key.split('__');
        const closedRows = rows.filter((client) => client.stage === 'FECHADO');
        const noShowRows = rows.filter((client) => client.stage === 'NO_SHOW');
        const noShowBaseRows = rows.filter((client) => client.stage !== 'FECHADO');
        const revenue = closedRows.reduce((total, client) => total + getClientRevenue(client), 0);

        return {
          closer,
          area,
          faturamento,
          hour,
          total: rows.length,
          closed: closedRows.length,
          revenue,
          conversionRate: safeRate(closedRows.length, rows.length) * 100,
          noShow: noShowRows.length,
          noShowRate: safeRate(noShowRows.length, noShowBaseRows.length) * 100,
        };
      });

      return scenarios.sort(
        (a, b) =>
          b.conversionRate - a.conversionRate ||
          a.noShowRate - b.noShowRate ||
          b.closed - a.closed ||
          b.revenue - a.revenue ||
          b.total - a.total
      )[0];
    })
      .filter((scenario): scenario is PerfectCloserScenario => Boolean(scenario))
      .sort((a, b) => compareCloserLabels(a.closer, b.closer));
  }

function buildCloserCreativeStats(clients: PipelineClient[]): CloserCreativeStats[] {
  const grouped = new Map<string, PipelineClient[]>();

  clients.forEach((client) => {
    const closer = normalizeCloserName(client.assignedCloser || client.vendedor);
    if (!closer) return;

    const creative = readableValue(getCommercialLeadOrigin({ criativo: client.criativo, funil: client.funil, creativeSource: client.creativeSource }));
    const key = `${closer}__${creative}`;
    grouped.set(key, [...(grouped.get(key) || []), client]);
  });

  return Array.from(grouped.entries())
    .map(([key, rows]) => {
      const closedRows = rows.filter((client) => client.stage === 'FECHADO');
      const revenue = closedRows.reduce((total, client) => total + getClientRevenue(client), 0);

      return {
        key,
        closer: normalizeCloserName(rows[0]?.assignedCloser || rows[0]?.vendedor) as CloserName,
        creative: readableValue(getCommercialLeadOrigin({ criativo: rows[0]?.criativo, funil: rows[0]?.funil, creativeSource: rows[0]?.creativeSource })),
        total: rows.length,
        closed: closedRows.length,
        revenue,
        conversionRate: safeRate(closedRows.length, rows.length) * 100,
        ticketMedio: closedRows.length > 0 ? revenue / closedRows.length : 0,
      };
    })
    .sort((a, b) => compareCloserLabels(a.closer, b.closer) || b.conversionRate - a.conversionRate || b.closed - a.closed || b.revenue - a.revenue || b.total - a.total);
  }

function buildCloserDeepDiveSummary(clients: PipelineClient[], closer: CloserName): CloserDeepDiveSummary | null {
  const closerClients = clients.filter((client) => normalizeCloserName(client.assignedCloser || client.vendedor) === closer && client.stage !== 'NOVO');

  if (closerClients.length === 0) return null;

  const closedClients = closerClients.filter((client) => client.stage === 'FECHADO');
  const noShowBaseClients = closerClients.filter((client) => client.stage !== 'FECHADO');
  const revenue = closedClients.reduce((sum, client) => sum + getClientRevenue(client), 0);

  const grouped = new Map<string, PipelineClient[]>();
  closerClients.forEach((client) => {
    const area = getArea(client);
    const faturamento = readableFaturamento(client.faturamento);
    const hour = getHourLabel(getHour(client));
    const key = `${area}__${faturamento}__${hour}`;
    grouped.set(key, [...(grouped.get(key) || []), client]);
  });

  const scenarioEntries = Array.from(grouped.entries()).map(([key, rows]) => {
    const [area, faturamento, hour] = key.split('__');
    const closedRows = rows.filter((client) => client.stage === 'FECHADO');
    const scenarioRevenue = closedRows.reduce((sum, client) => sum + getClientRevenue(client), 0);

    return {
      key,
      rows,
      scenario: {
        closer,
        area,
        faturamento,
        hour,
        total: rows.length,
        closed: closedRows.length,
        revenue: scenarioRevenue,
        conversionRate: safeRate(closedRows.length, rows.length) * 100,
      } satisfies PerfectCloserScenario,
    };
  });

  const bestScenarioEntry = scenarioEntries.sort(
    (a, b) =>
      b.scenario.conversionRate - a.scenario.conversionRate ||
      a.scenario.noShowRate - b.scenario.noShowRate ||
      b.scenario.closed - a.scenario.closed ||
      b.scenario.revenue - a.scenario.revenue ||
      b.scenario.total - a.scenario.total
  )[0] || null;
  const bestScenarioRows = bestScenarioEntry?.rows || [];
  const bestScenario = bestScenarioEntry?.scenario || null;
  const bestCreative = bestScenarioRows.length > 0 ? groupPreVenda(bestScenarioRows, (client) => getCommercialLeadOrigin({ criativo: client.criativo, funil: client.funil, creativeSource: client.creativeSource }))[0] || null : null;
  const bestHour = bestScenarioRows.length > 0 ? groupPreVenda(bestScenarioRows, (client) => getHourLabel(getHour(client)))[0] || null : null;
  const bestArea = bestScenarioRows.length > 0 ? groupPreVenda(bestScenarioRows, getArea)[0] || null : null;
  const bestFaturamento = bestScenarioRows.length > 0 ? groupPreVenda(bestScenarioRows, (client) => readableFaturamento(client.faturamento))[0] || null : null;

  return {
    closer,
    total: closerClients.length,
    attended: noShowBaseClients.filter((client) => client.stage !== 'NO_SHOW').length,
    noShow: closerClients.filter((client) => client.stage === 'NO_SHOW').length,
    closed: closedClients.length,
    revenue,
    conversionRate: safeRate(closedClients.length, closerClients.length) * 100,
    ticketMedio: closedClients.length > 0 ? revenue / closedClients.length : 0,
    bestCreative,
    bestHour,
    bestArea,
    bestFaturamento,
    bestScenario,
  };
}

function buildSellerPerformanceStats(clients: PipelineClient[]): SellerPerformanceStats[] {
  const grouped = new Map<CloserName, PipelineClient[]>();

  clients.forEach((client) => {
    const closer = normalizeCloserName(client.assignedCloser || client.vendedor);
    if (!closer) return;
    grouped.set(closer, [...(grouped.get(closer) || []), client]);
  });

  return Array.from(grouped.entries())
    .map(([closer, closerClients]) => {
      const closedClients = closerClients.filter((client) => client.stage === 'FECHADO');
      const revenue = closedClients.reduce((sum, client) => sum + getClientRevenue(client), 0);

      const closedHourGrouped = new Map<string, PipelineClient[]>();
      closedClients.forEach((client) => {
        const hour = getHourLabel(getHour(client));
        if (hour === 'Sem horario') return;
        closedHourGrouped.set(hour, [...(closedHourGrouped.get(hour) || []), client]);
      });

      const bestHourEntry = Array.from(closedHourGrouped.entries())
        .map(([hour, rows]) => {
          const revenueRows = rows.reduce((sum, client) => sum + getClientRevenue(client), 0);
          return {
            hour,
            closed: rows.length,
            revenue: revenueRows,
            total: rows.length,
          };
        })
        .sort((a, b) => b.closed - a.closed || b.revenue - a.revenue || b.total - a.total)[0];

      return {
        closer,
        total: closerClients.length,
        closed: closedClients.length,
        revenue,
        conversionRate: safeRate(closedClients.length, closerClients.length) * 100,
        bestHour: bestHourEntry?.hour || null,
        bestHourClosed: bestHourEntry?.closed || 0,
      };
    })
    .sort((a, b) => compareCloserLabels(a.closer, b.closer));
}

function DashboardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">{children}</div>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">{subtitle}</p>
    </div>
  );
}

function toPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildCallsFromEditableSheet(logs: Array<{
  date: string;
  closer: string;
  agendada: number;
  realizada: number;
  pitch: number;
  vendas: number;
  valor: number;
  primeiraParcela: number;
}>, filter: RaioXFilterState) {
  const filteredLogs = logs.filter((log) => filterClientByRaioX(log.date, filter));
  const rows = CLOSERS_FROM_CALLS_SHEET.map((closer) => {
    const closerLogs = filteredLogs.filter((log) => log.closer === closer);
    return normalizeCallMetrics({
      closer,
      agendada: sum(closerLogs, 'agendada'),
      realizada: sum(closerLogs, 'realizada'),
      pitch: sum(closerLogs, 'pitch'),
      vendas: sum(closerLogs, 'vendas'),
      valor: sum(closerLogs, 'valor'),
      primeiraParcela: sum(closerLogs, 'primeiraParcela'),
      showUpRate: 0,
      pitchRateFromRealized: 0,
      salesPerPitchRate: 0,
      ticketMedio: 0,
      cashCollectedRate: 0,
      conversionRate: 0,
    });
  });

  return {
    label: getCallSheetLabel(filter),
    rows,
  };
}

function summarizeCloserRows(rows: CloserCallMetrics[]): CloserCallMetrics {
  return normalizeCallMetrics({
    closer: 'TOTAL',
    agendada: rows.reduce((sum, row) => sum + row.agendada, 0),
    realizada: rows.reduce((sum, row) => sum + row.realizada, 0),
    pitch: rows.reduce((sum, row) => sum + row.pitch, 0),
    vendas: rows.reduce((sum, row) => sum + row.vendas, 0),
    valor: rows.reduce((sum, row) => sum + row.valor, 0),
    primeiraParcela: rows.reduce((sum, row) => sum + row.primeiraParcela, 0),
    showUpRate: 0,
    pitchRateFromRealized: 0,
    salesPerPitchRate: 0,
    ticketMedio: 0,
    cashCollectedRate: 0,
    conversionRate: 0,
  });
}

function normalizeCallMetrics(row: CloserCallMetrics): CloserCallMetrics {
  return {
    ...row,
    showUpRate: safeRate(row.realizada, row.agendada),
    pitchRateFromRealized: safeRate(row.pitch, row.realizada),
    salesPerPitchRate: safeRate(row.vendas, row.pitch),
    ticketMedio: row.vendas > 0 ? row.valor / row.vendas : 0,
    cashCollectedRate: safeRate(row.primeiraParcela, row.valor),
    conversionRate: safeRate(row.vendas, row.realizada),
  };
}

function sum<T extends Record<string, unknown>>(items: T[], key: keyof T) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function safeRate(part: number, total: number) {
  return total > 0 ? part / total : 0;
}

function compareCloserLabels(a: string, b: string) {
  const rankA = getCloserRank(a);
  const rankB = getCloserRank(b);
  if (rankA !== rankB) return rankA - rankB;
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function getCloserRank(value: string) {
  const closer = normalizeCloserName(value);
  return closer ? (CLOSER_ORDER.get(closer) ?? Number.MAX_SAFE_INTEGER - 1) : Number.MAX_SAFE_INTEGER;
}

function getCallSheetLabel(filter: RaioXFilterState) {
  if (filter.mode === 'all') return 'Planilha Raio X closer';
  if (filter.mode === 'month') {
    return filter.date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (char) => char.toUpperCase());
  }
  if (filter.mode === 'week') return 'Semana filtrada';
  return filter.date.toLocaleDateString('pt-BR');
}

function readableValue(value?: string | null) {
  if (!value) return 'Nao informado';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readableFaturamento(value?: string) {
  const labels: Record<string, string> = {
    '0_A_10K': 'R$ 0 até R$ 10 mil',
    '10K_A_20K': 'R$ 10 mil até R$ 20 mil',
    '20K_A_30K': 'R$ 20 mil até R$ 30 mil',
    '30K_A_50K': 'R$ 30 mil até R$ 50 mil',
    '50K_A_80K': 'R$ 50 mil até R$ 80 mil',
    '80K_A_100K': 'R$ 80 mil até R$ 100 mil',
    '100K_A_150K': 'R$ 100 mil até R$ 150 mil',
    '150K_A_250K': 'R$ 150 mil até R$ 250 mil',
    '250K_A_400K': 'R$ 250 mil até R$ 400 mil',
    '400K_A_600K': 'R$ 400 mil até R$ 600 mil',
    '600K_A_1M': 'R$ 600 mil até R$ 1 milhão',
    '1M_PLUS': 'Mais de R$ 1 milhão',
    'NAO_INFORMADO': 'Faturamento nao informado',
  };

  return labels[value || ''] || readableValue(value || 'Nao informado');
}

function getMrrPlanMonths(client: PipelineClient) {
  const plan = client.periodo || client.plan;

  if (plan === 'MENSAL') return 1;
  if (plan === 'TRIMESTRAL') return 3;
  if (plan === 'SEMESTRAL') return 6;

  return 0;
}

function getMrrRemainingTotal(client: PipelineClient) {
  const explicitRemaining = Number(client.mrrRemaining || 0);
  if (explicitRemaining > 0) return explicitRemaining;

  const dealValue = Number(client.dealValue || client.entrada || 0);
  const entryValue = Number(client.mrrEntrada || client.entrada || 0);
  return Math.max(dealValue - entryValue, 0);
}

function getPlannedMrrForMonth(client: PipelineClient, targetDate: Date) {
  if (!client.isMrr || client.stage !== 'FECHADO') return 0;

  const startDate = getMrrStartDate(client);
  if (!startDate) return 0;

  const remainingInstallments = Math.max(getMrrPlanMonths(client) - 1, 0);
  if (remainingInstallments <= 0) return 0;

  const projectionDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);
  const dueOffset = getMonthOffset(startDate, projectionDate);
  if (dueOffset < 1 || dueOffset > remainingInstallments) return 0;

  const remainingTotal = getMrrRemainingTotal(client);
  return remainingTotal / remainingInstallments;
}

function getMrrStartDate(client: PipelineClient) {
  const raw = client.lastStageChange || client.dataEntrada || client.entryDate || client.createdAt || null;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthOffset(startDate: Date, targetDate: Date) {
  return (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
}

function getNextCycleMrrValue(client: PipelineClient) {
  const remainingInstallments = Math.max(getMrrPlanMonths(client) - 1, 0);
  if (remainingInstallments <= 0) return 0;

  const remainingTotal = getMrrRemainingTotal(client);
  return remainingTotal / remainingInstallments;
}

function MetricCard({ label, value, detail, tone = 'default' }: { label: string; value: ReactNode; detail: string; tone?: 'default' | 'success' | 'danger' }) {
  const toneClass = tone === 'success'
    ? 'border-emerald-100 bg-emerald-50/60'
    : tone === 'danger'
      ? 'border-red-100 bg-red-50/70'
      : 'border-slate-100 bg-white';

  return (
    <div className={`rounded-[1.6rem] border p-5 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{detail}</p>
    </div>
  );
}

function StatusBreakdownCard({
  title,
  value,
  detail,
  items,
  accent,
}: {
  title: string;
  value: number;
  detail: string;
  items: { label: string; value: number }[];
  accent: 'info' | 'success';
}) {
  const accentClass = accent === 'success'
    ? 'border-emerald-100 bg-emerald-50/60'
    : 'border-slate-100 bg-white';

  return (
    <Card className={`rounded-[1.6rem] border p-5 shadow-sm ${accentClass}`}>
      <CardHeader className="p-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-slate-500">{detail}</p>
      </CardHeader>
      <CardContent className="mt-4 space-y-4 p-0 xl:space-y-0">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="rounded-[1.3rem] border border-slate-100 bg-white p-4 xl:min-w-[190px] xl:max-w-[220px]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Total</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="min-w-0 rounded-[1.1rem] border border-slate-100 bg-[#f7f7f8] p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{item.value}</p>
            </div>
          ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-[#f7f7f8] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function ChartPanel({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">{icon}{title}</CardTitle>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PerfectScenarioCards({ rows }: { rows: PerfectCloserScenario[] }) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Cenário perfeito por closer
        </CardTitle>
        <p className="text-sm text-slate-500">
          Melhor combinação real encontrada no pipeline: área de atuação, faixa de faturamento e horário com maior conversão por closer.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 p-6 text-center text-sm font-medium text-slate-500">
            Sem dados suficientes no pipeline para identificar cenários perfeitos por closer.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <div key={row.closer} className="rounded-[1.5rem] border border-slate-100 bg-[#f7f7f8] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{getSpecialistDisplayName(row.closer)}</p>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {row.conversionRate.toFixed(1)}%
                  </Badge>
                </div>
                <p className="mt-3 text-lg font-black leading-snug text-slate-950">
                  {row.area} • {row.faturamento} • {row.hour}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {row.closed} fechado(s) em {row.total} lead(s), {row.noShow} no show(s), gerando {formatBRL(row.revenue)}.
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CloserDeepDiveCard({ summary }: { summary: CloserDeepDiveSummary }) {
  const cards = [
    { label: 'Agendamentos', value: summary.total.toString() },
    { label: 'Comparecimento', value: `${summary.attended} (${((summary.attended / Math.max(summary.total, 1)) * 100).toFixed(1)}%)` },
    { label: 'No show', value: `${summary.noShow} (${((summary.noShow / Math.max(summary.total, 1)) * 100).toFixed(1)}%)` },
    { label: 'Fechados', value: summary.closed.toString() },
    { label: 'Conversao', value: `${summary.conversionRate.toFixed(1)}%` },
    { label: 'Receita gerada', value: formatBRL(summary.revenue) },
    { label: 'Ticket medio', value: formatBRL(summary.ticketMedio) },
  ];

  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Resumo geral do closer filtrado
        </CardTitle>
        <p className="text-sm text-slate-500">
          Visao consolidada do closer com horario, area, criativo e faixa de faturamento com melhor performance no recorte atual.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div key={card.label} className="rounded-[1.4rem] border border-slate-100 bg-[#f7f7f8] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{card.label}</p>
              <p className="mt-2 text-xl font-black text-slate-950">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{getSpecialistDisplayName(summary.closer)}</p>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                {summary.conversionRate.toFixed(1)}%
              </Badge>
            </div>
            <p className="mt-3 text-lg font-black leading-snug text-slate-950">
              {summary.bestScenario ? `${summary.bestScenario.area} • ${summary.bestScenario.faturamento} • ${summary.bestScenario.hour}` : 'Sem dados suficientes'}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {summary.bestScenario
                ? `${summary.bestScenario.closed} fechado(s) em ${summary.bestScenario.total} lead(s), ${summary.bestScenario.noShow} no show(s), gerando ${formatBRL(summary.bestScenario.revenue)}.`
                : 'Nao foi possivel identificar o melhor cenario para este closer no periodo selecionado.'}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Melhor horario</p>
                <p className="mt-1 text-base font-black text-slate-950">{summary.bestHour?.name || 'Sem dados'}</p>
              </div>
              <div className="rounded-[1rem] border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Melhor area</p>
                <p className="mt-1 text-base font-black text-slate-950">{summary.bestArea?.name || 'Sem dados'}</p>
              </div>
              <div className="rounded-[1rem] border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Melhor criativo</p>
                <p className="mt-1 text-base font-black text-slate-950">{summary.bestCreative?.name || 'Sem dados'}</p>
              </div>
              <div className="rounded-[1rem] border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Melhor faturamento</p>
                <p className="mt-1 text-base font-black text-slate-950">{summary.bestFaturamento?.name || 'Sem dados'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InsightCard
              label="Melhor horario"
              value={summary.bestHour?.name || 'Sem dados'}
              detail={summary.bestHour ? `${summary.bestHour.conversionRate.toFixed(1)}% de conversao e ${summary.bestHour.revenue > 0 ? formatBRL(summary.bestHour.revenue) : 'R$ 0,00'}` : 'Sem horario dominante'}
            />
            <InsightCard
              label="Melhor area"
              value={summary.bestArea?.name || 'Sem dados'}
              detail={summary.bestArea ? `${summary.bestArea.closed} fechado(s) em ${summary.bestArea.total} lead(s)` : 'Sem area dominante'}
            />
            <InsightCard
              label="Melhor criativo"
              value={summary.bestCreative?.name || 'Sem dados'}
              detail={summary.bestCreative ? `${summary.bestCreative.closed} fechado(s) e ${formatBRL(summary.bestCreative.revenue)}` : 'Sem criativo dominante'}
            />
            <InsightCard
              label="Melhor faturamento"
              value={summary.bestFaturamento?.name || 'Sem dados'}
              detail={summary.bestFaturamento ? `${summary.bestFaturamento.closed} fechado(s) e ${summary.bestFaturamento.conversionRate.toFixed(1)}% de conversao` : 'Sem faixa dominante'}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadMetricTable({ title, icon, rows, firstColumn }: { title: string; icon: ReactNode; rows: PreVendaGroupStats[]; firstColumn: string }) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">{icon}{title}</CardTitle>
        <p className="text-sm text-slate-500">Agendamento, comparecimento, no show, conversão e receita por origem/funil.</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{firstColumn}</TableHead>
              <TableHead className="text-center">Agend.</TableHead>
              <TableHead className="text-center">Agend. %</TableHead>
              <TableHead className="text-center">Comp.</TableHead>
              <TableHead className="text-center">No show</TableHead>
              <TableHead className="text-center">Conv.</TableHead>
              <TableHead className="text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sem dados para o periodo selecionado.</TableCell></TableRow>
            ) : rows.map((item) => (
              <TableRow key={item.name}>
                <TableCell className="max-w-[260px] truncate font-semibold text-slate-900">{item.name}</TableCell>
                <TableCell className="text-center">{item.total}</TableCell>
                <TableCell className="text-center">{item.scheduledRate.toFixed(1)}%</TableCell>
                <TableCell className="text-center">{item.attendanceRate.toFixed(1)}%</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">{item.noShowRate.toFixed(1)}%</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{item.conversionRate.toFixed(1)}%</Badge>
                </TableCell>
                <TableCell className="text-right font-bold">{formatBRL(item.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CloserBreakdownTable({ title, rows, secondColumn }: { title: string; rows: CloserBreakdownStats[]; secondColumn: string }) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Closer</TableHead>
              <TableHead>{secondColumn}</TableHead>
              <TableHead className="text-center">Agend.</TableHead>
              <TableHead className="text-center">Comp.</TableHead>
              <TableHead className="text-center">No show</TableHead>
              <TableHead className="text-center">Conv.</TableHead>
              <TableHead className="text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sem dados para o periodo selecionado.</TableCell></TableRow>
            ) : rows.map((item) => (
              <TableRow key={item.key}>
                <TableCell className="font-bold text-slate-950">{getSpecialistDisplayName(item.closer)}</TableCell>
                <TableCell className="max-w-[220px] truncate font-semibold text-slate-800">{item.segment}</TableCell>
                <TableCell className="text-center">{item.total}</TableCell>
                <TableCell className="text-center">{item.attendanceRate.toFixed(1)}%</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">{item.noShowRate.toFixed(1)}%</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{item.conversionRate.toFixed(1)}%</Badge>
                </TableCell>
                <TableCell className="text-right font-bold">{formatBRL(item.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CloserCreativeConversionTable({ rows }: { rows: CloserCreativeStats[] }) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="h-5 w-5 text-primary" />
          Conversão do closer por criativo
        </CardTitle>
        <p className="text-sm text-slate-500">
          Cruzamento do pipeline filtrado: closer oficial, criativo/funil, leads, fechados e receita.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Closer</TableHead>
              <TableHead>Criativo/funil</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead className="text-center">Fechados</TableHead>
              <TableHead className="text-center">Conv.</TableHead>
              <TableHead className="text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Sem dados de closer por criativo no periodo selecionado.
                </TableCell>
              </TableRow>
            ) : rows.slice(0, 8).map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-bold text-slate-950">{getSpecialistDisplayName(row.closer)}</TableCell>
                <TableCell className="max-w-[240px] truncate font-semibold text-slate-800">{row.creative}</TableCell>
                <TableCell className="text-center">{row.total}</TableCell>
                <TableCell className="text-center font-bold text-emerald-700">{row.closed}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {row.conversionRate.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold">{formatBRL(row.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StatsTable({ title, icon, rows, firstColumn, compact = false }: { title: string; icon: ReactNode; rows: PreVendaGroupStats[]; firstColumn: string; compact?: boolean }) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className="flex items-center gap-2 text-lg">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{firstColumn}</TableHead>
              <TableHead className="text-center">Agend.</TableHead>
              {!compact && <TableHead className="text-center">Comp.</TableHead>}
              <TableHead className="text-center">Conv.</TableHead>
              <TableHead className="text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={compact ? 4 : 5} className="py-8 text-center text-muted-foreground">Sem dados para o periodo selecionado.</TableCell></TableRow>
            ) : rows.map((item) => (
              <TableRow key={item.name}>
                <TableCell className="max-w-[240px] truncate font-semibold text-slate-900">{item.name}</TableCell>
                <TableCell className="text-center">{item.total}</TableCell>
                {!compact && <TableCell className="text-center">{item.attendanceRate.toFixed(1)}%</TableCell>}
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{item.conversionRate.toFixed(1)}%</Badge>
                </TableCell>
                <TableCell className="text-right font-bold">{formatBRL(item.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CloserCreativeTable({ rows }: { rows: CloserCreativeStats[] }) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Criativo/funil que mais converte por closer
        </CardTitle>
        <p className="text-sm text-slate-500">
          Leitura 100% baseada nos cards do pipeline filtrado: closer atribuido, criativo/funil e coluna Fechado.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Closer</TableHead>
              <TableHead>Criativo/funil</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead className="text-center">Fechados</TableHead>
              <TableHead className="text-center">Conversao</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Ticket medio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Sem dados suficientes no pipeline para cruzar closer com criativo/funil.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-bold text-slate-950">{getSpecialistDisplayName(row.closer)}</TableCell>
                  <TableCell className="max-w-[320px] truncate font-semibold text-slate-800">{row.creative}</TableCell>
                  <TableCell className="text-center">{row.total}</TableCell>
                  <TableCell className="text-center font-bold text-emerald-700">{row.closed}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      {row.conversionRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatBRL(row.revenue)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(row.ticketMedio)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CallsCloserTable({ rows, title }: { rows: CloserCallMetrics[]; title: string }) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Closer</TableHead>
              <TableHead className="text-center">Agend.</TableHead>
              <TableHead className="text-center">Realiz.</TableHead>
              <TableHead className="text-center">Pitch</TableHead>
              <TableHead className="text-center">Vendas</TableHead>
              <TableHead className="text-center">Conv.</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.closer}>
                <TableCell className="font-semibold text-slate-900">{getSpecialistDisplayName(row.closer)}</TableCell>
                <TableCell className="text-center">{row.agendada}</TableCell>
                <TableCell className="text-center">{row.realizada}</TableCell>
                <TableCell className="text-center">{row.pitch}</TableCell>
                <TableCell className="text-center font-bold text-emerald-700">{row.vendas}</TableCell>
                <TableCell className="text-center"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{toPct(row.conversionRate)}</Badge></TableCell>
                <TableCell className="text-right font-bold">{formatBRL(row.valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

