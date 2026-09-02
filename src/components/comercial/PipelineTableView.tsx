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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useCommercial, 
  PipelineClient, 
  PipelineStage, 
  STAGE_LABELS,
  Vendedor,
  Pacote,
  Periodo,
  Equipe,
  PagadorAnuncio,
} from '@/contexts/CommercialContext';
import { PlanType } from '@/types';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Pencil,
  Trash2,
  MoreHorizontal,
  Download,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatBRL } from '@/lib/utils';
import { getCommercialLeadOrigin } from '@/lib/commercialOrigin';
import { NegotiationDetailsDialog } from './NegotiationDetailsDialog';
import { TaxaInterestDetailsDialog } from './TaxaInterestDetailsDialog';

interface PipelineTableViewProps {
  clients: PipelineClient[];
  onEditClient: (client: PipelineClient) => void;
  onDeleteClient: (client: PipelineClient) => void;
  canExport?: boolean;
}

type SortField = 'clientName' | 'clinicName' | 'dealValue' | 'stage' | 'entryDate' | 'plan';
type SortDirection = 'asc' | 'desc';

const PLAN_LABELS: Record<PlanType, string> = {
  'MENSAL': 'Mensal',
  'TRIMESTRAL': 'Trimestral',
  'SEMESTRAL': 'Semestral',
};

const PLAN_COLORS: Record<PlanType, string> = {
  'MENSAL': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'TRIMESTRAL': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'SEMESTRAL': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  'NOVO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'NO_SHOW': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'TAXA_INTERESSE': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'NEGOCIACAO': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'PERDIDO': 'bg-muted text-muted-foreground border-border',
  'FECHADO': 'bg-success/20 text-success border-success/30',
};

