import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Calendar, Edit2, Loader2, Save, Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import { AGENDADOR_OPTIONS, Agendador, useCommercial } from '@/contexts/CommercialContext';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from '@/components/comercial/PeriodFilter';
import { getCommercialSetting, setCommercialSetting } from '@/lib/commercialCloudStore';
import { useAuthSafe } from '@/contexts/AuthContext';
import { AgendamentoDashboard } from '@/components/comercial/agendamento/AgendamentoDashboard';
import { useAgendamentoData } from '@/hooks/useAgendamentoData';
import { useAgendamentoRealtime } from '@/hooks/useAgendamentoRealtime';
import { format } from 'date-fns';
import { getScheduleDate, parseCalendarDate } from '@/lib/preVendaAnalytics';

const DAILY_GOAL = 8;
const SDR_NAMES: Record<string, string> = {
  MIGUEL: 'Miguel',
  HEBERT: 'Hebert',
};

export default function MetaAgendamentos() {
  useAgendamentoRealtime();
  const authContext = useAuthSafe();
  const user = authContext?.user;
  const { pipelineClients, sdrGoals, setSDRGoal } = useCommercial();
  const { leads, isLoading: isLoadingAgendamentos } = useAgendamentoData();
  const { filterByPeriod } = usePeriodFilter();
  const [period, setPeriod] = useState<PeriodFilterValue>('current_month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [isEditingGeneralGoal, setIsEditingGeneralGoal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [celebrated, setCelebrated] = useState<Set<string>>(new Set());

  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const [generalGoal, setGeneralGoal] = useState('');
  const [goals, setGoals] = useState<Record<Agendador, string>>(() => {
    const initial = {} as Record<Agendador, string>;
    AGENDADOR_OPTIONS.forEach((option) => {
      initial[option.value] = '';
    });
    return initial;
  });

  useEffect(() => {
    let mounted = true;
    void getCommercialSetting(`scheduling_general_goal:${currentMonthKey}`).then((value) => {
      if (mounted) setGeneralGoal(value || '');
    });
    return () => {
      mounted = false;
    };
  }, [currentMonthKey]);

  useEffect(() => {
    const nextGoals = {} as Record<Agendador, string>;
    AGENDADOR_OPTIONS.forEach((option) => {
      const goal = sdrGoals.find((item) => item.agendador === option.value && item.month === currentMonthKey);
      nextGoals[option.value] = goal?.goalCount ? String(goal.goalCount) : '';
    });
    setGoals(nextGoals);
  }, [currentMonthKey, sdrGoals]);

  const sdrStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const stats: Record<Agendador, { scheduledCount: number; todayCount: number }> = {} as Record<Agendador, { scheduledCount: number; todayCount: number }>;

    AGENDADOR_OPTIONS.forEach((option) => {
      const scheduledCount = pipelineClients.filter((client) => {
        if (client.agendadoPor !== option.value) return false;
        const date = parseCalendarDate(getScheduleDate(client));
        return date ? filterByPeriod(date, period, customStart, customEnd) : false;
      }).length;

      const todayCount = pipelineClients.filter((client) => {
        if (client.agendadoPor !== option.value) return false;
        const date = parseCalendarDate(getScheduleDate(client));
        return !!date && date >= todayStart && date <= todayEnd;
      }).length;

      stats[option.value] = { scheduledCount, todayCount };
    });

    return stats;
  }, [customEnd, customStart, filterByPeriod, period, pipelineClients]);

  useEffect(() => {
    ['MIGUEL', 'HEBERT'].forEach((name) => {
      if ((sdrStats as any)[name]?.todayCount >= DAILY_GOAL && !celebrated.has(name)) {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 } });
        toast.success(`${SDR_NAMES[name]} bateu a meta diaria!`);
        setCelebrated((current) => new Set(current).add(name));
      }
    });
  }, [celebrated, sdrStats]);

  const totalScheduled = useMemo(() => pipelineClients.filter((client) => {
    const date = parseCalendarDate(getScheduleDate(client));
    return date ? filterByPeriod(date, period, customStart, customEnd) : false;
  }).length, [customEnd, customStart, filterByPeriod, period, pipelineClients]);

  const effectiveGeneralGoal = parseInt(generalGoal) || AGENDADOR_OPTIONS.reduce((sum, option) => sum + (parseInt(goals[option.value]) || 0), 0);
  const totalProgress = effectiveGeneralGoal > 0 ? Math.min((totalScheduled / effectiveGeneralGoal) * 100, 100) : 0;
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (!lead.data) return false;
      const parts = lead.data.split('/');
      if (parts.length !== 3) return false;
      const leadDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      return filterByPeriod(leadDate, period, customStart, customEnd);
    });
  }, [customEnd, customStart, filterByPeriod, leads, period]);

  const selectedMonthRange = useMemo(() => {
    if (period !== 'current_month') return null;
    const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }, [period]);

  const handleSaveGoal = async (agendador: Agendador) => {
    const value = parseInt(goals[agendador]) || 0;
    if (value <= 0) {
      toast.error('A meta deve ser maior que zero');
      return;
    }
    try {
      await setSDRGoal(agendador, currentMonthKey, value);
      toast.success(`Meta de ${AGENDADOR_OPTIONS.find((option) => option.value === agendador)?.label} salva!`);
    } catch (error) {
      console.error('Failed to save scheduling goal:', error);
      toast.error('Erro ao salvar meta de agendamento na nuvem.');
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await Promise.all(AGENDADOR_OPTIONS.map((option) => {
        const value = parseInt(goals[option.value]) || 0;
        return setSDRGoal(option.value, currentMonthKey, value);
      }));
      toast.success('Todas as metas foram salvas!');
    } catch (error) {
      console.error('Failed to save all scheduling goals:', error);
      toast.error('Erro ao salvar metas de agendamento na nuvem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeneralGoal = async () => {
    const value = parseInt(generalGoal) || 0;
    if (value <= 0) {
      toast.error('A meta geral deve ser maior que zero');
      return;
    }

    try {
      await setCommercialSetting(`scheduling_general_goal:${currentMonthKey}`, String(value), user?.id);
      setIsEditingGeneralGoal(false);
      toast.success('Meta geral salva!');
    } catch (error) {
      console.error('Failed to save general scheduling goal:', error);
      toast.error('Erro ao salvar meta geral na nuvem.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meta de Agendamentos</h1>
            <p className="text-sm text-muted-foreground">Acompanhe metas de agendamentos, dashboard operacional e MRR planejado pelo pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodFilter
            value={period}
            onChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={(start, end) => {
              setCustomStart(start);
              setCustomEnd(end);
            }}
          />
        </div>
      </div>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-amber-500/10 animate-pulse" />
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Meta Geral</span>
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">Progresso total de agendamentos - {currentMonthLabel}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditingGeneralGoal((current) => !current)} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6 pt-4">
          {isEditingGeneralGoal && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <Input type="number" min="0" value={generalGoal} onChange={(e) => setGeneralGoal(e.target.value)} placeholder="Meta de agendamentos" className="max-w-[180px] bg-slate-900 border-slate-600 text-white" />
              <Button size="sm" onClick={handleSaveGeneralGoal} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
                <Save className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-amber-400 bg-clip-text text-transparent">{totalScheduled}</span>
                <span className="text-2xl text-slate-500">/ {effectiveGeneralGoal || '-'}</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">agendamentos realizados</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-white">{effectiveGeneralGoal > 0 ? `${totalProgress.toFixed(1)}%` : '-'}</span>
              <p className="text-sm text-slate-400">da meta</p>
            </div>
          </div>

          <Progress value={totalProgress} className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-red-600" />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Metas por pessoa que agenda</CardTitle>
            <CardDescription>Cards individuais com meta de agendamento e total agendado no periodo filtrado.</CardDescription>
          </div>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar metas
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {AGENDADOR_OPTIONS.map((agendador) => {
              const scheduledCount = sdrStats[agendador.value]?.scheduledCount || 0;
              const todayCount = sdrStats[agendador.value]?.todayCount || 0;
              const goalValue = parseInt(goals[agendador.value]) || 0;
              const progress = goalValue > 0 ? Math.min((scheduledCount / goalValue) * 100, 100) : 0;
              const isAchieved = goalValue > 0 && scheduledCount >= goalValue;
              const isDailyTracked = agendador.value === 'MIGUEL' || agendador.value === 'HEBERT';
              const dailyGoalAchieved = isDailyTracked && todayCount >= DAILY_GOAL;

              return (
                <Card key={agendador.value} className={`${isAchieved ? 'border-green-500/50 bg-green-500/5' : ''} ${dailyGoalAchieved ? 'ring-2 ring-yellow-400' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {agendador.label}
                      </CardTitle>
                      {dailyGoalAchieved && (
                        <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Meta diaria
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Agendados</p>
                        <p className="text-3xl font-bold text-foreground">{scheduledCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Meta</p>
                        <p className="text-xl font-bold">{goalValue || '-'}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-muted-foreground">Progresso</span>
                        <span className="text-sm font-medium">{goalValue > 0 ? `${progress.toFixed(1)}%` : '-'}</span>
                      </div>
                      <Progress value={progress} className={`h-2 ${isAchieved ? '[&>div]:bg-green-500' : ''}`} />
                    </div>
                    {isDailyTracked && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Hoje
                          </span>
                          <span className="text-sm font-bold">{todayCount} / {DAILY_GOAL}</span>
                        </div>
                        <Progress value={Math.min((todayCount / DAILY_GOAL) * 100, 100)} className={`h-2 ${dailyGoalAchieved ? '[&>div]:bg-yellow-500' : ''}`} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor={`goal-${agendador.value}`} className="text-sm">Meta mensal</Label>
                      <div className="flex gap-2">
                        <Input id={`goal-${agendador.value}`} type="number" min="0" value={goals[agendador.value]} onChange={(e) => setGoals((current) => ({ ...current, [agendador.value]: e.target.value }))} placeholder="Ex: 30" className="flex-1" />
                        <Button size="icon" variant="outline" onClick={() => handleSaveGoal(agendador.value)}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="hidden">
        <Card className="border-emerald-500/30 bg-emerald-50/70">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-emerald-700" />
              <div>
                <p className="text-sm text-muted-foreground">MRR planejado futuro</p>
                <p className="text-2xl font-bold text-emerald-700">R$ 0,00</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Entrada MRR coletada</p>
            <p className="mt-2 text-2xl font-bold">R$ 0,00</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Contratos MRR fechados</p>
            <p className="mt-2 text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ticket médio MRR total</p>
            <p className="mt-2 text-2xl font-bold">R$ 0,00</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle>Dashboard de agendamentos</CardTitle>
          <CardDescription>Mesmas métricas do antigo Controle de Agendamento, agora centralizadas aqui e conectadas às automações do pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAgendamentos ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <AgendamentoDashboard
              leads={filteredLeads}
              selectedDay={period === 'day' || period === 'current_day' ? customStart || new Date() : undefined}
              selectedMonth={period === 'current_month' ? format(new Date(), 'yyyy-MM') : undefined}
              selectedMonthRange={selectedMonthRange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
