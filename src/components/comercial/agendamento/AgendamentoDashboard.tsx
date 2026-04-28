import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, Clock, DollarSign, Target, TrendingUp, UserCheck, Users, UserX } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type PipelineClient, AGENDADOR_OPTIONS, FATURAMENTO_OPTIONS, OFFICIAL_SDR_VALUES, SALAO_OU_CLINICA_OPTIONS, useCommercial } from '@/contexts/CommercialContext';
import { getClientRevenue } from '@/lib/commercialMetrics';
import { HORARIO_OPTIONS } from '@/hooks/useAgendamentoData';
import { getScheduleDate, getHour, getTurn } from '@/lib/preVendaAnalytics';

interface AgendamentoDashboardProps {
  leads: any[];
  selectedDay?: Date;
  selectedMonth?: string;
  selectedMonthRange?: { startDate: Date; endDate: Date } | null;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const COMPLETED_STATUSES = ['NEGOCIACAO', 'TAXA_INTERESSE', 'PERDIDO', 'FECHADO'];
const SDRS = OFFICIAL_SDR_VALUES;
const HORARIO_LABELS: Record<(typeof HORARIO_OPTIONS)[number]['value'], string> = {
  MANHA: 'ManhÃ£',
  TARDE: 'Tarde',
  NOITE: 'Noite',
};

function toLocalDate(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const isoDateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const brDateOnly = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const date = isoDateOnly
    ? new Date(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]))
    : brDateOnly
      ? new Date(Number(brDateOnly[3]), Number(brDateOnly[2]) - 1, Number(brDateOnly[1]))
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameLocalDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function formatPipelineMonth(date: Date) {
  return format(date, 'MM/yyyy');
}

function normalizeFaturamentoBucket(value: PipelineClient['faturamento'] | string | undefined | null): PipelineClient['faturamento'] | 'NAO_INFORMADO' {
  if (!value) return 'NAO_INFORMADO';
  switch (value) {
    case '0_A_15K':
    case '0_10K':
    case 'FATURA_12K':
    case 'PODE_INVESTIR':
      return '0_A_10K';
    case '10K_A_20K':
    case '15K_A_30K':
    case '15K_MAIS':
      return '10K_A_20K';
    case '20K_A_30K':
      return '20K_A_30K';
    case '30K_A_50K':
      return '30K_A_50K';
    case '50K_A_100K':
      return '50K_A_80K';
    case '50K_A_80K':
      return '50K_A_80K';
    case '80K_A_100K':
      return '80K_A_100K';
    case '100K_PLUS':
    case '100K_A_150K':
      return '100K_A_150K';
    case '150K_A_250K':
      return '150K_A_250K';
    case '250K_A_400K':
      return '250K_A_400K';
    case '400K_A_600K':
      return '400K_A_600K';
    case '600K_A_1M':
      return '600K_A_1M';
    case '1M_PLUS':
      return '1M_PLUS';
    case 'NAO_INFORMADO':
    case 'PERSONALIZADO':
      return 'NAO_INFORMADO';
    default:
      return value as PipelineClient['faturamento'];
  }
}

function getPipelineAreaLabel(area: PipelineClient['salaoOuClinica']) {
  return SALAO_OU_CLINICA_OPTIONS.find((option) => option.value === area)?.label || 'NÃ£o informado';
}

