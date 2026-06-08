import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PipelineClient, VENDEDOR_OPTIONS, PACOTE_OPTIONS, Pacote, Vendedor, Periodo, PERIODO_OPTIONS, AGENDADOR_OPTIONS } from '@/contexts/CommercialContext';
import { Building2, GripVertical, Clock, AlertTriangle, Pencil, Trash2, User, StickyNote, CalendarClock, PhoneOff, MessageSquare, Phone, MessageCircle, Calendar } from 'lucide-react';
import { cn, formatBRL } from '@/lib/utils';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCommercialLeadOrigin } from '@/lib/commercialOrigin';

interface PipelineCardProps {
  client: PipelineClient;
  onEdit?: (client: PipelineClient) => void;
  onDelete?: (client: PipelineClient) => void;
  onNotes?: (client: PipelineClient) => void;
  selected?: boolean;
  onSelectToggle?: (clientId: string) => void;
  selectionMode?: boolean;
}

const PERIODO_COLORS: Record<Periodo, string> = {
  'MENSAL': 'bg-green-500/20 text-green-400 border-green-500/30',
  'TRIMESTRAL': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'SEMESTRAL': 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  'TAXA_INTERESSE': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
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

const VENDEDOR_COLORS: Record<Vendedor, string> = {
  'HERBERT': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'CLED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'PEDRO_H': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'PEDRO_JUAN': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'CAETANO': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function parseValidDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const localDateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (localDateOnly) {
      const [, year, month, day] = localDateOnly;
      const localDate = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }
  }
  const date = value instanceof Date ? value : new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNotes(value: unknown): Array<{ id: string; content: string; createdAt: string | Date }> {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean) as Array<{ id: string; content: string; createdAt: string | Date }>;
  }

  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean) as Array<{ id: string; content: string; createdAt: string | Date }>;
    }
  } catch {
    // Legacy notes may be stored as plain text; render them as a single note.
  }

  return [
    {
      id: `legacy-${clientIdFallback(value)}`,
      content: value,
      createdAt: new Date(0),
    },
  ];
}

function clientIdFallback(value: string) {
  return value.replace(/\s+/g, '-').slice(0, 32);
}

