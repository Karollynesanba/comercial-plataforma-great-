import { Fragment, useEffect, useMemo, useState } from 'react';
import { Award, ClipboardList, PhoneCall, Save, UserRound, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KPICard } from '@/components/dashboard/KPICard';
import { AGENDADOR_OPTIONS, OFFICIAL_SDR_OPTIONS, OFFICIAL_SDR_VALUES, useCommercial, type Agendador } from '@/contexts/CommercialContext';
import { RaioXFilters, filterClientByRaioX, getDefaultRaioXFilter, type RaioXFilterState } from '@/components/comercial/RaioXFilters';
import { formatBRL } from '@/lib/utils';
import { getScheduleDate, parseCalendarDate, summarizePreVenda } from '@/lib/preVendaAnalytics';

type DailyDraft = {
  contacts: string;
  qualified: string;
  scheduled: string;
  noShowCalls: string;
};

type SheetMetrics = {
  contacts: number;
  qualified: number;
  scheduled: number;
  noShowCalls: number;
};

type WeekGroup = {
  label: string;
  dates: string[];
};

const SDRS = [
  { value: 'MIGUEL' as Agendador, label: 'Miguel' },
  { value: 'HEBERT' as Agendador, label: 'Herbert' },
];

const MONEY_REVENUE_STAGES = ['FECHADO', 'TAXA_INTERESSE'] as const;

const emptyDraft = (): DailyDraft => ({
  contacts: '0',
  qualified: '0',
  scheduled: '0',
  noShowCalls: '0',
});

const emptyMetrics = (): SheetMetrics => ({
  contacts: 0,
  qualified: 0,
  scheduled: 0,
  noShowCalls: 0,
});

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateBR(date: string) {
  return date.split('-').reverse().join('/');
}

function parseNumber(value: string | number | undefined) {
  return Math.max(0, Number(value) || 0);
}

