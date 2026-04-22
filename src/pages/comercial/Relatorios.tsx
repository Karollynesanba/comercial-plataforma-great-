import React, { useMemo, useState } from 'react';
import { formatBRL } from '@/lib/utils';
import { useCommercial, VENDEDOR_OPTIONS, STAGE_LABELS } from '@/contexts/CommercialContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from '@/components/comercial/PeriodFilter';
import { 
  AlertTriangle, 
  TrendingDown, 
  Users, 
  Calendar,
  Search,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  Filter
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function RelatoriosPage() {
  const { pipelineClients } = useCommercial();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>('all_time');
  const { filterByPeriod } = usePeriodFilter();

  // Get all lost clients
  const lostClients = useMemo(() => {
    return pipelineClients.filter(client => client.stage === 'PERDIDO');
  }, [pipelineClients]);

  // Filter lost clients based on search and filters
  const filteredLostClients = useMemo(() => {
    return lostClients.filter(client => {
      const matchesSearch = searchQuery === '' || 
        client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.lostReason?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesVendedor = selectedVendedor === 'all' || client.vendedor === selectedVendedor;
      
      // Period filter
      const clientDate = client.dataEntrada;
      const matchesPeriod = filterByPeriod(clientDate, periodFilter);
      
      return matchesSearch && matchesVendedor && matchesPeriod;
    });
  }, [lostClients, searchQuery, selectedVendedor, periodFilter, filterByPeriod]);

  // Fixed loss reason categories
  const FIXED_REASONS = [
    'Valor alto',
    'Não era o que buscava',
    'Saiu para pensar',
    'Busca atendimento humano',
    'Outro',
  ] as const;

  // Function to categorize raw reasons into fixed categories
  const categorizeReason = (rawReason: string | null): string => {
    if (!rawReason) return 'Outro';
    
    const lower = rawReason.toLowerCase();
    
    // Valor alto
    if (
      lower.includes('valor') ||
      lower.includes('caro') ||
      lower.includes('preço') ||
      lower.includes('orçamento') ||
      lower.includes('salgado')
    ) {
      return 'Valor alto';
    }
    
    // Não era o que buscava
    if (
      lower.includes('não era') ||
      lower.includes('buscava') ||
      lower.includes('serviço') ||
      lower.includes('procurava') ||
      lower.includes('esperava')
    ) {
      return 'Não era o que buscava';
    }
    
    // Saiu para pensar
    if (
      lower.includes('pensar') ||
      lower.includes('analisar') ||
      lower.includes('esperar') ||
      lower.includes('decidir')
    ) {
      return 'Saiu para pensar';
    }
    
    // Busca atendimento humano
    if (
      lower.includes('atendimento') ||
      lower.includes('humano') ||
      lower.includes('presencial')
    ) {
      return 'Busca atendimento humano';
    }
    
    return 'Outro';
  };

  // Analyze loss reasons with fixed categories
  const lossReasonAnalysis = useMemo(() => {
    const reasonCounts: Record<string, number> = {};
    
    // Initialize all fixed reasons with 0
    FIXED_REASONS.forEach(reason => {
      reasonCounts[reason] = 0;
    });
    
    filteredLostClients.forEach(client => {
      const category = categorizeReason(client.lostReason);
      reasonCounts[category] = (reasonCounts[category] || 0) + 1;
    });

    return FIXED_REASONS
      .map(reason => ({
        reason,
        count: reasonCounts[reason],
        percentage: filteredLostClients.length > 0 
          ? (reasonCounts[reason] / filteredLostClients.length) * 100 
          : 0,
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredLostClients]);

  // Lost by vendedor analysis
  const lostByVendedor = useMemo(() => {
    const vendedorCounts: Record<string, { total: number; value: number }> = {};
    
    filteredLostClients.forEach(client => {
      const vendedor = client.vendedor;
      if (!vendedorCounts[vendedor]) {
        vendedorCounts[vendedor] = { total: 0, value: 0 };
      }
      vendedorCounts[vendedor].total += 1;
      vendedorCounts[vendedor].value += client.entrada || 0;
    });

    return Object.entries(vendedorCounts)
      .map(([vendedor, data]) => ({
        vendedor: VENDEDOR_OPTIONS.find(v => v.value === vendedor)?.label || vendedor,
        ...data,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLostClients]);

  // Monthly lost trend
  const monthlyLostTrend = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        month: format(date, 'MMM/yy', { locale: ptBR }),
        monthKey: format(date, 'yyyy-MM'),
        count: 0,
        value: 0,
      };
    });

    lostClients.forEach(client => {
      const clientMonth = format(new Date(client.dataEntrada), 'yyyy-MM');
      const monthData = last6Months.find(m => m.monthKey === clientMonth);
      if (monthData) {
        monthData.count += 1;
        monthData.value += client.entrada || 0;
      }
    });

    return last6Months;
  }, [lostClients]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalLost = filteredLostClients.length;
    const totalValue = filteredLostClients.reduce((acc, c) => acc + (c.entrada || 0), 0);
    const avgValue = totalLost > 0 ? totalValue / totalLost : 0;
    const topReason = lossReasonAnalysis[0]?.reason || 'N/A';
    
    return { totalLost, totalValue, avgValue, topReason };
  }, [filteredLostClients, lossReasonAnalysis]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Cliente', 'Vendedor', 'Motivo da Perda', 'Valor', 'Data', 'Criativo'];
    const rows = filteredLostClients.map(client => [
      client.clientName,
      VENDEDOR_OPTIONS.find(v => v.value === client.vendedor)?.label || client.vendedor,
      client.lostReason || 'Não informado',
      client.entrada?.toFixed(2) || '0',
      format(new Date(client.dataEntrada), 'dd/MM/yyyy'),
      client.criativo,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-perdidos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Relatório de Clientes Perdidos
          </h1>
          <p className="text-muted-foreground">
            Análise de motivos de perda e tendências
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente ou motivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos vendedores</SelectItem>
                {VENDEDOR_OPTIONS.map(v => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PeriodFilter value={periodFilter} onChange={setPeriodFilter} />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Perdidos</CardTitle>
            <Users className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalLost}</div>
            <p className="text-xs text-muted-foreground">clientes perdidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Perdido</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totals.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">em oportunidades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totals.avgValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">por cliente perdido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Motivo Principal</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={totals.topReason}>
              {totals.topReason}
            </div>
            <p className="text-xs text-muted-foreground">
              {lossReasonAnalysis[0]?.percentage.toFixed(0)}% dos casos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Loss Reasons Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Distribuição por Motivo
            </CardTitle>
            <CardDescription>
              Motivos de perda mais frequentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lossReasonAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={lossReasonAnalysis}
                    dataKey="count"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ reason, percentage }) => `${percentage.toFixed(0)}%`}
                    labelLine={false}
                  >
                    {lossReasonAnalysis.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, name]}
                    labelFormatter={() => ''}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ paddingTop: 20 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendência Mensal
            </CardTitle>
            <CardDescription>
              Evolução de clientes perdidos nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyLostTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'count') return [value, 'Clientes'];
                     return [formatBRL(value), 'Valor'];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lost by Vendedor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Perdidos por Vendedor
            </CardTitle>
            <CardDescription>
              Distribuição de perdas por responsável
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lostByVendedor.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={lostByVendedor} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="vendedor" type="category" className="text-xs" width={80} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'total') return [value, 'Clientes'];
                      return [formatBRL(value), 'Valor'];
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name="total" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Reasons Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Ranking de Motivos
            </CardTitle>
            <CardDescription>
              Motivos ordenados por frequência
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lossReasonAnalysis.length > 0 ? (
              <div className="space-y-3">
                {lossReasonAnalysis.slice(0, 5).map((item, index) => (
                  <div key={item.reason} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.reason}</div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-destructive rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{item.count}</div>
                      <div className="text-xs text-muted-foreground">{item.percentage.toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nenhum motivo registrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico Detalhado
          </CardTitle>
          <CardDescription>
            Lista completa de clientes perdidos ({filteredLostClients.length} registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Motivo da Perda</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Criativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLostClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum cliente perdido encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLostClients.map(client => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.clientName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {VENDEDOR_OPTIONS.find(v => v.value === client.vendedor)?.label || client.vendedor}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="whitespace-normal">
                          {client.lostReason || 'Não informado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        R$ {(client.entrada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(client.dataEntrada), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{client.criativo}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
