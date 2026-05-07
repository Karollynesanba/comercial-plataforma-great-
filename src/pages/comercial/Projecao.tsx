import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, CalendarDays, DollarSign, Presentation, Target, TrendingUp, Users } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { KPICard } from '@/components/dashboard/KPICard';
import { formatBRL, formatBRLShort } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { setCommercialSetting } from '@/lib/commercialCloudStore';

const DEFAULT_TICKET = 12000;
const DEFAULT_LEAD_VALUE = 100;
const DEFAULT_SCHEDULING_RATE = 100;
const DEFAULT_SHOW_RATE = 70;
const DEFAULT_PITCH_RATE = 65;
const DEFAULT_CONVERSION_RATE = 25;
const DEFAULT_AD_INVESTMENT = 10000;
const PROJECTION_SETTING_KEY = 'commercial_projection_state_v2';

type ProjectionState = {
  ticketMedian: number;
  schedulingCost: number;
  adInvestment: number;
  desiredRevenue: number;
  schedulingRate: number[];
  showRate: number[];
  pitchRate: number[];
  conversionRate: number[];
  fixedMetrics: Record<FixedMetric, boolean>;
};

type SyncStatus = 'loading' | 'saving' | 'saved' | 'error';
type FixedMetric = 'ticketMedian' | 'schedulingCost' | 'adInvestment' | 'desiredRevenue';

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

function safeCeil(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.ceil(value);
}

function clampRate(value: number, fallback: number) {
  const safe = value > 0 ? value : fallback;
  return Math.min(100, Math.max(0, safe));
}

function calculateProjection({
  ticketMedian,
  schedulingCost,
  adInvestment,
  desiredRevenue,
  schedulingRate,
  showRate,
  pitchRate,
  conversionRate,
}: {
  ticketMedian: number;
  schedulingCost: number;
  adInvestment: number;
  desiredRevenue: number;
  schedulingRate: number;
  showRate: number;
  pitchRate: number;
  conversionRate: number;
}) {
  const safeTicket = ticketMedian > 0 ? ticketMedian : DEFAULT_TICKET;
  const safeSchedulingCost = schedulingCost > 0 ? schedulingCost : DEFAULT_LEAD_VALUE;
  const safeSchedulingRate = clampRate(schedulingRate, DEFAULT_SCHEDULING_RATE) / 100;
  const safeShowRate = clampRate(showRate, DEFAULT_SHOW_RATE) / 100;
  const safePitchRate = clampRate(pitchRate, DEFAULT_PITCH_RATE) / 100;
  const safeConversionRate = clampRate(conversionRate, DEFAULT_CONVERSION_RATE) / 100;

  const currentLeads = adInvestment > 0 && safeSchedulingCost > 0 ? Math.floor(adInvestment / safeSchedulingCost) : 0;
  const currentScheduled = safeCeil(currentLeads * safeSchedulingRate);
  const currentCompleted = safeCeil(currentScheduled * safeShowRate);
  const currentPitches = safeCeil(currentCompleted * safePitchRate);
  const currentSales = safeCeil(currentPitches * safeConversionRate);
  const currentRevenue = currentSales * safeTicket;
  const costPerScheduling = currentScheduled > 0 ? adInvestment / currentScheduled : 0;

  const requiredSales = safeCeil(desiredRevenue / safeTicket);
  const requiredPitches = safeCeil(requiredSales / Math.max(safeConversionRate, 0.0001));
  const requiredCompleted = safeCeil(requiredPitches / Math.max(safePitchRate, 0.0001));
  const requiredScheduled = safeCeil(requiredCompleted / Math.max(safeShowRate, 0.0001));
  const requiredLeads = safeCeil(requiredScheduled / Math.max(safeSchedulingRate, 0.0001));
  const recommendedAdInvestment = requiredLeads * safeSchedulingCost;
  const recommendedCostPerScheduling = requiredScheduled > 0 ? recommendedAdInvestment / requiredScheduled : 0;

  return {
    currentLeads,
    currentScheduled,
    currentCompleted,
    currentPitches,
    currentSales,
    currentRevenue,
    costPerScheduling,
    requiredSales,
    requiredPitches,
    requiredCompleted,
    requiredScheduled,
    requiredLeads,
    recommendedAdInvestment,
    recommendedCostPerScheduling,
    revenueGap: currentRevenue - desiredRevenue,
    ticketMedian: safeTicket,
    schedulingCost: safeSchedulingCost,
    schedulingRate: safeSchedulingRate * 100,
    showRate: safeShowRate * 100,
    pitchRate: safePitchRate * 100,
    conversionRate: safeConversionRate * 100,
  };
}

