import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AgendamentoLead,
  useAgendamentoData,
  HORARIO_OPTIONS,
  TEM_SOCIO_OPTIONS,
  TEM_MKT_OPTIONS,
  TEM_SECRETARIA_OPTIONS,
  FATURAMENTO_OPTIONS,
  FUNIL_OPTIONS,
  STATUS_OPTIONS,
} from '@/hooks/useAgendamentoData';
import { MoreHorizontal, Copy, Trash2, Search, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AgendamentoSpreadsheetProps {
  leads: AgendamentoLead[];
}

// Status color mapping - matching Pipeline columns
const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    'NOVO_LEAD': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
    'NO_SHOW': 'bg-orange-500/20 text-orange-700 border-orange-500/30',
    'TAXA_INTERESSE': 'bg-amber-500/20 text-amber-700 border-amber-500/30',
    'NEGOCIACAO': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
    'PERDIDO': 'bg-red-500/20 text-red-700 border-red-500/30',
    'FECHADO': 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
    // Legacy status colors for backward compatibility
    'NOSHOW': 'bg-orange-500/20 text-orange-700 border-orange-500/30',
    'ENTRAR EM CONTATO': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
    'ARROGANTE': 'bg-red-500/20 text-red-700 border-red-500/30',
  };
  return colorMap[status] || 'bg-muted text-muted-foreground border-border';
};

// Funil color mapping
const getFunilColor = (funil: string) => {
  const colorMap: Record<string, string> = {
    'INSTAGRAM': 'bg-pink-500/20 text-pink-700 border-pink-500/30',
    'INDICAÇÃO': 'bg-green-500/20 text-green-700 border-green-500/30',
    'IA': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
    'FORMULARIO': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
    'BLACK FRIDAY': 'bg-gray-800/20 text-gray-900 border-gray-800/30',
  };
  return colorMap[funil] || 'bg-muted text-muted-foreground border-border';
};