function rate(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function addMetrics(a: SheetMetrics, b: SheetMetrics): SheetMetrics {
  return {
    contacts: a.contacts + b.contacts,
    qualified: a.qualified + b.qualified,
    scheduled: a.scheduled + b.scheduled,
    noShowCalls: a.noShowCalls + b.noShowCalls,
  };
}

function getDraftMetrics(draft: DailyDraft | undefined): SheetMetrics {
  return {
    contacts: parseNumber(draft?.contacts),
    qualified: parseNumber(draft?.qualified),
    scheduled: parseNumber(draft?.scheduled),
    noShowCalls: parseNumber(draft?.noShowCalls),
  };
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
    return existingDates.length > 0 ? [...existingDates].sort() : [toIsoDate(new Date())];
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

export default function RaioXSDR() {
  const { pipelineClients, preSalesDailyLogs, upsertPreSalesDailyLog } = useCommercial();
  const [filter, setFilter] = useState<RaioXFilterState>(getDefaultRaioXFilter);
  const [drafts, setDrafts] = useState<Record<string, DailyDraft>>({});

  const clients = useMemo(() =>
    pipelineClients.filter((client) => {
      const scheduleDate = parseCalendarDate(getScheduleDate(client));
      return scheduleDate ? filterClientByRaioX(scheduleDate.toISOString(), filter) : false;
    }),
    [filter, pipelineClients]
  );

  const officialClients = useMemo(() =>
    clients.filter((client) =>
      Boolean(client.agendadoPor) &&
      OFFICIAL_SDR_VALUES.includes(client.agendadoPor)
    ),
    [clients]
  );

  const officialDailyLogs = useMemo(() =>
    preSalesDailyLogs.filter((log) => OFFICIAL_SDR_VALUES.includes(log.sdr as Agendador)),
    [preSalesDailyLogs]
  );

  const visibleDates = useMemo(() => {
    const filteredDates = Array.from(new Set(
      officialDailyLogs
        .filter((log) => filterClientByRaioX(log.date, filter))
        .map((log) => log.date)
    ));

    return getDateRange(filter, filteredDates);
  }, [filter, officialDailyLogs]);

  const weekGroups = useMemo(() => groupDatesByWeek(visibleDates), [visibleDates]);
  const overview = useMemo(() =>
    summarizePreVenda('Geral', clients, clients.length, { revenueStages: [...MONEY_REVENUE_STAGES] }),
    [clients]
  );

  const sdrStats = useMemo(() =>
    OFFICIAL_SDR_OPTIONS
      .filter((sdr) => OFFICIAL_SDR_VALUES.includes(sdr.value))
      .map((sdr) => {
        const clients = officialClients.filter((client) => client.agendadoPor === sdr.value);
        return summarizePreVenda(sdr.label, clients, officialClients.length, { revenueStages: [...MONEY_REVENUE_STAGES] });
      }),
    [officialClients]
  );

  const agendadorStats = useMemo(() =>
    AGENDADOR_OPTIONS.map((agendador) => {
      const agendadorClients = clients.filter((client) => client.agendadoPor === agendador.value);
      return {
        ...summarizePreVenda(agendador.label, agendadorClients, agendadorClients.length, { revenueStages: [...MONEY_REVENUE_STAGES] }),
        isOfficialSdr: OFFICIAL_SDR_VALUES.includes(agendador.value),
      };
    }),
    [clients]
  );

  const unassignedAgendadorStats = useMemo(() => {
    const orphanClients = clients.filter((client) => !client.agendadoPor || !String(client.agendadoPor).trim());
    if (orphanClients.length === 0) return null;
    return summarizePreVenda('Sem agendador', orphanClients, clients.length, { revenueStages: [...MONEY_REVENUE_STAGES] });
  }, [clients]);

  useEffect(() => {
    const nextDrafts = visibleDates.reduce((acc, date) => {
      SDRS.forEach((sdr) => {
        const key = `${date}:${sdr.value}`;
        const existing = preSalesDailyLogs.find((log) => log.date === date && log.sdr === sdr.value);
        acc[key] = existing
          ? {
              contacts: String(existing.contacts || 0),
              qualified: String(existing.qualified || 0),
              scheduled: String(existing.scheduled || 0),
              noShowCalls: String(existing.noShowCalls || 0),
            }
          : emptyDraft();
      });
      return acc;
    }, {} as Record<string, DailyDraft>);

    setDrafts(nextDrafts);
  }, [preSalesDailyLogs, visibleDates]);

  const getMetrics = (date: string, sdr: Agendador) => getDraftMetrics(drafts[`${date}:${sdr}`]);

  const getSdrTotals = (dates: string[], sdr: Agendador) =>
    dates.reduce((acc, date) => addMetrics(acc, getMetrics(date, sdr)), emptyMetrics());

  const getCombinedTotals = (dates: string[]) =>
    SDRS.reduce((acc, sdr) => addMetrics(acc, getSdrTotals(dates, sdr.value)), emptyMetrics());

  const grandTotals = useMemo(() => getCombinedTotals(visibleDates), [drafts, visibleDates]);

  const updateDraft = (date: string, sdr: Agendador, field: keyof DailyDraft, value: string) => {
    const key = `${date}:${sdr}`;
    setDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] || emptyDraft()),
        [field]: value,
      },
    }));
  };

  const saveDailyLog = (date: string, sdr: Agendador) => {
    const draft = drafts[`${date}:${sdr}`] || emptyDraft();
    upsertPreSalesDailyLog({
      date,
      sdr,
      contacts: parseNumber(draft.contacts),
      qualified: parseNumber(draft.qualified),
      scheduled: parseNumber(draft.scheduled),
      noShowCalls: parseNumber(draft.noShowCalls),
    });
  };

  const saveAllVisibleRows = () => {
    visibleDates.forEach((date) => {
      SDRS.forEach((sdr) => saveDailyLog(date, sdr.value));
    });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-card to-background p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Zap className="h-8 w-8 text-indigo-500" />
              Pré venda
            </h1>
            <p className="text-muted-foreground mt-2 max-w-3xl">
              Análise individual apenas dos SDRs oficiais, Miguel e Herbert. Os outros usuários podem agendar no pipeline, mas não entram como SDR oficial nesta leitura.
            </p>
          </div>
          <RaioXFilters value={filter} onChange={setFilter} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard label="Agendamentos no pipeline" value={overview.total} icon={<Users className="h-5 w-5" />} />
        <KPICard label="Comparecimento" value={`${overview.attendanceRate.toFixed(1)}%`} change={overview.attended} changeLabel="compareceram" variant="success" />
        <KPICard label="No show pipeline" value={`${overview.noShowRate.toFixed(1)}%`} change={overview.noShow} changeLabel="faltaram" variant="danger" />
        <KPICard label="Conversão real" value={`${overview.conversionRate.toFixed(1)}%`} change={overview.closed} changeLabel="fechados" />
        <KPICard label="Receita + taxas" value={formatBRL(overview.revenue)} variant="success" />
      </div>

      <Card className="border-indigo-500/20">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-500" />
                Daily SDR | 2026
              </CardTitle>
              <CardDescription>
                Grade separada por semana e dia: Miguel à esquerda, Herbert ao lado e Total calculado automaticamente. Edite as células do SDR e salve ao sair do campo ou em lote.
              </CardDescription>
            </div>
            <Button className="gap-2" onClick={saveAllVisibleRows}>
              <Save className="h-4 w-4" />
              Salvar planilha visível
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard label="Contatos no período" value={grandTotals.contacts} icon={<PhoneCall className="h-5 w-5" />} />
            <KPICard label="Qualificados no período" value={grandTotals.qualified} variant="success" />
            <KPICard label="Agendamentos informados" value={grandTotals.scheduled} />
            <KPICard label="Calls feitas / No Show" value={grandTotals.noShowCalls} variant="danger" />
          </div>

          <div className="overflow-hidden rounded-2xl border bg-background">
            <Table className="w-full table-fixed text-[11px] lg:text-xs">
              <TableHeader>
                <TableRow className="bg-slate-950 text-white hover:bg-slate-950">
                  <TableHead className="w-[7%] bg-slate-950 px-1 text-white">Período</TableHead>
                  <TableHead className="border-l-2 border-red-600 text-center text-white" colSpan={5}>Miguel</TableHead>
                  <TableHead className="w-[10px] bg-red-700 p-0" />
                  <TableHead className="text-center text-white" colSpan={5}>Herbert</TableHead>
                  <TableHead className="w-[10px] bg-red-700 p-0" />
                  <TableHead className="text-center text-white" colSpan={5}>Total</TableHead>
                </TableRow>
                <TableRow className="bg-red-600 text-white hover:bg-red-600">
                  <TableHead className="bg-red-600 px-1 text-white">Dia</TableHead>
                  <MetricHeader separated />
                  <DividerHeader />
                  <MetricHeader />
                  <DividerHeader />
                  <MetricHeader />
                </TableRow>
              </TableHeader>
              <TableBody>
                <AggregatedRow label="TOTAL" miguel={getSdrTotals(visibleDates, 'MIGUEL')} herbert={getSdrTotals(visibleDates, 'HEBERT')} total={grandTotals} strong />

                {weekGroups.map((week) => (
                  <Fragment key={week.label}>
                    <AggregatedRow
                      key={`${week.label}-total`}
                      label={week.label}
                      miguel={getSdrTotals(week.dates, 'MIGUEL')}
                      herbert={getSdrTotals(week.dates, 'HEBERT')}
                      total={getCombinedTotals(week.dates)}
                    />

                    {week.dates.map((date) => {
                      const miguel = getMetrics(date, 'MIGUEL');
                      const herbert = getMetrics(date, 'HEBERT');
                      const total = addMetrics(miguel, herbert);

                      return (
                        <TableRow key={date}>
                          <TableCell className="bg-background px-1 font-medium">{formatDateBR(date)}</TableCell>
                          <EditableSdrBlock
                            draft={drafts[`${date}:MIGUEL`] || emptyDraft()}
                            onChange={(field, value) => updateDraft(date, 'MIGUEL', field, value)}
                            onBlur={() => saveDailyLog(date, 'MIGUEL')}
                            separated
                          />
                          <DividerCell />
                          <EditableSdrBlock
                            draft={drafts[`${date}:HEBERT`] || emptyDraft()}
                            onChange={(field, value) => updateDraft(date, 'HEBERT', field, value)}
                            onBlur={() => saveDailyLog(date, 'HEBERT')}
                          />
                          <DividerCell />
                          <ReadonlyMetricBlock metrics={total} separated />
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {sdrStats.map((item) => (
          <Card key={item.name} className="border-indigo-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserRound className="h-5 w-5 text-indigo-500" />
                {item.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <MetricLine label="Agendamentos" value={item.total} />
              <MetricLine label="Compareceram" value={`${item.attendanceRate.toFixed(1)}%`} success />
              <MetricLine label="No show" value={`${item.noShowRate.toFixed(1)}%`} danger />
              <MetricLine label="Taxa de interesse" value={item.taxaInteresse} />
              <MetricLine label="Negociação" value={item.negotiation} />
              <MetricLine label="Perdidos" value={item.lost} danger />
              <MetricLine label="Fechados" value={item.closed} success />
              <MetricLine label="Conversão" value={`${item.conversionRate.toFixed(1)}%`} success />
              <MetricLine label="Receita + taxas" value={formatBRL(item.revenue)} success />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-red-500" />
            Agendadores do pipeline
          </CardTitle>
          <CardDescription>
            Todos que podem marcar reuniÃ£o aparecem aqui. Miguel e Herbert continuam destacados como SDRs oficiais, mas Pedro, Cled e Caetano tambÃ©m tÃªm leitura de agendamentos e vendas geradas pelos leads que agendaram.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {agendadorStats.map((item) => (
              <Card key={item.name} className={item.isOfficialSdr ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-200'}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-red-500" />
                      {item.name}
                    </span>
                    {item.isOfficialSdr && (
                      <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700">
                        SDR
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <MetricLine label="Agendamentos" value={item.total} />
                  <MetricLine label="Compareceram" value={`${item.attendanceRate.toFixed(1)}%`} success />
                  <MetricLine label="No show" value={`${item.noShowRate.toFixed(1)}%`} danger />
                  <MetricLine label="Taxa de interesse" value={item.taxaInteresse} />
                  <MetricLine label="NegociaÃ§Ã£o" value={item.negotiation} />
                  <MetricLine label="Fechados" value={item.closed} success />
                  <MetricLine label="ConversÃ£o" value={`${item.conversionRate.toFixed(1)}%`} success />
                  <MetricLine label="Receita + taxas" value={formatBRL(item.revenue)} success />
                </CardContent>
              </Card>
            ))}
            {unassignedAgendadorStats ? (
              <Card className="border-dashed border-amber-400/50 bg-amber-50/40">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-amber-500" />
                      Sem agendador
                    </span>
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                      Revisar
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <MetricLine label="Agendamentos" value={unassignedAgendadorStats.total} />
                  <MetricLine label="Compareceram" value={`${unassignedAgendadorStats.attendanceRate.toFixed(1)}%`} success />
                  <MetricLine label="No show" value={`${unassignedAgendadorStats.noShowRate.toFixed(1)}%`} danger />
                  <MetricLine label="Taxa de interesse" value={unassignedAgendadorStats.taxaInteresse} />
                  <MetricLine label="Negociação" value={unassignedAgendadorStats.negotiation} />
                  <MetricLine label="Fechados" value={unassignedAgendadorStats.closed} success />
                  <MetricLine label="Conversão" value={`${unassignedAgendadorStats.conversionRate.toFixed(1)}%`} success />
                  <MetricLine label="Receita + taxas" value={formatBRL(unassignedAgendadorStats.revenue)} success />
                </CardContent>
              </Card>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Ranking individual dos SDRs oficiais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SDR</TableHead>
                <TableHead className="text-center">Agend.</TableHead>
                <TableHead className="text-center">Comp.</TableHead>
                <TableHead className="text-center">No show</TableHead>
                <TableHead className="text-center">Taxa int.</TableHead>
                <TableHead className="text-center">Neg.</TableHead>
                <TableHead className="text-center">Perdidos</TableHead>
                <TableHead className="text-center">Fechados</TableHead>
                <TableHead className="text-center">Conv.</TableHead>
                  <TableHead className="text-right">Receita + taxas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sdrStats.map((item, index) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{index + 1}. {item.name}</TableCell>
                  <TableCell className="text-center">{item.total}</TableCell>
                  <TableCell className="text-center">{item.attendanceRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-center text-destructive">{item.noShowRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-center">{item.taxaInteresse}</TableCell>
                  <TableCell className="text-center">{item.negotiation}</TableCell>
                  <TableCell className="text-center text-destructive">{item.lost}</TableCell>
                  <TableCell className="text-center font-semibold text-emerald-600">{item.closed}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                      {item.conversionRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(item.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricHeader({ separated }: { separated?: boolean }) {
  return (
    <>
      <TableHead className={separated ? 'border-l-2 border-red-800 px-1 text-center text-white' : 'px-1 text-center text-white'}>Contatos</TableHead>
      <TableHead className="px-1 text-center text-white">Qualificados</TableHead>
      <TableHead className="px-1 text-center text-white">Agendamentos</TableHead>
      <TableHead className="px-1 text-center text-white">Calls realizadas</TableHead>
      <TableHead className="px-1 text-center text-white">Conversão</TableHead>
    </>
  );
}

function DividerHeader() {
  return <TableHead className="w-[10px] bg-red-700 p-0" />;
}

function DividerCell() {
  return <TableCell className="w-[10px] bg-red-50 p-0" />;
}

function EditableSdrBlock({
  draft,
  onChange,
  onBlur,
  separated,
}: {
  draft: DailyDraft;
  onChange: (field: keyof DailyDraft, value: string) => void;
  onBlur: () => void;
  separated?: boolean;
}) {
  const metrics = getDraftMetrics(draft);

  return (
    <>
      <EditableNumberCell value={draft.contacts} onChange={(value) => onChange('contacts', value)} onBlur={onBlur} separated={separated} />
      <EditableNumberCell value={draft.qualified} onChange={(value) => onChange('qualified', value)} onBlur={onBlur} />
      <EditableNumberCell value={draft.scheduled} onChange={(value) => onChange('scheduled', value)} onBlur={onBlur} />
      <EditableNumberCell value={draft.noShowCalls} onChange={(value) => onChange('noShowCalls', value)} onBlur={onBlur} />
      <TableCell className="px-1 text-center font-semibold tabular-nums">{rate(metrics.scheduled, metrics.contacts).toFixed(0)}%</TableCell>
    </>
  );
}

function ReadonlyMetricBlock({ metrics, separated }: { metrics: SheetMetrics; separated?: boolean }) {
  return (
    <>
      <ReadonlyCell value={metrics.contacts} separated={separated} />
      <ReadonlyCell value={metrics.qualified} />
      <ReadonlyCell value={metrics.scheduled} />
      <ReadonlyCell value={metrics.noShowCalls} />
      <TableCell className="px-1 text-center font-semibold tabular-nums">{rate(metrics.scheduled, metrics.contacts).toFixed(0)}%</TableCell>
    </>
  );
}

function AggregatedRow({
  label,
  miguel,
  herbert,
  total,
  strong,
}: {
  label: string;
  miguel: SheetMetrics;
  herbert: SheetMetrics;
  total: SheetMetrics;
  strong?: boolean;
}) {
  return (
    <TableRow className={strong ? 'bg-red-700 font-bold text-white hover:bg-red-700' : 'border-y-2 border-red-700 bg-red-600 font-bold text-white hover:bg-red-600'}>
      <TableCell className={strong ? 'bg-red-700 px-1 text-white' : 'bg-red-600 px-1 text-white'}>
        {label}
      </TableCell>
      <ReadonlyMetricBlock metrics={miguel} separated />
      <DividerCell />
      <ReadonlyMetricBlock metrics={herbert} separated />
      <DividerCell />
      <ReadonlyMetricBlock metrics={total} separated />
    </TableRow>
  );
}

function EditableNumberCell({ value, onChange, onBlur, separated }: { value: string; onChange: (value: string) => void; onBlur: () => void; separated?: boolean }) {
  return (
    <TableCell className={separated ? 'border-l-2 border-red-100 px-1 text-center' : 'px-1 text-center'}>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="mx-auto h-8 w-full max-w-[54px] px-1 text-center text-xs font-semibold tabular-nums"
      />
    </TableCell>
  );
}

function ReadonlyCell({ value, separated }: { value: number; separated?: boolean }) {
  return <TableCell className={separated ? 'border-l-2 border-red-100 px-1 text-center font-semibold tabular-nums' : 'px-1 text-center font-semibold tabular-nums'}>{value}</TableCell>;
}

function MetricLine({ label, value, danger, success }: { label: string; value: string | number; danger?: boolean; success?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={danger ? 'font-semibold text-destructive tabular-nums' : success ? 'font-semibold text-emerald-600 tabular-nums' : 'font-semibold tabular-nums'}>
        {value}
      </span>
    </div>
  );
}
