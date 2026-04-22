import { useMemo, useState } from 'react';
import { Calculator, CalendarDays, DollarSign, Presentation, Target, TrendingUp, Users } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { KPICard } from '@/components/dashboard/KPICard';
import { formatBRL, formatBRLShort } from '@/lib/utils';

const DEFAULT_TICKET = 12000;
const DEFAULT_CONVERSION_RATE = 25;
const DEFAULT_SHOW_RATE = 70;
const DEFAULT_PITCH_RATE = 65;
const DEFAULT_TRAFFIC_INVESTMENT = 10000;
const DEFAULT_COST_PER_LEAD = 100;
const DEFAULT_SCHEDULING_RATE = 100;

function toNumber(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return Number(normalized) || 0;
}

function numberInput(value: number, setValue: (value: number) => void) {
  return {
    value: String(value),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setValue(toNumber(event.target.value)),
  };
}

type FixedMetric = 'scheduledMeetings' | 'completedMeetings' | 'pitchMeetings' | 'sales' | 'averageTicket' | 'conversionRate' | 'trafficInvestment' | 'costPerLead';
type SimulationMode = 'traffic' | 'goal';

function normalizeRate(value: number, fallback: number) {
  return value > 0 ? value : fallback;
}

function clampRate(value: number, fallback: number) {
  const safeValue = normalizeRate(value, fallback);
  return Math.min(100, Math.max(0, safeValue));
}

function safeCeil(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.ceil(value);
}

function calculateTrafficLeads(investment: number, costPerLead: number) {
  if (investment <= 0 || costPerLead <= 0) return 0;
  return Math.floor(investment / costPerLead);
}

function calculateTrafficScheduledMeetings(investment: number, costPerLead: number, schedulingRate: number) {
  const leads = calculateTrafficLeads(investment, costPerLead);
  const rate = clampRate(schedulingRate, DEFAULT_SCHEDULING_RATE) / 100;
  return safeCeil(leads * rate);
}

function calculateGoalScenario({
  targetRevenue,
  ticket,
  conversionRate,
  showRate,
  pitchRate,
  fixedSales,
}: {
  targetRevenue: number;
  ticket: number;
  conversionRate: number;
  showRate: number;
  pitchRate: number;
  fixedSales?: number;
}) {
  const safeTicket = ticket > 0 ? ticket : DEFAULT_TICKET;
  const safeConversion = Math.min(100, Math.max(1, conversionRate > 0 ? conversionRate : DEFAULT_CONVERSION_RATE));
  const safeShowRate = Math.min(100, Math.max(1, showRate > 0 ? showRate : DEFAULT_SHOW_RATE));
  const safePitchRate = Math.min(100, Math.max(1, pitchRate > 0 ? pitchRate : DEFAULT_PITCH_RATE));
  const sales = safeCeil(fixedSales && fixedSales > 0 ? fixedSales : targetRevenue / safeTicket);
  const requiredTicket = fixedSales && fixedSales > 0 ? targetRevenue / Math.max(fixedSales, 1) : safeTicket;
  const pitches = safeCeil(sales / (safeConversion / 100));
  const completed = safeCeil(pitches / (safePitchRate / 100));
  const scheduled = safeCeil(completed / (safeShowRate / 100));
  const revenue = sales * requiredTicket;

  return {
    scheduled,
    completed,
    pitches,
    sales,
    conversion: safeConversion,
    ticket: requiredTicket,
    revenue,
  };
}