export function AgendamentoSpreadsheet({ leads }: AgendamentoSpreadsheetProps) {
  const { updateLead, deleteLead, duplicateLead } = useAgendamentoData();
  const [searchQuery, setSearchQuery] = useState('');
  const [horarioFilter, setHorarioFilter] = useState<string>('all');
  const [funilFilter, setFunilFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.telefone.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesHorario = horarioFilter === 'all' || lead.horario === horarioFilter;
      const matchesFunil = funilFilter === 'all' || lead.funil === funilFilter;
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      return matchesSearch && matchesHorario && matchesFunil && matchesStatus;
    });
  }, [leads, searchQuery, horarioFilter, funilFilter, statusFilter]);

  // Handle inline edit
  const startEdit = (id: string, field: string, currentValue: string) => {
    setEditingCell({ id, field });
    setEditValue(currentValue);
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    await updateLead.mutateAsync({
      id: editingCell.id,
      [editingCell.field]: editValue,
    });
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  // Handle dropdown change
  const handleDropdownChange = async (id: string, field: string, value: string) => {
    await updateLead.mutateAsync({ id, [field]: value });
  };

  // Get display label for enum values
  const getHorarioLabel = (value: string) => {
    return HORARIO_OPTIONS.find((o) => o.value === value)?.label || value;
  };

  const getTemSocioLabel = (value: string) => {
    return TEM_SOCIO_OPTIONS.find((o) => o.value === value)?.label || value;
  };

  const getTemMktLabel = (value: string) => {
    return TEM_MKT_OPTIONS.find((o) => o.value === value)?.label || value;
  };

  const getTemSecretariaLabel = (value: string) => {
    return TEM_SECRETARIA_OPTIONS.find((o) => o.value === value)?.label || value;
  };

  const getFaturamentoLabel = (value: string) => {
    return FATURAMENTO_OPTIONS.find((o) => o.value === value)?.label || value;
  };

  // Format date from Agenda Great (YYYY-MM-DD) to display format (DD/MM/YYYY)
  const getDisplayDate = (lead: AgendamentoLead) => {
    if (lead.agenda_event_date) {
      try {
        return format(parseISO(lead.agenda_event_date), 'dd/MM/yyyy');
      } catch {
        return lead.data || '-';
      }
    }
    return lead.data || '-';
  };

  // Convert time (HH:MM:SS) to period label
  const getHorarioFromTime = (timeStr: string | null | undefined): 'MANHA' | 'TARDE' | 'NOITE' | null => {
    if (!timeStr) return null;
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (isNaN(hour)) return null;
    if (hour >= 8 && hour < 12) return 'MANHA';
    if (hour >= 12 && hour < 17) return 'TARDE';
    return 'NOITE'; // 17h-00h (and 00h-08h)
  };

  // Get display period - prefer Agenda Great time, fallback to manual horario
  const getDisplayPeriod = (lead: AgendamentoLead) => {
    const derivedHorario = getHorarioFromTime(lead.agenda_event_time);
    return getHorarioLabel(derivedHorario || lead.horario);
  };

  // Check if lead has agenda data
  const hasAgendaData = (lead: AgendamentoLead) => {
    return !!lead.agenda_event_date && !!lead.agenda_event_time;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={horarioFilter} onValueChange={setHorarioFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Horário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos horários</SelectItem>
            {HORARIO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={funilFilter} onValueChange={setFunilFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Funil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos funis</SelectItem>
            {FUNIL_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredLeads.length} registro(s)
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 z-10">
              <TableRow>
                <TableHead className="w-[100px] font-semibold">DATA</TableHead>
                <TableHead className="w-[150px] font-semibold">NOME</TableHead>
                <TableHead className="w-[130px] font-semibold">TELEFONE</TableHead>
                <TableHead className="w-[100px] font-semibold">HORÁRIO</TableHead>
                <TableHead className="w-[100px] font-semibold">TEM SÓCIO?</TableHead>
                <TableHead className="w-[100px] font-semibold">TEM MKT?</TableHead>
                <TableHead className="w-[110px] font-semibold">TEM SECRET.?</TableHead>
                <TableHead className="w-[120px] font-semibold">FATURAMENTO</TableHead>
                <TableHead className="w-[160px] font-semibold">FUNIL</TableHead>
                <TableHead className="w-[110px] font-semibold">AGENDADO POR</TableHead>
                <TableHead className="w-[180px] font-semibold">STATUS</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/30">
                    {/* DATA - Shows agenda date if available, otherwise form date */}
                    <TableCell className="p-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "px-2 py-1.5 rounded text-sm flex items-center gap-1",
                              hasAgendaData(lead) ? "text-primary font-medium" : "text-muted-foreground"
                            )}>
                              {hasAgendaData(lead) && <Calendar className="h-3 w-3" />}
                              {getDisplayDate(lead)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {hasAgendaData(lead) 
                              ? `Data da reunião na Agenda Great` 
                              : `Data do cadastro (sem agendamento vinculado)`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* NOME - Inline editable */}
                    <TableCell className="p-1">
                      {editingCell?.id === lead.id && editingCell.field === 'nome' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          className="h-8 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(lead.id, 'nome', lead.nome)}
                          className="px-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded text-sm font-medium"
                        >
                          {lead.nome}
                        </div>
                      )}
                    </TableCell>

                    {/* TELEFONE - Inline editable */}
                    <TableCell className="p-1">
                      {editingCell?.id === lead.id && editingCell.field === 'telefone' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          className="h-8 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(lead.id, 'telefone', lead.telefone)}
                          className="px-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded text-sm"
                        >
                          {lead.telefone}
                        </div>
                      )}
                    </TableCell>

                    {/* HORÁRIO - Shows actual time from Agenda Great if available */}
                    <TableCell className="p-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "px-2 py-1.5 rounded text-sm",
                              hasAgendaData(lead) ? "text-primary font-semibold" : "text-muted-foreground"
                            )}>
                              {getDisplayPeriod(lead)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {hasAgendaData(lead) 
                              ? `Horário exato da Agenda Great` 
                              : `Período genérico (MANHÃ/TARDE/NOITE)`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* TEM SÓCIO? - Dropdown */}
                    <TableCell className="p-1">
                      <Select
                        value={lead.tem_socio}
                        onValueChange={(v) => handleDropdownChange(lead.id, 'tem_socio', v)}
                      >
                        <SelectTrigger className="h-8 text-xs border-0 bg-transparent hover:bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEM_SOCIO_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* TEM MKT? - Dropdown */}
                    <TableCell className="p-1">
                      <Select
                        value={lead.tem_mkt}
                        onValueChange={(v) => handleDropdownChange(lead.id, 'tem_mkt', v)}
                      >
                        <SelectTrigger className="h-8 text-xs border-0 bg-transparent hover:bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEM_MKT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* TEM SECRETÁRIA? - Dropdown */}
                    <TableCell className="p-1">
                      <Select
                        value={lead.tem_secretaria || 'NAO'}
                        onValueChange={(v) => handleDropdownChange(lead.id, 'tem_secretaria', v)}
                      >
                        <SelectTrigger className="h-8 text-xs border-0 bg-transparent hover:bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEM_SECRETARIA_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* FATURAMENTO - Dropdown */}
                    <TableCell className="p-1">
                      <Select
                        value={lead.faturamento}
                        onValueChange={(v) => handleDropdownChange(lead.id, 'faturamento', v)}
                      >
                        <SelectTrigger className="h-8 text-xs border-0 bg-transparent hover:bg-muted/50">
                          <SelectValue>
                            {getFaturamentoLabel(lead.faturamento)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {FATURAMENTO_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* FUNIL - Dropdown with pill style */}
                    <TableCell className="p-1">
                      <Select
                        value={lead.funil}
                        onValueChange={(v) => handleDropdownChange(lead.id, 'funil', v)}
                      >
                        <SelectTrigger className="h-8 text-xs border-0 bg-transparent hover:bg-muted/50 p-0">
                          <Badge
                            variant="outline"
                            className={cn('text-xs font-normal', getFunilColor(lead.funil))}
                          >
                            {lead.funil}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {FUNIL_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* AGENDADO POR - Dropdown */}
                    <TableCell className="p-1">
                      <Select
                        value={lead.agendado_via || '_none'}
                        onValueChange={(v) => handleDropdownChange(lead.id, 'agendado_via', v === '_none' ? '' : v)}
                      >
                        <SelectTrigger className="h-8 text-xs border-0 bg-transparent hover:bg-muted/50">
                          <SelectValue>
                            {lead.agendado_via === 'LIGACAO' ? 'Ligação' : lead.agendado_via === 'MENSAGEM' ? 'Mensagem' : '—'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">—</SelectItem>
                          <SelectItem value="LIGACAO">Ligação</SelectItem>
                          <SelectItem value="MENSAGEM">Mensagem</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* STATUS - Dropdown with pill style */}
                    <TableCell className="p-1">
                      <Select
                        value={lead.status}
                        onValueChange={(v) => handleDropdownChange(lead.id, 'status', v)}
                      >
                        <SelectTrigger className="h-8 text-xs border-0 bg-transparent hover:bg-muted/50 p-0">
                          <Badge
                            variant="outline"
                            className={cn('text-xs font-normal', getStatusColor(lead.status))}
                          >
                            {STATUS_OPTIONS.find(s => s.value === lead.status)?.label || lead.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => duplicateLead.mutate(lead)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteLead.mutate(lead.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
