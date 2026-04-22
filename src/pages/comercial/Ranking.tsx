import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCommercial, Vendedor, VENDEDOR_OPTIONS, PERIODO_OPTIONS, Agendador, AGENDADOR_OPTIONS } from '@/contexts/CommercialContext';
import { useAuth } from '@/contexts/AuthContext';
import { MonthPeriodFilter, useMonthFilter } from '@/components/comercial/MonthPeriodFilter';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from '@/components/comercial/PeriodFilter';
import { EditSDRGoalDialog } from '@/components/comercial/EditSDRGoalDialog';
import { cn, formatBRL } from '@/lib/utils';
import { 
  canEditPlatform, 
  canSeeCommission, 
  isAdminOrCoordinator,
  TEAM_USERS,
  getUserByVendedorKey,
} from '@/lib/userMapping';
import { Trophy, TrendingUp, TrendingDown, Users, DollarSign, Target, Percent, Banknote, BarChart3, ArrowUp, ArrowDown, Minus, Clock, Calendar, Star, Award, Zap, Edit, Phone, Coins } from 'lucide-react';
import { useAgendaData } from '@/hooks/useAgendaData';
import { useCommissionConfigs } from '@/hooks/useCommissionConfig';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
const PERIODO_COLORS: Record<string, string> = {
  'MENSAL': '#3b82f6',
  'TRIMESTRAL': '#22c55e',
  'SEMESTRAL': '#f59e0b',
  'TAXA_INTERESSE': '#8b5cf6',
};

interface VendedorStats {
  vendedor: Vendedor;
  name: string;
  role: 'SDR' | 'CLOSER' | 'COORDENADOR';
  totalLeads: number;
  closedCount: number;
  closedValue: number;
  conversionRate: number;
  averageTicket: number;
  // Commission fields
  directCommission: number;
  bonusCommission: number;
  totalCommission: number;
  commissionRate: number;
  // Extended stats for comparison
  avgDaysToClose: number;
  bestPeriodo: string;
  lostCount: number;
  negotiationCount: number;
  monthlyEvolution: { month: string; value: number; deals: number }[];
  periodoBreakdown: { periodo: string; count: number; value: number }[];
}

const ROLE_BADGES: Record<string, string> = {
  'SDR': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'CLOSER': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'COORDENADOR': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const VENDEDOR_ROLE_MAP: Record<Vendedor, 'SDR' | 'CLOSER' | 'COORDENADOR'> = {
  'HERBERT': 'CLOSER',
  'CLED': 'COORDENADOR',
  'PEDRO_H': 'CLOSER',
  'PEDRO_JUAN': 'CLOSER',
  'CAETANO': 'CLOSER',
};

// Commission rates
const COMMISSION_RATES = {
  HERBERT: 0,
  CLED_DIRECT: 0,
  CLED_BONUS: 0,
};

const MEDAL_COLORS = [
  'text-yellow-400', // Gold
  'text-gray-300',   // Silver
  'text-amber-600',  // Bronze
];

// Date helpers
// - Leads (Total Leads / funil): use entry date
// - Sales (Fechados / Faturamento / Comissões): use closing date (lastStageChange)
function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value as any);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getEntryDate(c: any): Date | undefined {
  // Use data_entrada, then entryDate, then created_at as fallback
  return toDate(c?.dataEntrada ?? c?.entryDate ?? c?.createdAt);
}

function getClosingDate(c: any): Date | undefined {
  return toDate(c?.lastStageChange);
}