export function PipelineTableView({ 
  clients, 
  onEditClient, 
  onDeleteClient,
  canExport = false 
}: PipelineTableViewProps) {
  const { updatePipelineClient, movePipelineClient } = useCommercial();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('entryDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [negotiationDialogOpen, setNegotiationDialogOpen] = useState(false);
  const [pendingNegotiation, setPendingNegotiation] = useState<{ client: PipelineClient; targetStage: 'NEGOCIACAO' | 'FECHADO' } | null>(null);
  const [taxaDialogOpen, setTaxaDialogOpen] = useState(false);
  const [pendingTaxaClient, setPendingTaxaClient] = useState<PipelineClient | null>(null);

  const getClientEntryDate = (client: PipelineClient) => client.entryDate || client.dataEntrada || client.createdAt;
  const getClientValue = (client: PipelineClient) => client.dealValue ?? client.entrada ?? 0;
  const getClientOrigin = (client: PipelineClient) => getCommercialLeadOrigin({
    creativeSource: client.creativeSource,
    criativo: client.criativo,
    funil: client.funil,
  });
  const getClientSdr = (client: PipelineClient) => client.assignedSDR || client.agendadoPor || '-';
  const getClientCloser = (client: PipelineClient) => client.assignedCloser || client.vendedor || '-';
  const getPlan = (client: PipelineClient) => client.plan || client.periodo || 'MENSAL';

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const normalizedQuery = query.replace(/\D/g, ''); // Remove non-digits for phone matching
      result = result.filter(c => 
        c.clientName.toLowerCase().includes(query) ||
        c.clinicName.toLowerCase().includes(query) ||
        getClientOrigin(c).toLowerCase().includes(query) ||
        (normalizedQuery.length > 0 && c.telefone && c.telefone.replace(/\D/g, '').includes(normalizedQuery))
      );
    }

    // Stage filter
    if (stageFilter !== 'all') {
      result = result.filter(c => c.stage === stageFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      result = result.filter(c => getPlan(c) === planFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'clientName':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'clinicName':
          comparison = a.clinicName.localeCompare(b.clinicName);
          break;
        case 'dealValue':
          comparison = getClientValue(a) - getClientValue(b);
          break;
        case 'stage':
          comparison = a.stage.localeCompare(b.stage);
          break;
        case 'entryDate':
          comparison = new Date(getClientEntryDate(a) || 0).getTime() - new Date(getClientEntryDate(b) || 0).getTime();
          break;
        case 'plan':
          comparison = getPlan(a).localeCompare(getPlan(b));
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [clients, searchQuery, sortField, sortDirection, stageFilter, planFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const handleStageChange = (client: PipelineClient, newStage: PipelineStage) => {
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
    setPendingTaxaClient(null);
  };

  const handleNegotiationConfirm = (data: { vendedor: Vendedor; pacote: Pacote; periodo: Periodo; entrada: number; isMrr?: boolean; mrrRemaining?: number; clinicName?: string; equipe?: Equipe; pagadorAnuncio?: PagadorAnuncio }) => {
    if (!pendingNegotiation) return;
    const { client, targetStage } = pendingNegotiation;
    movePipelineClient(client.id, targetStage, undefined, {
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
    });
    setPendingNegotiation(null);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Nome', 'Clínica', 'Status', 'Valor', 'Plano', 'Origem', 'SDR', 'Closer', 'Data Entrada', 'Dias no Pipeline', 'Previsão Fechamento'];
    const rows = filteredClients.map(c => [
      c.id,
      c.clientName,
      c.clinicName,
      STAGE_LABELS[c.stage],
      getClientValue(c),
      PLAN_LABELS[getPlan(c) as keyof typeof PLAN_LABELS] || getPlan(c),
      getClientOrigin(c),
      getClientSdr(c),
      getClientCloser(c),
      format(new Date(getClientEntryDate(c) || new Date()), 'dd/MM/yyyy'),
      differenceInDays(new Date(), new Date(getClientEntryDate(c) || new Date())),
      c.expectedCloseDate ? format(new Date(c.expectedCloseDate), 'dd/MM/yyyy') : '-',
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

  const getDaysInStage = (client: PipelineClient) => {
    const lastMove = client.lastStageChange ? new Date(client.lastStageChange) : new Date(getClientEntryDate(client) || new Date());
    return differenceInDays(new Date(), lastMove);
  };

  const getRowStatus = (client: PipelineClient) => {
    if (client.stage === 'FECHADO' || client.stage === 'PERDIDO') return 'neutral';
    const daysInStage = getDaysInStage(client);
    if (daysInStage > 7) return 'critical';
    if (daysInStage > 3) return 'warning';
    return 'normal';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas etapas</SelectItem>
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos planos</SelectItem>
            {Object.entries(PLAN_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canExport && (
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-2 hover:bg-surface-2">
                <TableHead className="w-[200px]">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('clientName')}
                  >
                    Nome do Lead
                    <SortIcon field="clientName" />
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('clinicName')}
                  >
                    Clínica
                    <SortIcon field="clinicName" />
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('stage')}
                  >
                    Status
                    <SortIcon field="stage" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors ml-auto"
                    onClick={() => handleSort('dealValue')}
                  >
                    Valor (R$)
                    <SortIcon field="dealValue" />
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('plan')}
                  >
                    Plano
                    <SortIcon field="plan" />
                  </button>
                </TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>SDR</TableHead>
                <TableHead>Closer</TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                    onClick={() => handleSort('entryDate')}
                  >
                    Entrada
                    <SortIcon field="entryDate" />
                  </button>
                </TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Prev. Fech.</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const rowStatus = getRowStatus(client);
                  const daysInStage = getDaysInStage(client);
                  
                  return (
                    <TableRow 
                      key={client.id}
                      className={cn(
                        "transition-colors",
                        rowStatus === 'critical' && 'bg-destructive/5 hover:bg-destructive/10',
                        rowStatus === 'warning' && 'bg-warning/5 hover:bg-warning/10',
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {rowStatus === 'critical' && (
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          {rowStatus === 'warning' && (
                            <Clock className="h-4 w-4 text-warning shrink-0" />
                          )}
                          {client.clientName}
                        </div>
                      </TableCell>
                      <TableCell>{client.clinicName}</TableCell>
                      <TableCell>
                        <Select 
                          value={client.stage} 
                        onValueChange={(value) => handleStageChange(client, value as PipelineStage)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <Badge className={cn('text-xs', STAGE_COLORS[client.stage])}>
                              {STAGE_LABELS[client.stage]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STAGE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatBRL(getClientValue(client))}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', PLAN_COLORS[getPlan(client) as PlanType])}>
                          {PLAN_LABELS[getPlan(client) as PlanType] || getPlan(client)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getClientOrigin(client)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {getClientSdr(client)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {getClientCloser(client)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {format(new Date(getClientEntryDate(client) || new Date()), 'dd/MM/yy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-sm font-medium tabular-nums",
                          rowStatus === 'critical' && 'text-destructive',
                          rowStatus === 'warning' && 'text-warning',
                        )}>
                          {daysInStage}d
                        </span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {client.expectedCloseDate 
                          ? format(new Date(client.expectedCloseDate), 'dd/MM/yy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem onClick={() => onEditClient(client)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDeleteClient(client)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>{filteredClients.length} leads encontrados</span>
        <span>
          Total: {formatBRL(filteredClients.reduce((sum, c) => sum + getClientValue(c), 0))}
        </span>
      </div>

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
    </div>
  );
}
