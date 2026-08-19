import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCommercial, PERIODO_OPTIONS, Periodo, type PipelineClient } from '@/contexts/CommercialContext';
import { KPICard } from '@/components/dashboard/KPICard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Target, 
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import { cn, formatBRL, formatBRLShort } from '@/lib/utils';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from '@/components/comercial/PeriodFilter';
import { getCommercialLeadOrigin } from '@/lib/commercialOrigin';
import { getHour } from '@/lib/preVendaAnalytics';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const CATEGORY_COLORS: Record<string, string> = {
  'MENSAL': '#3b82f6',
  'TRIMESTRAL': '#22c55e',
  'SEMESTRAL': '#f59e0b',
  'TAXA_INTERESSE': '#8b5cf6',
};

type CreativePerformanceRow = {
  name: string;
  appointments: number;
  sales: number;
  revenue: number;
  conversionRate: number;
};

function getCreativeLabel(value?: string) {
  return value?.trim() || 'Desconhecido';
}

function getCreativeRevenue(client: PipelineClient) {
  if (client.isMrr) {
    return Number(client.mrrEntrada || client.entrada || client.dealValue || 0) + Number(client.mrrRemaining || 0);
  }

  return Number(client.entrada || client.dealValue || 0);
}

function getScheduledDate(client: PipelineClient) {
  return client.meetingDate || (client as any).agenda_event_date || null;
}

function getScheduledVia(value?: string | null) {
  return String(value || '').trim().toUpperCase();
}

