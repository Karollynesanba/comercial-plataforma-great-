import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useCommercial, 
  PipelineClient, 
  STAGE_LABELS,
  VENDEDOR_OPTIONS,
  EQUIPE_OPTIONS,
  PERIODO_OPTIONS,
  PACOTE_OPTIONS,
  PAGADOR_ANUNCIO_OPTIONS,
  Vendedor,
  Equipe,
  Periodo,
  Pacote,
  PagadorAnuncio,
} from '@/contexts/CommercialContext';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from './PeriodFilter';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Download,
  Maximize2,
  Minimize2,
  DollarSign,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatBRL } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  SalesColumnVisibility, 
  SalesColumnKey, 
  DEFAULT_VISIBLE_COLUMNS,
  SALES_COLUMN_LABELS,
} from './SalesColumnVisibility';
import {
  SalesEditableCell,
  getOptionsForField,
  VENDEDOR_COLORS,
  EQUIPE_COLORS,
  PERIODO_COLORS,
  PACOTE_COLORS,
  PAGADOR_COLORS,
} from './SalesEditableCell';
import { toast } from 'sonner';

type SortField = 'clientName' | 'vendedor' | 'entrada' | 'stage' | 'lastStageChange' | 'equipe';
type SortDirection = 'asc' | 'desc';