function calculateTrafficProjection({
  scheduledMeetings,
  showRate,
  pitchRate,
  conversionRate,
  averageTicket,
  targetRevenue,
  trafficInvestment,
  costPerLead,
  schedulingRate,
  fixedScheduledMeetings,
}: {
  scheduledMeetings: number;
  showRate: number;
  pitchRate: number;
  conversionRate: number;
  averageTicket: number;
  targetRevenue: number;
  trafficInvestment: number;
  costPerLead: number;
  schedulingRate: number;
  fixedScheduledMeetings: boolean;
}) {
  const derivedScheduledMeetings = calculateTrafficScheduledMeetings(trafficInvestment, costPerLead, schedulingRate);
  const effectiveScheduledMeetings = fixedScheduledMeetings ? Math.max(0, scheduledMeetings) : derivedScheduledMeetings;
  const projectedCompleted = safeCeil(effectiveScheduledMeetings * (showRate / 100));
  const projectedPitches = safeCeil(projectedCompleted * (pitchRate / 100));
  const projectedSales = safeCeil(projectedPitches * (conversionRate / 100));
  const projectedRevenue = projectedSales * averageTicket;

  return {
    trafficLeads: calculateTrafficLeads(trafficInvestment, costPerLead),
    derivedScheduledMeetings,
    effectiveScheduledMeetings,
    projectedCompleted,
    projectedPitches,
    projectedSales,
    projectedRevenue,
    showRate,
    pitchRate,
    realConversionRate: conversionRate,
    gapToTarget: projectedRevenue - targetRevenue,
    conversion: conversionRate,
    ticket: averageTicket,
    scheduled: Math.ceil(effectiveScheduledMeetings),
    completed: Math.ceil(projectedCompleted),
    pitches: Math.ceil(projectedPitches),
    sales: Math.ceil(projectedSales),
    revenue: projectedRevenue,
  };
}

function calculateGoalProjection({
  targetRevenue,
  ticket,
  conversionRate,
  showRate,
  pitchRate,
  fixedSales,
}: {
  targetRevenue: number;
  ticket: number;
  conversionRate: number;
  showRate: number;
  pitchRate: number;
  fixedSales?: number;
}) {
  const safeTicket = ticket > 0 ? ticket : DEFAULT_TICKET;
  const safeConversion = Math.min(100, Math.max(1, conversionRate > 0 ? conversionRate : DEFAULT_CONVERSION_RATE));
  const safeShowRate = Math.min(100, Math.max(1, showRate > 0 ? showRate : DEFAULT_SHOW_RATE));
  const safePitchRate = Math.min(100, Math.max(1, pitchRate > 0 ? pitchRate : DEFAULT_PITCH_RATE));
  const resolvedSales = fixedSales && fixedSales > 0 ? fixedSales : safeCeil(targetRevenue / safeTicket);
  const resolvedTicket = fixedSales && fixedSales > 0 ? targetRevenue / Math.max(fixedSales, 1) : safeTicket;
  const pitches = safeCeil(resolvedSales / (safeConversion / 100));
  const completed = safeCeil(pitches / (safePitchRate / 100));
  const scheduled = safeCeil(completed / (safeShowRate / 100));

  return {
    trafficLeads: 0,
    derivedScheduledMeetings: scheduled,
    effectiveScheduledMeetings: scheduled,
    projectedCompleted: completed,
    projectedPitches: pitches,
    projectedSales: resolvedSales,
    projectedRevenue: targetRevenue,
    showRate: safeShowRate,
    pitchRate: safePitchRate,
    realConversionRate: safeConversion,
    gapToTarget: 0,
    conversion: safeConversion,
    ticket: resolvedTicket,
    scheduled,
    completed,
    pitches,
    sales: resolvedSales,
    revenue: targetRevenue,
  };
}

function calculateGoalTrafficPlan({
  goalScheduledMeetings,
  trafficInvestment,
  costPerLead,
  schedulingRate,
  fixedTrafficInvestment,
  fixedCostPerLead,
}: {
  goalScheduledMeetings: number;
  trafficInvestment: number;
  costPerLead: number;
  schedulingRate: number;
  fixedTrafficInvestment: boolean;
  fixedCostPerLead: boolean;
}) {
  const safeSchedulingRate = Math.min(100, Math.max(1, schedulingRate > 0 ? schedulingRate : DEFAULT_SCHEDULING_RATE));
  const requiredLeads = safeCeil(goalScheduledMeetings / (safeSchedulingRate / 100));
  const currentInvestment = trafficInvestment > 0 ? trafficInvestment : DEFAULT_TRAFFIC_INVESTMENT;
  const currentCostPerLead = costPerLead > 0 ? costPerLead : DEFAULT_COST_PER_LEAD;

  if (fixedTrafficInvestment && fixedCostPerLead) {
    return {
      leads: requiredLeads,
      investment: currentInvestment,
      costPerLead: currentCostPerLead,
      derivedInvestment: currentInvestment,
      derivedCostPerLead: currentCostPerLead,
    };
  }

  if (fixedTrafficInvestment) {
    const derivedCostPerLead = requiredLeads > 0 ? currentInvestment / requiredLeads : currentCostPerLead;
    return {
      leads: requiredLeads,
      investment: currentInvestment,
      costPerLead: derivedCostPerLead,
      derivedInvestment: currentInvestment,
      derivedCostPerLead,
    };
  }

  if (fixedCostPerLead) {
    const derivedInvestment = requiredLeads * currentCostPerLead;
    return {
      leads: requiredLeads,
      investment: derivedInvestment,
      costPerLead: currentCostPerLead,
      derivedInvestment,
      derivedCostPerLead: currentCostPerLead,
    };
  }

  const derivedCostPerLead = currentCostPerLead;
  const derivedInvestment = requiredLeads * derivedCostPerLead;
  return {
    leads: requiredLeads,
    investment: derivedInvestment,
    costPerLead: derivedCostPerLead,
    derivedInvestment,
    derivedCostPerLead,
  };
}

