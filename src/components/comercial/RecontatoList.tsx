import { useMemo, useState } from 'react';
import { PipelineClient } from '@/contexts/CommercialContext';
import { useCommercial } from '@/contexts/CommercialContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Phone, Calendar, CalendarIcon, Clock, FileText, Edit2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatBRL } from '@/lib/utils';

interface RecontatoListProps {
  clients: PipelineClient[];
  onEditClient: (client: PipelineClient) => void;
  onNotesClient: (client: PipelineClient) => void;
}

const STAGE_LABELS: Record<string, string> = {
  'NO_SHOW': 'No Show',
  'TAXA_INTERESSE': 'Taxa de Interesse',
  'NEGOCIACAO': 'Negociação',
};

const STAGE_COLORS: Record<string, string> = {
  'NO_SHOW': 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  'TAXA_INTERESSE': 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  'NEGOCIACAO': 'bg-purple-500/20 text-purple-600 border-purple-500/30',
};

function parseMeetingDateTime(meetingDate?: string, meetingTime?: string) {
  if (!meetingDate) return null;

  const dateStr = meetingDate.trim();
  const timeStr = (meetingTime || '').trim();

  // Accept ISO-like date (YYYY-MM-DD) or BR date (DD/MM/YYYY)
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    year = y; month = m; day = d;
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/').map(Number);
    year = y; month = m; day = d;
  }

  if (!year || !month || !day) return null;

  let hours = 0;
  let minutes = 0;
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, min] = timeStr.split(':').map(Number);
    hours = h;
    minutes = min;
  }

  const dt = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function RecontatoList({ clients, onEditClient, onNotesClient }: RecontatoListProps) {
  const { updatePipelineClient } = useCommercial();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'days' | 'name' | 'value'>('days');

  const [scheduleOpenFor, setScheduleOpenFor] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState<string>('');

  const openSchedule = (client: PipelineClient) => {
    setScheduleOpenFor(client.id);

    // Pre-fill existing data (if any)
    const dt = parseMeetingDateTime(client.meetingDate, client.meetingTime);
    setScheduleDate(dt || undefined);
    setScheduleTime(client.meetingTime || '');
  };

  const handleSaveSchedule = (clientId: string) => {
    if (!scheduleDate) return;
    const meetingDate = scheduleDate.toISOString().split('T')[0];
    updatePipelineClient(clientId, {
      meetingDate,
      meetingTime: scheduleTime || (null as any),
    });
    setScheduleOpenFor(null);
  };

  const handleClearSchedule = (clientId: string) => {
    updatePipelineClient(clientId, {
      meetingDate: null as any,
      meetingTime: null as any,
    });
    setScheduleDate(undefined);
    setScheduleTime('');
    setScheduleOpenFor(null);
  };

  // Filter clients in NO_SHOW, TAXA_INTERESSE or NEGOCIACAO stages
  const recontatoClients = clients.filter(client => 
    client.ativo && (client.stage === 'NO_SHOW' || client.stage === 'TAXA_INTERESSE' || client.stage === 'NEGOCIACAO')
  );

  const agendaItems = useMemo(() => {
    const now = new Date();
    return recontatoClients
      .map((c) => {
        const dt = parseMeetingDateTime(c.meetingDate, c.meetingTime);
        return { client: c, dt };
      })
      .filter((x): x is { client: PipelineClient; dt: Date } => !!x.dt)
      .sort((a, b) => a.dt.getTime() - b.dt.getTime())
      .filter((x) => x.dt.getTime() >= now.getTime())
      .slice(0, 10);
  }, [recontatoClients]);

  // Apply filters
  const filteredClients = recontatoClients.filter(client => {
    if (stageFilter !== 'all' && client.stage !== stageFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        client.clientName.toLowerCase().includes(query) ||
        client.clinicName.toLowerCase().includes(query) ||
        client.telefone?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Sort clients
  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === 'days') {
      const daysA = a.lastStageChange ? differenceInDays(new Date(), new Date(a.lastStageChange)) : 0;
      const daysB = b.lastStageChange ? differenceInDays(new Date(), new Date(b.lastStageChange)) : 0;
      return daysB - daysA; // Most days first
    }
    if (sortBy === 'name') {
      return a.clientName.localeCompare(b.clientName);
    }
    if (sortBy === 'value') {
      return b.entrada - a.entrada;
    }
    return 0;
  });

  const getDaysInStage = (client: PipelineClient) => {
    if (!client.lastStageChange) return 0;
    return differenceInDays(new Date(), new Date(client.lastStageChange));
  };

  const getUrgencyBadge = (days: number) => {
    if (days >= 7) return <Badge variant="destructive" className="text-xs">Urgente</Badge>;
    if (days >= 3) return <Badge variant="outline" className="text-xs border-warning text-warning">Atenção</Badge>;
    return null;
  };

  const totalNoShow = recontatoClients.filter(c => c.stage === 'NO_SHOW').length;
  const totalTaxaInteresse = recontatoClients.filter(c => c.stage === 'TAXA_INTERESSE').length;
  const totalNegociacao = recontatoClients.filter(c => c.stage === 'NEGOCIACAO').length;
  const totalValue = recontatoClients.reduce((sum, c) => sum + c.entrada, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">No Show</p>
                <p className="text-2xl font-bold text-orange-500">{totalNoShow}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Interesse</p>
                <p className="text-2xl font-bold text-yellow-500">{totalTaxaInteresse}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Phone className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Negociação</p>
                <p className="text-2xl font-bold text-purple-500">{totalNegociacao}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Phone className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatBRL(totalValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mini agenda */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Próximos recontatos</CardTitle>
        </CardHeader>
        <CardContent>
          {agendaItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum horário futuro cadastrado nos leads de recontato.</p>
          ) : (
            <div className="space-y-2">
              {agendaItems.map(({ client, dt }) => (
                <div key={`${client.id}-${dt.toISOString()}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {format(dt, "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <Badge className={STAGE_COLORS[client.stage]}>{STAGE_LABELS[client.stage]}</Badge>
                    </div>
                    <p className="text-sm text-foreground truncate">{client.clientName}</p>
                    {client.clinicName && (
                      <p className="text-xs text-muted-foreground truncate">{client.clinicName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Popover open={scheduleOpenFor === client.id} onOpenChange={(open) => setScheduleOpenFor(open ? client.id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openSchedule(client)}
                          title="Definir horário"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] bg-popover" align="end">
                        <div className="space-y-3">
                          <div className="text-sm font-medium">Horário do recontato</div>
                          <div className="grid gap-2">
                            <div className="text-xs text-muted-foreground">Data (opcional)</div>
                            <div className="rounded-md border border-border">
                              <CalendarComponent
                                mode="single"
                                selected={scheduleDate}
                                onSelect={setScheduleDate}
                                initialFocus
                                className={cn('p-3 pointer-events-auto')}
                              />
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <div className="text-xs text-muted-foreground">Hora (opcional)</div>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <Button variant="outline" size="sm" onClick={() => handleClearSchedule(client.id)}>
                              Remover
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveSchedule(client.id)}
                              disabled={!scheduleDate}
                              className="gap-2"
                            >
                              <CalendarIcon className="h-4 w-4" />
                              Salvar
                            </Button>
                          </div>
                          {!scheduleDate && (
                            <p className="text-xs text-muted-foreground">
                              Se quiser salvar, selecione uma data. A hora é opcional.
                            </p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" onClick={() => onNotesClient(client)} title="Notas">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEditClient(client)} title="Editar">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
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
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todas etapas</SelectItem>
                <SelectItem value="NO_SHOW">No Show</SelectItem>
                <SelectItem value="TAXA_INTERESSE">Taxa de Interesse</SelectItem>
                <SelectItem value="NEGOCIACAO">Negociação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'days' | 'name' | 'value')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="days">Dias na etapa</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="value">Valor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Clientes para Recontato ({sortedClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum cliente para recontato no momento</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Follow Up</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Recontato</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClients.map(client => {
                    const daysInStage = getDaysInStage(client);
                    const reason = client.stage === 'NO_SHOW' ? client.noShowReason : null;
                    const followupDone = client.followupDone || false;
                    const scheduledDate = parseMeetingDateTime(client.meetingDate, client.meetingTime);
                    
                    return (
                      <TableRow key={client.id} className={followupDone ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={followupDone}
                              onCheckedChange={(checked) => {
                                updatePipelineClient(client.id, { followupDone: !!checked });
                              }}
                              className="h-5 w-5"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{client.clientName}</p>
                            {client.clinicName && (
                              <p className="text-sm text-muted-foreground">{client.clinicName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.telefone ? (
                            <a 
                              href={`https://wa.me/55${client.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {client.telefone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={STAGE_COLORS[client.stage]}>
                            {STAGE_LABELS[client.stage]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {scheduledDate ? (
                            <div className="flex items-center gap-1 text-sm">
                              <CalendarIcon className="h-3 w-3 text-primary" />
                              <span className="font-medium tabular-nums">
                                {format(scheduledDate, "dd/MM", { locale: ptBR })}
                              </span>
                              {client.meetingTime && (
                                <span className="text-muted-foreground">
                                  às {client.meetingTime}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{daysInStage}d</span>
                            </div>
                            {getUrgencyBadge(daysInStage)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {reason ? (
                            <span className="text-sm text-muted-foreground">{reason}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="tabular-nums font-medium">
                            {formatBRL(client.entrada)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Popover open={scheduleOpenFor === client.id} onOpenChange={(open) => setScheduleOpenFor(open ? client.id : null)}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openSchedule(client)}
                                  title="Definir horário"
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[320px] bg-popover" align="end">
                                <div className="space-y-3">
                                  <div className="text-sm font-medium">Horário do recontato</div>
                                  <div className="grid gap-2">
                                    <div className="text-xs text-muted-foreground">Data (opcional)</div>
                                    <div className="rounded-md border border-border">
                                      <CalendarComponent
                                        mode="single"
                                        selected={scheduleDate}
                                        onSelect={setScheduleDate}
                                        initialFocus
                                        className={cn('p-3 pointer-events-auto')}
                                      />
                                    </div>
                                  </div>
                                  <div className="grid gap-2">
                                    <div className="text-xs text-muted-foreground">Hora (opcional)</div>
                                    <div className="relative">
                                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        type="time"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        className="pl-9"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 pt-1">
                                    <Button variant="outline" size="sm" onClick={() => handleClearSchedule(client.id)}>
                                      Remover
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveSchedule(client.id)}
                                      disabled={!scheduleDate}
                                      className="gap-2"
                                    >
                                      <CalendarIcon className="h-4 w-4" />
                                      Salvar
                                    </Button>
                                  </div>
                                  {!scheduleDate && (
                                    <p className="text-xs text-muted-foreground">
                                      Se quiser salvar, selecione uma data. A hora é opcional.
                                    </p>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onNotesClient(client)}
                              title="Notas"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEditClient(client)}
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
