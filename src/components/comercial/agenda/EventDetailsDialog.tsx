import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AgendaEvent, EVENT_COLORS, useAgendaData } from '@/hooks/useAgendaData';
import { useAgendamentoData, FATURAMENTO_OPTIONS, SALAO_OU_CLINICA_OPTIONS, STATUS_OPTIONS, TEM_MKT_OPTIONS, TEM_SECRETARIA_OPTIONS, TEM_SOCIO_OPTIONS } from '@/hooks/useAgendamentoData';
import { useCommercialSafe, AGENDADOR_OPTIONS } from '@/contexts/CommercialContext';
import { BadgeInfo, Bell, CalendarDays, Copy, Edit3, Loader2, Phone, StickyNote, Target, Trash2, User2, ChevronDown } from 'lucide-react';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import { cn, formatBRL } from '@/lib/utils';
import { coerceCommercialAnswer, formatCommercialAnswerLabel } from '@/lib/commercialAnswer';
import { normalizeMeetingClientName, normalizeMeetingTitle } from '@/lib/agendaTitle';
import { toast } from 'sonner';

function normalizeFaturamentoBucket(value?: string | null) {
  switch (value) {
    case '0_A_10K':
    case '0_A_15K':
    case '0_10K':
    case 'FATURA_12K':
    case 'PODE_INVESTIR':
      return '0_A_10K';
    case '10K_A_20K':
    case '15K_A_30K':
    case '15K_MAIS':
      return '10K_A_20K';
    case '20K_A_30K':
      return '20K_A_30K';
    case '30K_A_50K':
      return '30K_A_50K';
    case '50K_A_80K':
    case '50K_A_100K':
      return '50K_A_80K';
    case '80K_A_100K':
      return '80K_A_100K';
    case '100K_A_150K':
    case '100K_PLUS':
      return '100K_A_150K';
    case '150K_A_250K':
      return '150K_A_250K';
    case '250K_A_400K':
      return '250K_A_400K';
    case '400K_A_600K':
      return '400K_A_600K';
    case '600K_A_1M':
      return '600K_A_1M';
    case '1M_PLUS':
      return '1M_PLUS';
    case 'NAO_INFORMADO':
    case 'PERSONALIZADO':
    default:
      return 'NAO_INFORMADO';
  }
}

const CORE_EVENT_DETAIL_KEYS = new Set([
  'id',
  'source_table',
  'title',
  'description',
  'notes',
  'client_name',
  'client_phone',
  'clinic_name',
  'event_date',
  'event_time',
  'duration_minutes',
  'meeting_link',
  'scheduled_by',
  'lead_stage',
  'creative_source',
  'color',
  'reminder_2h_sent',
  'reminder_30min_sent',
  'created_by_user_id',
  'assigned_closer_id',
  'team_id',
  'created_at',
  'updated_at',
  'pipeline_client_id',
  'raw_record',
]);

function formatDynamicFieldLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

function formatDynamicFieldValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toLocaleString('pt-BR');
  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatDynamicFieldValue(item))
      .filter((item) => item.length > 0);
    return items.join(', ');
  }
  return '';
}

const EVENT_COLOR_PRESET = EVENT_COLORS.map((color) => ({
  ...color,
  style: { backgroundColor: color.value },
}));

interface EventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: AgendaEvent | null;
  onDuplicate?: (event: AgendaEvent) => void;
}