export default function ComercialProjecao() {
  const { user } = useAuth();
  const [ticketMedian, setTicketMedian] = useState(DEFAULT_TICKET);
  const [schedulingCost, setSchedulingCost] = useState(DEFAULT_LEAD_VALUE);
  const [adInvestment, setAdInvestment] = useState(DEFAULT_AD_INVESTMENT);
  const [desiredRevenue, setDesiredRevenue] = useState(300000);
  const [schedulingRate, setSchedulingRate] = useState([DEFAULT_SCHEDULING_RATE]);
  const [showRate, setShowRate] = useState([DEFAULT_SHOW_RATE]);
  const [pitchRate, setPitchRate] = useState([DEFAULT_PITCH_RATE]);
  const [conversionRate, setConversionRate] = useState([DEFAULT_CONVERSION_RATE]);
  const [fixedMetrics, setFixedMetrics] = useState<Record<FixedMetric, boolean>>({
    ticketMedian: false,
    schedulingCost: false,
    adInvestment: false,
    desiredRevenue: false,
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [lastSimulatedAt, setLastSimulatedAt] = useState<number | null>(null);
  const hydratedRef = useRef(false);

  const toggleFixedMetric = (metric: FixedMetric) => {
    setFixedMetrics((current) => ({
      ...current,
      [metric]: !current[metric],
    }));
  };

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      if (!isSupabaseConfigured) {
        if (mounted) {
          hydratedRef.current = true;
          setSyncStatus('saved');
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('commercial_settings')
          .select('setting_value')
          .eq('setting_key', PROJECTION_SETTING_KEY)
          .maybeSingle();

        if (error) throw error;

        if (data?.setting_value && mounted) {
          const parsed = JSON.parse(data.setting_value) as Partial<ProjectionState> & { leadValue?: number };
          const savedSchedulingCost = parsed.schedulingCost ?? parsed.leadValue ?? DEFAULT_LEAD_VALUE;
          setTicketMedian(parsed.ticketMedian ?? DEFAULT_TICKET);
          setSchedulingCost(savedSchedulingCost);
          setAdInvestment(parsed.adInvestment ?? DEFAULT_AD_INVESTMENT);
          setDesiredRevenue(parsed.desiredRevenue ?? 300000);
          setSchedulingRate(Array.isArray(parsed.schedulingRate) && parsed.schedulingRate.length > 0 ? parsed.schedulingRate : [DEFAULT_SCHEDULING_RATE]);
          setShowRate(Array.isArray(parsed.showRate) && parsed.showRate.length > 0 ? parsed.showRate : [DEFAULT_SHOW_RATE]);
          setPitchRate(Array.isArray(parsed.pitchRate) && parsed.pitchRate.length > 0 ? parsed.pitchRate : [DEFAULT_PITCH_RATE]);
          setConversionRate(Array.isArray(parsed.conversionRate) && parsed.conversionRate.length > 0 ? parsed.conversionRate : [DEFAULT_CONVERSION_RATE]);
          setFixedMetrics(parsed.fixedMetrics ?? {
            ticketMedian: false,
            schedulingCost: false,
            adInvestment: false,
            desiredRevenue: false,
          });
        }

        if (mounted) {
          hydratedRef.current = true;
          setSyncStatus('saved');
        }
      } catch (error) {
        console.error('Erro ao carregar a projecao:', error);
        if (mounted) {
          hydratedRef.current = true;
          setSyncStatus('error');
        }
      }
    }

    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || !isSupabaseConfigured) return;

    const nextState: ProjectionState = {
      ticketMedian,
      schedulingCost,
      adInvestment,
      desiredRevenue,
      schedulingRate,
      showRate,
      pitchRate,
      conversionRate,
      fixedMetrics,
    };

    const timeoutId = window.setTimeout(() => {
      setSyncStatus('saving');
      void setCommercialSetting(PROJECTION_SETTING_KEY, JSON.stringify(nextState), user?.id)
        .then(() => setSyncStatus('saved'))
        .catch((error) => {
          console.error('Erro ao salvar a projecao:', error);
          setSyncStatus('error');
        });
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [
    adInvestment,
    conversionRate,
    desiredRevenue,
    fixedMetrics,
    pitchRate,
    schedulingRate,
    schedulingCost,
    showRate,
    ticketMedian,
    user?.id,
  ]);

  const projection = useMemo(() => calculateProjection({
    ticketMedian,
    schedulingCost,
    adInvestment,
    desiredRevenue,
    schedulingRate: schedulingRate[0] ?? DEFAULT_SCHEDULING_RATE,
    showRate: showRate[0] ?? DEFAULT_SHOW_RATE,
    pitchRate: pitchRate[0] ?? DEFAULT_PITCH_RATE,
    conversionRate: conversionRate[0] ?? DEFAULT_CONVERSION_RATE,
  }), [adInvestment, conversionRate, desiredRevenue, pitchRate, schedulingCost, schedulingRate, showRate, ticketMedian]);
  const schedulingRateValue = schedulingRate[0] ?? DEFAULT_SCHEDULING_RATE;
  const showRateValue = showRate[0] ?? DEFAULT_SHOW_RATE;
  const pitchRateValue = pitchRate[0] ?? DEFAULT_PITCH_RATE;
  const conversionRateValue = conversionRate[0] ?? DEFAULT_CONVERSION_RATE;
  const simulatorCards = useMemo(() => ([
    {
      label: 'Leads necessários',
      value: projection.requiredLeads.toString(),
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Agendamentos necessários',
      value: projection.requiredScheduled.toString(),
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: 'Vendas necessárias',
      value: projection.requiredSales.toString(),
      icon: <Target className="h-5 w-5" />,
    },
    {
      label: 'Faturamento alvo',
      value: formatBRL(desiredRevenue),
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: 'Custo por lead',
      value: formatBRL(projection.recommendedCostPerScheduling),
      icon: <DollarSign className="h-5 w-5" />,
    },
  ]), [desiredRevenue, projection.recommendedCostPerScheduling, projection.requiredLeads, projection.requiredSales, projection.requiredScheduled]);

  const simulateGoal = () => {
    setLastSimulatedAt(Date.now());
  };

  const highlight = lastSimulatedAt ? 'ring-2 ring-primary/30' : '';

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          Projecao Comercial
        </h1>
        <p className="text-muted-foreground mt-1">
          Informe ticket medio, custo por lead, investimento em anuncio, taxas e faturamento desejado para a plataforma calcular o funil necessario.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {syncStatus === 'loading' && 'Carregando configuracao salva do banco...'}
          {syncStatus === 'saving' && 'Salvando projecao no banco...'}
          {syncStatus === 'saved' && 'Projecao sincronizada com o banco de dados.'}
          {syncStatus === 'error' && 'Falha ao sincronizar a projecao com o banco. Revise a conexao com o Supabase.'}
        </p>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle>Caminho até a meta</CardTitle>
          <CardDescription>
            Esses números mostram o volume necessário para chegar ao faturamento desejado com as taxas informadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {simulatorCards.map((card) => (
              <KPICard key={card.label} label={card.label} value={card.value} icon={card.icon} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Simulador de meta</CardTitle>
            <CardDescription>
              Ajuste os números e clique em Simular meta para ver as métricas necessárias para bater o faturamento desejado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Ticket medio</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.ticketMedian} onCheckedChange={() => toggleFixedMetric('ticketMedian')} />
                    Fixar
                  </label>
                </div>
                <Input type="number" min={0} {...numberInput(ticketMedian, setTicketMedian)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                <Label>Custo por lead</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.schedulingCost} onCheckedChange={() => toggleFixedMetric('schedulingCost')} />
                    Fixar
                  </label>
                </div>
                <Input type="number" min={0} {...numberInput(schedulingCost, setSchedulingCost)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Investimento em anuncio</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.adInvestment} onCheckedChange={() => toggleFixedMetric('adInvestment')} />
                    Fixar
                  </label>
                </div>
                <Input inputMode="decimal" {...numberInput(adInvestment, setAdInvestment)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Faturamento desejado</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={fixedMetrics.desiredRevenue} onCheckedChange={() => toggleFixedMetric('desiredRevenue')} />
                    Fixar
                  </label>
                </div>
                <Input inputMode="decimal" {...numberInput(desiredRevenue, setDesiredRevenue)} />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border bg-background p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Taxa de agendamento</span>
                  <strong>{schedulingRateValue.toFixed(1)}%</strong>
                </div>
              <Slider value={schedulingRate} onValueChange={setSchedulingRate} min={0} max={100} step={0.5} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="space-y-5 rounded-xl border bg-muted/20 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Taxa de comparecimento</span>
                  <strong>{showRateValue.toFixed(1)}%</strong>
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
                  <strong>{pitchRateValue.toFixed(1)}%</strong>
                </div>
                <Slider value={pitchRate} onValueChange={setPitchRate} min={0} max={100} step={0.5} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Taxa de conversao</span>
                  <strong>{conversionRateValue.toFixed(1)}%</strong>
                </div>
                <Slider value={conversionRate} onValueChange={setConversionRate} min={0} max={100} step={0.5} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div className="flex">
              <Button type="button" onClick={simulateGoal} className={`h-11 ${highlight}`}>
                Simular meta
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Resultado da simulação</CardTitle>
            <CardDescription>
              Os números abaixo mostram quantos leads, agendamentos, reuniões e vendas você precisa para atingir o faturamento desejado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Leads necessários</span>
              <strong>{projection.requiredLeads.toString()}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Agendamentos necessários</span>
              <strong>{projection.requiredScheduled.toString()}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reuniões realizadas necessárias</span>
              <strong>{projection.requiredCompleted.toString()}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pitchs necessários</span>
              <strong>{projection.requiredPitches.toString()}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vendas necessárias</span>
              <strong>{projection.requiredSales.toString()}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ticket médio</span>
              <strong>{formatBRL(projection.ticketMedian)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Custo por lead</span>
              <strong>{formatBRL(projection.costPerScheduling)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Investimento recomendado</span>
              <strong>{formatBRL(projection.recommendedAdInvestment)}</strong>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              <p className="text-sm text-muted-foreground">Faturamento desejado</p>
              <p className="text-3xl font-bold mt-1">{formatBRL(desiredRevenue)}</p>
              <p className="text-sm mt-2">
                Resultado atual: <strong>{formatBRL(projection.currentRevenue)}</strong>
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <p className="font-medium">Meta planejada: {formatBRLShort(desiredRevenue)}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                A plataforma recalcula o funil de trás para frente com base nas taxas e no ticket médio que você informou.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
