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
import { parseLocalDateValue } from './MonthPeriodFilter';
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
import { NegotiationDetailsDialog } from './NegotiationDetailsDialog';
import { TaxaInterestDetailsDialog } from './TaxaInterestDetailsDialog';
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

const TIME_FILTER_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const value = `${String(hour).padStart(2, '0')}:00`;
  return { value, label: value };
});

// Color mappings for pills - based on category
const ATIVO_COLORS = {
  true: 'bg-blue-50 text-blue-700 border-blue-100',
  false: 'bg-slate-50 text-slate-500 border-slate-200',
};

const VENDEDOR_COLORS: Record<Vendedor, string> = {
  'HERBERT': 'bg-blue-50 text-blue-700 border-blue-100',
  'CLED': 'bg-amber-50 text-amber-700 border-amber-100',
  'PEDRO_H': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'PEDRO_JUAN': 'bg-blue-50 text-blue-700 border-blue-100',
  'CAETANO': 'bg-orange-50 text-orange-700 border-orange-100',
};

const EQUIPE_COLORS: Record<Equipe, string> = {
  'LIRA': 'bg-slate-100 text-slate-700 border-slate-200',
  'KAUAN': 'bg-slate-100 text-slate-700 border-slate-200',
};

const FATURAMENTO_COLORS: Partial<Record<Faturamento, string>> = {
  '0_A_10K': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '10K_A_20K': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '20K_A_30K': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '30K_A_50K': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '50K_A_80K': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '80K_A_100K': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '100K_A_150K': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '150K_A_250K': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '250K_A_400K': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '400K_A_600K': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '600K_A_1M': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '1M_PLUS': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'NAO_INFORMADO': 'bg-slate-50 text-slate-500 border-slate-200',
  'PERSONALIZADO': 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const PACOTE_COLORS: Record<Pacote, string> = {
  'COMPLETO': 'bg-red-50 text-red-700 border-red-100',
  'TRAFEGO_E_CRIATIVOS': 'bg-orange-50 text-orange-700 border-orange-100',
  'ATENDIMENTO': 'bg-amber-50 text-amber-700 border-amber-100',
  'TRAFEGO': 'bg-lime-50 text-lime-700 border-lime-100',
  'COMPLETO_NOVA_ERA': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'TRAFEGO_ARTES_IA': 'bg-violet-50 text-violet-700 border-violet-100',
  'TRAFEGO_CONSULTORIA': 'bg-pink-50 text-pink-700 border-pink-100',
  'IA': 'bg-slate-50 text-slate-700 border-slate-200',
};

const PERIODO_COLORS: Record<Periodo, string> = {
  'MENSAL': 'bg-slate-100 text-slate-700 border-slate-200',
  'TRIMESTRAL': 'bg-slate-100 text-slate-700 border-slate-200',
  'SEMESTRAL': 'bg-slate-100 text-slate-700 border-slate-200',
  'TAXA_INTERESSE': 'bg-slate-100 text-slate-700 border-slate-200',
};

const AGENDADOR_COLORS: Record<Agendador, string> = {
  'MIGUEL': 'bg-blue-50 text-blue-700 border-blue-100',
  'PEDRO': 'bg-red-50 text-red-700 border-red-100',
  'HEBERT': 'bg-blue-50 text-blue-700 border-blue-100',
  'ALAN': 'bg-violet-50 text-violet-700 border-violet-100',
  'CLED': 'bg-orange-50 text-orange-700 border-orange-100',
  'CAETANO': 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  'NOVO': 'bg-blue-50 text-blue-700 border-blue-100',
  'NO_SHOW': 'bg-rose-50 text-rose-700 border-rose-100',
  'TAXA_INTERESSE': 'bg-amber-50 text-amber-700 border-amber-100',
  'NEGOCIACAO': 'bg-violet-50 text-violet-700 border-violet-100',
  'PERDIDO': 'bg-slate-50 text-slate-500 border-slate-200',
  'FECHADO': 'bg-emerald-50 text-emerald-700 border-emerald-100',
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
  const [horarioFilter, setHorarioFilter] = useState<string>('all');
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

  // Stage details dialogs
  const [negotiationDialogOpen, setNegotiationDialogOpen] = useState(false);
  const [pendingNegotiation, setPendingNegotiation] = useState<{ client: PipelineClient; targetStage: 'NEGOCIACAO' | 'FECHADO' } | null>(null);
  const [taxaDialogOpen, setTaxaDialogOpen] = useState(false);
  const [pendingTaxaClient, setPendingTaxaClient] = useState<PipelineClient | null>(null);

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

  const getAppointmentHour = (client: PipelineClient) => {
    const rawTime = client.meetingTime || (client as any).agenda_event_time || (client as any).horario_especifico || null;
    if (!rawTime) return null;

    const directMatch = String(rawTime).trim().match(/^(\d{1,2}):(\d{2})/);
    if (directMatch) {
      return Number(directMatch[1]);
    }

    const parsed = new Date(rawTime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getHours();
    }

    return null;
  };

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
        (c.funil || '').toLowerCase().includes(query) ||
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

    // Horário filter - matches the full hour window, e.g. 17:00 through 17:59
    if (horarioFilter !== 'all') {
      const selectedHour = Number(horarioFilter.split(':')[0]);
      result = result.filter((client) => getAppointmentHour(client) === selectedHour);
    }

    // Period filter
    result = result.filter(c => {
      const clientDate = c.createdAt || c.dataEntrada || c.entryDate;
      return filterByPeriod(clientDate ? parseLocalDateValue(clientDate) || undefined : undefined, periodFilter, customStart, customEnd);
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
          comparison = (parseLocalDateValue(a.createdAt || a.dataEntrada || a.entryDate)?.getTime() || 0) - (parseLocalDateValue(b.createdAt || b.dataEntrada || b.entryDate)?.getTime() || 0);
          break;
        case 'equipe':
          comparison = a.equipe.localeCompare(b.equipe);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [pipelineClients, searchQuery, sortField, sortDirection, stageFilter, vendedorFilter, equipeFilter, periodoFilter, pacoteFilter, horarioFilter, periodFilter, customStart, customEnd, showInactive, filterByPeriod]);

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

    if (newStage === 'TAXA_INTERESSE') {
      setPendingTaxaClient(client);
      setTaxaDialogOpen(true);
      return;
    }

    if (newStage === 'NEGOCIACAO' && client.entrada === 0) {
      setPendingNegotiation({ client, targetStage: 'NEGOCIACAO' });
      setNegotiationDialogOpen(true);
      return;
    }

    if (newStage === 'FECHADO') {
      setPendingNegotiation({ client, targetStage: 'FECHADO' });
      setNegotiationDialogOpen(true);
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

  const handleTaxaConfirm = ({ vendedor, valor }: { vendedor: Vendedor; valor: number }) => {
    if (!pendingTaxaClient) return;
    movePipelineClient(pendingTaxaClient.id, 'TAXA_INTERESSE', undefined, {
      vendedor,
      entrada: valor,
      periodo: 'TAXA_INTERESSE',
      isMrr: false,
      mrrEntrada: valor,
      mrrRemaining: 0,
    });
    toast.success(`${pendingTaxaClient.clientName} movido para Taxa de Interesse`);
    setPendingTaxaClient(null);
  };

  const handleNegotiationConfirm = (data: { vendedor: Vendedor; pacote: Pacote; periodo: Periodo; entrada: number; isMrr?: boolean; mrrRemaining?: number; clinicName?: string; equipe?: Equipe; pagadorAnuncio?: PagadorAnuncio }) => {
    if (!pendingNegotiation) return;
    const { client, targetStage } = pendingNegotiation;
    const extraData = {
      vendedor: data.vendedor,
      pacote: data.pacote,
      periodo: data.periodo,
      entrada: data.entrada,
      isMrr: data.isMrr || false,
      mrrEntrada: data.entrada,
      mrrRemaining: data.isMrr ? Number(data.mrrRemaining || 0) : 0,
      ...(data.clinicName && { clinicName: data.clinicName }),
      ...(data.equipe && { equipe: data.equipe }),
      ...(data.pagadorAnuncio && { pagadorAnuncio: data.pagadorAnuncio }),
    };
    movePipelineClient(client.id, targetStage, undefined, extraData);
    toast.success(`${client.clientName} movido para ${targetStage === 'FECHADO' ? 'Fechado' : 'Negociação'}`);
    setPendingNegotiation(null);
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
    const createdDate = parseLocalDateValue(client.createdAt || client.dataEntrada || client.entryDate);
    return createdDate ? differenceInDays(new Date(), createdDate) : 0;
  };

  const getAppointmentTime = (client: PipelineClient) => {
    const rawTime = client.meetingTime || (client as any).agenda_event_time || (client as any).horario_especifico || null;
    if (!rawTime) return "-";

    const directMatch = String(rawTime).trim().match(/^(\d{1,2}):(\d{2})/);
    if (directMatch) {
      return `${directMatch[1].padStart(2, "0")}:${directMatch[2]}`;
    }

    const parsed = new Date(rawTime);
    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, "HH:mm");
    }

    return String(rawTime);
  };

  const exportToCSV = () => {
    const rows = filteredClients.map(c => [
      c.ativo ? 'ATIVO' : 'INATIVO',
      c.clientName,
      VENDEDOR_OPTIONS.find(v => v.value === c.vendedor)?.label || c.vendedor,
      c.funil || '-',
      c.criativo,
      EQUIPE_OPTIONS.find(e => e.value === c.equipe)?.label || c.equipe,
      c.faturamento === 'PERSONALIZADO' && c.faturamentoPersonalizado
        ? c.faturamentoPersonalizado
        : (FATURAMENTO_OPTIONS.find(f => f.value === c.faturamento)?.label || c.faturamento),
      PERIODO_OPTIONS.find(p => p.value === c.periodo)?.label || c.periodo,
      format(parseLocalDateValue(c.createdAt || c.dataEntrada || c.entryDate) || new Date(), 'dd/MM/yyyy'),
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
    setHorarioFilter('all');
    setPeriodFilter('current_month');
    setCustomStart(undefined);
    setCustomEnd(undefined);
    setSearchQuery('');
  };

  const hasActiveFilters = stageFilter !== 'all' || vendedorFilter !== 'all' || equipeFilter !== 'all' || periodoFilter !== 'all' || pacoteFilter !== 'all' || horarioFilter !== 'all' || periodFilter !== 'current_month' || searchQuery !== '';

  return (
    <div className={cn(
      "space-y-6 transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50 bg-background p-6 overflow-auto"
    )}>
      {/* Filters Row 1: Search and Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-sm"
          />
        </div>

        <Button 
          variant={showInactive ? "secondary" : "outline"} 
          onClick={() => setShowInactive(!showInactive)}
          className="gap-2 h-11 rounded-xl border-slate-200 bg-white text-sm shadow-sm"
        >
          {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {showInactive ? 'Mostrando inativos' : 'Mostrar inativos'}
        </Button>

        {canExport && (
          <Button variant="outline" onClick={exportToCSV} className="gap-2 h-11 rounded-xl border-slate-200 bg-white text-sm shadow-sm">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        )}

        <Button 
          variant="outline" 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="gap-2 h-11 rounded-xl border-slate-200 bg-white text-sm shadow-sm"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
          <SelectTrigger className="h-10 w-[170px] rounded-xl border-slate-200 bg-white text-sm shadow-sm">
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todos vendedores</SelectItem>
            {VENDEDOR_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={horarioFilter} onValueChange={setHorarioFilter}>
          <SelectTrigger className="h-10 w-[130px] rounded-xl border-slate-200 bg-white text-sm shadow-sm">
            <SelectValue placeholder="Horário" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todos horários</SelectItem>
            {TIME_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={equipeFilter} onValueChange={setEquipeFilter}>
          <SelectTrigger className="h-10 w-[160px] rounded-xl border-slate-200 bg-white text-sm shadow-sm">
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
          <SelectTrigger className="w-[150px] h-10 text-sm">
            <SelectValue placeholder="PerÃ­odo" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todos perÃ­odos</SelectItem>
            {PERIODO_OPTIONS.map(opt => (
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

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="h-10 w-[150px] rounded-xl border-slate-200 bg-white text-sm shadow-sm">
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
          <Button variant="ghost" onClick={clearFilters} className="h-10 rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_20px_50px_-30px_rgba(15,23,42,0.2)]">
        <div className="overflow-hidden">
          <Table className="w-full table-fixed text-[12px]">
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow className="h-14 border-b border-slate-200 bg-white hover:bg-white">
                <TableHead className="w-[72px] text-[11px] font-semibold uppercase tracking-wide text-slate-500">ATIVO</TableHead>
                <TableHead className="w-[150px] text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('clientName')}
                  >
                    CLIENTE <SortIcon field="clientName" />
                  </button>
                </TableHead>
                <TableHead className="w-[92px] text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('vendedor')}
                  >
                    VENDEDOR <SortIcon field="vendedor" />
                  </button>
                </TableHead>
                <TableHead className="w-[110px] text-[11px] font-semibold uppercase tracking-wide text-slate-500">CRIATIVO</TableHead>
                <TableHead className="w-[110px] text-xs font-semibold">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('equipe')}
                  >
                    EQUIPE <SortIcon field="equipe" />
                  </button>
                </TableHead>
                  <TableHead className="w-[110px] text-[11px] font-semibold uppercase tracking-wide text-slate-500">FATURAMENTO</TableHead>
                  <TableHead className="w-[160px] text-sm font-semibold">PACOTE</TableHead>
                  <TableHead className="w-[130px] text-sm font-semibold">PERÍODO</TableHead>
                  <TableHead className="w-[110px] text-sm font-semibold">INDICAÇÃO</TableHead>
                  <TableHead className="w-[130px] text-sm font-semibold">AGENDADO POR</TableHead>
                  <TableHead className="w-[130px] text-sm font-semibold">HORARIO AGEND.</TableHead>
                  <TableHead className="w-[130px] text-sm font-semibold text-right">
                    <button 
                      className="flex items-center gap-2 hover:text-foreground transition-colors ml-auto"
                      onClick={() => handleSort('entrada')}
                    >
                      ENTRADA <SortIcon field="entrada" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[84px] text-xs font-semibold">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('dataEntrada')}
                  >
                    DATA <SortIcon field="dataEntrada" />
                  </button>
                </TableHead>
                <TableHead className="w-[92px] text-xs font-semibold">STATUS</TableHead>
                {showInactive && <TableHead className="w-[110px] text-xs font-semibold">MOTIVO</TableHead>}
                <TableHead className="w-[68px] text-xs font-semibold text-center">AÃ‡Ã•ES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showInactive ? 16 : 15} className="text-center text-muted-foreground py-12 text-sm">
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
                      <TableCell className="p-2">
                        <Select
                          value={client.ativo ? 'ATIVO' : 'INATIVO'}
                          onValueChange={(value) => handleInlineEdit(client.id, 'ativo', value === 'ATIVO')}
                        >
                          <SelectTrigger className="h-8 w-full border-0 p-0">
                            <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', ATIVO_COLORS[String(client.ativo) as keyof typeof ATIVO_COLORS])}>
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
                      <TableCell className="p-2">
                        {editingCell?.id === client.id && editingCell?.field === 'clientName' ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleTextEditSave(client.id, 'clientName')}
                            onKeyDown={(e) => e.key === 'Enter' && handleTextEditSave(client.id, 'clientName')}
                            className="h-8 text-xs"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="text-xs font-medium cursor-pointer hover:text-primary truncate block"
                            onClick={() => handleTextEdit(client, 'clientName')}
                          >
                            {client.clientName}
                          </span>
                        )}
                      </TableCell>

                      {/* VENDEDOR */}
                      <TableCell className="p-2">
                        <Select
                          value={client.vendedor}
                          onValueChange={(value) => handleInlineEdit(client.id, 'vendedor', value as Vendedor)}
                        >
                          <SelectTrigger className="h-8 w-full border-0 p-0">
                            <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', VENDEDOR_COLORS[client.vendedor])}>
                              {VENDEDOR_OPTIONS.find(v => v.value === client.vendedor)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {VENDEDOR_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', VENDEDOR_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* CRIATIVO */}
                      <TableCell className="p-2">
                        <Select
                          value={client.criativo}
                          onValueChange={(value) => handleInlineEdit(client.id, 'criativo', value)}
                        >
                          <SelectTrigger className="h-8 w-full border-0 p-0">
                            <Badge className="text-[11px] px-2.5 py-0.5 bg-slate-100 text-slate-700 border-slate-200">
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
                                  className="h-8 text-xs"
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
                      <TableCell className="p-2">
                        <Select
                          value={client.equipe}
                          onValueChange={(value) => handleInlineEdit(client.id, 'equipe', value as Equipe)}
                        >
                          <SelectTrigger className="h-8 w-full border-0 p-0">
                            <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', EQUIPE_COLORS[client.equipe])}>
                              {EQUIPE_OPTIONS.find(e => e.value === client.equipe)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {EQUIPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', EQUIPE_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* FATURAMENTO */}
                      <TableCell className="p-2">
                        <Select
                          value={client.faturamento}
                          onValueChange={(value) => handleInlineEdit(client.id, 'faturamento', value as Faturamento)}
                        >
                          <SelectTrigger className="h-8 w-full border-0 p-0">
                            <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full truncate max-w-[130px]', FATURAMENTO_COLORS[client.faturamento])}>
                              {client.faturamento === 'PERSONALIZADO' && client.faturamentoPersonalizado
                                ? client.faturamentoPersonalizado
                                : FATURAMENTO_OPTIONS.find(f => f.value === client.faturamento)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {FATURAMENTO_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', FATURAMENTO_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>


                      {/* PACOTE */}
                      <TableCell className="p-2">
                        <Select
                          value={client.pacote}
                          onValueChange={(value) => handleInlineEdit(client.id, 'pacote', value as Pacote)}
                        >
                          <SelectTrigger className="h-8 w-full border-0 p-0">
                            <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', PACOTE_COLORS[client.pacote])}>
                              {PACOTE_OPTIONS.find(p => p.value === client.pacote)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {PACOTE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', PACOTE_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* PERÃODO */}
                      <TableCell className="p-2">
                        <Select
                          value={client.periodo}
                          onValueChange={(value) => handleInlineEdit(client.id, 'periodo', value as Periodo)}
                        >
                          <SelectTrigger className="h-8 w-full border-0 p-0">
                            <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', PERIODO_COLORS[client.periodo])}>
                              {PERIODO_OPTIONS.find(p => p.value === client.periodo)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {PERIODO_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', PERIODO_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>


                      {/* AGENDADO POR */}
                      {/* INDICA��O */}
                      <TableCell className="p-2">
                        <Select
                          value={client.indicacao || 'NAO'}
                          onValueChange={(value) => handleInlineEdit(client.id, 'indicacao', value)}
                        >
                          <SelectTrigger className="h-8 w-full border-0 p-0">
                            <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', client.indicacao === 'SIM' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200')}>
                              {client.indicacao || 'N�o'}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {INDICACAO_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Select
                          value={client.agendadoPor || ''}
                          onValueChange={(value) => handleInlineEdit(client.id, 'agendadoPor', value as Agendador)}
                        >
                          <SelectTrigger className="h-8 w-full border-0 p-0">
                            {client.agendadoPor ? (
                              <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', AGENDADOR_COLORS[client.agendadoPor])}>
                                {AGENDADOR_OPTIONS.find(a => a.value === client.agendadoPor)?.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {AGENDADOR_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', AGENDADOR_COLORS[opt.value])}>
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>


                      {/* HORARIO AGENDADO */}
                      <TableCell className="p-2">
                        <span className="text-xs font-medium text-slate-700">
                          {getAppointmentTime(client)}
                        </span>
                      </TableCell>

                      {/* ENTRADA */}
                      <TableCell className="p-2 text-right">
                        {editingCell?.id === client.id && editingCell?.field === 'entrada' ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleTextEditSave(client.id, 'entrada')}
                            onKeyDown={(e) => e.key === 'Enter' && handleTextEditSave(client.id, 'entrada')}
                            className="h-8 text-xs text-right"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="text-xs font-semibold tabular-nums cursor-pointer hover:text-primary"
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
                      <TableCell className="p-2">
                        <span className="text-xs font-medium text-slate-700">
                          {format(parseLocalDateValue(client.createdAt || client.dataEntrada || client.entryDate) || new Date(), 'dd/MM/yy', { locale: ptBR })}
                        </span>
                      </TableCell>
                      {/* STATUS */}
                      <TableCell className="p-2">
                        <Select
                          value={client.stage}
                          onValueChange={(value) => handleStageChange(client, value as PipelineStage)}
                        >
                          <SelectTrigger className="h-8 w-full border-0 p-0">
                            <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', STAGE_COLORS[client.stage])}>
                              {STAGE_LABELS[client.stage]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {Object.entries(STAGE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                <Badge className={cn('text-[11px] px-2.5 py-0.5 rounded-full', STAGE_COLORS[value as PipelineStage])}>
                                  {label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* MOTIVO (only when showing inactive) */}
                      {showInactive && (
                        <TableCell className="p-2">
                          <span className="text-sm text-muted-foreground">
                            {client.lostReason || '-'}
                          </span>
                        </TableCell>
                      )}

                      {/* AÃ‡Ã•ES */}
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
          Total: <strong className="text-foreground text-base">R$ {filteredClients.reduce((sum, c) => sum + c.entrada, 0).toLocaleString('pt-BR')}</strong>
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

      <NegotiationDetailsDialog
        open={negotiationDialogOpen}
        onOpenChange={setNegotiationDialogOpen}
        clientName={pendingNegotiation?.client.clientName || ''}
        currentClinicName={pendingNegotiation?.client.clinicName}
        targetStage={pendingNegotiation?.targetStage || 'NEGOCIACAO'}
        onConfirm={handleNegotiationConfirm}
      />

      <TaxaInterestDetailsDialog
        open={taxaDialogOpen}
        onOpenChange={setTaxaDialogOpen}
        clientName={pendingTaxaClient?.clientName || ''}
        onConfirm={handleTaxaConfirm}
      />

      {/* Celebration Animation */}
      <CelebrationAnimation
        show={showCelebration}
        type="sale"
        title={celebrationData ? `ðŸŽ‰ ${celebrationData.clientName} fechou!` : undefined}
        subtitle={celebrationData ? `Valor: ${formatBRL(celebrationData.value)}` : undefined}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
}





