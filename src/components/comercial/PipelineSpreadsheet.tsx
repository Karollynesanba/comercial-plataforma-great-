import { useState, useMemo, useCallback } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  useCommercial, 
  PipelineClient, 
  PipelineStage, 
  STAGE_LABELS,
  VENDEDOR_OPTIONS,
  EQUIPE_OPTIONS,
  FATURAMENTO_OPTIONS,
  PACOTE_OPTIONS,
  PERIODO_OPTIONS,
  INDICACAO_OPTIONS,
  LOST_REASON_OPTIONS,
  PAGADOR_ANUNCIO_OPTIONS,
  AGENDADOR_OPTIONS,
  Vendedor,
  Equipe,
  Faturamento,
  Pacote,
  Periodo,
  PagadorAnuncio,
  Agendador,
} from '@/contexts/CommercialContext';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from './PeriodFilter';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  MoreHorizontal,
  Download,
  CalendarIcon,
  Check,
  Plus,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Trash2,
  Pencil,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatBRL } from '@/lib/utils';
import { LostReasonDialog } from './LostReasonDialog';
import { NoShowReasonDialog } from './NoShowReasonDialog';
import { ClosedDetailsDialog } from './ClosedDetailsDialog';
import { DeleteClientDialog } from './DeleteClientDialog';
import { EditClientDialog } from './EditClientDialog';
import { CelebrationAnimation } from './CelebrationAnimation';
import { toast } from 'sonner';

interface PipelineSpreadsheetProps {
  onEditClient?: (client: PipelineClient) => void;
  onDeleteClient?: (client: PipelineClient) => void;
  canExport?: boolean;
}

type SortField = 'clientName' | 'vendedor' | 'entrada' | 'stage' | 'dataEntrada' | 'equipe';
type SortDirection = 'asc' | 'desc';

// Color mappings for pills - based on category
const ATIVO_COLORS = {
  true: 'bg-success/20 text-success border-success/30',
  false: 'bg-muted text-muted-foreground border-border',
};

