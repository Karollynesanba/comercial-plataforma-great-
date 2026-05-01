import { useState, useEffect, useRef, useMemo } from 'react';
import { useCommercial, AGENDADOR_OPTIONS } from '@/contexts/CommercialContext';
import { useAuth } from '@/contexts/AuthContext';
import { EditGoalDialog } from '@/components/comercial/EditGoalDialog';
import { EditAllSDRGoalsDialog } from '@/components/comercial/EditAllSDRGoalsDialog';
import { CelebrationAnimation } from '@/components/comercial/CelebrationAnimation';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from '@/components/comercial/PeriodFilter';
import { KPICard } from '@/components/dashboard/KPICard';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Edit,
  ArrowRight,
  Users,
  Trophy,
} from 'lucide-react';
import { cn, formatBRL, formatBRLShort } from '@/lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
export default function MetasPage() {
  const { currentGoal, getGoalStats, pipelineClients, getPipelineStats, getSDRStats, sdrGoals } = useCommercial();
  const { user, canEdit } = useAuth();
  
  // Permitir que qualquer usuário autenticado da operação comercial registre metas
  const canEditGoals = canEdit || !!user;
  const [editGoalOpen, setEditGoalOpen] = useState(false);
  const [editSDRGoalOpen, setEditSDRGoalOpen] = useState(false);
  
  // Period filter
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>('all_time');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const { filterByPeriod } = usePeriodFilter();
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'sale' | 'goal'>('goal');
  const [celebrationTitle, setCelebrationTitle] = useState('');
  const [celebrationSubtitle, setCelebrationSubtitle] = useState('');
  
  // Track previous goal achievement to detect when goal is reached
  const prevGoalAchieved = useRef(false);
  const prevSDRGoalsAchieved = useRef<Record<string, boolean>>({});

  // Filter clients by period
  const periodFilteredClients = useMemo(() => {
    return pipelineClients.filter(client => {
      const clientDate = client.dataEntrada || client.entryDate;
      return filterByPeriod(clientDate, periodFilter, customStart, customEnd);
    });
  }, [pipelineClients, periodFilter, customStart, customEnd, filterByPeriod]);

  const stats = getGoalStats();
  const pipelineStats = getPipelineStats();
  const goalValue = currentGoal?.goalValue || 0;
  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // SDR Stats
  const sdrStats = AGENDADOR_OPTIONS.map(agendador => ({
    ...agendador,
    stats: getSDRStats(agendador.value, currentMonthKey),
  }));

  // Check for goal achievements
  useEffect(() => {
    // Check main goal
    const isGoalAchieved = stats.percentAchieved >= 100;
    if (isGoalAchieved && !prevGoalAchieved.current) {
      setCelebrationType('goal');
      setCelebrationTitle('🏆 Meta Comercial Batida!');
      setCelebrationSubtitle(`Parabéns! Vocês alcançaram ${formatBRL(stats.totalSold)}!`);
      setShowCelebration(true);
    }
    prevGoalAchieved.current = isGoalAchieved;

    // Check SDR goals
    sdrStats.forEach(sdr => {
      const isSDRGoalAchieved = sdr.stats.goalCount > 0 && sdr.stats.percentAchieved >= 100;
      const wasAchievedBefore = prevSDRGoalsAchieved.current[sdr.value];
      
      if (isSDRGoalAchieved && !wasAchievedBefore) {
        setCelebrationType('goal');
        setCelebrationTitle(`🏆 ${sdr.label} bateu a meta!`);
        setCelebrationSubtitle(`${sdr.stats.closedCount} agendamentos fechados de ${sdr.stats.goalCount}!`);
        setShowCelebration(true);
      }
      prevSDRGoalsAchieved.current[sdr.value] = isSDRGoalAchieved;
    });
  }, [stats.percentAchieved, stats.totalSold, sdrStats]);

  // Generate daily sales data for the chart (only business days)
  const now = new Date();
  const currentDay = now.getDate();
  
  // Generate data only for business days using filtered clients
  const dailySalesData: { day: string; vendas: number; meta: number }[] = [];
  for (let day = 1; day <= currentDay; day++) {
    const date = new Date(now.getFullYear(), now.getMonth(), day);
    const dayOfWeek = date.getDay();
    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Calculate actual sales for this day from filtered clients
      const daySales = periodFilteredClients
        .filter(c => c.stage === 'FECHADO')
        .filter(c => {
          // Use lastStageChange (closing date) instead of dataEntrada (entry date)
          if (!c.lastStageChange) return false;
          const closeDate = new Date(c.lastStageChange);
          if (Number.isNaN(closeDate.getTime())) return false;
          return closeDate.getDate() === day && 
                 closeDate.getMonth() === now.getMonth() && 
                 closeDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, c) => sum + (c.entrada || 0), 0);
      
      dailySalesData.push({
        day: day.toString().padStart(2, '0'),
        vendas: daySales,
        meta: goalValue / stats.totalBusinessDays,
      });
    }
  }

  // Sales by creative source - using filtered clients
  const closedClients = periodFilteredClients.filter(c => c.stage === 'FECHADO');
  
  const salesBySourceMap = closedClients.reduce((acc, client) => {
    const source = client.criativo || 'NÃO IDENTIFICADO';
    const value = client.entrada || 0;
    acc[source] = (acc[source] || 0) + value;
    return acc;
  }, {} as Record<string, number>);
  
  const salesBySource = Object.entries(salesBySourceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 sources

  // Distribution by plan - using correct field name (periodo)
  const planDistribution = [
    { name: '30 Dias', value: closedClients.filter(c => c.periodo === 'MENSAL').length, color: '#3B82F6' },
    { name: '90 Dias', value: closedClients.filter(c => c.periodo === 'TRIMESTRAL').length, color: '#8B5CF6' },
    { name: '180 Dias', value: closedClients.filter(c => c.periodo === 'SEMESTRAL').length, color: '#10B981' },
    { name: 'Taxa Int.', value: closedClients.filter(c => c.periodo === 'TAXA_INTERESSE').length, color: '#F59E0B' },
  ];

  const getStatusBadge = () => {
    switch (stats.status) {
      case 'ok':
        return (
          <Badge className="bg-success/20 text-success border-success/30 gap-1">
            <CheckCircle className="h-3 w-3" />
            No caminho certo
          </Badge>
        );
      case 'risk':
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Meta em risco
          </Badge>
        );
      case 'danger':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Fora da meta
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Metas Comerciais</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhamento de performance — {currentMonth}
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
          {getStatusBadge()}
          {canEditGoals && (
            <Button variant="outline" onClick={() => setEditGoalOpen(true)} className="gap-2">
              <Edit className="h-4 w-4" />
              Adicionar Meta
            </Button>
          )}
        </div>
      </div>

      {/* Main Goal Card */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <ProgressRing 
              value={stats.totalSold} 
              max={goalValue} 
              size="lg" 
              label="da meta" 
              color={stats.status === 'danger' ? 'danger' : stats.status === 'risk' ? 'warning' : 'primary'} 
            />
            
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Meta de {currentMonth}</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {formatBRL(goalValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendido</p>
                  <p className="text-3xl font-bold tabular-nums text-success">
                    {formatBRL(stats.totalSold)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faltam</p>
                  <p className={cn(
                    "text-3xl font-bold tabular-nums",
                    stats.remaining > 0 ? "text-primary" : "text-success"
                  )}>
                    {formatBRL(stats.remaining)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{stats.percentAchieved.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(stats.percentAchieved, 100)} className="h-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Projeção do Mês"
          value={formatBRLShort(stats.projection)}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={stats.projection >= goalValue ? 'up' : 'down'}
          appearance="surface"
          variant="info"
          className="min-h-[150px]"
        />
        <KPICard
          label="Necessário/Dia"
          value={formatBRLShort(stats.dailyNeeded)}
          icon={<Target className="h-5 w-5" />}
          featured
          className="min-h-[150px]"
        />
        <KPICard
          label="Dias Úteis Restantes"
          value={`${stats.daysRemaining} de ${stats.totalBusinessDays}`}
          icon={<Calendar className="h-5 w-5" />}
          appearance="surface"
          variant="primary"
          className="min-h-[150px]"
        />
        <KPICard
          label="Em Negociação"
          value={formatBRL(pipelineStats.negotiationValue)}
          icon={<DollarSign className="h-5 w-5" />}
          appearance="surface"
          variant="warning"
          className="min-h-[150px]"
        />
      </div>

      {/* Alerts */}
      {stats.status !== 'ok' && (
        <Card className={cn(
          "border-0 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden",
          stats.status === 'danger'
            ? "bg-rose-50/90 border-l-4 border-l-destructive"
            : "bg-amber-50/90 border-l-4 border-l-warning"
        )}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center shrink-0",
                stats.status === 'danger' ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
              )}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold">
                  {stats.status === 'danger' 
                    ? 'Meta em risco — esforço diário insuficiente'
                    : 'Atenção: ritmo de vendas abaixo do esperado'
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Para bater a meta, você precisa vender <strong>{formatBRLShort(stats.dailyNeeded)}</strong> por dia útil 
                  nos próximos <strong>{stats.daysRemaining}</strong> dias úteis.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/comercial/pipeline" className="gap-1">
                  Ver Pipeline <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline warning */}
      {pipelineStats.totalValue < stats.remaining && (
        <Card className="border-0 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden bg-amber-50/80 border-l-4 border-l-warning">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 bg-warning/10 text-warning">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold">Pipeline não sustenta a meta</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  O valor total no pipeline (R$ {pipelineStats.totalValue.toLocaleString('pt-BR')}) 
                  é menor que o valor faltante para a meta (R$ {stats.remaining.toLocaleString('pt-BR')}).
                  Adicione mais leads ao pipeline.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <Card className="overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border-0">
          <CardHeader>
            <CardTitle className="text-lg">Vendas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySalesData}>
                  <defs>
                    <linearGradient id="dailySalesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e10600" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#e10600" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatBRL(value), 'Vendas']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke="#e10600" 
                    strokeWidth={3}
                    dot={{ fill: '#e10600', r: 4 }}
                    activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                    fill="url(#dailySalesGradient)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="meta" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Creative Source */}
        <Card className="overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border-0">
          <CardHeader>
            <CardTitle className="text-lg">Vendas por Criativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesBySource} layout="vertical">
                  <defs>
                    <linearGradient id="creativeBarGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ff4d4d" />
                      <stop offset="100%" stopColor="#e10600" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#94a3b8"
                    fontSize={12}
                    width={100}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatBRL(value), 'Valor']}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="url(#creativeBarGradient)" 
                    radius={[0, 10, 10, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="lg:col-span-2 overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border-0">
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={92}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4">
                {planDistribution.map(plan => (
                  <div key={plan.name} className="text-center rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
                    <div 
                      className="w-4 h-4 rounded-full mx-auto mb-3 shadow-sm"
                      style={{ backgroundColor: plan.color }}
                    />
                    <p className="text-sm text-muted-foreground">{plan.name}</p>
                    <p className="text-2xl font-bold">{plan.value}</p>
                    <p className="text-xs text-muted-foreground">clientes</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SDR Goals Section */}
      <Card className="overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Metas dos SDRs</CardTitle>
          </div>
          {canEditGoals && (
            <Button variant="outline" size="sm" onClick={() => setEditSDRGoalOpen(true)} className="gap-2">
              <Edit className="h-4 w-4" />
              Adicionar Metas
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sdrStats.map(sdr => {
              const isGoalMet = sdr.stats.goalCount > 0 && sdr.stats.percentAchieved >= 100;
              return (
                <div 
                  key={sdr.value} 
                  className={cn(
                    "p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)]",
                    isGoalMet 
                      ? "border-success/20 bg-success/5" 
                      : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold tracking-tight">{sdr.label}</span>
                      {isGoalMet && (
                        <Badge className="bg-success/20 text-success border-success/30 gap-1">
                          <Trophy className="h-3 w-3" />
                          Meta Batida!
                        </Badge>
                      )}
                    </div>
                    <span className="text-2xl font-bold tabular-nums">
                      {sdr.stats.closedCount}/{sdr.stats.goalCount || '-'}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(sdr.stats.percentAchieved, 100)} 
                    className={cn(
                      "h-3 rounded-full bg-slate-200 overflow-hidden [&>div]:bg-gradient-to-r [&>div]:from-[#ff3b3b] [&>div]:to-[#e10600]",
                      isGoalMet && "[&>div]:from-emerald-500 [&>div]:to-emerald-600"
                    )}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {sdr.stats.goalCount > 0 
                      ? `${sdr.stats.percentAchieved.toFixed(0)}% da meta de agendamentos`
                      : 'Meta não definida'
                    }
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <EditGoalDialog open={editGoalOpen} onOpenChange={setEditGoalOpen} />
      <EditAllSDRGoalsDialog open={editSDRGoalOpen} onOpenChange={setEditSDRGoalOpen} />

      {/* Celebration Animation */}
      <CelebrationAnimation
        show={showCelebration}
        type={celebrationType}
        title={celebrationTitle}
        subtitle={celebrationSubtitle}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
}
