import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAgendamentoData } from '@/hooks/useAgendamentoData';
import { useAgendamentoRealtime } from '@/hooks/useAgendamentoRealtime';
import { AgendamentoSpreadsheet } from '@/components/comercial/agendamento/AgendamentoSpreadsheet';
import { AgendamentoDashboard } from '@/components/comercial/agendamento/AgendamentoDashboard';
import { AddAgendamentoDialog } from '@/components/comercial/agendamento/AddAgendamentoDialog';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from '@/components/comercial/PeriodFilter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, CalendarCheck, Loader2, LayoutDashboard, Table, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ControleAgendamento() {
  // Realtime subscription for instant updates
  useAgendamentoRealtime();

  const { leads, isLoading, error } = useAgendamentoData();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>('current_month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const { filterByPeriod } = usePeriodFilter();

  // Get date range from selected month
  // Filter leads by selected period
  // IMPORTANT: Use the lead's 'data' field (DD/MM/YYYY) as the primary date reference
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (!lead.data) return false;
      const parts = lead.data.split('/');
      if (parts.length !== 3) return false;

      const leadDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      return filterByPeriod(leadDate, periodFilter, customStart, customEnd);
    });
  }, [leads, periodFilter, customStart, customEnd, filterByPeriod]);

  // Export to CSV
  const handleExport = () => {
    if (filteredLeads.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = [
      'DATA',
      'NOME',
      'TELEFONE',
      'HORÁRIO',
      'TEM SÓCIO?',
      'TEM MKT?',
      'FATURAMENTO',
      'FUNIL',
      'STATUS',
    ];

    const csvContent = [
      headers.join(','),
      ...filteredLeads.map((lead) =>
        [
          `"${lead.data}"`,
          `"${lead.nome}"`,
          `"${lead.telefone}"`,
          lead.horario === 'MANHA' ? 'MANHÃ' : lead.horario,
          lead.tem_socio === 'NAO' ? 'NÃO' : lead.tem_socio,
          lead.tem_mkt === 'NAO' ? 'NÃO' : lead.tem_mkt,
          lead.faturamento
            .replace('0_A_10K', '0 - 10K')
            .replace('10K_A_20K', '10K - 20K')
            .replace('20K_A_30K', '20K - 30K')
            .replace('30K_A_50K', '30K - 50K')
            .replace('50K_A_80K', '50K - 80K')
            .replace('80K_A_100K', '80K - 100K')
            .replace('100K_A_150K', '100K - 150K')
            .replace('150K_A_250K', '150K - 250K')
            .replace('250K_A_400K', '250K - 400K')
            .replace('400K_A_600K', '400K - 600K')
            .replace('600K_A_1M', '600K - 1M')
            .replace('1M_PLUS', '1M +'),
          `"${lead.funil}"`,
          `"${lead.status}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `controle-agendamento-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Dados exportados com sucesso!');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Erro ao carregar dados: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Controle de Agendamento</h1>
            <p className="text-sm text-muted-foreground">
              Organize agendamentos e qualifique leads com status e funil
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodFilter
            value={periodFilter}
            onChange={setPeriodFilter}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={(start, end) => {
              setCustomStart(start);
              setCustomEnd(end);
            }}
          />
          {(periodFilter !== 'current_month') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPeriodFilter('current_month');
                setCustomStart(undefined);
                setCustomEnd(undefined);
              }}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={handleExport} disabled={filteredLeads.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Content with Tabs */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="spreadsheet" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Planilha
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>
          
          {/* Show count of filtered leads */}
          {periodFilter !== 'all_time' && (
            <div className="mb-4 text-sm text-muted-foreground">
              Exibindo <span className="font-semibold text-foreground">{filteredLeads.length}</span> agendamento(s)
            </div>
          )}
          
          <TabsContent value="spreadsheet">
            <AgendamentoSpreadsheet leads={filteredLeads} />
          </TabsContent>
          
          <TabsContent value="dashboard">
            <AgendamentoDashboard 
              leads={filteredLeads} 
              selectedDay={periodFilter === 'day' || periodFilter === 'current_day' ? customStart || new Date() : undefined}
              selectedMonth={periodFilter === 'current_month' ? format(new Date(), 'yyyy-MM') : undefined}
              selectedMonthRange={periodFilter === 'current_month' ? { startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999) } : null}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Add Dialog */}
      <AddAgendamentoDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