const VENDEDOR_COLORS: Record<Vendedor, string> = {
  'HERBERT': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'CLED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'PEDRO_H': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'PEDRO_JUAN': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'CAETANO': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const EQUIPE_COLORS: Record<Equipe, string> = {
  'LIRA': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'KAUAN': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

const FATURAMENTO_COLORS: Partial<Record<Faturamento, string>> = {
  '0_A_10K': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  '10K_A_20K': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  '20K_A_30K': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  '30K_A_50K': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  '50K_A_80K': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  '80K_A_100K': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  '100K_A_150K': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  '150K_A_250K': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  '250K_A_400K': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  '400K_A_600K': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  '600K_A_1M': 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  '1M_PLUS': 'bg-red-500/20 text-red-400 border-red-500/30',
  'NAO_INFORMADO': 'bg-muted text-muted-foreground border-border',
  'PERSONALIZADO': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const PACOTE_COLORS: Record<Pacote, string> = {
  'COMPLETO': 'bg-red-500/20 text-red-400 border-red-500/30',
  'TRAFEGO_E_CRIATIVOS': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'ATENDIMENTO': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'TRAFEGO': 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  'COMPLETO_NOVA_ERA': 'bg-green-500/20 text-green-400 border-green-500/30',
  'TRAFEGO_ARTES_IA': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'TRAFEGO_CONSULTORIA': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'IA': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'TRAFEGO_ROTEIRO': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'TRAFEGO_IA': 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
};

const PERIODO_COLORS: Record<Periodo, string> = {
  'MENSAL': 'bg-green-500/20 text-green-400 border-green-500/30',
  'TRIMESTRAL': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'SEMESTRAL': 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  'TAXA_INTERESSE': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const AGENDADOR_COLORS: Record<Agendador, string> = {
  'MIGUEL': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'PEDRO': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'HEBERT': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'CLED': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'CAETANO': 'bg-lime-500/20 text-lime-400 border-lime-500/30',
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  'NOVO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'NO_SHOW': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'TAXA_INTERESSE': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'NEGOCIACAO': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'PERDIDO': 'bg-muted text-muted-foreground border-border',
  'FECHADO': 'bg-success/20 text-success border-success/30',
};

export function PipelineSpreadsheet({ 
  onEditClient, 
  onDeleteClient,
  canExport = false 
}: PipelineSpreadsheetProps) {
  const { 
    pipelineClients, 
    updatePipelineClient, 
    movePipelineClient,
    criativos,
    addCriativo,
  } = useCommercial();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('dataEntrada');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [vendedorFilter, setVendedorFilter] = useState<string>('all');
  const [equipeFilter, setEquipeFilter] = useState<string>('all');
  const [periodoFilter, setPeriodoFilter] = useState<string>('all');
  const [pacoteFilter, setPacoteFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>('current_month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [showInactive, setShowInactive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { filterByPeriod } = usePeriodFilter();
  
  // Lost reason dialog
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [pendingLostClient, setPendingLostClient] = useState<PipelineClient | null>(null);

  // No Show dialog
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [pendingNoShowClient, setPendingNoShowClient] = useState<PipelineClient | null>(null);

  // Closed details dialog
  const [closedDialogOpen, setClosedDialogOpen] = useState(false);
  const [pendingClosedClient, setPendingClosedClient] = useState<PipelineClient | null>(null);

  // Celebration animation
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{ clientName: string; value: number } | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<PipelineClient | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<PipelineClient | null>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // New criativo input
  const [newCriativo, setNewCriativo] = useState('');

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...pipelineClients];

    // Show inactive filter
    if (!showInactive) {
      result = result.filter(c => c.ativo);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const normalizedQuery = query.replace(/\D/g, ''); // Remove non-digits for phone matching
      result = result.filter(c => 
        c.clientName.toLowerCase().includes(query) ||
        c.clinicName.toLowerCase().includes(query) ||
        c.criativo.toLowerCase().includes(query) ||
        (normalizedQuery.length > 0 && c.telefone && c.telefone.replace(/\D/g, '').includes(normalizedQuery))
      );
    }

    // Stage filter
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

    // Pacote filter
    if (pacoteFilter !== 'all') {
      result = result.filter(c => c.pacote === pacoteFilter);
    }

    // Period filter
    result = result.filter(c => {
      const clientDate = c.dataEntrada || c.entryDate;
      return filterByPeriod(clientDate ? new Date(clientDate) : undefined, periodFilter, customStart, customEnd);
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'clientName':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'vendedor':
          comparison = a.vendedor.localeCompare(b.vendedor);
          break;
        case 'entrada':
          comparison = a.entrada - b.entrada;
          break;
        case 'stage':
          comparison = a.stage.localeCompare(b.stage);
          break;
        case 'dataEntrada':
          comparison = new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime();
          break;
        case 'equipe':
          comparison = a.equipe.localeCompare(b.equipe);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [pipelineClients, searchQuery, sortField, sortDirection, stageFilter, vendedorFilter, equipeFilter, periodoFilter, pacoteFilter, periodFilter, customStart, customEnd, showInactive, filterByPeriod]);

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

  const handleStageChange = (client: PipelineClient, newStage: PipelineStage) => {
    if (newStage === 'PERDIDO') {
      setPendingLostClient(client);
      setLostDialogOpen(true);
      return;
    }
    
    if (newStage === 'NO_SHOW') {
      setPendingNoShowClient(client);
      setNoShowDialogOpen(true);
      return;
    }

    if (newStage === 'FECHADO') {
      // Ask for pagador anúncio
      setPendingClosedClient(client);
      setClosedDialogOpen(true);
      return;
    }

    movePipelineClient(client.id, newStage);
  };

  const handleLostConfirm = (reason: string, vendedor: string) => {
    if (pendingLostClient) {
      // First update the vendedor, then move to PERDIDO
      updatePipelineClient(pendingLostClient.id, { vendedor: vendedor as any });
      movePipelineClient(pendingLostClient.id, 'PERDIDO', reason, { vendedor: vendedor as any });
      toast.info('Cliente movido para Perdidos');
      setPendingLostClient(null);
    }
  };

  const handleNoShowConfirm = (reason: string, vendedor: string) => {
    if (pendingNoShowClient) {
      updatePipelineClient(pendingNoShowClient.id, { vendedor: vendedor as any, noShowReason: reason });
      movePipelineClient(pendingNoShowClient.id, 'NO_SHOW');
      toast.warning(`${pendingNoShowClient.clientName} marcado como No Show`);
      setPendingNoShowClient(null);
    }
  };

  const handleClosedConfirm = (equipe: Equipe, pagadorAnuncio: PagadorAnuncio, clinicName: string) => {
    if (pendingClosedClient) {
      const extraData = { equipe, pagadorAnuncio, clinicName };
      updatePipelineClient(pendingClosedClient.id, extraData);
      movePipelineClient(pendingClosedClient.id, 'FECHADO', undefined, {
        ...extraData,
        periodo: pendingClosedClient.periodo,
        entrada: pendingClosedClient.entrada,
      });
      // Trigger celebration animation
      setCelebrationData({ clientName: pendingClosedClient.clientName, value: pendingClosedClient.entrada });
      setShowCelebration(true);
      setPendingClosedClient(null);
    }
  };

  const handleInlineEdit = (id: string, field: keyof PipelineClient, value: any) => {
    updatePipelineClient(id, { [field]: value });
    setEditingCell(null);
  };

  const handleTextEdit = (client: PipelineClient, field: string) => {
    setEditingCell({ id: client.id, field });
    setEditValue(client[field as keyof PipelineClient] as string || '');
  };

  const handleTextEditSave = (id: string, field: string) => {
    if (field === 'entrada') {
      const value = parseFloat(editValue.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(value)) {
        updatePipelineClient(id, { entrada: value });
      }
    } else {
      updatePipelineClient(id, { [field]: editValue });
    }
    setEditingCell(null);
  };

  const handleAddCriativo = () => {
    if (newCriativo.trim()) {
      addCriativo(newCriativo.trim());
      setNewCriativo('');
    }
  };

  const getDaysInPipeline = (client: PipelineClient) => {
    return differenceInDays(new Date(), new Date(client.dataEntrada));
  };

  const exportToCSV = () => {
    const headers = ['ATIVO', 'CLIENTE', 'VENDEDOR', 'CRIATIVO', 'EQUIPE', 'FATURAMENTO', 'PACOTE', 'PERÍODO', 'INDICAÇÃO', 'ENTRADA', 'DATA', 'DIAS', 'STATUS', 'MOTIVO PERDA'];
    const rows = filteredClients.map(c => [
      c.ativo ? 'ATIVO' : 'INATIVO',
      c.clientName,
      VENDEDOR_OPTIONS.find(v => v.value === c.vendedor)?.label || c.vendedor,
      c.criativo,
      EQUIPE_OPTIONS.find(e => e.value === c.equipe)?.label || c.equipe,
      c.faturamento === 'PERSONALIZADO' && c.faturamentoPersonalizado
        ? c.faturamentoPersonalizado
        : (FATURAMENTO_OPTIONS.find(f => f.value === c.faturamento)?.label || c.faturamento),
      PACOTE_OPTIONS.find(p => p.value === c.pacote)?.label || c.pacote,
      PERIODO_OPTIONS.find(p => p.value === c.periodo)?.label || c.periodo,
      c.indicacao || '-',
      c.entrada,
      format(new Date(c.dataEntrada), 'dd/MM/yyyy'),
      getDaysInPipeline(c),
      STAGE_LABELS[c.stage],
      c.lostReason || '-',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pipeline_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setStageFilter('all');
    setVendedorFilter('all');
    setEquipeFilter('all');
    setPeriodoFilter('all');
    setPacoteFilter('all');
    setPeriodFilter('current_month');
    setCustomStart(undefined);
    setCustomEnd(undefined);
    setSearchQuery('');
  };

  const hasActiveFilters = stageFilter !== 'all' || vendedorFilter !== 'all' || equipeFilter !== 'all' || periodoFilter !== 'all' || pacoteFilter !== 'all' || periodFilter !== 'current_month' || searchQuery !== '';

  return (
    <div className={cn(
      "space-y-6 transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50 bg-background p-6 overflow-auto"
    )}>
      {/* Filters Row 1: Search and Actions */}
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

        <Button 
          variant={showInactive ? "secondary" : "outline"} 
          onClick={() => setShowInactive(!showInactive)}
          className="gap-2 h-11 text-sm"
        >
          {showInactive ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          {showInactive ? 'Mostrando inativos' : 'Mostrar inativos'}
        </Button>

        {canExport && (
          <Button variant="outline" onClick={exportToCSV} className="gap-2 h-11 text-sm">
            <Download className="h-5 w-5" />
            Exportar CSV
          </Button>
        )}

        <Button 
          variant="outline" 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="gap-2 h-11 text-sm"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        </Button>
      </div>

      {/* Filters Row 2: Dropdowns */}
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

        <Select value={pacoteFilter} onValueChange={setPacoteFilter}>
          <SelectTrigger className="w-[170px] h-10 text-sm">
            <SelectValue placeholder="Pacote" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todos pacotes</SelectItem>
            {PACOTE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
          <SelectTrigger className="w-[150px] h-10 text-sm">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todos períodos</SelectItem>
            {PERIODO_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[150px] h-10 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="h-10 text-sm">
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[75vh]">
          <Table className="text-base">
            <TableHeader className="sticky top-0 z-10 bg-surface-2">
              <TableRow className="bg-surface-2 hover:bg-surface-2 h-14">
                <TableHead className="w-[100px] text-sm font-semibold">ATIVO</TableHead>
                <TableHead className="min-w-[200px] text-sm font-semibold">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('clientName')}
                  >
                    CLIENTE <SortIcon field="clientName" />
                  </button>
                </TableHead>
                <TableHead className="w-[130px] text-sm font-semibold">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('vendedor')}
                  >
                    VENDEDOR <SortIcon field="vendedor" />
                  </button>
                </TableHead>
                <TableHead className="w-[150px] text-sm font-semibold">CRIATIVO</TableHead>
                <TableHead className="w-[150px] text-sm font-semibold">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('equipe')}
                  >
                    EQUIPE <SortIcon field="equipe" />
                  </button>
                </TableHead>
                <TableHead className="w-[150px] text-sm font-semibold">FATURAMENTO</TableHead>
                <TableHead className="w-[160px] text-sm font-semibold">PACOTE</TableHead>
                <TableHead className="w-[130px] text-sm font-semibold">PERÍODO</TableHead>
                <TableHead className="w-[110px] text-sm font-semibold">INDICAÇÃO</TableHead>
                <TableHead className="w-[130px] text-sm font-semibold">AGENDADO POR</TableHead>
                <TableHead className="w-[130px] text-sm font-semibold text-right">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors ml-auto"
                    onClick={() => handleSort('entrada')}
                  >
                    ENTRADA <SortIcon field="entrada" />
                  </button>
                </TableHead>
                <TableHead className="w-[120px] text-sm font-semibold">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('dataEntrada')}
                  >
                    DATA <SortIcon field="dataEntrada" />
                  </button>
                </TableHead>
                <TableHead className="w-[140px] text-sm font-semibold">STATUS</TableHead>
                {showInactive && <TableHead className="w-[150px] text-sm font-semibold">MOTIVO</TableHead>}
                <TableHead className="w-[100px] text-sm font-semibold text-center">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showInactive ? 15 : 14} className="text-center text-muted-foreground py-12 text-base">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const daysInPipeline = getDaysInPipeline(client);
                  
                  return (
                    <TableRow 
                      key={client.id}
                      className={cn(
                        "transition-colors h-14",
                        !client.ativo && 'opacity-60',
                      )}
                    >
                      {/* ATIVO */}
                      <TableCell className="p-3">
                        <Select
                          value={client.ativo ? 'ATIVO' : 'INATIVO'}
                          onValueChange={(value) => handleInlineEdit(client.id, 'ativo', value === 'ATIVO')}
                        >
                          <SelectTrigger className="h-9 w-full border-0 p-0">
                            <Badge className={cn('text-xs px-3 py-1', ATIVO_COLORS[String(client.ativo) as keyof typeof ATIVO_COLORS])}>
                              {client.ativo ? 'ATIVO' : 'INATIVO'}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="ATIVO">Ativo</SelectItem>
                            <SelectItem value="INATIVO">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* CLIENTE */}
                      <TableCell className="p-3">
                        {editingCell?.id === client.id && editingCell?.field === 'clientName' ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleTextEditSave(client.id, 'clientName')}
                            onKeyDown={(e) => e.key === 'Enter' && handleTextEditSave(client.id, 'clientName')}
                            className="h-9 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="text-sm font-medium cursor-pointer hover:text-primary"
                            onClick={() => handleTextEdit(client, 'clientName')}
                          >
                            {client.clientName}
                          </span>
                        )}
                      </TableCell>

                      {/* VENDEDOR */}
                      <TableCell className="p-3">
                        <Select
                          value={client.vendedor}
                          onValueChange={(value) => handleInlineEdit(client.id, 'vendedor', value as Vendedor)}
                        >
                          <SelectTrigger className="h-9 w-full border-0 p-0">
                            <Badge className={cn('text-xs px-3 py-1', VENDEDOR_COLORS[client.vendedor])}>
                              {VENDEDOR_OPTIONS.find(v => v.value === client.vendedor)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {VENDEDOR_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-xs px-3 py-1', VENDEDOR_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* CRIATIVO */}
                      <TableCell className="p-3">
                        <Select
                          value={client.criativo}
                          onValueChange={(value) => handleInlineEdit(client.id, 'criativo', value)}
                        >
                          <SelectTrigger className="h-9 w-full border-0 p-0">
                            <Badge className="text-xs px-3 py-1 bg-rose-500/20 text-rose-400 border-rose-500/30">
                              {client.criativo}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover max-h-[300px]">
                            {criativos.map(criativo => (
                              <SelectItem key={criativo} value={criativo}>
                                {criativo}
                              </SelectItem>
                            ))}
                            <div className="p-2 border-t border-border">
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Novo criativo..."
                                  value={newCriativo}
                                  onChange={(e) => setNewCriativo(e.target.value)}
                                  className="h-9 text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button 
                                  size="sm" 
                                  className="h-9 px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddCriativo();
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* EQUIPE */}
                      <TableCell className="p-3">
                        <Select
                          value={client.equipe}
                          onValueChange={(value) => handleInlineEdit(client.id, 'equipe', value as Equipe)}
                        >
                          <SelectTrigger className="h-9 w-full border-0 p-0">
                            <Badge className={cn('text-xs px-3 py-1', EQUIPE_COLORS[client.equipe])}>
                              {EQUIPE_OPTIONS.find(e => e.value === client.equipe)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {EQUIPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-xs px-3 py-1', EQUIPE_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* FATURAMENTO */}
                      <TableCell className="p-3">
                        <Select
                          value={client.faturamento}
                          onValueChange={(value) => handleInlineEdit(client.id, 'faturamento', value as Faturamento)}
                        >
                          <SelectTrigger className="h-9 w-full border-0 p-0">
                            <Badge className={cn('text-xs px-3 py-1 truncate max-w-[130px]', FATURAMENTO_COLORS[client.faturamento])}>
                              {client.faturamento === 'PERSONALIZADO' && client.faturamentoPersonalizado
                                ? client.faturamentoPersonalizado
                                : FATURAMENTO_OPTIONS.find(f => f.value === client.faturamento)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {FATURAMENTO_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-xs px-3 py-1', FATURAMENTO_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* PACOTE */}
                      <TableCell className="p-3">
                        <Select
                          value={client.pacote}
                          onValueChange={(value) => handleInlineEdit(client.id, 'pacote', value as Pacote)}
                        >
                          <SelectTrigger className="h-9 w-full border-0 p-0">
                            <Badge className={cn('text-xs px-3 py-1', PACOTE_COLORS[client.pacote])}>
                              {PACOTE_OPTIONS.find(p => p.value === client.pacote)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {PACOTE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-xs px-3 py-1', PACOTE_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* PERÍODO */}
                      <TableCell className="p-3">
                        <Select
                          value={client.periodo}
                          onValueChange={(value) => handleInlineEdit(client.id, 'periodo', value as Periodo)}
                        >
                          <SelectTrigger className="h-9 w-full border-0 p-0">
                            <Badge className={cn('text-xs px-3 py-1', PERIODO_COLORS[client.periodo])}>
                              {PERIODO_OPTIONS.find(p => p.value === client.periodo)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {PERIODO_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-xs px-3 py-1', PERIODO_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* INDICAÇÃO */}
                      <TableCell className="p-3">
                        <Select
                          value={client.indicacao || 'NAO'}
                          onValueChange={(value) => handleInlineEdit(client.id, 'indicacao', value)}
                        >
                          <SelectTrigger className="h-9 w-full border-0 p-0">
                            <Badge className={cn('text-xs px-3 py-1', client.indicacao === 'SIM' ? 'bg-success/20 text-success border-success/30' : 'bg-muted text-muted-foreground border-border')}>
                              {client.indicacao || 'Não'}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {INDICACAO_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* AGENDADO POR */}
                      <TableCell className="p-3">
                        <Select
                          value={client.agendadoPor || ''}
                          onValueChange={(value) => handleInlineEdit(client.id, 'agendadoPor', value as Agendador)}
                        >
                          <SelectTrigger className="h-9 w-full border-0 p-0">
                            {client.agendadoPor ? (
                              <Badge className={cn('text-xs px-3 py-1', AGENDADOR_COLORS[client.agendadoPor])}>
                                {AGENDADOR_OPTIONS.find(a => a.value === client.agendadoPor)?.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {AGENDADOR_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-xs px-3 py-1', AGENDADOR_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* ENTRADA */}
                      <TableCell className="p-3 text-right">
                        {editingCell?.id === client.id && editingCell?.field === 'entrada' ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleTextEditSave(client.id, 'entrada')}
                            onKeyDown={(e) => e.key === 'Enter' && handleTextEditSave(client.id, 'entrada')}
                            className="h-9 text-sm text-right"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="text-sm font-semibold tabular-nums cursor-pointer hover:text-primary"
                            onClick={() => {
                              setEditingCell({ id: client.id, field: 'entrada' });
                              setEditValue(client.entrada.toString());
                            }}
                          >
                            R$ {client.entrada.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </TableCell>

                      {/* DATA */}
                      <TableCell className="p-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="h-9 px-3 text-sm font-normal">
                              {format(new Date(client.dataEntrada), 'dd/MM/yy', { locale: ptBR })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-popover" align="start">
                            <Calendar
                              mode="single"
                              selected={new Date(client.dataEntrada)}
                              onSelect={(date) => date && handleInlineEdit(client.id, 'dataEntrada', date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>



                      {/* STATUS */}
                      <TableCell className="p-3">
                        <Select
                          value={client.stage}
                          onValueChange={(value) => handleStageChange(client, value as PipelineStage)}
                        >
                          <SelectTrigger className="h-9 w-full border-0 p-0">
                            <Badge className={cn('text-xs px-3 py-1', STAGE_COLORS[client.stage])}>
                              {STAGE_LABELS[client.stage]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {Object.entries(STAGE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                <Badge className={cn('text-xs px-3 py-1', STAGE_COLORS[value as PipelineStage])}>
                                  {label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* MOTIVO (only when showing inactive) */}
                      {showInactive && (
                        <TableCell className="p-3">
                          <span className="text-sm text-muted-foreground">
                            {client.lostReason || '-'}
                          </span>
                        </TableCell>
                      )}

                      {/* AÇÕES */}
                      <TableCell className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setClientToEdit(client);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setClientToDelete(client);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-base text-muted-foreground px-3 py-2">
        <span>{filteredClients.length} leads {showInactive ? '(incluindo inativos)' : ''}</span>
        <span>
          Total: <strong className="text-foreground text-lg">R$ {filteredClients.reduce((sum, c) => sum + c.entrada, 0).toLocaleString('pt-BR')}</strong>
        </span>
      </div>

      {/* Lost Reason Dialog */}
      <LostReasonDialog
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
        clientName={pendingLostClient?.clientName || ''}
        onConfirm={handleLostConfirm}
      />

      {/* No Show Reason Dialog */}
      <NoShowReasonDialog
        open={noShowDialogOpen}
        onOpenChange={setNoShowDialogOpen}
        clientName={pendingNoShowClient?.clientName || ''}
        onConfirm={handleNoShowConfirm}
      />

      {/* Delete Client Dialog */}
      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        client={clientToDelete}
      />

      {/* Edit Client Dialog */}
      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={clientToEdit}
      />

      {/* Closed Details Dialog */}
      <ClosedDetailsDialog
        open={closedDialogOpen}
        onOpenChange={setClosedDialogOpen}
        clientName={pendingClosedClient?.clientName || ''}
        currentClinicName={pendingClosedClient?.clinicName}
        onConfirm={handleClosedConfirm}
      />

      {/* Celebration Animation */}
      <CelebrationAnimation
        show={showCelebration}
        type="sale"
        title={celebrationData ? `🎉 ${celebrationData.clientName} fechou!` : undefined}
        subtitle={celebrationData ? `Valor: ${formatBRL(celebrationData.value)}` : undefined}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
}