export function SalesSpreadsheet() {
  const { pipelineClients, updatePipelineClient } = useCommercial();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('lastStageChange');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [vendedorFilter, setVendedorFilter] = useState<string>('all');
  const [equipeFilter, setEquipeFilter] = useState<string>('all');
  const [periodoFilter, setPeriodoFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>('current_month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<SalesColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);
  const { filterByPeriod } = usePeriodFilter();

  // Filter only FECHADO and TAXA_INTERESSE stages
  const salesClients = useMemo(() => {
    let result = pipelineClients.filter(c => 
      c.stage === 'FECHADO' || c.stage === 'TAXA_INTERESSE'
    );

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const normalizedQuery = query.replace(/\D/g, '');
      result = result.filter(c => 
        c.clientName.toLowerCase().includes(query) ||
        c.clinicName.toLowerCase().includes(query) ||
        (normalizedQuery.length > 0 && c.telefone && c.telefone.replace(/\D/g, '').includes(normalizedQuery))
      );
    }

    // Stage filter (FECHADO or TAXA_INTERESSE)
    if (stageFilter !== 'all') {
      result = result.filter(c => c.stage === stageFilter);
    }

    // Vendedor filter
    if (vendedorFilter !== 'all') {
      result = result.filter(c => c.vendedor === vendedorFilter);
    }

    // Equipe filter
    if (equipeFilter !== 'all') {
      result = result.filter(c => c.equipe === equipeFilter);
    }

    // Periodo filter
    if (periodoFilter !== 'all') {
      result = result.filter(c => c.periodo === periodoFilter);
    }

    // Period filter - filter by lastStageChange (when they closed/became taxa)
    result = result.filter(c => {
      const changeDate = c.lastStageChange;
      return filterByPeriod(changeDate ? new Date(changeDate) : undefined, periodFilter, customStart, customEnd);
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'clientName':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'vendedor':
          comparison = (a.vendedor || '').localeCompare(b.vendedor || '');
          break;
        case 'entrada':
          comparison = a.entrada - b.entrada;
          break;
        case 'stage':
          comparison = a.stage.localeCompare(b.stage);
          break;
        case 'lastStageChange':
          comparison = new Date(a.lastStageChange || 0).getTime() - new Date(b.lastStageChange || 0).getTime();
          break;
        case 'equipe':
          comparison = a.equipe.localeCompare(b.equipe);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [pipelineClients, searchQuery, sortField, sortDirection, stageFilter, vendedorFilter, equipeFilter, periodoFilter, periodFilter, customStart, customEnd, filterByPeriod]);

  // Calculate totals
  const totals = useMemo(() => {
    const fechados = salesClients.filter(c => c.stage === 'FECHADO');
    const taxaInteresse = salesClients.filter(c => c.stage === 'TAXA_INTERESSE');
    
    return {
      totalVendas: fechados.length,
      totalTaxaInteresse: taxaInteresse.length,
      valorFechados: fechados.reduce((sum, c) => sum + c.entrada, 0),
      valorTaxaInteresse: taxaInteresse.reduce((sum, c) => sum + c.entrada, 0),
      valorTotal: salesClients.reduce((sum, c) => sum + c.entrada, 0),
    };
  }, [salesClients]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const handleCellSave = (clientId: string, field: string, value: string | number) => {
    try {
      updatePipelineClient(clientId, { [field]: value });
      toast.success('Atualizado com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const exportToCSV = () => {
    const headers = visibleColumns.map(col => SALES_COLUMN_LABELS[col]);
    const rows = salesClients.map(c => 
      visibleColumns.map(col => {
        switch (col) {
          case 'clientName': return c.clientName;
          case 'clinicName': return c.clinicName || '-';
          case 'telefone': return c.telefone || '-';
          case 'vendedor': return VENDEDOR_OPTIONS.find(v => v.value === c.vendedor)?.label || c.vendedor;
          case 'equipe': return EQUIPE_OPTIONS.find(e => e.value === c.equipe)?.label || c.equipe;
          case 'pacote': return PACOTE_OPTIONS.find(p => p.value === c.pacote)?.label || c.pacote;
          case 'periodo': return PERIODO_OPTIONS.find(p => p.value === c.periodo)?.label || c.periodo;
          case 'entrada': return c.entrada;
          case 'lastStageChange': return c.lastStageChange ? format(new Date(c.lastStageChange), 'dd/MM/yyyy') : '-';
          case 'stage': return STAGE_LABELS[c.stage];
          case 'criativo': return c.criativo || '-';
          case 'pagadorAnuncio': return PAGADOR_ANUNCIO_OPTIONS.find(p => p.value === c.pagadorAnuncio)?.label || c.pagadorAnuncio || '-';
          default: return '-';
        }
      })
    );

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setStageFilter('all');
    setVendedorFilter('all');
    setEquipeFilter('all');
    setPeriodoFilter('all');
    setPeriodFilter('current_month');
    setCustomStart(undefined);
    setCustomEnd(undefined);
    setSearchQuery('');
  };

  const hasActiveFilters = stageFilter !== 'all' || vendedorFilter !== 'all' || equipeFilter !== 'all' || periodoFilter !== 'all' || periodFilter !== 'current_month' || searchQuery !== '';

  const isColumnVisible = (col: SalesColumnKey) => visibleColumns.includes(col);

  const renderCell = (client: PipelineClient, column: SalesColumnKey) => {
    switch (column) {
      case 'clientName':
        return (
          <SalesEditableCell
            value={client.clientName}
            type="text"
            field="clientName"
            onSave={(field, value) => handleCellSave(client.id, field, value)}
          />
        );
      case 'clinicName':
        return (
          <SalesEditableCell
            value={client.clinicName || ''}
            type="text"
            field="clinicName"
            onSave={(field, value) => handleCellSave(client.id, field, value)}
          />
        );
      case 'telefone':
        return (
          <SalesEditableCell
            value={client.telefone || ''}
            type="text"
            field="telefone"
            onSave={(field, value) => handleCellSave(client.id, field, value)}
          />
        );
      case 'vendedor':
        return (
          <SalesEditableCell
            value={client.vendedor || ''}
            type="select"
            field="vendedor"
            options={VENDEDOR_OPTIONS}
            badgeClassName={VENDEDOR_COLORS[client.vendedor as Vendedor]}
            onSave={(field, value) => handleCellSave(client.id, field, value)}
          />
        );
      case 'equipe':
        return (
          <SalesEditableCell
            value={client.equipe}
            type="select"
            field="equipe"
            options={EQUIPE_OPTIONS}
            badgeClassName={EQUIPE_COLORS[client.equipe as Equipe]}
            onSave={(field, value) => handleCellSave(client.id, field, value)}
          />
        );
      case 'pacote':
        return (
          <SalesEditableCell
            value={client.pacote}
            type="select"
            field="pacote"
            options={PACOTE_OPTIONS}
            badgeClassName={PACOTE_COLORS[client.pacote as Pacote]}
            onSave={(field, value) => handleCellSave(client.id, field, value)}
          />
        );
      case 'periodo':
        return (
          <SalesEditableCell
            value={client.periodo}
            type="select"
            field="periodo"
            options={PERIODO_OPTIONS}
            badgeClassName={PERIODO_COLORS[client.periodo as Periodo]}
            onSave={(field, value) => handleCellSave(client.id, field, value)}
          />
        );
      case 'entrada':
        return (
          <SalesEditableCell
            value={client.entrada}
            type="number"
            field="entrada"
            onSave={(field, value) => handleCellSave(client.id, field, value)}
            formatDisplay={(v) => formatBRL(Number(v))}
            className="text-right font-medium"
          />
        );
      case 'lastStageChange':
        return (
          <span className="text-muted-foreground">
            {client.lastStageChange 
              ? format(new Date(client.lastStageChange), 'dd/MM/yyyy', { locale: ptBR })
              : '-'
            }
          </span>
        );
      case 'stage':
        return (
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              client.stage === 'FECHADO' 
                ? 'bg-success/20 text-success border-success/30' 
                : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
            )}
          >
            {STAGE_LABELS[client.stage]}
          </Badge>
        );
      case 'criativo':
        return (
          <SalesEditableCell
            value={client.criativo || ''}
            type="text"
            field="criativo"
            onSave={(field, value) => handleCellSave(client.id, field, value)}
          />
        );
      case 'pagadorAnuncio':
        return (
          <SalesEditableCell
            value={client.pagadorAnuncio || ''}
            type="select"
            field="pagadorAnuncio"
            options={PAGADOR_ANUNCIO_OPTIONS}
            badgeClassName={client.pagadorAnuncio ? PAGADOR_COLORS[client.pagadorAnuncio as PagadorAnuncio] : ''}
            onSave={(field, value) => handleCellSave(client.id, field, value)}
          />
        );
      default:
        return '-';
    }
  };

  return (
    <div className={cn(
      "space-y-6 transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50 bg-background p-6 overflow-auto"
    )}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-success/10 border-success/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Vendas Fechadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{totals.totalVendas}</div>
            <p className="text-sm text-success/70">
              R$ {totals.valorFechados.toLocaleString('pt-BR')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taxa de Interesse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{totals.totalTaxaInteresse}</div>
            <p className="text-sm text-yellow-500/70">
              R$ {totals.valorTaxaInteresse.toLocaleString('pt-BR')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {totals.valorTotal.toLocaleString('pt-BR')}
            </div>
            <p className="text-sm text-primary/70">
              {salesClients.length} vendas no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-base"
          />
        </div>

        <SalesColumnVisibility
          visibleColumns={visibleColumns}
          onVisibilityChange={setVisibleColumns}
        />

        <Button variant="outline" onClick={exportToCSV} className="gap-2 h-10 text-sm">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>

        <Button 
          variant="outline" 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="gap-2 h-10 text-sm"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFullscreen ? 'Sair' : 'Tela cheia'}
        </Button>
      </div>

      {/* Filters Row 2 */}
      <div className="flex flex-wrap items-center gap-3">
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
        
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px] h-10 text-sm">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="FECHADO">Fechados</SelectItem>
            <SelectItem value="TAXA_INTERESSE">Taxa de Interesse</SelectItem>
          </SelectContent>
        </Select>

        <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
          <SelectTrigger className="w-[150px] h-10 text-sm">
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todos vendedores</SelectItem>
            {VENDEDOR_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={equipeFilter} onValueChange={setEquipeFilter}>
          <SelectTrigger className="w-[160px] h-10 text-sm">
            <SelectValue placeholder="Equipe" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todas equipes</SelectItem>
            {EQUIPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
          <SelectTrigger className="w-[140px] h-10 text-sm">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todos períodos</SelectItem>
            {PERIODO_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {isColumnVisible('clientName') && (
                  <TableHead 
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort('clientName')}
                  >
                    <div className="flex items-center gap-2">
                      Cliente
                      <SortIcon field="clientName" />
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('clinicName') && (
                  <TableHead className="whitespace-nowrap">Clínica</TableHead>
                )}
                {isColumnVisible('telefone') && (
                  <TableHead className="whitespace-nowrap">Telefone</TableHead>
                )}
                {isColumnVisible('vendedor') && (
                  <TableHead 
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort('vendedor')}
                  >
                    <div className="flex items-center gap-2">
                      Vendedor
                      <SortIcon field="vendedor" />
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('equipe') && (
                  <TableHead 
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort('equipe')}
                  >
                    <div className="flex items-center gap-2">
                      Equipe
                      <SortIcon field="equipe" />
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('pacote') && (
                  <TableHead className="whitespace-nowrap">Pacote</TableHead>
                )}
                {isColumnVisible('periodo') && (
                  <TableHead className="whitespace-nowrap">Período</TableHead>
                )}
                {isColumnVisible('criativo') && (
                  <TableHead className="whitespace-nowrap">Criativo</TableHead>
                )}
                {isColumnVisible('pagadorAnuncio') && (
                  <TableHead className="whitespace-nowrap">Pagador Anúncio</TableHead>
                )}
                {isColumnVisible('entrada') && (
                  <TableHead 
                    className="cursor-pointer select-none whitespace-nowrap text-right"
                    onClick={() => handleSort('entrada')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      Entrada
                      <SortIcon field="entrada" />
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('lastStageChange') && (
                  <TableHead 
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort('lastStageChange')}
                  >
                    <div className="flex items-center gap-2">
                      Data
                      <SortIcon field="lastStageChange" />
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('stage') && (
                  <TableHead 
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort('stage')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      <SortIcon field="stage" />
                    </div>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12 text-muted-foreground">
                    Nenhuma venda encontrada no período selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                salesClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/30">
                    {visibleColumns.map((column) => (
                      <TableCell key={column} className={column === 'entrada' ? 'text-right' : ''}>
                        {renderCell(client, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>Mostrando {salesClients.length} registro(s)</span>
        <span className="font-medium">
          Total: R$ {totals.valorTotal.toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );
}