export default function ComercialDashboards() {
  const { pipelineClients, currentGoal, getGoalStats, getPipelineStats } = useCommercial();

  // Period filter state
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>('current_month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [selectedCreative, setSelectedCreative] = useState<string>('all');
  const { filterByPeriod } = usePeriodFilter();

  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const goalValue = currentGoal?.goalValue || 0;
  const stats = getGoalStats();
  const pipelineStats = getPipelineStats();

  // Filter closed clients by selected period - use lastStageChange to determine when deal was closed
  const filteredClosedClients = useMemo(() => {
    return pipelineClients.filter(c => {
      if (c.stage !== 'FECHADO') return false;
      const closeDate = c.lastStageChange || null;
      return filterByPeriod(closeDate, periodFilter, customStart, customEnd);
    });
  }, [pipelineClients, periodFilter, customStart, customEnd, filterByPeriod]);

  const scheduledClientsInPeriod = useMemo(() => {
    return pipelineClients.filter((client) => {
      const scheduleDate = getScheduledDate(client);
      if (!scheduleDate) return false;
      return filterByPeriod(scheduleDate, periodFilter, customStart, customEnd);
    });
  }, [customEnd, customStart, filterByPeriod, periodFilter, pipelineClients]);

  const schedulingOriginStats = useMemo(() => {
    const counts = scheduledClientsInPeriod.reduce((acc, client) => {
      const via = getScheduledVia(client.agendadoVia);
      if (via === 'LIGACAO' || via === 'MENSAGEM') {
        acc[via] += 1;
      }
      return acc;
    }, { LIGACAO: 0, MENSAGEM: 0 });

    const total = counts.LIGACAO + counts.MENSAGEM;
    return {
      callCount: counts.LIGACAO,
      messageCount: counts.MENSAGEM,
    };
  }, [scheduledClientsInPeriod]);

  const busiestHour = useMemo(() => {
    const hourCounts = scheduledClientsInPeriod.reduce((acc, client) => {
      const hour = getHour(client);
      if (hour === null || Number.isNaN(hour)) return acc;
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const topHour = Object.entries(hourCounts)
      .map(([hour, total]) => ({ hour: Number(hour), total }))
      .sort((a, b) => b.total - a.total || a.hour - b.hour)[0] || null;

    return topHour;
  }, [scheduledClientsInPeriod]);



  // Dados filtrados por período - vendas fechadas
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const closedClients = filteredClosedClients;

    const totalRevenue = closedClients.reduce((sum, c) => sum + (c.entrada || c.dealValue || 0), 0);
    const avgTicket = closedClients.length > 0 ? totalRevenue / closedClients.length : 0;

    // Vendas por categoria/período
    const byCategory = PERIODO_OPTIONS.reduce((acc, option) => {
      const deals = closedClients.filter(c => c.periodo === option.value);
      acc[option.value] = {
        count: deals.length,
        value: deals.reduce((sum, c) => sum + (c.entrada || c.dealValue || 0), 0),
      };
      return acc;
    }, {} as Record<Periodo, { count: number; value: number }>);

    // Vendas por criativo
    const byCreative = closedClients.reduce((acc, c) => {
      const creative = getCommercialLeadOrigin({ criativo: c.criativo, funil: c.funil, creativeSource: c.creativeSource });
      if (!acc[creative]) acc[creative] = { count: 0, value: 0 };
      acc[creative].count++;
      acc[creative].value += c.entrada || c.dealValue || 0;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    // Vendas por vendedor
    const bySeller = closedClients.reduce((acc, c) => {
      const seller = c.vendedor || 'Desconhecido';
      if (!acc[seller]) acc[seller] = { count: 0, value: 0 };
      acc[seller].count++;
      acc[seller].value += c.entrada || c.dealValue || 0;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    // Vendas por dia/mês (aggregate by month label if not current month filter)
    const dailySales: Record<string, number> = {};
    if (periodFilter === 'current_month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        dailySales[i.toString()] = 0;
      }
      closedClients.forEach(c => {
        // Use lastStageChange for accurate close date
        const closeDate = c.lastStageChange ? new Date(c.lastStageChange) : null;
        if (!closeDate || Number.isNaN(closeDate.getTime())) return;
        const day = closeDate.getDate().toString();
        dailySales[day] = (dailySales[day] || 0) + (c.entrada || c.dealValue || 0);
      });
    } else {
      // Aggregate by month
      closedClients.forEach(c => {
        // Use lastStageChange for accurate close date
        const closeDate = c.lastStageChange ? new Date(c.lastStageChange) : null;
        if (!closeDate || Number.isNaN(closeDate.getTime())) return;
        const monthKey = closeDate.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
        dailySales[monthKey] = (dailySales[monthKey] || 0) + (c.entrada || c.dealValue || 0);
      });
    }

    return { totalRevenue, avgTicket, closedCount: closedClients.length, byCategory, byCreative, bySeller, dailySales };
  }, [filteredClosedClients, periodFilter]);

  // Evolução mensal - últimos 6 meses
  const monthlyEvolution = useMemo(() => {
    const months: { month: string; monthNum: number; year: number; revenue: number; deals: number; avgTicket: number; revenueChange: number | null; ticketChange: number | null }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
      
      const closedInMonth = pipelineClients.filter(c => {
        if (c.stage !== 'FECHADO') return false;
        // Use lastStageChange for accurate close date in monthly evolution
        const closeDate = c.lastStageChange ? new Date(c.lastStageChange) : null;
        if (!closeDate || Number.isNaN(closeDate.getTime())) return false;
        return closeDate.getMonth() === date.getMonth() && closeDate.getFullYear() === date.getFullYear();
      });

      const revenue = closedInMonth.reduce((sum, c) => sum + (c.entrada || c.dealValue || 0), 0);
      const deals = closedInMonth.length;
      const avgTicket = deals > 0 ? revenue / deals : 0;

      // Calculate month-over-month change
      const prevMonth = months[months.length - 1];
      const revenueChange = prevMonth && prevMonth.revenue > 0 
        ? ((revenue - prevMonth.revenue) / prevMonth.revenue) * 100 
        : null;
      const ticketChange = prevMonth && prevMonth.avgTicket > 0 
        ? ((avgTicket - prevMonth.avgTicket) / prevMonth.avgTicket) * 100 
        : null;

      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        monthNum: date.getMonth(),
        year: date.getFullYear(),
        revenue,
        deals,
        avgTicket,
        revenueChange,
        ticketChange,
      });
    }

    return months;
  }, [pipelineClients]);

  // Calcular crescimento
  const growth = useMemo(() => {
    if (monthlyEvolution.length < 2) return { revenue: 0, deals: 0, avgTicket: 0, trend: 'neutral' as const };
    
    const current = monthlyEvolution[monthlyEvolution.length - 1];
    const previous = monthlyEvolution[monthlyEvolution.length - 2];

    const revenueGrowth = previous.revenue > 0 
      ? ((current.revenue - previous.revenue) / previous.revenue) * 100 
      : current.revenue > 0 ? 100 : 0;

    const dealsGrowth = previous.deals > 0 
      ? ((current.deals - previous.deals) / previous.deals) * 100 
      : current.deals > 0 ? 100 : 0;

    const avgTicketGrowth = previous.avgTicket > 0 
      ? ((current.avgTicket - previous.avgTicket) / previous.avgTicket) * 100 
      : current.avgTicket > 0 ? 100 : 0;

    const trend = revenueGrowth > 5 ? 'up' : revenueGrowth < -5 ? 'down' : 'neutral';

    return { revenue: revenueGrowth, deals: dealsGrowth, avgTicket: avgTicketGrowth, trend };
  }, [monthlyEvolution]);

  // Análise de onde investir
  const investmentRecommendations = useMemo(() => {
    const recommendations: { title: string; description: string; priority: 'high' | 'medium' | 'low'; icon: React.ReactNode }[] = [];

    // Analisar criativos mais eficientes
    const creativeData = Object.entries(currentMonthData.byCreative)
      .map(([name, data]) => ({ name, ...data, avgTicket: data.count > 0 ? data.value / data.count : 0 }))
      .sort((a, b) => b.value - a.value);

    if (creativeData.length > 0) {
      const topCreative = creativeData[0];
      recommendations.push({
        title: `Criativo com maior faturamento: "${topCreative.name}"`,
        description: `Gerou ${formatBRL(topCreative.value)} com ${topCreative.count} vendas. Considere aumentar investimento neste criativo.`,
        priority: 'high',
        icon: <Lightbulb className="h-5 w-5 text-warning" />,
      });
    }

    // Analisar categorias mais rentáveis
    const categoryData = Object.entries(currentMonthData.byCategory)
      .filter(([_, data]) => data.count > 0)
      .map(([name, data]) => ({ name, ...data, avgTicket: data.value / data.count }))
      .sort((a, b) => b.avgTicket - a.avgTicket);

    if (categoryData.length > 0) {
      const topCategory = categoryData[0];
      recommendations.push({
        title: `Planos ${topCategory.name} têm maior ticket médio`,
        description: `Ticket médio de ${formatBRLShort(topCategory.avgTicket)}. Priorize vendas deste tipo de plano.`,
        priority: 'high',
        icon: <Target className="h-5 w-5 text-success" />,
      });
    }

    // Verificar tendência de crescimento
    if (growth.trend === 'up') {
      recommendations.push({
        title: 'Empresa em crescimento!',
        description: `Faturamento cresceu ${growth.revenue.toFixed(1)}% em relação ao mês anterior. Mantenha as estratégias atuais.`,
        priority: 'low',
        icon: <CheckCircle2 className="h-5 w-5 text-success" />,
      });
    } else if (growth.trend === 'down') {
      recommendations.push({
        title: 'Atenção: Queda no faturamento',
        description: `Faturamento caiu ${Math.abs(growth.revenue).toFixed(1)}% em relação ao mês anterior. Revise estratégias de captação.`,
        priority: 'high',
        icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
      });
    }

    // Verificar taxa de conversão
    if (pipelineStats.conversionRate < 20) {
      recommendations.push({
        title: 'Taxa de conversão baixa',
        description: `Apenas ${pipelineStats.conversionRate.toFixed(1)}% dos leads estão convertendo. Invista em qualificação de leads.`,
        priority: 'medium',
        icon: <AlertTriangle className="h-5 w-5 text-warning" />,
      });
    }

    // Analisar vendedores
    const sellerData = Object.entries(currentMonthData.bySeller)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    if (sellerData.length > 1) {
      const topSeller = sellerData[0];
      const bottomSeller = sellerData[sellerData.length - 1];
      if (topSeller.value > bottomSeller.value * 2) {
        recommendations.push({
          title: `${topSeller.name} lidera vendas`,
          description: `Analise as técnicas de ${topSeller.name} para replicar com outros vendedores. Diferença de ${((topSeller.value - bottomSeller.value) / 1000).toFixed(1)}k.`,
          priority: 'medium',
          icon: <Users className="h-5 w-5 text-primary" />,
        });
      }
    }

    return recommendations.slice(0, 4);
  }, [currentMonthData, growth, pipelineStats]);

  // Dados para gráficos
  const dailySalesChartData = Object.entries(currentMonthData.dailySales).map(([day, value]) => ({
    day: `${day}`,
    value,
  }));

  const categoryPieData = Object.entries(currentMonthData.byCategory)
    .filter(([_, data]) => data.count > 0)
    .map(([name, data]) => ({
      name,
      value: data.value,
      count: data.count,
    }));

  const creativePerformanceData = useMemo(() => {
    const appointmentRows = pipelineClients.filter((client) => {
      if (!client.meetingDate && !client.meetingTime) return false;
      const scheduleDate = client.meetingDate || client.dataEntrada || client.entryDate || client.createdAt || null;
      return filterByPeriod(scheduleDate, periodFilter, customStart, customEnd);
    });

    const closedRows = pipelineClients.filter((client) => {
      if (client.stage !== 'FECHADO') return false;
      return filterByPeriod(client.lastStageChange || null, periodFilter, customStart, customEnd);
    });

    const grouped = new Map<string, CreativePerformanceRow>();
    const ensureRow = (creative: string) => {
      const key = getCreativeLabel(creative);
      if (!grouped.has(key)) {
        grouped.set(key, {
          name: key,
          appointments: 0,
          sales: 0,
          revenue: 0,
          conversionRate: 0,
        });
      }
      return grouped.get(key)!;
    };

    appointmentRows.forEach((client) => {
      ensureRow(getCommercialLeadOrigin({ criativo: client.criativo, funil: client.funil, creativeSource: client.creativeSource })).appointments += 1;
    });

    closedRows.forEach((client) => {
      const row = ensureRow(getCommercialLeadOrigin({ criativo: client.criativo, funil: client.funil, creativeSource: client.creativeSource }));
      row.sales += 1;
      row.revenue += getCreativeRevenue(client);
    });

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        conversionRate: row.appointments > 0 ? (row.sales / row.appointments) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales || b.appointments - a.appointments || a.name.localeCompare(b.name));
  }, [pipelineClients, periodFilter, customStart, customEnd, filterByPeriod]);

  const creativeOptions = useMemo(() => {
    return creativePerformanceData.map((item) => item.name).sort((a, b) => a.localeCompare(b));
  }, [creativePerformanceData]);

  const selectedCreativeMetrics = useMemo(() => {
    if (selectedCreative === 'all') {
      return creativePerformanceData.reduce<CreativePerformanceRow>(
        (acc, row) => ({
          name: 'Todos os criativos',
          appointments: acc.appointments + row.appointments,
          sales: acc.sales + row.sales,
          revenue: acc.revenue + row.revenue,
          conversionRate: 0,
        }),
        { name: 'Todos os criativos', appointments: 0, sales: 0, revenue: 0, conversionRate: 0 }
      );
    }

    return creativePerformanceData.find((item) => item.name === selectedCreative) || {
      name: selectedCreative,
      appointments: 0,
      sales: 0,
      revenue: 0,
      conversionRate: 0,
    };
  }, [creativePerformanceData, selectedCreative]);

  const selectedCreativeSummary = selectedCreative === 'all'
    ? {
        ...selectedCreativeMetrics,
        conversionRate: selectedCreativeMetrics.appointments > 0
          ? (selectedCreativeMetrics.sales / selectedCreativeMetrics.appointments) * 100
          : 0,
      }
    : selectedCreativeMetrics;

  const creativeFocusData = selectedCreative === 'all'
    ? creativePerformanceData.slice(0, 6)
    : creativePerformanceData.filter((item) => item.name === selectedCreative);

  const sellerBarData = Object.entries(currentMonthData.bySeller)
    .map(([name, data]) => ({
      name: name.split(' ')[0],
      value: data.value,
      deals: data.count,
    }))
    .sort((a, b) => b.value - a.value);

  const revenueSparklineValues = monthlyEvolution.map((item) => item.revenue);
  const dealsSparklineValues = monthlyEvolution.map((item) => item.deals);
  const ticketSparklineValues = monthlyEvolution.map((item) => item.avgTicket);
  const goalSparklineValues = monthlyEvolution.map((item) => (goalValue > 0 ? (item.revenue / goalValue) * 100 : 0));
  const negotiationSparklineValues = monthlyEvolution.map((item) => Math.max(0, item.revenue * 0.12));

  return (
    <div className="space-y-8 animate-in bg-transparent">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Dashboards Visuais
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise completa de performance e evolução da empresa
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodFilter
            value={periodFilter}
            onChange={setPeriodFilter}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
          />
          <Badge variant="outline" className="text-sm py-1 px-3">
            Atualizado em tempo real
          </Badge>
        </div>
      </div>

      {/* ======================== DASHBOARD PERÍODO SELECIONADO ======================== */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {periodFilter === 'current_month' ? 'Dashboard do Mês Atual' : 'Dashboard Comercial'}
            </h2>
            <p className="text-sm text-muted-foreground">Período selecionado</p>
          </div>
        </div>

        {/* KPIs do mês atual */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            label="Faturamento"
            value={`R$ ${(currentMonthData.totalRevenue / 1000).toFixed(1)}k`}
            icon={<DollarSign className="h-5 w-5" />}
            featured
            sparklineValues={revenueSparklineValues}
            className="min-h-[150px]"
          />
          <KPICard
            label="Contratos Fechados"
            value={currentMonthData.closedCount.toString()}
            icon={<Target className="h-5 w-5" />}
            variant="primary"
            sparklineValues={dealsSparklineValues}
            className="min-h-[150px]"
          />
          <KPICard
            label="Ticket Médio"
            value={formatBRLShort(currentMonthData.avgTicket)}
            icon={<DollarSign className="h-5 w-5" />}
            variant="info"
            sparklineValues={ticketSparklineValues}
            className="min-h-[150px]"
          />
          <KPICard
            label="Meta"
            value={`${stats.percentAchieved.toFixed(0)}%`}
            icon={<Target className="h-5 w-5" />}
            trend={stats.percentAchieved >= 100 ? 'up' : stats.percentAchieved >= 70 ? 'neutral' : 'down'}
            variant="success"
            sparklineValues={goalSparklineValues}
            className="min-h-[150px]"
          />
          <KPICard
            label="Em Negociação"
            value={`R$ ${(pipelineStats.negotiationValue / 1000).toFixed(1)}k`}
            icon={<Users className="h-5 w-5" />}
            variant="warning"
            sparklineValues={negotiationSparklineValues}
            className="min-h-[150px]"
          />
        </div>

        {/* Gráficos do período selecionado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vendas por dia/mês */}
          <Card className="overflow-hidden bg-white/95">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {periodFilter === 'current_month' ? 'Vendas Diárias' : 'Vendas por Mês'}
              </CardTitle>
              <CardDescription>
                {periodFilter === 'current_month' ? 'Faturamento por dia do mês' : 'Faturamento acumulado por mês'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                {periodFilter === 'current_month' ? (
                  <AreaChart data={dailySalesChartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e10600" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#e10600" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                    <XAxis dataKey="day" className="text-xs" tickLine={false} axisLine={false} stroke="#94a3b8" />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      stroke="#94a3b8"
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatBRL(value), 'Vendas']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#e10600" 
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#e10600' }}
                      activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                ) : (
                  <ComposedChart data={monthlyEvolution}>
                    <defs>
                      <linearGradient id="colorMonthlyRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e10600" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#e10600" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMonthlyDeals" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.95} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                    <XAxis dataKey="month" className="text-xs" tickLine={false} axisLine={false} stroke="#94a3b8" />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      stroke="#94a3b8"
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      stroke="#94a3b8"
                    />
                    <RechartsTooltip 
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0]?.payload;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-medium text-foreground mb-2">{label}</p>
                            <p className="text-sm text-green-500">
                              Faturamento: R$ {Math.round(data.revenue).toLocaleString('pt-BR')}
                            </p>
                            <p className="text-sm text-blue-500">
                              Vendas: {data.deals}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="deals" 
                      fill="url(#colorMonthlyDeals)"
                      radius={[6, 6, 0, 0]}
                      barSize={34}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#e10600" 
                      strokeWidth={3}
                      dot={{ fill: '#e10600', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Vendas por categoria */}
          <Card className="overflow-hidden bg-white/95">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" />
                Vendas por Período
              </CardTitle>
              <CardDescription>Distribuição por tipo de plano</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={74}
                    outerRadius={114}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number, name: string) => [formatBRL(value), name]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Vendas por vendedor */}
          <Card className="overflow-hidden bg-white/95">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Performance por Vendedor
              </CardTitle>
              <CardDescription>Faturamento individual no mês</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sellerBarData} layout="vertical">
                  <defs>
                    <linearGradient id="sellerGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ff3b3b" />
                      <stop offset="100%" stopColor="#e10600" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    className="text-xs"
                    tickLine={false}
                    axisLine={false}
                    stroke="#94a3b8"
                  />
                  <YAxis type="category" dataKey="name" className="text-xs" width={80} tickLine={false} axisLine={false} stroke="#94a3b8" />
                  <RechartsTooltip 
                    formatter={(value: number) => [formatBRL(value), 'Vendas']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="url(#sellerGradient)" radius={[0, 10, 10, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-rose-100/80 bg-gradient-to-br from-white via-white to-rose-50/30 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <CardHeader className="space-y-4 border-b border-rose-100/70 bg-gradient-to-r from-rose-50/30 to-transparent">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      Criativos em Performance
                    </CardTitle>
                    <CardDescription>
                      Agendamentos contam os leads do CRM com data e hora de reunião; vendas e receita usam os fechados do período.
                    </CardDescription>
                  </div>
                  <div className="w-full md:w-[320px] space-y-2">
                    <Select value={selectedCreative} onValueChange={setSelectedCreative}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar criativo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os criativos</SelectItem>
                        {creativeOptions.map((creative) => (
                          <SelectItem key={creative} value={creative}>
                            {creative}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <PeriodFilter
                      value={periodFilter}
                      onChange={setPeriodFilter}
                      customStart={customStart}
                      customEnd={customEnd}
                      onCustomChange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
                      showIcon={false}
                      className="justify-end"
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <KPICard
                    label="Agendamentos"
                    value={selectedCreativeSummary.appointments.toString()}
                    icon={<Activity className="h-5 w-5" />}
                    className="min-h-[132px]"
                  />
                  <KPICard
                    label="Vendas"
                    value={selectedCreativeSummary.sales.toString()}
                    icon={<Target className="h-5 w-5" />}
                    variant="success"
                    className="min-h-[132px]"
                  />
                  <KPICard
                    label="Receita"
                    value={formatBRL(selectedCreativeSummary.revenue)}
                    icon={<DollarSign className="h-5 w-5" />}
                    variant="success"
                    className="min-h-[132px]"
                  />
                  <KPICard
                    label="Conversão"
                    value={`${selectedCreativeSummary.conversionRate.toFixed(1)}%`}
                    icon={<BarChart3 className="h-5 w-5" />}
                    trend={selectedCreativeSummary.conversionRate >= 25 ? 'up' : selectedCreativeSummary.conversionRate >= 15 ? 'neutral' : 'down'}
                    className="min-h-[132px]"
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Vendas x Agendamentos por Criativo
                      </CardTitle>
                      <CardDescription>
                        Comparativo entre o volume de agendamentos do CRM e as vendas fechadas no período.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={creativeFocusData} barCategoryGap="28%" barGap={8}>
                          <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                          <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} stroke="#94a3b8" />
                          <YAxis className="text-xs" tickLine={false} axisLine={false} stroke="#94a3b8" />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number, name: string) => {
                              if (name === 'Agendamentos') return [`${value} agendamentos`, name];
                              if (name === 'Vendas') return [`${value} vendas`, name];
                              return [String(value), name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="appointments" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Agendamentos" maxBarSize={36} />
                          <Bar dataKey="sales" fill="#22c55e" radius={[8, 8, 0, 0]} name="Vendas" maxBarSize={36} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Receita por Criativo
                      </CardTitle>
                      <CardDescription>
                        Receita fechada gerada por cada criativo no período selecionado.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={creativeFocusData} layout="vertical" barCategoryGap="18%">
                          <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            className="text-xs"
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                          />
                          <YAxis type="category" dataKey="name" className="text-xs" width={120} tickLine={false} axisLine={false} stroke="#94a3b8" />
                          <RechartsTooltip
                            formatter={(value: number) => [formatBRL(value), 'Receita']}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 10, 10, 0]} barSize={18} maxBarSize={22}>
                            <LabelList
                              dataKey="revenue"
                              position="right"
                              formatter={(value: number) => formatBRLShort(value)}
                              className="fill-foreground"
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card className="overflow-hidden border-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Ranking completo dos criativos
                    </CardTitle>
                    <CardDescription>
                      Todos os criativos do período com agendamentos, vendas, conversão e receita.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-hidden rounded-2xl border border-border/60">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="px-5 py-4 text-left font-medium">Criativo</th>
                            <th className="px-5 py-4 text-right font-medium">Agendamentos</th>
                            <th className="px-5 py-4 text-right font-medium">Vendas</th>
                            <th className="px-5 py-4 text-right font-medium">Conversão</th>
                            <th className="px-5 py-4 text-right font-medium">Receita</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creativePerformanceData.length > 0 ? (
                            creativePerformanceData.map((row) => (
                              <tr
                                key={row.name}
                                className={cn(
                                  'border-t border-border/60 transition-colors hover:bg-rose-50/60',
                                  selectedCreative !== 'all' && selectedCreative === row.name ? 'bg-primary/5' : 'bg-background'
                                )}
                              >
                                <td className="px-5 py-4 font-medium">{row.name}</td>
                                <td className="px-5 py-4 text-right">{row.appointments}</td>
                                <td className="px-5 py-4 text-right">{row.sales}</td>
                                <td className="px-5 py-4 text-right">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'rounded-full px-3 py-1 font-medium',
                                      row.conversionRate >= 25
                                        ? 'border-success bg-success/10 text-success'
                                        : row.conversionRate >= 15
                                          ? 'border-warning bg-warning/10 text-warning'
                                          : 'border-destructive bg-destructive/10 text-destructive'
                                    )}
                                  >
                                    {row.conversionRate.toFixed(1)}%
                                  </Badge>
                                </td>
                                <td className="px-5 py-4 text-right font-semibold">{formatBRL(row.revenue)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-5 py-6 text-center text-muted-foreground" colSpan={5}>
                                Nenhum criativo encontrado no período selecionado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ======================== DASHBOARD EVOLUÇÃO ======================== */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            growth.trend === 'up' ? "bg-success/20" : growth.trend === 'down' ? "bg-destructive/20" : "bg-muted"
          )}>
            {growth.trend === 'up' ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : growth.trend === 'down' ? (
              <TrendingDown className="h-5 w-5 text-destructive" />
            ) : (
              <Minus className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Evolução da Empresa</h2>
            <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
          </div>
          <Badge className={cn(
            "ml-auto",
            growth.trend === 'up' ? "bg-success/20 text-success" : growth.trend === 'down' ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
          )}>
            {growth.trend === 'up' ? (
              <><ArrowUp className="h-3 w-3 mr-1" /> +{growth.revenue.toFixed(1)}%</>
            ) : growth.trend === 'down' ? (
              <><ArrowDown className="h-3 w-3 mr-1" /> {growth.revenue.toFixed(1)}%</>
            ) : (
              <>Estável</>
            )}
          </Badge>
        </div>

        {/* KPIs de evolução */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Crescimento Faturamento"
            value={`${growth.revenue > 0 ? '+' : ''}${growth.revenue.toFixed(1)}%`}
            icon={growth.revenue >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            trend={growth.revenue > 0 ? 'up' : growth.revenue < 0 ? 'down' : 'neutral'}
            variant={growth.revenue > 0 ? 'success' : growth.revenue < 0 ? 'danger' : undefined}
          />
          <KPICard
            label="Crescimento Vendas"
            value={`${growth.deals > 0 ? '+' : ''}${growth.deals.toFixed(1)}%`}
            icon={growth.deals >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            trend={growth.deals > 0 ? 'up' : growth.deals < 0 ? 'down' : 'neutral'}
          />
          <KPICard
            label="Var. Ticket Médio"
            value={`${growth.avgTicket > 0 ? '+' : ''}${growth.avgTicket.toFixed(1)}%`}
            icon={<DollarSign className="h-5 w-5" />}
            trend={growth.avgTicket > 0 ? 'up' : growth.avgTicket < 0 ? 'down' : 'neutral'}
          />
          <KPICard
            label="Taxa de Conversão"
            value={`${pipelineStats.conversionRate.toFixed(1)}%`}
            icon={<Target className="h-5 w-5" />}
            trend={pipelineStats.conversionRate >= 25 ? 'up' : pipelineStats.conversionRate >= 15 ? 'neutral' : 'down'}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-9 w-9 rounded-full bg-sky-50 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-sky-600" />
                </div>
                Taxa de Agendamento por Ligação ou Mensagem
              </CardTitle>
              <CardDescription>Baseado nos agendamentos do período selecionado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ligação</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">{schedulingOriginStats.callCount.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">{schedulingOriginStats.callCount} agendamentos</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mensagem</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">{schedulingOriginStats.messageCount.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">{schedulingOriginStats.messageCount} agendamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                Horário que mais agenda
              </CardTitle>
              <CardDescription>Faixa com maior volume de agendamentos no período</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black tracking-tight text-foreground">
                {busiestHour ? `${String(busiestHour.hour).padStart(2, '0')}:00` : '--:--'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {busiestHour ? `${busiestHour.total} agendamentos no período` : 'Sem agendamentos no período'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico principal de evolução */}
        <Card className="overflow-hidden bg-white/95">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução Mensal
            </CardTitle>
            <CardDescription>Faturamento e número de vendas mês a mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={monthlyEvolution}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e10600" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#e10600" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                <XAxis dataKey="month" className="text-xs" tickLine={false} axisLine={false} stroke="#94a3b8" />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                  stroke="#94a3b8"
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                  stroke="#94a3b8"
                />
                <RechartsTooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-foreground mb-2">{label}</p>
                        <p className="text-sm text-green-500">
                          Faturamento: R$ {Math.round(data.revenue).toLocaleString('pt-BR')}
                          {data.revenueChange !== null && (
                            <span className={cn("ml-2", data.revenueChange >= 0 ? "text-green-400" : "text-red-400")}>
                              ({data.revenueChange >= 0 ? '+' : ''}{data.revenueChange.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-blue-500">
                          Vendas: {data.deals}
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#e10600" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)"
                  name="Faturamento"
                />
                <Bar 
                  yAxisId="right" 
                  dataKey="deals" 
                  fill="#3b82f6" 
                  radius={[8, 8, 0, 0]}
                  name="Vendas"
                  opacity={0.85}
                  maxBarSize={28}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ticket médio ao longo do tempo */}
        <Card className="overflow-hidden bg-white/95">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Evolução do Ticket Médio
            </CardTitle>
            <CardDescription>Valor médio por venda mês a mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                <XAxis dataKey="month" className="text-xs" tickLine={false} axisLine={false} stroke="#94a3b8" />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                  stroke="#94a3b8"
                />
                <RechartsTooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-foreground mb-2">{label}</p>
                        <p className="text-sm text-amber-500">
                          Ticket Médio: R$ {Math.round(data.avgTicket).toLocaleString('pt-BR')}
                          {data.ticketChange !== null && (
                            <span className={cn("ml-2", data.ticketChange >= 0 ? "text-green-400" : "text-red-400")}>
                              ({data.ticketChange >= 0 ? '+' : ''}{data.ticketChange.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgTicket" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* ======================== RECOMENDAÇÕES DE INVESTIMENTO ======================== */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-warning/20 flex items-center justify-center">
            <Lightbulb className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Onde Investir</h2>
            <p className="text-sm text-muted-foreground">Recomendações baseadas nos dados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investmentRecommendations.map((rec, index) => (
            <Card
              key={index}
              className={cn(
                'relative overflow-hidden border-0 bg-white/95 shadow-[0_4px_20px_rgba(0,0,0,0.06)]',
                rec.priority === 'high'
                  ? 'bg-gradient-to-r from-amber-50/80 via-white to-white'
                  : rec.priority === 'medium'
                    ? 'bg-gradient-to-r from-emerald-50/70 via-white to-white'
                    : 'bg-gradient-to-r from-sky-50/70 via-white to-white'
              )}
            >
              <span
                className={cn(
                  'absolute left-0 top-0 h-full w-1.5 rounded-r-full',
                  rec.priority === 'high' ? 'bg-warning' : rec.priority === 'medium' ? 'bg-primary' : 'bg-success'
                )}
              />
              <CardContent className="relative p-5">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    rec.priority === 'high' ? "bg-warning/20" : rec.priority === 'medium' ? "bg-primary/20" : "bg-success/20"
                  )}>
                    {rec.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{rec.title}</h3>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        rec.priority === 'high' ? "border-warning text-warning" : rec.priority === 'medium' ? "border-primary text-primary" : "border-success text-success"
                      )}>
                        {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Info'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {investmentRecommendations.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-lg font-medium">Parabéns!</p>
              <p className="text-muted-foreground">Não há alertas ou recomendações no momento. Continue com a estratégia atual!</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
