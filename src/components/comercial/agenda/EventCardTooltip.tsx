import { useState, useRef, useEffect, ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AgendaEvent, EVENT_COLORS } from '@/hooks/useAgendaData';
import { format, parseISO, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Calendar, Clock, User, Users, Briefcase, TrendingUp, Target, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  FATURAMENTO_OPTIONS, 
  HORARIO_OPTIONS,
  TEM_SOCIO_OPTIONS,
  TEM_MKT_OPTIONS,
  SALAO_OU_CLINICA_OPTIONS,
} from '@/hooks/useAgendamentoData';
import { getPhoneMatchCandidates } from '@/lib/phoneUtils';
import { AGENDADOR_OPTIONS, useCommercialSafe } from '@/contexts/CommercialContext';
import { useAgendamentoData } from '@/hooks/useAgendamentoData';

const AGENDADO_VIA_LABELS: Record<string, string> = {
  LIGACAO: 'Ligação',
  MENSAGEM: 'Mensagem',
  CALENDLY: 'Calendly',
};

function formatAgendadoViaLabel(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  return AGENDADO_VIA_LABELS[normalized] || normalized;
}

interface EventCardTooltipProps {
  event: AgendaEvent;
  children: ReactNode;
  className?: string;
}

export function EventCardTooltip({ event, children, className }: EventCardTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Get pipeline clients to access custom faturamento values
  const { pipelineClients } = useCommercialSafe();
  const { leads: agendamentoLeads } = useAgendamentoData();

  const agendamentoLead = useMemo(() => {
    if (!event.client_phone) return null;
    const candidates = getPhoneMatchCandidates(event.client_phone);
    if (candidates.length === 0) return null;
    return agendamentoLeads.find((lead) => candidates.includes(lead.telefone)) || null;
  }, [agendamentoLeads, event.client_phone]);
  
  // Find matching pipeline client to get custom faturamento
  const pipelineClient = useMemo(() => {
    if (!event.client_phone || !pipelineClients) return null;
    
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '').replace(/^55/, '');
    const eventPhone = normalizePhone(event.client_phone);
    
    return pipelineClients.find(client => {
      if (!client.telefone) return false;
      const clientPhone = normalizePhone(client.telefone);
      return clientPhone === eventPhone || eventPhone.endsWith(clientPhone) || clientPhone.endsWith(eventPhone);
    }) || null;
  }, [event.client_phone, pipelineClients]);

  // Recalculate position when tooltip is shown or data changes
  useEffect(() => {
    if (!showTooltip || !containerRef.current) return;
    
    const calculatePosition = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const tooltipWidth = 320;
      // Get actual tooltip height if available, otherwise estimate
      const tooltipHeight = tooltipRef.current?.offsetHeight || 380;
      const padding = 12;
      
      // Calculate horizontal position (centered on element, but constrained to viewport)
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      if (left < padding) left = padding;
      if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
      }
      
      // Calculate vertical position
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let top: number;
      
      // Always ensure tooltip stays within viewport
      if (spaceBelow >= tooltipHeight + padding) {
        // Plenty of space below, show there
        top = rect.bottom + padding;
      } else if (spaceAbove >= tooltipHeight + padding) {
        // Space above, show there
        top = rect.top - tooltipHeight - padding;
      } else {
        // Not enough space either way, position to maximize visibility
        // Center vertically in viewport
        top = Math.max(padding, (window.innerHeight - tooltipHeight) / 2);
      }
      
      // Final safety clamp to viewport
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
      
      setTooltipStyle({
        position: 'fixed',
        top,
        left,
        width: tooltipWidth,
        maxHeight: window.innerHeight - padding * 2,
        overflowY: 'auto',
        zIndex: 9999,
      });
    };

    // Calculate immediately and after a frame (to get actual tooltip height)
    calculatePosition();
    requestAnimationFrame(calculatePosition);
  }, [showTooltip, agendamentoLead]);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 2000); // 2 seconds delay
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Helper to get display label
  const getLabel = (value: string | undefined, options: readonly { value: string; label: string }[]) => {
    if (!value) return '-';
    return options.find(o => o.value === value)?.label || value;
  };
  
  // Helper to get faturamento display - check for custom value from pipeline
  const getFaturamentoDisplay = () => {
    // First check if pipeline client has custom faturamento
    if (pipelineClient?.faturamento === 'PERSONALIZADO' && pipelineClient?.faturamentoPersonalizado) {
      return pipelineClient.faturamentoPersonalizado;
    }
    // Fall back to agendamento lead value
    if (agendamentoLead?.faturamento) {
      return getLabel(agendamentoLead.faturamento, FATURAMENTO_OPTIONS);
    }
    return '-';
  };

  const colorLabel = EVENT_COLORS.find(c => c.value === event.color)?.label || 'Sem status';
  const scheduledByLabel = event.scheduled_by
    ? AGENDADOR_OPTIONS.find((option) => option.value === event.scheduled_by)?.label || event.scheduled_by
    : pipelineClient?.agendadoPor
      ? AGENDADOR_OPTIONS.find((option) => option.value === pipelineClient.agendadoPor)?.label || pipelineClient.agendadoPor
      : null;
  const scheduledViaLabel = formatAgendadoViaLabel(agendamentoLead?.agendado_via || pipelineClient?.agendadoVia);
  const endTime = format(
    addMinutes(parseISO(`2000-01-01T${event.event_time}`), event.duration_minutes || 60),
    'HH:mm'
  );

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className="bg-popover border border-border rounded-lg shadow-xl animate-in fade-in-0 zoom-in-95"
      style={tooltipStyle}
    >
      {/* Header */}
      <div className="p-3 border-b bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: event.color || '#3b82f6' }}
          />
          <h4 className="font-semibold text-foreground truncate flex-1">{event.title}</h4>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{colorLabel}</p>
        {scheduledByLabel && (
          <p className="text-xs font-semibold text-muted-foreground mt-1">
            Quem agendou: {scheduledByLabel}
          </p>
        )}
        {scheduledViaLabel && (
          <p className="text-xs font-semibold text-muted-foreground mt-1">
            Agendado via: {scheduledViaLabel}
          </p>
        )}
      </div>

      {/* Content - Agendamento Data Grid */}
      <div className="p-3">
        {agendamentoLead ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {/* Data */}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Data:</span>
            </div>
            <span className="font-medium text-foreground">{agendamentoLead.data || '-'}</span>

            {/* Nome */}
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Nome:</span>
            </div>
            <span className="font-medium text-foreground truncate">{agendamentoLead.nome || event.client_name}</span>

            {/* Telefone */}
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Telefone:</span>
            </div>
            <span className="font-medium text-foreground">{agendamentoLead.telefone || event.client_phone}</span>

            {/* Horário */}
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Horário:</span>
            </div>
            <span className="font-medium text-foreground">{getLabel(agendamentoLead.horario, HORARIO_OPTIONS)}</span>

            {/* Tem Sócio */}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Tem Sócio?</span>
            </div>
            <Badge variant={agendamentoLead.tem_socio === 'SIM' ? 'default' : 'secondary'} className="w-fit text-xs">
              {getLabel(agendamentoLead.tem_socio, TEM_SOCIO_OPTIONS)}
            </Badge>

            {/* Tem MKT */}
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Tem MKT?</span>
            </div>
            <Badge variant={agendamentoLead.tem_mkt === 'SIM' ? 'default' : 'secondary'} className="w-fit text-xs">
              {getLabel(agendamentoLead.tem_mkt, TEM_MKT_OPTIONS)}
            </Badge>

            {/* Área de atuação */}
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Área de atuação:</span>
            </div>
            <Badge variant="outline" className="w-fit text-xs">
              {getLabel(agendamentoLead.salao_ou_clinica, SALAO_OU_CLINICA_OPTIONS)}
            </Badge>

            {/* Faturamento */}
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Faturamento:</span>
            </div>
            <Badge variant="outline" className="w-fit text-xs">
              {getFaturamentoDisplay()}
            </Badge>

            {/* Funil */}
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Funil:</span>
            </div>
            <span className="font-medium text-foreground text-xs truncate">{agendamentoLead.funil || '-'}</span>

            {/* Status */}
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Status:</span>
            </div>
            <Badge 
              variant="secondary" 
              className={cn(
                "w-fit text-xs",
                agendamentoLead.status === 'ENTRAR EM CONTATO' && "bg-green-500/20 text-green-700 dark:text-green-400"
              )}
            >
              {agendamentoLead.status || '-'}
            </Badge>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{event.client_name}</span>
            </div>
            
            <div className="flex items-center gap-2 text-foreground">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{event.client_phone}</span>
            </div>

            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>
                {format(parseISO(event.event_date), "d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{event.event_time.slice(0, 5)} – {endTime}</span>
            </div>

            <p className="text-xs text-muted-foreground italic mt-2">
              Dados do agendamento não encontrados
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {showTooltip && createPortal(tooltipContent, document.body)}
    </div>
  );
}