export function AgendamentoDashboard({ leads, selectedDay, selectedMonth, selectedMonthRange }: AgendamentoDashboardProps) {
  const { pipelineClients } = useCommercial();
  const sourceClients = pipelineClients.length > 0 ? pipelineClients : leads;

  const filteredClients = useMemo(() => {
    return sourceClients.filter((client) => {
      const rawDate = getScheduleDate(client as PipelineClient);
      const date = toLocalDate(rawDate as string | Date | null | undefined);
      if (!date) return false;

      if (selectedDay) {
        return isSameLocalDay(date, selectedDay);
      }

      if (selectedMonth && selectedMonth !== 'all' && selectedMonthRange) {
        return date >= selectedMonthRange.startDate && date <= selectedMonthRange.endDate;
      }

      if (selectedMonth && selectedMonth !== 'all') {
        return formatPipelineMonth(date) === selectedMonth;
      }

      return true;
    });
  }, [leads, selectedDay, selectedMonth, selectedMonthRange, sourceClients]);

  const evolutionData = useMemo(() => {
    if (selectedDay) {
      return [{
        month: format(selectedDay, 'dd/MM', { locale: ptBR }),
        'No Show': filteredClients.filter((lead) => lead.stage === 'NO_SHOW' || lead.status === 'NO_SHOW').length,
        Realizados: filteredClients.filter((lead) => COMPLETED_STATUSES.includes(lead.stage || lead.status)).length,
      }];
    }

    if (selectedMonth && selectedMonth !== 'all' && selectedMonthRange) {
      return [{
        month: format(selectedMonthRange.startDate, 'MMM/yy', { locale: ptBR }),
        'No Show': filteredClients.filter((lead) => lead.stage === 'NO_SHOW' || lead.status === 'NO_SHOW').length,
        Realizados: filteredClients.filter((lead) => COMPLETED_STATUSES.includes(lead.stage || lead.status)).length,
      }];
    }

    return Array.from({ length: 6 }).map((_, index) => {
      const date = subMonths(new Date(), 5 - index);
      const month = format(date, 'MM/yyyy');
      const monthLeads = filteredClients.filter((lead) => {
        const leadDate = toLocalDate(getScheduleDate(lead as PipelineClient) as string | Date | null | undefined);
        return leadDate ? formatPipelineMonth(leadDate) === month : false;
      });
      return {
        month: format(date, 'MMM/yy', { locale: ptBR }),
        'No Show': monthLeads.filter((lead) => lead.stage === 'NO_SHOW' || lead.status === 'NO_SHOW').length,
        Realizados: monthLeads.filter((lead) => COMPLETED_STATUSES.includes(lead.stage || lead.status)).length,
      };
    });
  }, [filteredClients, selectedDay, selectedMonth, selectedMonthRange]);

  const sdrPerformanceData = useMemo(() => {
    return SDRS.map((sdr) => {
      const sdrClients = filteredClients.filter((client) => client.agendadoPor === sdr);
      return {
        name: sdr,
        Realizados: sdrClients.filter((client) => COMPLETED_STATUSES.includes(client.stage || client.status)).length,
        'No Show': sdrClients.filter((client) => client.stage === 'NO_SHOW' || client.status === 'NO_SHOW').length,
      };
    });
  }, [filteredClients]);

  const metrics = useMemo(() => {
    const total = filteredClients.length;
    const noShowCount = filteredClients.filter((lead) => lead.stage === 'NO_SHOW' || lead.status === 'NO_SHOW').length;
    const completedAppointments = filteredClients.filter((lead) => COMPLETED_STATUSES.includes(lead.stage || lead.status)).length;
    const totalMeetings = noShowCount + completedAppointments;
    const completionRate = totalMeetings > 0 ? ((completedAppointments / totalMeetings) * 100).toFixed(1) : '0';

    const faturamentoData = FATURAMENTO_OPTIONS.map((option) => ({
      name: option.label,
      value: filteredClients.filter((lead) => normalizeFaturamentoBucket(lead.faturamento) === option.value).length,
    })).filter((item) => item.value > 0);

    const topFaturamento = faturamentoData.reduce(
      (best, item) => item.value > best.value ? item : best,
      { name: 'N/A', value: 0 }
    );

    const criativoMap = filteredClients.reduce((acc, lead) => {
      const key = lead.creativeSource || lead.creative_source || lead.criativo || lead.funil || 'NAO IDENTIFICADO';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const criativoData = Object.entries(criativoMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const horarioData = HORARIO_OPTIONS.map((option) => ({
      name: HORARIO_LABELS[option.value],
      value: filteredClients.filter((lead) => {
        const hour = getHour(lead as PipelineClient);
        const turn = getTurn(hour);
        return turn.startsWith(option.value === 'MANHA' ? 'Manha' : option.value === 'TARDE' ? 'Tarde' : 'Noite');
      }).length,
    })).filter((item) => item.value > 0);

    const salaoClinicaData = SALAO_OU_CLINICA_OPTIONS.map((option) => ({
      name: option.label,
      value: filteredClients.filter((lead) => lead.salaoOuClinica === option.value).length,
    })).filter((item) => item.value > 0);

    return {
      total,
      newLeadCount: filteredClients.filter((lead) => (lead.stage || lead.status) === 'NOVO').length,
      todayAppointments: filteredClients.filter((lead) => {
        const date = toLocalDate(getScheduleDate(lead as PipelineClient) as string | Date | null | undefined);
        return date ? isSameLocalDay(date, new Date()) : false;
      }).length,
      topFaturamento,
      faturamentoData,
      criativoData,
      horarioData,
      salaoClinicaData,
      noShowCount,
      completedAppointments,
      completionRate,
      comSocio: filteredClients.filter((lead) => lead.temSocio === 'SIM' || lead.tem_socio === 'SIM').length,
      semSocio: filteredClients.filter((lead) => lead.temSocio === 'NAO' || lead.tem_socio === 'NAO').length,
      comMkt: filteredClients.filter((lead) => lead.temMkt === 'SIM' || lead.tem_mkt === 'SIM').length,
      semMkt: filteredClients.filter((lead) => lead.temMkt === 'NAO' || lead.tem_mkt === 'NAO').length,
    };
  }, [filteredClients]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-red-600" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold">{metrics.todayAppointments}</p>
                <p className="text-xs text-muted-foreground">Agendamentos marcados para o dia atual</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-300 to-slate-400" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Novo lead</p>
                <p className="text-2xl font-bold">{metrics.newLeadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Realizados</p>
                <p className="text-2xl font-bold text-green-600">{metrics.completedAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 to-red-600" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserX className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">No Show</p>
                <p className="text-2xl font-bold text-red-600">{metrics.noShowCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Top Faturamento</p>
                <p className="text-lg font-bold">{metrics.topFaturamento.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" />Evolucao: No Show x Realizados</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <defs>
                    <linearGradient id="realizadosLineFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="noShowLineFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} stroke="#94A3B8" />
                  <YAxis axisLine={false} tickLine={false} stroke="#94A3B8" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Realizados" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 5 }} fill="url(#realizadosLineFill)" />
                  <Line type="monotone" dataKey="No Show" stroke="#EF4444" strokeWidth={3} dot={false} activeDot={{ r: 5 }} fill="url(#noShowLineFill)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taxa de Comparecimento (Geral)</span>
              <span className="text-lg font-bold">{metrics.completionRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" />Performance SDRs</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sdrPerformanceData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#94A3B8" />
                  <YAxis axisLine={false} tickLine={false} stroke="#94A3B8" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Realizados" fill="#10B981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="No Show" fill="#EF4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4" />Distribuicao por Faturamento</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.faturamentoData}>
                  <defs>
                    <linearGradient id="faturamentoBarFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.75} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#94A3B8" />
                  <YAxis axisLine={false} tickLine={false} stroke="#94A3B8" />
                  <Tooltip />
                  <Bar dataKey="value" fill="url(#faturamentoBarFill)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" />Top Criativos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.criativoData.map((item, index) => (
                <div key={item.name} className="space-y-1 rounded-xl px-2 py-1 transition-all duration-200 hover:bg-slate-50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full shadow-sm" style={{ width: `${(item.value / Math.max(metrics.criativoData[0]?.value || 1, 1)) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" />Por Horario</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.horarioData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={82} paddingAngle={3} label>
                    {metrics.horarioData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" />Ãrea de atuaÃ§Ã£o</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.salaoClinicaData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={82} paddingAngle={3} label>
                    {metrics.salaoClinicaData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