export function PipelineCard({ client, onEdit, onDelete, onNotes, selected, onSelectToggle, selectionMode }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: client.id,
    data: client,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  // Calculate days in current stage
  const lastStageChange = parseValidDate(client.lastStageChange) || parseValidDate(client.dataEntrada);
  const daysInStage = lastStageChange ? differenceInDays(new Date(), lastStageChange) : 0;
  const entryDate = parseValidDate(client.dataEntrada);

  // Visual alert rules (only for active stages)
  const isActiveStage = client.stage !== 'FECHADO' && client.stage !== 'PERDIDO';
  const isStuck = isActiveStage && daysInStage > 7;
  const isWarning = isActiveStage && daysInStage > 3 && daysInStage <= 7;
  const scheduledDate = parseValidDate(client.meetingDate);
  const scheduledTime = client.meetingTime ? client.meetingTime.slice(0, 5) : '';
  const hasSchedule = Boolean(scheduledDate || scheduledTime);
  const scheduleDateLabel = scheduledDate ? format(scheduledDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Sem data';
  const scheduleTimeLabel = scheduledTime || 'Sem horario';

  // Check if has notes
  const parsedNotes = parseNotes(client.notes);
  const hasNotes = parsedNotes.length > 0;
  const notesCount = parsedNotes.length;
  const lastNote = hasNotes ? parsedNotes[parsedNotes.length - 1] : null;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(client);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(client);
  };

  const handleNotes = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNotes?.(client);
  };

  const vendedorLabel = VENDEDOR_OPTIONS.find(v => v.value === client.vendedor)?.label || client.vendedor;
  const pacoteLabel = PACOTE_OPTIONS.find(p => p.value === client.pacote)?.label || client.pacote;
  const periodoLabel = PERIODO_OPTIONS.find(p => p.value === client.periodo)?.label || client.periodo;
  const agendadorLabel = client.agendadoPor ? AGENDADOR_OPTIONS.find(a => a.value === client.agendadoPor)?.label : null;
  const agendadoViaLabel = client.agendadoVia === 'LIGACAO'
    ? 'Ligacao'
    : client.agendadoVia === 'MENSAGEM'
      ? 'Mensagem'
      : client.agendadoVia === 'CALENDLY'
        ? 'Calendly'
        : client.agendadoVia;
  const clientOrigin = getCommercialLeadOrigin({
    creativeSource: client.creativeSource,
    criativo: client.criativo,
    funil: client.funil,
  });

  const handleCheckbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectToggle?.(client.id);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-4 transition-all border-border hover:border-muted-foreground/40 group relative',
        isDragging && 'opacity-50 shadow-lg scale-105 z-50',
        isStuck && 'border-destructive/40 bg-destructive/5',
        isWarning && !isStuck && 'border-warning/40 bg-warning/5',
        client.stage === 'FECHADO' && 'border-success/40 bg-success/5',
        client.stage === 'PERDIDO' && 'opacity-60',
        selected && 'ring-2 ring-primary border-primary/60'
      )}
    >
      {/* Drag handle area */}
      <div 
        className="absolute inset-0 cursor-grab active:cursor-grabbing" 
        {...attributes}
        {...listeners}
      />
      
      {/* Action buttons - positioned above the drag layer */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button 
          variant="ghost" 
          size="icon-sm" 
          className="h-7 w-7 bg-background/80 hover:bg-background"
          onClick={handleNotes}
          title="Anotações"
        >
          <StickyNote className="h-3.5 w-3.5" />
          {hasNotes && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
              {notesCount}
            </span>
          )}
        </Button>
        <Button 
          variant="ghost" 
          size="icon-sm" 
          className="h-7 w-7 bg-background/80 hover:bg-background"
          onClick={handleEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon-sm" 
          className="h-7 w-7 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3 relative pointer-events-none">
        {/* Header with grip, checkbox and value */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="pointer-events-auto" onClick={handleCheckbox}>
              <Checkbox checked={selected} className="h-4 w-4" />
            </div>
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            <span className="font-bold text-lg text-primary tabular-nums">
              {formatBRL(client.entrada)}
            </span>
          </div>
          <div className="flex gap-1 mr-14">
            <Badge className={cn('text-[10px]', PERIODO_COLORS[client.periodo])}>
              {periodoLabel}
            </Badge>
          </div>
        </div>

        {/* Client info */}
        <div>
          <p className="font-medium text-foreground">{client.clientName}</p>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <Building2 className="h-3.5 w-3.5" />
            <span>{client.clinicName}</span>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1">
          <Badge className={cn('text-[10px]', VENDEDOR_COLORS[client.vendedor])}>
            {vendedorLabel}
          </Badge>
          <Badge className={cn('text-[10px]', PACOTE_COLORS[client.pacote])}>
            {pacoteLabel}
          </Badge>
        </div>

        {/* Criativo and Agendador */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px]">
            {clientOrigin}
          </span>
          {agendadorLabel && (
            <span className="flex items-center gap-1 bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded text-[10px]">
              <CalendarClock className="h-3 w-3" />
              {agendadorLabel}
            </span>
          )}
          {client.agendadoVia && (
            <span className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[10px]',
              client.agendadoVia === 'LIGACAO'
                ? 'bg-emerald-500/20 text-emerald-400'
                : client.agendadoVia === 'CALENDLY'
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-blue-500/20 text-blue-400'
            )}>
              {client.agendadoVia === 'LIGACAO' ? <Phone className="h-3 w-3" /> : client.agendadoVia === 'CALENDLY' ? <Calendar className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
              {agendadoViaLabel}
            </span>
          )}
        </div>

        {hasSchedule && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/90 px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 text-violet-700">
              <CalendarClock className="h-4 w-4 shrink-0" />
              <p className="text-xs font-black uppercase tracking-[0.14em]">Agendamento</p>
            </div>
            <p className="mt-1 text-sm font-bold text-violet-900">
              Agendado para {scheduleDateLabel} as {scheduleTimeLabel}
            </p>
            <div className="mt-1 grid grid-cols-2 gap-2 text-sm font-semibold text-slate-950">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Data</span>
                <span>{scheduleDateLabel}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Horario</span>
                <span>{scheduleTimeLabel}</span>
              </div>
            </div>
          </div>
        )}

        {/* No Show Reason */}
        {client.stage === 'NO_SHOW' && client.noShowReason && (
          <div className="flex items-start gap-2 p-2 rounded bg-orange-500/10 border border-orange-500/20">
            <PhoneOff className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />
            <p className="text-xs text-orange-300 line-clamp-2">{client.noShowReason}</p>
          </div>
        )}

        {/* Notes Preview */}
        {hasNotes && lastNote && (
          <div className="flex items-start gap-2 p-2 rounded bg-muted/50 border border-border">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground line-clamp-2">{lastNote.content}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {format(new Date(lastNote.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                {notesCount > 1 && ` • +${notesCount - 1} anotação${notesCount > 2 ? 'ões' : ''}`}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{vendedorLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {entryDate ? format(entryDate, 'dd/MM', { locale: ptBR }) : 'Sem data'}
            </span>
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded",
              isStuck && 'bg-destructive/10 text-destructive',
              isWarning && !isStuck && 'bg-warning/10 text-warning',
            )}>
              {isStuck && <AlertTriangle className="h-3 w-3" />}
              {isWarning && !isStuck && <Clock className="h-3 w-3" />}
              <span>{daysInStage}d na etapa</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}


