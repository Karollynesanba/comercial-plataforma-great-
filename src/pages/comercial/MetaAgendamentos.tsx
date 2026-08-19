import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Calendar, Edit2, Loader2, Save, Sparkles, Target, TrendingUp, Users, Clock } from 'lucide-react';
import { AGENDADOR_OPTIONS, Agendador, OFFICIAL_SDR_VALUES, useCommercial } from '@/contexts/CommercialContext';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from '@/components/comercial/PeriodFilter';
import { getCommercialSetting, setCommercialSetting } from '@/lib/commercialCloudStore';
import { useAuthSafe } from '@/contexts/AuthContext';
import { AgendamentoDashboard } from '@/components/comercial/agendamento/AgendamentoDashboard';
import { useAgendamentoRealtime } from '@/hooks/useAgendamentoRealtime';
import { format } from 'date-fns';
import { getScheduleDate, parseCalendarDate } from '@/lib/preVendaAnalytics';

const DAILY_GOAL = 8;
const SDR_NAMES: Record<string, string> = {
HEBERT: 'Herbert',
ALAN: 'Alan',
};

function normalizeLeadKey(lead: any) {
  const pipelineClientId = String(lead.pipeline_client_id || '').trim();
  if (pipelineClientId) return `pipeline:${pipelineClientId}`;

  const agendaEventId = String(lead.agenda_event_id || '').trim();
  if (agendaEventId) return `agenda:${agendaEventId}`;

  const phone = String(lead.telefone || '').replace(/\D/g, '');
  const name = String(lead.nome || '').trim().toLowerCase();
  if (phone) return `person:${phone}`;
  if (name) return `person:${name}`;
  const date = String(lead.data || lead.agenda_event_date || lead.meetingDate || '').trim();
  const time = String(lead.horario_especifico || lead.agenda_event_time || lead.meetingTime || '').trim();
  return `fallback:${date}:${time}`;
}