export function EventDetailsDialog({ open, onOpenChange, event, onDuplicate }: EventDetailsDialogProps) {
  const { updateEvent, deleteEvent } = useAgendaData();
  const { leads, updateLead } = useAgendamentoData();
  const commercial = useCommercialSafe();
  const pipelineClients = commercial?.pipelineClients || [];
  const updatePipelineClient = commercial?.updatePipelineClient;
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const eventPhoneDigits = useMemo(() => (event?.client_phone || '').replace(/\D/g, ''), [event?.client_phone]);
  const eventTimeLabel = event?.event_time?.slice(0, 5) || '--:--';
  const eventDateLabel = event?.event_date || '--/--/----';
  const eventSlotTime = event?.event_time?.slice(0, 5) || '';

  const leadData = useMemo(() => {
    if (!event) return null;
    return leads.find((lead) => {
      const leadPhoneDigits = (lead.telefone || '').replace(/\D/g, '');
      const leadSlotTime = (lead.agenda_event_time || lead.horario_especifico || '').slice(0, 5);
      return (
        lead.agenda_event_id === event.id ||
        (event.pipeline_client_id && lead.pipeline_client_id === event.pipeline_client_id) ||
        (
          leadPhoneDigits === eventPhoneDigits &&
          lead.agenda_event_date === event.event_date &&
          (!eventSlotTime || leadSlotTime === eventSlotTime)
        )
      );
    }) || null;
  }, [event, eventPhoneDigits, leads]);

  const pipelineClient = useMemo(() => {
    if (!event) return null;
    return pipelineClients.find((client) => {
      const clientPhoneDigits = client.telefone?.replace(/\D/g, '') || '';
      const clientMeetingTime = (client.meetingTime || '').slice(0, 5);
      return (
        clientPhoneDigits === eventPhoneDigits &&
        client.meetingDate === event.event_date &&
        (!eventSlotTime || clientMeetingTime === eventSlotTime)
      );
    }) || null;
  }, [event, eventPhoneDigits, pipelineClients]);

  const [eventForm, setEventForm] = useState({
    title: '',
    client_name: '',
    client_phone: '',
    event_date: '',
    event_time: '',
    duration_minutes: 60,
    meeting_link: '',
    description: '',
    notes: '',
    color: '#3B82F6',
  });

  const [leadForm, setLeadForm] = useState({
    faturamento: '0_A_10K',
    tem_socio: 'NAO',
    tem_mkt: 'NAO',
    tem_secretaria: 'NAO',
    salao_ou_clinica: 'NAO_INFORMADO',
    status: 'NOVO_LEAD',
    notes: '',
  });

  useEffect(() => {
    if (!event) return;
    setEventForm({
      title: event.title,
      client_name: event.client_name,
      client_phone: event.client_phone,
      event_date: event.event_date,
      event_time: event.event_time?.slice(0, 5) || '',
      duration_minutes: event.duration_minutes,
      meeting_link: event.meeting_link || '',
      description: event.description || '',
      notes: event.notes || '',
      color: event.color,
    });
  }, [event]);

  useEffect(() => {
    setLeadForm({
      faturamento: normalizeFaturamentoBucket(leadData?.faturamento || pipelineClient?.faturamento) || '0_A_10K',
      tem_socio: coerceCommercialAnswer(leadData?.tem_socio || pipelineClient?.temSocio, 'NAO'),
      tem_mkt: coerceCommercialAnswer(leadData?.tem_mkt || pipelineClient?.temMkt, 'NAO'),
      tem_secretaria: coerceCommercialAnswer(leadData?.tem_secretaria || pipelineClient?.temSecretaria) || 'NAO_SEI',
      salao_ou_clinica: leadData?.salao_ou_clinica || pipelineClient?.salaoOuClinica || 'NAO_INFORMADO',
      status: leadData?.status || 'NOVO_LEAD',
      notes: event?.notes || '',
    });
  }, [event?.notes, leadData, pipelineClient]);

  const agendadoViaLabel = pipelineClient?.agendadoVia === 'LIGACAO'
    ? 'Ligação'
    : pipelineClient?.agendadoVia === 'MENSAGEM'
      ? 'Mensagem'
      : pipelineClient?.agendadoVia === 'CALENDLY'
        ? 'Calendly'
      : 'Sem informação';
  const agendadorLabel = pipelineClient?.agendadoPor
    ? AGENDADOR_OPTIONS.find((option) => option.value === pipelineClient.agendadoPor)?.label || pipelineClient.agendadoPor
    : 'Sem informação';
  const areaAtuacaoLabel = SALAO_OU_CLINICA_OPTIONS.find((option) => option.value === (leadForm.salao_ou_clinica || pipelineClient?.salaoOuClinica || ''))
    ?.label || leadForm.salao_ou_clinica || pipelineClient?.salaoOuClinica || 'Sem informação';
  const faturamentoLabel = FATURAMENTO_OPTIONS.find((option) => option.value === leadForm.faturamento)?.label || leadForm.faturamento || 'Sem informação';
  const funilLabel = pipelineClient?.criativo || 'Sem informação';
  const professionLabel = pipelineClient?.profession || leadData?.profession || 'Não identificado';
  const currentColorOption = EVENT_COLORS.find((color) => color.value === eventForm.color) || EVENT_COLORS[0];
  const isNoShowColor = (color: string) => color.toUpperCase() === '#FF0000';
  const recoveredStatus = leadForm.status === 'NO_SHOW' ? 'NOVO_LEAD' : leadForm.status;
  const recoveredStatusOption = STATUS_OPTIONS.find((option) => option.value === recoveredStatus);
  const recoveredPipelineStage = recoveredStatusOption?.pipelineStage || 'NOVO';
  const extraEventFields = useMemo(() => {
    if (!event?.raw_record) return [];

    return Object.entries(event.raw_record)
      .filter(([key, value]) => {
        if (CORE_EVENT_DETAIL_KEYS.has(key)) return false;
        return formatDynamicFieldValue(value).length > 0;
      })
      .map(([key, value]) => ({
        key,
        label: formatDynamicFieldLabel(key),
        value: formatDynamicFieldValue(value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [event?.raw_record]);
  if (!event) return null;

  const originalEventTitle = event.title?.trim() || '';
  const originalClientName = event.client_name?.trim() || '';
  const originalPhone = formatPhoneForWhatsApp(event.client_phone);
  const nextClientName = normalizeMeetingClientName(eventForm.client_name || '') || originalClientName;
  const titleWasEdited = (eventForm.title || '').trim() !== originalEventTitle;
  const nextEventTitle = titleWasEdited
    ? (eventForm.title || originalEventTitle || event.client_name || '').trim() || originalEventTitle
    : originalEventTitle;
  const eventClientChanged = nextClientName !== originalClientName;
  const eventPhoneChanged = formatPhoneForWhatsApp(eventForm.client_phone) !== originalPhone;

  const isLostLeadContext = pipelineClient?.stage === 'PERDIDO' || leadForm.status === 'PERDIDO';

  const saveCurrentChanges = async () => {
    const canonicalClientName = nextClientName;
    const shouldBeNoShow = !isLostLeadContext && isNoShowColor(eventForm.color);
    const resolvedLeadStatus = isLostLeadContext
      ? 'PERDIDO'
      : shouldBeNoShow
      ? 'NO_SHOW'
      : leadForm.status === 'NO_SHOW'
        ? 'NOVO_LEAD'
        : leadForm.status;

    const eventPatch: Record<string, any> = {};
    if (titleWasEdited) {
      eventPatch.title = nextEventTitle;
    }
    if (eventClientChanged) {
      eventPatch.client_name = canonicalClientName;
    }
    if (eventPhoneChanged) {
      eventPatch.client_phone = formatPhoneForWhatsApp(eventForm.client_phone);
    }
    if (eventForm.event_date !== event.event_date) {
      eventPatch.event_date = eventForm.event_date;
    }
    if ((eventForm.event_time || '').slice(0, 5) !== (event.event_time || '').slice(0, 5)) {
      eventPatch.event_time = eventForm.event_time;
    }
    if (eventForm.color !== event.color) {
      eventPatch.color = eventForm.color;
    }
    if (eventForm.description !== (event.description || '')) {
      eventPatch.description = eventForm.description || null;
    }
    if (eventForm.notes !== (event.notes || '')) {
      eventPatch.notes = eventForm.notes || null;
    }
    if (eventForm.meeting_link !== (event.meeting_link || '')) {
      eventPatch.meeting_link = eventForm.meeting_link || null;
    }

    if (Object.keys(eventPatch).length > 0) {
      await updateEvent.mutateAsync({
        id: event.id,
        ...eventPatch,
      });
    }

    if (leadData) {
      const leadPatch: Record<string, any> = {};

      if (leadForm.faturamento !== leadData.faturamento) leadPatch.faturamento = leadForm.faturamento;
      if (leadForm.tem_socio !== leadData.tem_socio) leadPatch.tem_socio = leadForm.tem_socio;
      if (leadForm.tem_mkt !== leadData.tem_mkt) leadPatch.tem_mkt = leadForm.tem_mkt;
      if (leadForm.tem_secretaria !== leadData.tem_secretaria) leadPatch.tem_secretaria = leadForm.tem_secretaria;
      if (leadForm.salao_ou_clinica !== leadData.salao_ou_clinica) leadPatch.salao_ou_clinica = leadForm.salao_ou_clinica;
      if (leadForm.notes !== (leadData.notes || '')) leadPatch.notes = leadForm.notes || null;
      if (eventForm.event_date !== leadData.agenda_event_date) leadPatch.agenda_event_date = eventForm.event_date;
      if (eventForm.event_time !== leadData.agenda_event_time) leadPatch.agenda_event_time = eventForm.event_time;
      if (titleWasEdited) leadPatch.agenda_event_title = nextEventTitle;
      if (resolvedLeadStatus !== leadData.status) leadPatch.status = resolvedLeadStatus;

      if (Object.keys(leadPatch).length > 0) {
        try {
          await updateLead.mutateAsync({
            id: leadData.id,
            agenda_event_id: event.id,
            pipeline_client_id: leadData.pipeline_client_id || pipelineClient?.id || null,
            ...leadPatch,
          });
        } catch (leadError) {
          console.warn('Lead update failed after event save, keeping event changes.', leadError);
        }
      }
    }

    setIsEditingEvent(false);
    setIsEditingLead(false);
  };

  const handleSaveEvent = async () => {
    try {
      const eventPatch: Record<string, any> = {};
      if (titleWasEdited) eventPatch.title = nextEventTitle;
      if (eventClientChanged) eventPatch.client_name = nextClientName;
      if (eventPhoneChanged) eventPatch.client_phone = formatPhoneForWhatsApp(eventForm.client_phone);
      if (eventForm.event_date !== event.event_date) eventPatch.event_date = eventForm.event_date;
      if ((eventForm.event_time || '').slice(0, 5) !== (event.event_time || '').slice(0, 5)) eventPatch.event_time = eventForm.event_time;
      if (eventForm.color !== event.color) eventPatch.color = eventForm.color;
      if (eventForm.description !== (event.description || '')) eventPatch.description = eventForm.description || null;
      if (eventForm.notes !== (event.notes || '')) eventPatch.notes = eventForm.notes || null;
      if (eventForm.meeting_link !== (event.meeting_link || '')) eventPatch.meeting_link = eventForm.meeting_link || null;

      if (Object.keys(eventPatch).length > 0) {
        await updateEvent.mutateAsync({
          id: event.id,
          ...eventPatch,
        });
      }

      setIsEditingEvent(false);
    } catch (error) {
      console.error('Falha ao salvar evento.', error);
    }
  };

  const handleColorChange = async (color: string) => {
    setEventForm((current) => ({ ...current, color }));

    await updateEvent.mutateAsync({
      id: event.id,
      color,
    });
    toast.success('Cor do evento atualizada!');
  };

  const handleSaveLead = async () => {
    try {
      if (!leadData) {
        setIsEditingLead(false);
        return;
      }

      const resolvedLeadStatus = leadForm.status;

      const leadPatch: Record<string, any> = {};
      if (leadForm.faturamento !== leadData.faturamento) leadPatch.faturamento = leadForm.faturamento;
      if (leadForm.tem_socio !== leadData.tem_socio) leadPatch.tem_socio = leadForm.tem_socio;
      if (leadForm.tem_mkt !== leadData.tem_mkt) leadPatch.tem_mkt = leadForm.tem_mkt;
      if (leadForm.tem_secretaria !== leadData.tem_secretaria) leadPatch.tem_secretaria = leadForm.tem_secretaria;
      if (leadForm.salao_ou_clinica !== leadData.salao_ou_clinica) leadPatch.salao_ou_clinica = leadForm.salao_ou_clinica;
      if (leadForm.notes !== (leadData.notes || '')) leadPatch.notes = leadForm.notes || null;
      if (resolvedLeadStatus !== leadData.status) leadPatch.status = resolvedLeadStatus;

      if (Object.keys(leadPatch).length > 0) {
        await updateLead.mutateAsync({
          id: leadData.id,
          ...leadPatch,
        });
      }

      setIsEditingLead(false);
      toast.success('Informações do lead atualizadas!');
    } catch (error) {
      console.error('Falha ao salvar lead.', error);
    }
  };

  const handleDelete = async () => {
    await deleteEvent.mutateAsync(event.id);
    onOpenChange(false);
  };

  const handleManualReminder = () => {
    toast.success('Lembrete manual simulado. Nesta versao local nao existe envio externo.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-h-[94vh] overflow-hidden rounded-[30px] border border-slate-200/70 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.16)] sm:max-w-[1180px] lg:max-w-[1320px]">
        <div className="max-h-[94vh] overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 p-0">
        <DialogHeader className="border-b border-slate-200/70 px-8 py-6">
          <DialogTitle className="text-[1.8rem] font-black tracking-tight text-slate-950 sm:text-3xl">
            {isEditingEvent ? (eventForm.title || 'Editar evento') : event.title}
          </DialogTitle>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Visão consolidada do agendamento, do lead e do pipeline vinculado.
          </p>
        </DialogHeader>

        {isEditingEvent ? (
          <div className="space-y-5 px-8 py-7">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título</Label>
                <Input value={eventForm.title} onChange={(e) => setEventForm((current) => ({ ...current, title: e.target.value }))} />
              </div>
              <div>
                <Label>Cliente</Label>
                <Input value={eventForm.client_name} onChange={(e) => setEventForm((current) => ({ ...current, client_name: e.target.value }))} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={eventForm.client_phone} onChange={(e) => setEventForm((current) => ({ ...current, client_phone: e.target.value }))} />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={eventForm.event_date} onChange={(e) => setEventForm((current) => ({ ...current, event_date: e.target.value }))} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={eventForm.event_time} onChange={(e) => setEventForm((current) => ({ ...current, event_time: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Cor</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EVENT_COLOR_PRESET.map((color) => {
                    const active = eventForm.color === color.value;

                    return (
                      <Button
                        key={color.value}
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEventForm((current) => ({ ...current, color: color.value }));
                        }}
                        className={[
                          'h-9 rounded-full border px-4 text-xs font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                          active
                            ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/15'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                        ].join(' ')}
                      >
                        <span
                          className="mr-2 h-2.5 w-2.5 rounded-full ring-2 ring-white"
                          style={{ backgroundColor: color.value }}
                          aria-hidden="true"
                        />
                        {color.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Tem sócio?</Label>
                <Select value={leadForm.tem_socio} onValueChange={(value) => setLeadForm((current) => ({ ...current, tem_socio: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEM_SOCIO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tem MKT?</Label>
                <Select value={leadForm.tem_mkt} onValueChange={(value) => setLeadForm((current) => ({ ...current, tem_mkt: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEM_MKT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tem secretária?</Label>
                <Select value={leadForm.tem_secretaria} onValueChange={(value) => setLeadForm((current) => ({ ...current, tem_secretaria: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEM_SECRETARIA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Link</Label>
                <Input value={eventForm.meeting_link} onChange={(e) => setEventForm((current) => ({ ...current, meeting_link: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea value={eventForm.description} onChange={(e) => setEventForm((current) => ({ ...current, description: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Anotações</Label>
                <Textarea value={eventForm.notes} onChange={(e) => setEventForm((current) => ({ ...current, notes: e.target.value }))} />
              </div>
            </div>

            <div className="sticky bottom-0 -mx-8 mt-6 flex justify-end gap-2 border-t border-slate-200/70 bg-white/95 px-8 py-4 backdrop-blur-xl">
              <Button variant="outline" onClick={() => setIsEditingEvent(false)}>Cancelar</Button>
              <Button onClick={handleSaveEvent} disabled={updateEvent.isPending}>
                {updateEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-8 py-7">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            aria-label="Alterar cor ou status do evento"
                            title="Clique para trocar a cor do evento"
                            className="inline-flex h-9 items-center gap-2 rounded-full border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full ring-2 ring-white"
                              style={{ backgroundColor: currentColorOption.value }}
                            />
                            <span className="max-w-[140px] truncate">{currentColorOption.label}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[420px] rounded-3xl p-4">
                          <div className="mb-3">
                            <p className="text-sm font-bold text-slate-950">Cor</p>
                            <p className="text-xs font-medium text-slate-500">{currentColorOption.label}</p>
                            <p className="text-xs text-slate-500">Clique em uma opção para salvar automaticamente no evento, sem entrar em edição.</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {EVENT_COLOR_PRESET.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                aria-label={color.label}
                                onClick={async () => {
                                  setIsColorPickerOpen(false);
                                  await handleColorChange(color.value);
                                }}
                                className="group inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                              >
                                <span
                                  className="h-2.5 w-2.5 rounded-full ring-2 ring-white transition group-hover:scale-110"
                                  style={{ backgroundColor: color.value }}
                                />
                                <span className={cn('truncate', eventForm.color === color.value ? 'text-slate-950' : 'text-slate-700')}>
                                  {color.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <p className="text-[1.8rem] font-black tracking-tight text-slate-950">{event.client_name}</p>
                    </div>
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Cor</p>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_COLOR_PRESET.map((color) => {
                          const active = eventForm.color === color.value;

                          return (
                            <Button
                              key={color.value}
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                await handleColorChange(color.value);
                              }}
                              className={[
                                'h-8 rounded-full border px-3 text-[11px] font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                                active
                                  ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/15'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                              ].join(' ')}
                            >
                              <span
                                className="mr-2 h-2.5 w-2.5 rounded-full ring-2 ring-white"
                                style={{ backgroundColor: color.value }}
                                aria-hidden="true"
                              />
                              {color.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="rounded-full bg-slate-950 px-3 py-1 text-white shadow-sm hover:bg-slate-950">
                        <CalendarDays className="mr-1 h-3.5 w-3.5" />
                        {eventDateLabel} • {eventTimeLabel}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 shadow-sm">
                        <Phone className="mr-1 h-3.5 w-3.5" />
                        {event.client_phone || 'Sem telefone'}
                      </Badge>
                      {pipelineClient?.agendadoPor && (
                        <Badge variant="outline" className="rounded-full border-red-200 bg-red-50 px-3 py-1 text-red-700 shadow-sm">
                          <User2 className="mr-1 h-3.5 w-3.5" />
                          {AGENDADOR_OPTIONS.find((option) => option.value === pipelineClient.agendadoPor)?.label || pipelineClient.agendadoPor}
                        </Badge>
                      )}
                    </div>

                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingLead((current) => !current)} className="rounded-full transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100">
                      <Edit3 className="mr-2 h-4 w-4" />
                      {isEditingLead ? 'Fechar edição' : 'Editar lead'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingEvent(true)} className="rounded-full transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100">
                      <Edit3 className="mr-2 h-4 w-4" />
                      Editar evento
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                  <div className="rounded-[1.3rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Data</p>
                    <p className="mt-2 text-base font-black text-slate-950">{eventDateLabel}</p>
                  </div>
                  <div className="rounded-[1.3rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Horário</p>
                    <p className="mt-2 text-base font-black text-slate-950">{eventTimeLabel}</p>
                  </div>
                  <div className="rounded-[1.3rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Telefone</p>
                    <p className="mt-2 text-base font-black text-slate-950">{event.client_phone || 'Sem telefone'}</p>
                  </div>
                  <div className="rounded-[1.3rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Agendamento</p>
                    <p className="mt-2 text-base font-black text-slate-950">{pipelineClient?.agendadoVia ? agendadoViaLabel : 'Sem informação'}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.6rem] border border-slate-100 bg-[#F9FAFB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <BadgeInfo className="h-4 w-4 text-primary" />
                    Observações do evento
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {event.description || event.notes || 'Sem observações registradas para esse agendamento.'}
                  </p>
                </div>

                {extraEventFields.length > 0 && (
                  <div className="mt-6 rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <StickyNote className="h-4 w-4 text-primary" />
                      Outros dados do banco
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {extraEventFields.map((field) => (
                        <div key={field.key} className="rounded-[1rem] border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            {field.label}
                          </p>
                          <p className="mt-1 break-words text-sm font-medium leading-6 text-slate-800">
                            {field.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Painel do lead</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">Informações essenciais</h3>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Quem agendou</p>
                    <p className="mt-2 text-base font-black text-slate-950">{agendadorLabel}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Ligação ou mensagem</p>
                    <p className="mt-2 text-base font-black text-slate-950">{agendadoViaLabel}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Tem sócio?</p>
                    <p className="mt-2 text-base font-black text-slate-950">{formatCommercialAnswerLabel(leadForm.tem_socio)}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Tem marketing?</p>
                    <p className="mt-2 text-base font-black text-slate-950">{formatCommercialAnswerLabel(leadForm.tem_mkt)}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Tem secretária?</p>
                    <p className="mt-2 text-base font-black text-slate-950">{formatCommercialAnswerLabel(leadForm.tem_secretaria)}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Área de atuação</p>
                    <p className="mt-2 text-base font-black text-slate-950">{areaAtuacaoLabel}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">PROFISSÃO</p>
                    <p className="mt-2 text-base font-black text-slate-950">{professionLabel}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Faturamento</p>
                    <p className="mt-2 text-base font-black text-slate-950">{faturamentoLabel}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Funil / criativo</p>
                    <p className="mt-2 text-base font-black text-slate-950">{funilLabel}</p>
                  </div>
                </div>

                {isEditingLead ? (
                  <div className="mt-6 rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label>Faturamento</Label>
                        <Select value={leadForm.faturamento} onValueChange={(value) => setLeadForm((current) => ({ ...current, faturamento: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FATURAMENTO_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={leadForm.status} onValueChange={(value) => setLeadForm((current) => ({ ...current, status: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tem sócio?</Label>
                        <Select value={leadForm.tem_socio} onValueChange={(value) => setLeadForm((current) => ({ ...current, tem_socio: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TEM_SOCIO_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tem marketing?</Label>
                        <Select value={leadForm.tem_mkt} onValueChange={(value) => setLeadForm((current) => ({ ...current, tem_mkt: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TEM_MKT_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tem secretária?</Label>
                        <Select value={leadForm.tem_secretaria} onValueChange={(value) => setLeadForm((current) => ({ ...current, tem_secretaria: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TEM_SECRETARIA_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Área de atuação</Label>
                        <Select value={leadForm.salao_ou_clinica} onValueChange={(value) => setLeadForm((current) => ({ ...current, salao_ou_clinica: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SALAO_OU_CLINICA_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Anotações</Label>
                        <Textarea value={leadForm.notes} onChange={(e) => setLeadForm((current) => ({ ...current, notes: e.target.value }))} />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <Button onClick={handleSaveLead} disabled={updateLead.isPending}>
                          {updateLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Salvar alterações
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="sticky bottom-0 -mx-8 flex flex-col gap-3 border-t border-slate-200/70 bg-white/95 px-8 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <Button variant="destructive" onClick={handleDelete} disabled={deleteEvent.isPending} className="shadow-sm transition duration-200 hover:-translate-y-0.5">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleManualReminder} className="shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50">
                  <Bell className="h-4 w-4 mr-2" />
                  Lembrete manual
                </Button>
                {onDuplicate && (
                  <Button variant="outline" onClick={() => {
                    onDuplicate(event);
                    onOpenChange(false);
                  }} className="shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50">
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </Button>
                )}
                <Button onClick={() => setIsEditingEvent(true)} className="bg-red-600 text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-red-700">Editar evento</Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}