export default function RankingPage() {
  const { pipelineClients, getSDRStats } = useCommercial();
  const { events: agendaEvents } = useAgendaData();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>('current_month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const { filterByMonth } = useMonthFilter();
  const { filterByPeriod } = usePeriodFilter();
  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  
  // Unified filter function: uses period filter for week/custom, month filter for monthly
  const clientMatchesFilter = (date: Date | undefined): boolean => {
    if (periodFilter === 'current_month' || periodFilter === 'all_time') {
      // For month-based filters, map to month filter or use filterByPeriod
      if (periodFilter === 'current_month') return filterByMonth(date, selectedMonth);
      return filterByPeriod(date, periodFilter, customStart, customEnd);
    }
    // For week and custom filters, use filterByPeriod
    return filterByPeriod(date, periodFilter, customStart, customEnd);
  };

  // SDR Goal Dialog State
  const [sdrGoalDialogOpen, setSDRGoalDialogOpen] = useState(false);
  const [selectedSDR, setSelectedSDR] = useState<Agendador>('MIGUEL');

  // Permission check using centralized user mapping
  const userEmail = user?.email || '';
  const userRole = user?.role || '';
  
  // Only admin and coordenador can edit goals and see all data
  const isAdminOrCoord = isAdminOrCoordinator(userEmail, userRole);
  
  // Can edit all platform components (coordenadores and admins only)
  const canEdit = isAdminOrCoord;
  
  // Commission visibility: only admin and coordenador can see commissions
  const canSeeAllCommissions = isAdminOrCoord;
  const canSeeAnyCommission = isAdminOrCoord;
  
  // Check if user can see a specific vendedor's commission
  const canSeeVendedorCommission = (vendedorName: string) => {
    // Only admin and coordenador can see any commissions
    return isAdminOrCoord;
  };

  // Calculate Herbert's total sales for Cled's bonus (includes TAXA_INTERESSE)
  const herbertTotalSales = useMemo(() => {
    return pipelineClients
      .filter(c => {
        return c.vendedor === 'HERBERT' && 
               (c.stage === 'FECHADO' || c.stage === 'TAXA_INTERESSE') && 
               clientMatchesFilter(getClosingDate(c));
      })
      .reduce((sum, c) => sum + (c.entrada || 0), 0);
  }, [pipelineClients, selectedMonth, periodFilter, customStart, customEnd]);


  const vendedorStats = useMemo(() => {
    const now = new Date();
    const stats: VendedorStats[] = VENDEDOR_OPTIONS.map(v => {
      // Leads: filter by entry date
      const vendedorLeads = pipelineClients.filter(c => {
        if (c.vendedor !== v.value) return false;
        return clientMatchesFilter(getEntryDate(c));
      });

      // Revenue clients: FECHADO + TAXA_INTERESSE (for faturamento and commission)
      const revenueClients = pipelineClients.filter(c => {
        if (c.vendedor !== v.value) return false;
        if (c.stage !== 'FECHADO' && c.stage !== 'TAXA_INTERESSE') return false;
        return clientMatchesFilter(getClosingDate(c));
      });

      // Closed contracts: only FECHADO (TAXA_INTERESSE doesn't count as closed contract)
      const closedClients = revenueClients.filter(c => c.stage === 'FECHADO');

      const lostClients = vendedorLeads.filter(c => c.stage === 'PERDIDO');
      const negotiationClients = vendedorLeads.filter(c => c.stage === 'NEGOCIACAO');
      const closedValue = revenueClients.reduce((sum, c) => sum + (c.entrada || 0), 0);
      
      // Calculate average days to close
      let avgDaysToClose = 0;
      if (closedClients.length > 0) {
        const totalDays = closedClients.reduce((sum, c) => {
          const entryDate = getEntryDate(c);
          const closeDate = getClosingDate(c);
          if (!entryDate || !closeDate) return sum;
          return sum + Math.max(0, Math.floor((closeDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0);
        avgDaysToClose = totalDays / closedClients.length;
      }

      // Calculate periodo breakdown
      const periodoBreakdown = PERIODO_OPTIONS.map(p => {
        const periodClients = closedClients.filter(c => c.periodo === p.value);
        return {
          periodo: p.label,
          count: periodClients.length,
          value: periodClients.reduce((sum, c) => sum + (c.entrada || 0), 0),
        };
      });

      // Find best periodo
      const bestPeriodoData = periodoBreakdown.reduce((best, curr) => 
        curr.value > best.value ? curr : best, 
        { periodo: '-', count: 0, value: 0 }
      );

      // Monthly evolution (last 6 months)
      const monthlyEvolution: { month: string; value: number; deals: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        
        const monthClients = pipelineClients.filter(c => {
          if (c.vendedor !== v.value || c.stage !== 'FECHADO') return false;
          const closeDate = getClosingDate(c);
          if (!closeDate) return false;
          return closeDate.getMonth() === date.getMonth() && closeDate.getFullYear() === date.getFullYear();
        });

        monthlyEvolution.push({
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          value: monthClients.reduce((sum, c) => sum + (c.entrada || 0), 0),
          deals: monthClients.length,
        });
      }

      // Calculate commissions
      let directCommission = 0;
      let bonusCommission = 0;
      let commissionRate = 0;

      if (v.value === 'HERBERT') {
        directCommission = closedValue * COMMISSION_RATES.HERBERT;
        commissionRate = COMMISSION_RATES.HERBERT * 100;
      } else if (v.value === 'CLED') {
        directCommission = closedValue * COMMISSION_RATES.CLED_DIRECT;
        bonusCommission = herbertTotalSales * COMMISSION_RATES.CLED_BONUS;
        commissionRate = COMMISSION_RATES.CLED_DIRECT * 100;
      }

      const totalCommission = directCommission + bonusCommission;

      return {
        vendedor: v.value,
        name: v.label,
        role: VENDEDOR_ROLE_MAP[v.value],
        totalLeads: vendedorLeads.length,
        closedCount: closedClients.length,
        closedValue,
        conversionRate: vendedorLeads.length > 0 
          ? (closedClients.length / vendedorLeads.length) * 100 
          : 0,
        averageTicket: closedClients.length > 0 
          ? closedValue / closedClients.length 
          : 0,
        directCommission,
        bonusCommission,
        totalCommission,
        commissionRate,
        avgDaysToClose,
        bestPeriodo: bestPeriodoData.periodo,
        lostCount: lostClients.length,
        negotiationCount: negotiationClients.length,
        monthlyEvolution,
        periodoBreakdown,
      };
    });

    return stats;
  }, [pipelineClients, selectedMonth, filterByMonth, herbertTotalSales]);

  // Rankings
  const rankingByValue = useMemo(() => {
    return [...vendedorStats].sort((a, b) => b.closedValue - a.closedValue);
  }, [vendedorStats]);

  const rankingByCommission = useMemo(() => {
    return [...vendedorStats]
      .filter(v => v.totalCommission > 0)
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [vendedorStats]);

  const sdrs = useMemo(() => {
    return vendedorStats
      .filter(v => v.role === 'SDR')
      .sort((a, b) => b.totalLeads - a.totalLeads);
  }, [vendedorStats]);

  const closers = useMemo(() => {
    return vendedorStats
      .filter(v => v.role === 'CLOSER' || v.role === 'COORDENADOR')
      .sort((a, b) => b.closedValue - a.closedValue);
  }, [vendedorStats]);

  // Summary cards
  const totalStats = useMemo(() => {
    const meetingsInPeriod = agendaEvents.filter(e => {
      const eventDate = new Date(e.event_date);
      return clientMatchesFilter(eventDate);
    });

    const revenueInPeriod = pipelineClients.filter(c =>
      (c.stage === 'FECHADO' || c.stage === 'TAXA_INTERESSE') && clientMatchesFilter(getClosingDate(c))
    );

    const closedInPeriod = pipelineClients.filter(c =>
      c.stage === 'FECHADO' && clientMatchesFilter(getClosingDate(c))
    );

    const lostInPeriod = pipelineClients.filter(c =>
      c.stage === 'PERDIDO' && clientMatchesFilter(getEntryDate(c))
    );

    return {
      leads: meetingsInPeriod.length,
      closed: closedInPeriod.length,
      lost: lostInPeriod.length,
      value: revenueInPeriod.reduce((sum, c) => sum + (c.entrada || 0), 0),
      commission: vendedorStats.reduce((sum, v) => sum + v.totalCommission, 0),
    };
  }, [agendaEvents, pipelineClients, selectedMonth, filterByMonth, vendedorStats]);

  // Radar chart data for comparison
  const radarData = useMemo(() => {
    const maxLeads = Math.max(...vendedorStats.map(v => v.totalLeads), 1);
    const maxClosed = Math.max(...vendedorStats.map(v => v.closedCount), 1);
    const maxValue = Math.max(...vendedorStats.map(v => v.closedValue), 1);
    const maxTicket = Math.max(...vendedorStats.map(v => v.averageTicket), 1);
    const maxConversion = Math.max(...vendedorStats.map(v => v.conversionRate), 1);

    return [
      { metric: 'Leads', fullMark: 100, ...Object.fromEntries(vendedorStats.map(v => [v.name, (v.totalLeads / maxLeads) * 100])) },
      { metric: 'Fechados', fullMark: 100, ...Object.fromEntries(vendedorStats.map(v => [v.name, (v.closedCount / maxClosed) * 100])) },
      { metric: 'Faturamento', fullMark: 100, ...Object.fromEntries(vendedorStats.map(v => [v.name, (v.closedValue / maxValue) * 100])) },
      { metric: 'Ticket', fullMark: 100, ...Object.fromEntries(vendedorStats.map(v => [v.name, (v.averageTicket / maxTicket) * 100])) },
      { metric: 'Conversão', fullMark: 100, ...Object.fromEntries(vendedorStats.map(v => [v.name, (v.conversionRate / maxConversion) * 100])) },
    ];
  }, [vendedorStats]);

  // Bar chart data for comparison
  const comparisonBarData = useMemo(() => {
    return vendedorStats.map(v => ({
      name: v.name,
      Faturamento: v.closedValue,
      Leads: v.totalLeads,
      Fechados: v.closedCount,
    }));
  }, [vendedorStats]);

  // Fetch commission configs for SDR rates
  const { data: commissionConfigs } = useCommissionConfigs();
  
  const sdrCommissionRate = useMemo(() => {
    const config = commissionConfigs?.find(c => c.config_key === 'SDR_COMMISSION_RATE');
    return config?.config_value ?? 0;
  }, [commissionConfigs]);
  
  const sdrCommissionStartDate = useMemo(() => {
    const config = commissionConfigs?.find(c => c.config_key === 'SDR_COMMISSION_START_DATE');
    const dateValue = config?.config_value;
    if (!dateValue) return new Date(8640000000000000);
    // Convert YYYYMMDD to Date
    const dateStr = dateValue.toString();
    if (dateStr.length === 8) {
      const year = parseInt(dateStr.slice(0, 4));
      const month = parseInt(dateStr.slice(4, 6)) - 1; // 0-indexed
      const day = parseInt(dateStr.slice(6, 8));
      return new Date(year, month, day);
    }
    return new Date(8640000000000000);
  }, [commissionConfigs]);

  // SDR Stats - count closed deals by agendador + commission calculation
  // Only Felipe and Miguel are shown in the SDR ranking (others can schedule but don't participate)
  const SDR_RANKING_ELIGIBLE: Agendador[] = ['MIGUEL', 'HEBERT'];
  
  const sdrRankingData = useMemo(() => {
    return AGENDADOR_OPTIONS
      .filter(sdr => SDR_RANKING_ELIGIBLE.includes(sdr.value))
      .map(sdr => {
      const stats = getSDRStats(sdr.value, selectedMonth);
      
      const scheduledCount = pipelineClients.filter(c => {
        return c.agendadoPor === sdr.value && clientMatchesFilter(getEntryDate(c));
      }).length;
      
      let commissionValue = 0;
      let commissionSalesValue = 0;
      
      if (SDR_RANKING_ELIGIBLE.includes(sdr.value)) {
        const eligibleClosedDeals = pipelineClients.filter(c => {
          if (c.agendadoPor !== sdr.value) return false;
          if (c.stage !== 'FECHADO') return false;
          
          const closeDate = getClosingDate(c);
          if (!closeDate) return false;
          if (closeDate < sdrCommissionStartDate) return false;
          
          return clientMatchesFilter(closeDate);
        });
        
        commissionSalesValue = eligibleClosedDeals.reduce((sum, c) => sum + (c.entrada || 0), 0);
        commissionValue = commissionSalesValue * sdrCommissionRate;
      }
      
      return {
        agendador: sdr.value,
        name: sdr.label,
        closedCount: stats.closedCount,
        goalCount: stats.goalCount,
        percentAchieved: stats.percentAchieved,
        scheduledCount,
        commission: commissionValue,
        commissionSalesValue,
        hasCommission: SDR_RANKING_ELIGIBLE.includes(sdr.value),
      };
    }).sort((a, b) => b.closedCount - a.closedCount);
  }, [pipelineClients, selectedMonth, filterByMonth, getSDRStats, sdrCommissionRate, sdrCommissionStartDate]);

  const renderRankingTable = (data: VendedorStats[], showCommission: boolean = false) => (
    <Table>
      <TableHeader>
        <TableRow className="border-border/30 hover:bg-transparent">
          <TableHead className="w-12 text-muted-foreground">#</TableHead>
          <TableHead className="text-muted-foreground">Vendedor</TableHead>
          <TableHead className="text-muted-foreground text-center">Leads</TableHead>
          <TableHead className="text-muted-foreground text-center">Fechados</TableHead>
          <TableHead className="text-muted-foreground text-right">Faturamento</TableHead>
          <TableHead className="text-muted-foreground text-right">Ticket Médio</TableHead>
          <TableHead className="text-muted-foreground text-right">Conversão</TableHead>
          {showCommission && canSeeAnyCommission && (
            <>
              <TableHead className="text-muted-foreground text-right">Comissão</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((stat, index) => (
          <TableRow key={stat.vendedor} className={cn(
            "border-border/20",
            index === 0 && "bg-yellow-500/5",
            index === 1 && "bg-gray-500/5",
            index === 2 && "bg-amber-500/5"
          )}>
            <TableCell>
              <div className="flex items-center justify-center">
                {index < 3 ? (
                  <Trophy className={cn("h-5 w-5", MEDAL_COLORS[index])} />
                ) : (
                  <span className="text-muted-foreground font-medium">{index + 1}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {stat.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{stat.name}</p>
                  <Badge variant="outline" className={cn("text-xs", ROLE_BADGES[stat.role])}>
                    {stat.role}
                  </Badge>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <span className="font-medium">{stat.totalLeads}</span>
            </TableCell>
            <TableCell className="text-center">
              <span className="font-medium text-success">{stat.closedCount}</span>
            </TableCell>
            <TableCell className="text-right">
              <span className="font-semibold">
                R$ {stat.closedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </TableCell>
            <TableCell className="text-right">
              {stat.closedCount > 0 
                ? `R$ ${stat.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                : '-'}
            </TableCell>
            <TableCell className="text-right">
              <span className={cn(
                "font-medium",
                stat.conversionRate >= 50 && "text-success",
                stat.conversionRate >= 30 && stat.conversionRate < 50 && "text-amber-400",
                stat.conversionRate < 30 && stat.conversionRate > 0 && "text-muted-foreground"
              )}>
                {stat.conversionRate.toFixed(1)}%
              </span>
            </TableCell>
            {showCommission && canSeeAnyCommission && (
              <TableCell className="text-right">
                {canSeeVendedorCommission(stat.name) ? (
                  <span className={cn(
                    "font-bold",
                    stat.totalCommission > 0 ? "text-success" : "text-muted-foreground"
                  )}>
                    R$ {stat.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            Ranking de Vendedores
          </h1>
          <p className="text-muted-foreground mt-1">
            Performance e comissões — {currentMonth}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodFilter
            value={periodFilter}
            onChange={(v) => { setPeriodFilter(v); if (v === 'current_month') setCustomStart(undefined); }}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
          />
          {periodFilter === 'current_month' && (
            <MonthPeriodFilter value={selectedMonth} onChange={setSelectedMonth} />
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{totalStats.leads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fechados</p>
                <p className="text-2xl font-bold text-success">{totalStats.closed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturamento</p>
                <p className="text-2xl font-bold">R$ {(totalStats.value / 1000).toFixed(1)}k</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {canSeeAnyCommission && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comissões</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {canSeeAllCommissions 
                      ? `R$ ${totalStats.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : 'R$ ***'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Commission Details - Only visible to authorized users */}
      {canSeeAnyCommission && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              Comissões Detalhadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vendedorStats
                .filter(v => v.role !== 'SDR' && canSeeVendedorCommission(v.name))
                .map(stat => (
                  <Card key={stat.vendedor} className="border-border/30 bg-surface-2">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {stat.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-lg">{stat.name}</p>
                          <Badge variant="outline" className={ROLE_BADGES[stat.role]}>
                            {stat.role}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Vendas próprias</span>
                          <span className="font-medium">
                            R$ {stat.closedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            Comissão direta ({stat.commissionRate}%)
                          </span>
                          <span className="font-medium text-success">
                            R$ {stat.directCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {stat.vendedor === 'CLED' && canSeeVendedorCommission('Cled') && (
                          <>
                            {/* Herbert's sales bonus */}
                            <div className="border-t border-border/30 pt-3">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Vendas do Herbert</span>
                                <span className="font-medium">
                                  R$ {herbertTotalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                Bônus Herbert (3%)
                              </span>
                              <span className="font-medium text-amber-400">
                                R$ {(herbertTotalSales * COMMISSION_RATES.CLED_BONUS).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </>
                        )}

                        <div className="border-t border-primary/30 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Total Comissão</span>
                            <span className="font-bold text-lg text-success">
                              R$ {stat.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking Tables */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Ranking por Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className={cn("grid w-full mb-4", canSeeAnyCommission ? "grid-cols-4" : "grid-cols-3")}>
              <TabsTrigger value="geral">Geral</TabsTrigger>
              {canSeeAnyCommission && <TabsTrigger value="comissao">Por Comissão</TabsTrigger>}
              <TabsTrigger value="sdrs">SDRs</TabsTrigger>
              <TabsTrigger value="closers">Closers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="geral">
              {renderRankingTable(rankingByValue, canSeeAnyCommission)}
            </TabsContent>
            
            {canSeeAnyCommission && (
              <TabsContent value="comissao">
                {rankingByCommission.length > 0 ? (
                  renderRankingTable(rankingByCommission, true)
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Banknote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma comissão calculada no período</p>
                  </div>
                )}
              </TabsContent>
            )}
            
            <TabsContent value="sdrs">
              {sdrs.length > 0 ? (
                renderRankingTable(sdrs, false)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum SDR encontrado no período</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="closers">
              {closers.length > 0 ? (
                renderRankingTable(closers, true)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum Closer encontrado no período</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Seller Comparison Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Comparativo de Vendedores</h2>
            <p className="text-sm text-muted-foreground">Análise detalhada de performance individual</p>
          </div>
        </div>

        {/* Radar Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Comparativo de Habilidades
              </CardTitle>
              <CardDescription>Performance relativa em cada métrica</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" className="text-xs" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  {vendedorStats.map((v, idx) => (
                    <Radar
                      key={v.vendedor}
                      name={v.name}
                      dataKey={v.name}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Faturamento por Vendedor
              </CardTitle>
              <CardDescription>Comparação direta de resultados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparisonBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    className="text-xs"
                  />
                  <YAxis type="category" dataKey="name" className="text-xs" width={70} />
                  <RechartsTooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'Faturamento') return [formatBRL(value), name];
                      return [value, name];
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="Faturamento" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Individual Seller Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendedorStats.map((stat, idx) => {
            const prevMonth = stat.monthlyEvolution[stat.monthlyEvolution.length - 2];
            const currMonth = stat.monthlyEvolution[stat.monthlyEvolution.length - 1];
            const growth = prevMonth && prevMonth.value > 0 
              ? ((currMonth.value - prevMonth.value) / prevMonth.value) * 100 
              : currMonth.value > 0 ? 100 : 0;
            const lossRate = stat.totalLeads > 0 ? (stat.lostCount / stat.totalLeads) * 100 : 0;

            return (
              <Card key={stat.vendedor} className="border-border/50 bg-card/80 overflow-hidden">
                <div className="h-2" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2" style={{ borderColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                      <AvatarFallback className="text-lg font-bold" style={{ backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}20`, color: CHART_COLORS[idx % CHART_COLORS.length] }}>
                        {stat.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{stat.name}</CardTitle>
                        {idx === 0 && <Award className="h-5 w-5 text-yellow-400" />}
                      </div>
                      <Badge variant="outline" className={ROLE_BADGES[stat.role]}>
                        {stat.role}
                      </Badge>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      growth > 0 ? "text-success" : growth < 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {growth > 0 ? <ArrowUp className="h-4 w-4" /> : growth < 0 ? <ArrowDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                      {Math.abs(growth).toFixed(0)}%
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Faturamento
                      </p>
                      <p className="text-lg font-bold text-success">
                        R$ {(stat.closedValue / 1000).toFixed(1)}k
                      </p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" /> Conversão
                      </p>
                      <p className={cn(
                        "text-lg font-bold",
                        stat.conversionRate >= 50 ? "text-success" : stat.conversionRate >= 25 ? "text-amber-400" : "text-muted-foreground"
                      )}>
                        {stat.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> Leads
                      </p>
                      <p className="text-lg font-bold">{stat.totalLeads}</p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> Fechados
                      </p>
                      <p className="text-lg font-bold text-primary">{stat.closedCount}</p>
                    </div>
                  </div>

                  {/* Extended Metrics */}
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Ticket Médio
                      </span>
                      <span className="font-medium">
                        R$ {stat.averageTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Tempo médio fechamento
                      </span>
                      <span className="font-medium">
                        {stat.avgDaysToClose.toFixed(0)} dias
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Período mais vendido
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {stat.bestPeriodo}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Em negociação</span>
                      <span className="font-medium text-amber-400">{stat.negotiationCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de perda</span>
                      <span className={cn(
                        "font-medium",
                        lossRate > 50 ? "text-destructive" : lossRate > 30 ? "text-amber-400" : "text-muted-foreground"
                      )}>
                        {lossRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Mini Evolution Chart */}
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-2">Evolução (últimos 6 meses)</p>
                    <ResponsiveContainer width="100%" height={80}>
                      <BarChart data={stat.monthlyEvolution}>
                        <Bar 
                          dataKey="value" 
                          fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                          radius={[2, 2, 0, 0]}
                          opacity={0.8}
                        />
                        <RechartsTooltip 
                          formatter={(value: number) => [formatBRL(value), 'Vendas']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Commission (if applicable and authorized to see) */}
                  {stat.totalCommission > 0 && canSeeVendedorCommission(stat.name) && (
                    <div className="pt-2 border-t border-border/30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Banknote className="h-4 w-4" /> Comissão Total
                        </span>
                        <span className="text-lg font-bold text-success">
                          R$ {stat.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Periodo Breakdown Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Vendas por Período x Vendedor
            </CardTitle>
            <CardDescription>Distribuição de planos vendidos por cada vendedor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {vendedorStats.map((stat, idx) => (
                <div key={stat.vendedor}>
                  <p className="text-sm font-medium mb-3 text-center">{stat.name}</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stat.periodoBreakdown.filter(p => p.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ periodo, percent }) => `${periodo} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {stat.periodoBreakdown.filter(p => p.count > 0).map((entry, i) => (
                          <Cell 
                            key={`cell-${i}`} 
                            fill={PERIODO_COLORS[PERIODO_OPTIONS.find(o => o.label === entry.periodo)?.value || ''] || CHART_COLORS[i % CHART_COLORS.length]} 
                          />
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* SDR Ranking Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Phone className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Ranking de SDRs</h2>
            <p className="text-sm text-muted-foreground">Performance de agendamentos fechados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sdrRankingData.map((sdr, idx) => {
            const isLeader = idx === 0 && sdr.closedCount > 0;
            
            return (
              <Card key={sdr.agendador} className={cn(
                "border-border/50 bg-card/80 overflow-hidden",
                isLeader && "border-yellow-500/50"
              )}>
                <div className={cn(
                  "h-2",
                  isLeader ? "bg-yellow-500" : "bg-blue-500"
                )} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className={cn(
                        "h-12 w-12 border-2",
                        isLeader ? "border-yellow-500" : "border-blue-500"
                      )}>
                        <AvatarFallback className={cn(
                          "text-lg font-bold",
                          isLeader ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
                        )}>
                          {sdr.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl">{sdr.name}</CardTitle>
                          {isLeader && <Trophy className="h-5 w-5 text-yellow-400" />}
                        </div>
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          SDR
                        </Badge>
                      </div>
                    </div>
                    {canEdit && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedSDR(sdr.agendador);
                          setSDRGoalDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> Fechamentos
                      </p>
                      <p className="text-2xl font-bold text-success">
                        {sdr.closedCount}
                      </p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" /> Meta
                      </p>
                      <p className="text-2xl font-bold">
                        {sdr.goalCount || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Progress to goal */}
                  {sdr.goalCount > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso da Meta</span>
                        <span className={cn(
                          "font-medium",
                          sdr.percentAchieved >= 100 ? "text-success" : 
                          sdr.percentAchieved >= 70 ? "text-amber-400" : "text-muted-foreground"
                        )}>
                          {sdr.percentAchieved.toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(sdr.percentAchieved, 100)} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {sdr.closedCount} de {sdr.goalCount} fechamentos
                      </p>
                    </div>
                  )}

                  {sdr.goalCount === 0 && (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      <p>Nenhuma meta definida</p>
                      {canEdit && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-primary"
                          onClick={() => {
                            setSelectedSDR(sdr.agendador);
                            setSDRGoalDialogOpen(true);
                          }}
                        >
                          Definir meta
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Additional stats */}
                  <div className="pt-2 border-t border-border/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> Total Agendados
                      </span>
                      <span className="font-medium">{sdr.scheduledCount}</span>
                    </div>
                    {sdr.scheduledCount > 0 && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Taxa de Fechamento</span>
                        <span className={cn(
                          "font-medium",
                          (sdr.closedCount / sdr.scheduledCount) * 100 >= 50 ? "text-success" :
                          (sdr.closedCount / sdr.scheduledCount) * 100 >= 30 ? "text-amber-400" : "text-muted-foreground"
                        )}>
                          {((sdr.closedCount / sdr.scheduledCount) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* SDR Commission - Only for Felipe and Miguel, and only visible to authorized users */}
                  {sdr.hasCommission && canSeeAnyCommission && (
                    <div className="pt-2 border-t border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent rounded-lg p-2 -mx-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Coins className="h-4 w-4 text-amber-400" /> Comissão (0,5%)
                        </span>
                        <span className="text-lg font-bold text-amber-400">
                          R$ {sdr.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {sdr.commissionSalesValue > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Sobre R$ {sdr.commissionSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em vendas fechadas
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Commission Rules Info - Only visible to authorized users */}
      {canSeeAnyCommission && (
        <Card className="border-border/30 bg-surface-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Regras de Comissão</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="space-y-2">
              {canSeeVendedorCommission('Herbert') && (
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className={ROLE_BADGES['CLOSER']}>CLOSER</Badge>
                  <span>Herbert: <strong className="text-foreground">3%</strong> sobre vendas próprias</span>
                </li>
              )}
              {canSeeVendedorCommission('Cled') && (
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className={ROLE_BADGES['COORDENADOR']}>COORDENADOR</Badge>
                  <span>Cled: <strong className="text-foreground">1,5%</strong> sobre vendas próprias + <strong className="text-foreground">3%</strong> sobre vendas do Herbert</span>
                </li>
              )}
              <li className="flex items-center gap-2 border-t border-border/30 pt-2 mt-2">
                <Badge variant="outline" className={ROLE_BADGES['SDR']}>SDR</Badge>
                <span>Felipe e Miguel: <strong className="text-foreground">0,5%</strong> sobre o valor total de vendas fechadas (a partir de 03/02/2026)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* SDR Goal Dialog */}
      <EditSDRGoalDialog
        open={sdrGoalDialogOpen}
        onOpenChange={setSDRGoalDialogOpen}
        agendador={selectedSDR}
        month={selectedMonth}
      />
    </div>
  );
}