function uniqueLeadsByIdentity(leads: any[]) {
  const seen = new Set<string>();
  return leads.filter((lead) => {
    const key = normalizeLeadKey(lead);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeAgendadoVia(value?: string | null) {
  return String(value || '').trim().toUpperCase();
}

export default function MetaAgendamentos() {
  useAgendamentoRealtime();
  const authContext = useAuthSafe();
  const user = authContext?.user;
  const { sdrGoals, setSDRGoal, pipelineClients } = useCommercial();
  const { filterByPeriod } = usePeriodFilter();
  const [period, setPeriod] = useState<PeriodFilterValue>('current_month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [isEditingGeneralGoal, setIsEditingGeneralGoal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [celebrated, setCelebrated] = useState<Set<string>>(new Set());

  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const recognizedAgendadores = useMemo(() => new Set(AGENDADOR_OPTIONS.map((option) => option.value)), []);

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

  const filteredLeads = useMemo(() => {
    return pipelineClients.filter((lead) => {
      const rawDate = getScheduleDate(lead);
      const leadDate = parseCalendarDate(rawDate);
      return leadDate ? filterByPeriod(leadDate, period, customStart, customEnd) : false;
    });
  }, [customEnd, customStart, filterByPeriod, period, pipelineClients]);

  const uniqueFilteredLeads = useMemo(() => uniqueLeadsByIdentity(filteredLeads), [filteredLeads]);

  const sdrStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const stats: Record<Agendador, { scheduledCount: number; todayCount: number }> = {} as Record<Agendador, { scheduledCount: number; todayCount: number }>;

    AGENDADOR_OPTIONS.forEach((option) => {
      const scheduledCount = uniqueFilteredLeads.filter((lead: any) => {
        if (lead.agendadoPor !== option.value) return false;
        const date = parseCalendarDate(getScheduleDate(lead));
        return date ? filterByPeriod(date, period, customStart, customEnd) : false;
      }).length;

      const todayCount = uniqueFilteredLeads.filter((lead: any) => {
        if (lead.agendadoPor !== option.value) return false;
        const date = parseCalendarDate(getScheduleDate(lead));
        return !!date && date >= todayStart && date <= todayEnd;
      }).length;

      stats[option.value] = { scheduledCount, todayCount };
    });

    return stats;
  }, [customEnd, customStart, filterByPeriod, period, uniqueFilteredLeads]);

  useEffect(() => {
    OFFICIAL_SDR_VALUES.forEach((name) => {
      if ((sdrStats as any)[name]?.todayCount >= DAILY_GOAL && !celebrated.has(name)) {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 } });
        toast.success(`${SDR_NAMES[name]} bateu a meta diaria!`);
        setCelebrated((current) => new Set(current).add(name));
      }
    });
  }, [celebrated, sdrStats]);

  const totalScheduled = useMemo(() => uniqueFilteredLeads.filter((lead: any) => {
    if (!lead.agendadoPor || !recognizedAgendadores.has(lead.agendadoPor)) return false;
    const date = parseCalendarDate(getScheduleDate(lead));
    return date ? filterByPeriod(date, period, customStart, customEnd) : false;
  }).length, [customEnd, customStart, filterByPeriod, period, recognizedAgendadores, uniqueFilteredLeads]);

  const effectiveGeneralGoal = parseInt(generalGoal) || AGENDADOR_OPTIONS.reduce((sum, option) => sum + (parseInt(goals[option.value]) || 0), 0);
  const totalProgress = effectiveGeneralGoal > 0 ? Math.min((totalScheduled / effectiveGeneralGoal) * 100, 100) : 0;

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
    <div className="min-h-screen bg-[#F7F7F9] px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="rounded-[28px] border border-slate-200/70 bg-white/85 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
        </div>

        <Card className="relative overflow-hidden rounded-[30px] border border-slate-800/20 bg-[linear-gradient(135deg,#0f1115_0%,#141824_45%,#23131a_100%)] text-white shadow-[0_18px_50px_rgba(255,59,59,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,59,59,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_30%)]" />
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-70" />
          <CardHeader className="relative pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="rounded-lg bg-gradient-to-br from-red-500 to-red-700 p-2 shadow-lg shadow-red-500/25">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">Meta Geral</span>
                </CardTitle>
                <CardDescription className="mt-1 text-slate-400">Progresso total de agendamentos - {currentMonthLabel}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingGeneralGoal((current) => !current)}
                className="border-slate-600/80 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <Edit2 className="mr-1 h-4 w-4" />
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-6 pt-4">
            {isEditingGeneralGoal && (
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/40 p-3 backdrop-blur-sm">
                <Input
                  type="number"
                  min="0"
                  value={generalGoal}
                  onChange={(e) => setGeneralGoal(e.target.value)}
                  placeholder="Meta de agendamentos"
                  className="max-w-[180px] border-slate-600/70 bg-slate-950/70 text-white placeholder:text-slate-500"
                />
                <Button
                  size="sm"
                  onClick={handleSaveGeneralGoal}
                  className="rounded-full bg-gradient-to-r from-red-500 to-red-600 px-4 font-semibold shadow-lg shadow-red-500/20 hover:from-red-600 hover:to-red-700"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="bg-gradient-to-r from-white via-red-100 to-red-300 bg-clip-text text-6xl font-black tracking-tight text-transparent md:text-7xl">{totalScheduled}</span>
                  <span className="text-2xl text-slate-400 md:text-3xl">/ {effectiveGeneralGoal || '-'}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">agendamentos realizados</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-red-300">{effectiveGeneralGoal > 0 ? `${totalProgress.toFixed(1)}%` : '-'}</span>
                <p className="text-sm text-slate-400">da meta</p>
              </div>
            </div>

            <Progress value={totalProgress} className="h-4 rounded-full bg-white/10 [&>div]:rounded-full [&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-red-700" />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Metas por pessoa que agenda</CardTitle>
              <CardDescription>Cards individuais com meta de agendamento e total agendado no periodo filtrado.</CardDescription>
            </div>
            <Button onClick={handleSaveAll} disabled={isSaving} className="rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 font-semibold text-white shadow-lg shadow-red-500/20 hover:from-red-600 hover:to-red-700">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar metas
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {AGENDADOR_OPTIONS.map((agendador) => {
                const scheduledCount = sdrStats[agendador.value]?.scheduledCount || 0;
                const todayCount = sdrStats[agendador.value]?.todayCount || 0;
                const messageCount = uniqueFilteredLeads.filter((lead: any) => {
                  return lead.agendadoPor === agendador.value && normalizeAgendadoVia(lead.agendadoVia) === 'MENSAGEM';
                }).length;
                const callCount = uniqueFilteredLeads.filter((lead: any) => {
                  return lead.agendadoPor === agendador.value && normalizeAgendadoVia(lead.agendadoVia) === 'LIGACAO';
                }).length;
                const goalValue = parseInt(goals[agendador.value]) || 0;
                const progress = goalValue > 0 ? Math.min((scheduledCount / goalValue) * 100, 100) : 0;
                const isAchieved = goalValue > 0 && scheduledCount >= goalValue;
                const isDailyTracked = OFFICIAL_SDR_VALUES.includes(agendador.value);
                const dailyGoalAchieved = isDailyTracked && todayCount >= DAILY_GOAL;

                return (
                  <Card
                    key={agendador.value}
                    className={`group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)] ${isAchieved ? 'border-green-500/40 bg-green-500/5' : ''} ${dailyGoalAchieved ? 'ring-2 ring-yellow-400/70' : ''}`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 ${isAchieved ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-red-600'}`} />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {agendador.label}
                        </CardTitle>
                        {dailyGoalAchieved && (
                          <span className="flex items-center gap-1 rounded-full bg-yellow-500 px-2 py-0.5 text-xs text-white">
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
                          <p className="text-4xl font-black tracking-tight text-foreground">{scheduledCount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Meta</p>
                          <p className="text-2xl font-bold">{goalValue || '-'}</p>
                        </div>
                      </div>
                      {isDailyTracked && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agendamentos por mensagem</p>
                            <p className="mt-1 text-2xl font-bold text-foreground">{messageCount}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agendamentos por ligação</p>
                            <p className="mt-1 text-2xl font-bold text-foreground">{callCount}</p>
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Progresso</span>
                          <span className="text-sm font-medium">{goalValue > 0 ? `${progress.toFixed(1)}%` : '-'}</span>
                        </div>
                        <Progress value={progress} className={`h-3 rounded-full bg-slate-100 [&>div]:rounded-full ${isAchieved ? '[&>div]:bg-green-500' : '[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-red-600'}`} />
                      </div>
                      {isDailyTracked && (
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              Hoje
                            </span>
                            <span className="text-sm font-bold text-slate-900">{todayCount} / {DAILY_GOAL}</span>
                          </div>
                          <Progress value={Math.min((todayCount / DAILY_GOAL) * 100, 100)} className={`h-3 rounded-full bg-slate-200 [&>div]:rounded-full ${dailyGoalAchieved ? '[&>div]:bg-yellow-500' : '[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-red-600'}`} />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor={`goal-${agendador.value}`} className="text-sm">Meta mensal</Label>
                        <div className="flex gap-2">
                          <Input id={`goal-${agendador.value}`} type="number" min="0" value={goals[agendador.value]} onChange={(e) => setGoals((current) => ({ ...current, [agendador.value]: e.target.value }))} placeholder="Ex: 30" className="flex-1 rounded-xl border-slate-200/80 bg-white shadow-sm" />
                          <Button size="icon" variant="outline" onClick={() => handleSaveGoal(agendador.value)} className="rounded-xl border-slate-200/80 bg-white shadow-sm hover:bg-slate-50">
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

        <Card className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <CardTitle>Dashboard de agendamentos</CardTitle>
            <CardDescription>Mesmas métricas do antigo Controle de Agendamento, agora centralizadas aqui e conectadas às automações do pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <AgendamentoDashboard
              leads={filteredLeads}
              selectedDay={period === 'day' || period === 'current_day' ? customStart || new Date() : undefined}
              selectedMonth={period === 'current_month' ? format(new Date(), 'yyyy-MM') : undefined}
              selectedMonthRange={selectedMonthRange}
              period={period}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