export default function ComercialProjecao() {
  const [scheduledMeetings, setScheduledMeetings] = useState(100);
  const [completedMeetings, setCompletedMeetings] = useState(70);
  const [pitchMeetings, setPitchMeetings] = useState(45);
  const [sales, setSales] = useState(12);
  const [trafficInvestment, setTrafficInvestment] = useState(DEFAULT_TRAFFIC_INVESTMENT);
  const [costPerLead, setCostPerLead] = useState(DEFAULT_COST_PER_LEAD);
  const [schedulingRate, setSchedulingRate] = useState([DEFAULT_SCHEDULING_RATE]);
  const [showRate, setShowRate] = useState([DEFAULT_SHOW_RATE]);
  const [pitchRate, setPitchRate] = useState([DEFAULT_PITCH_RATE]);
  const [conversionRate, setConversionRate] = useState([25]);
  const [averageTicket, setAverageTicket] = useState(12000);
  const [targetRevenue, setTargetRevenue] = useState(300000);
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('traffic');
  const [fixedMetrics, setFixedMetrics] = useState<Record<FixedMetric, boolean>>({
    scheduledMeetings: false,
    completedMeetings: false,
    pitchMeetings: false,
    sales: false,
    averageTicket: false,
    conversionRate: false,
    trafficInvestment: false,
    costPerLead: false,
  });

  const toggleFixedMetric = (metric: FixedMetric) => {
    setFixedMetrics((current) => ({
      ...current,
      [metric]: !current[metric],
    }));
  };

  const trafficProjection = useMemo(() => {
    return calculateTrafficProjection({
      scheduledMeetings,
      showRate: showRate[0],
      pitchRate: pitchRate[0],
      conversionRate: conversionRate[0],
      averageTicket,
      targetRevenue,
      trafficInvestment,
      costPerLead,
      schedulingRate: schedulingRate[0],
      fixedScheduledMeetings: fixedMetrics.scheduledMeetings,
    });
  }, [averageTicket, costPerLead, conversionRate, fixedMetrics.scheduledMeetings, pitchRate, schedulingRate, scheduledMeetings, showRate, targetRevenue, trafficInvestment]);
  const goalProjection = useMemo(() => {
    return calculateGoalProjection({
      targetRevenue,
      ticket: averageTicket,
      conversionRate: conversionRate[0],
      showRate: showRate[0],
      pitchRate: pitchRate[0],
      fixedSales: fixedMetrics.sales ? sales : undefined,
    });
  }, [averageTicket, conversionRate, fixedMetrics.sales, pitchRate, sales, showRate, targetRevenue]);
  const activeProjection = simulationMode === 'goal' ? goalProjection : trafficProjection;
  const scheduledMeetingsDisplay = fixedMetrics.scheduledMeetings ? scheduledMeetings : trafficProjection.effectiveScheduledMeetings;
  const goalTrafficPlan = useMemo(() => {
    return calculateGoalTrafficPlan({
      goalScheduledMeetings: goalProjection.scheduled,
      trafficInvestment,
      costPerLead,
      schedulingRate: schedulingRate[0],
      fixedTrafficInvestment: fixedMetrics.trafficInvestment,
      fixedCostPerLead: fixedMetrics.costPerLead,
    });
  }, [costPerLead, fixedMetrics.costPerLead, fixedMetrics.trafficInvestment, goalProjection.scheduled, schedulingRate, trafficInvestment]);

  const targetScenarios = useMemo(() => {
    const safeTicket = goalProjection.ticket > 0 ? goalProjection.ticket : DEFAULT_TICKET;
    const safeConversion = normalizeRate(goalProjection.conversion, DEFAULT_CONVERSION_RATE);
    const safeShowRate = normalizeRate(showRate[0], DEFAULT_SHOW_RATE);
    const safePitchRate = normalizeRate(pitchRate[0], DEFAULT_PITCH_RATE);
    const fixedScenario = calculateGoalScenario({
      targetRevenue,
      ticket: safeTicket,
      conversionRate: safeConversion,
      showRate: safeShowRate,
      pitchRate: safePitchRate,
      fixedSales: fixedMetrics.sales ? sales : undefined,
    });
    const conversionScenario = calculateGoalScenario({
      targetRevenue,
      ticket: safeTicket,
      conversionRate: Math.min(100, safeConversion * 1.25),
      showRate: safeShowRate,
      pitchRate: safePitchRate,
      fixedSales: fixedMetrics.sales ? sales : undefined,
    });
    const ticketScenario = calculateGoalScenario({
      targetRevenue,
      ticket: safeTicket * 1.15,
      conversionRate: safeConversion,
      showRate: safeShowRate,
      pitchRate: safePitchRate,
      fixedSales: fixedMetrics.sales ? sales : undefined,
    });
    const attendanceScenario = calculateGoalScenario({
      targetRevenue,
      ticket: safeTicket,
      conversionRate: safeConversion,
      showRate: Math.min(100, safeShowRate * 1.15),
      pitchRate: safePitchRate,
      fixedSales: fixedMetrics.sales ? sales : undefined,
    });

    return [
      {
        name: 'Cenario com campos fixos',
        note: 'Respeita os campos que voce marcou como fixos no simulador.',
        ...fixedScenario,
      },
      {
        name: 'Cenario conversao melhor',
        note: 'Aumenta conversao em 25% e mantem ticket atual.',
        ...conversionScenario,
      },
      {
        name: 'Cenario ticket maior',
        note: 'Aumenta ticket medio em 15% e mantem conversao atual.',
        ...ticketScenario,
      },
      {
        name: 'Cenario maquina cheia',
        note: 'Melhora comparecimento em 15% sem aumentar ticket.',
        ...attendanceScenario,
      },
    ];
  }, [fixedMetrics.sales, goalProjection, pitchRate, sales, showRate, targetRevenue]);

  const simulateProjection = () => {
    setSimulationMode('traffic');
  };

  const simulateGoal = () => {
    setSimulationMode('goal');
    if (!fixedMetrics.trafficInvestment) {
      setTrafficInvestment(goalTrafficPlan.investment);
    }
    if (!fixedMetrics.costPerLead) {
      setCostPerLead(goalTrafficPlan.costPerLead);
    }
    if (!fixedMetrics.scheduledMeetings) {
      setScheduledMeetings(goalProjection.scheduled);
    }
    if (!fixedMetrics.completedMeetings) {
      setCompletedMeetings(goalProjection.completed);
    }
    if (!fixedMetrics.pitchMeetings) {
      setPitchMeetings(goalProjection.pitches);
    }
    if (!fixedMetrics.sales) {
      setSales(goalProjection.sales);
    }
    if (!fixedMetrics.averageTicket) {
      setAverageTicket(goalProjection.ticket);
    }
    if (!fixedMetrics.conversionRate) {
      setConversionRate([goalProjection.conversion]);
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          Projecao Comercial
        </h1>
        <p className="text-muted-foreground mt-1">
          Simule manualmente o funil do proximo mes e veja quais metricas sao necessarias para bater a meta de faturamento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard
          label="Agendamentos"
          value={(fixedMetrics.scheduledMeetings ? scheduledMeetings : trafficProjection.effectiveScheduledMeetings).toString()}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <KPICard label="Reunioes Realizadas" value={activeProjection.projectedCompleted.toString()} icon={<Users className="h-5 w-5" />} />
        <KPICard label="Reunioes com Pitch" value={activeProjection.projectedPitches.toString()} icon={<Presentation className="h-5 w-5" />} />
        <KPICard label="Vendas" value={activeProjection.projectedSales.toString()} icon={<Target className="h-5 w-5" />} />
        <KPICard label="Conversao Simulada" value={`${conversionRate[0].toFixed(1)}%`} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Simulador manual do funil</CardTitle>
            <CardDescription>
              Preencha as metricas manualmente enquanto a planilha oficial ainda nao foi conectada a plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Quantos agendamentos?</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.scheduledMeetings} onCheckedChange={() => toggleFixedMetric('scheduledMeetings')} />
                    Fixar
                  </label>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={String(scheduledMeetingsDisplay)}
                  onChange={(event) => {
                    if (fixedMetrics.scheduledMeetings) {
                      setScheduledMeetings(toNumber(event.target.value));
                    }
                  }}
                  disabled={!fixedMetrics.scheduledMeetings}
                />
                <p className="text-xs text-muted-foreground">
                  Se nao fixar, calculamos pelos campos de trafego abaixo.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Quantas reunioes realizadas?</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.completedMeetings} onCheckedChange={() => toggleFixedMetric('completedMeetings')} />
                    Fixar
                  </label>
                </div>
                <Input type="number" min={0} {...numberInput(completedMeetings, setCompletedMeetings)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Quantas tiveram pitch?</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.pitchMeetings} onCheckedChange={() => toggleFixedMetric('pitchMeetings')} />
                    Fixar
                  </label>
                </div>
                <Input type="number" min={0} {...numberInput(pitchMeetings, setPitchMeetings)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Quantas vendas?</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.sales} onCheckedChange={() => toggleFixedMetric('sales')} />
                    Fixar
                  </label>
                </div>
                <Input type="number" min={0} {...numberInput(sales, setSales)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Investimento em anuncio</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.trafficInvestment} onCheckedChange={() => toggleFixedMetric('trafficInvestment')} />
                    Fixar
                  </label>
                </div>
                <Input inputMode="decimal" {...numberInput(trafficInvestment, setTrafficInvestment)} />
                <p className="text-xs text-muted-foreground">
                  Se nao fixar, o simulador calcula um valor recomendado para bater a meta.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Custo por lead</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.costPerLead} onCheckedChange={() => toggleFixedMetric('costPerLead')} />
                    Fixar
                  </label>
                </div>
                <Input inputMode="decimal" {...numberInput(costPerLead, setCostPerLead)} />
                <p className="text-xs text-muted-foreground">
                  Se nao fixar, o simulador calcula um CPL recomendado para a projeção.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Ticket medio esperado</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.averageTicket} onCheckedChange={() => toggleFixedMetric('averageTicket')} />
                    Fixar
                  </label>
                </div>
                <Input inputMode="decimal" {...numberInput(averageTicket, setAverageTicket)} />
              </div>
              <div className="space-y-2">
                <Label>Faturamento desejado</Label>
                <Input inputMode="decimal" {...numberInput(targetRevenue, setTargetRevenue)} />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border bg-background p-4">
              <div className="flex items-center justify-between text-sm">
                <span>Taxa de agendamento</span>
                <strong>{schedulingRate[0].toFixed(1)}%</strong>
              </div>
              <Slider value={schedulingRate} onValueChange={setSchedulingRate} min={0} max={100} step={0.5} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Base estimada: {formatBRL(trafficInvestment)} investidos / {formatBRL(costPerLead)} por lead = {trafficProjection.trafficLeads} leads, resultando em {trafficProjection.derivedScheduledMeetings} agendamentos.
              </p>
            </div>

            <div className="space-y-5 rounded-xl border bg-muted/20 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Taxa de comparecimento</span>
                  <strong>{showRate[0].toFixed(1)}%</strong>
                </div>
                <Slider value={showRate} onValueChange={setShowRate} min={0} max={100} step={0.5} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Taxa de pitch</span>
                  <strong>{pitchRate[0].toFixed(1)}%</strong>
                </div>
                <Slider value={pitchRate} onValueChange={setPitchRate} min={0} max={100} step={0.5} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Conversao real informada</span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={fixedMetrics.conversionRate} onCheckedChange={() => toggleFixedMetric('conversionRate')} />
                  Fixar em {conversionRate[0].toFixed(1)}%
                </label>
              </div>
              <Slider value={conversionRate} onValueChange={setConversionRate} min={0} max={100} step={0.5} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" onClick={simulateProjection} className="h-11">
                Simular projecao
              </Button>
              <Button type="button" variant="outline" onClick={simulateGoal} className="h-11">
                Simular meta
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Taxa de comparecimento</p>
                <p className="mt-1 text-2xl font-bold">{activeProjection.showRate.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Taxa de pitch</p>
                <p className="mt-1 text-2xl font-bold">{activeProjection.pitchRate.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Conversao real informada</p>
                <p className="mt-1 text-2xl font-bold">{activeProjection.realConversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Resultado da simulacao</CardTitle>
            <CardDescription>
              O faturamento abaixo usa vendas e ticket medio esperado. Use "Simular projecao" para calcular o funil pelos agendamentos e taxas, ou "Simular meta" para calcular de tras para frente pelo faturamento desejado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {simulationMode === 'goal' ? 'Vendas necessárias' : 'Vendas projetadas'}
              </span>
              <strong>{activeProjection.projectedSales.toFixed(1)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {simulationMode === 'goal' ? 'Agendamentos necessários' : 'Agendamentos estimados'}
              </span>
              <strong>{simulationMode === 'goal' ? goalProjection.scheduled.toString() : String(trafficProjection.effectiveScheduledMeetings)}</strong>
            </div>
            {simulationMode === 'goal' ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Agendamentos pelo tráfego atual</span>
                <strong>{trafficProjection.effectiveScheduledMeetings.toString()}</strong>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {simulationMode === 'goal' ? 'Ticket médio alvo' : 'Ticket medio'}
              </span>
              <strong>{formatBRL(simulationMode === 'goal' ? goalProjection.ticket : averageTicket)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {simulationMode === 'goal' ? 'Investimento recomendado' : 'Investimento em anuncio'}
              </span>
              <strong>{formatBRL(simulationMode === 'goal' ? goalTrafficPlan.investment : trafficInvestment)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {simulationMode === 'goal' ? 'CPL recomendado' : 'Custo por lead'}
              </span>
              <strong>{formatBRL(simulationMode === 'goal' ? goalTrafficPlan.costPerLead : costPerLead)}</strong>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              <p className="text-sm text-muted-foreground">Faturamento projetado</p>
              <p className="text-3xl font-bold mt-1">{formatBRL(activeProjection.projectedRevenue)}</p>
              <p className="text-sm mt-2">
                Diferenca vs. meta: <strong>{activeProjection.gapToTarget >= 0 ? '+' : ''}{formatBRL(activeProjection.gapToTarget)}</strong>
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <p className="font-medium">Meta desejada: {formatBRLShort(targetRevenue)}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Para bater essa meta, o plano alvo recalcula vendas, agendamentos e ticket com base nas taxas escolhidas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cenarios necessarios para bater a meta</CardTitle>
          <CardDescription>
            A plataforma calcula caminhos possiveis para chegar no faturamento desejado usando as taxas informadas no simulador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {targetScenarios.map((scenario) => (
              <div key={scenario.name} className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="font-semibold">{scenario.name}</p>
                <p className="mt-1 min-h-[40px] text-sm text-muted-foreground">{scenario.note}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><span>Agendamentos</span><strong>{scenario.scheduled}</strong></div>
                  <div className="flex justify-between gap-4"><span>Realizadas</span><strong>{scenario.completed}</strong></div>
                  <div className="flex justify-between gap-4"><span>Com pitch</span><strong>{scenario.pitches}</strong></div>
                  <div className="flex justify-between gap-4"><span>Vendas</span><strong>{scenario.sales}</strong></div>
                  <div className="flex justify-between gap-4"><span>Conversao</span><strong>{scenario.conversion.toFixed(1)}%</strong></div>
                  <div className="flex justify-between gap-4"><span>Ticket</span><strong>{formatBRLShort(scenario.ticket)}</strong></div>
                  <div className="flex justify-between gap-4 border-t pt-2"><span>Faturamento</span><strong>{formatBRLShort(scenario.revenue)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
