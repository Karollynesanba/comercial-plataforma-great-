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
import { formatBRL } from '@/lib/utils';
import { coerceCommercialAnswer, formatCommercialAnswerLabel } from '@/lib/commercialAnswer';
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
  const { pipelineClients } = useCommercialSafe();
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const eventPhoneDigits = useMemo(() => (event?.client_phone || '').replace(/\D/g, ''), [event?.client_phone]);
  const eventTimeLabel = event?.event_time?.slice(0, 5) || '--:--';
  const eventDateLabel = event?.event_date || '--/--/----';

  const leadData = useMemo(() => {
    if (!event) return null;
    return leads.find((lead) => lead.telefone.replace(/\D/g, '') === eventPhoneDigits) || null;
  }, [event, eventPhoneDigits, leads]);

  const pipelineClient = useMemo(() => {
    if (!event) return null;
    return pipelineClients.find((client) => client.telefone?.replace(/\D/g, '') === eventPhoneDigits) || null;
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
      tem_socio: coerceCommercialAnswer(leadData?.tem_socio || pipelineClient?.temSocio) || 'NAO_SEI',
      tem_mkt: coerceCommercialAnswer(leadData?.tem_mkt || pipelineClient?.temMkt) || 'NAO_SEI',
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
  const eventColorLabel = EVENT_COLORS.find((color) => color.value === eventForm.color)?.label || 'Cor do evento';

  if (!event) return null;

  const handleSaveEvent = async () => {
    await updateEvent.mutateAsync({
      id: event.id,
      ...eventForm,
      client_phone: formatPhoneForWhatsApp(eventForm.client_phone),
      meeting_link: eventForm.meeting_link || null,
      description: eventForm.description || null,
      notes: eventForm.notes || null,
    });

    setIsEditingEvent(false);
  };

  const handleColorChange = async (color: string) => {
    setEventForm((current) => ({ ...current, color }));

    await updateEvent.mutateAsync({
      id: event.id,
      ...eventForm,
      color,
      client_phone: formatPhoneForWhatsApp(eventForm.client_phone),
      meeting_link: eventForm.meeting_link || null,
      description: eventForm.description || null,
      notes: eventForm.notes || null,
    });
    toast.success('Cor do evento atualizada!');
  };

  const handleSaveLead = async () => {
    if (leadData) {
      await updateLead.mutateAsync({
        id: leadData.id,
        faturamento: leadForm.faturamento as any,
        tem_socio: leadForm.tem_socio as any,
        tem_mkt: leadForm.tem_mkt as any,
        tem_secretaria: leadForm.tem_secretaria as any,
        salao_ou_clinica: leadForm.salao_ou_clinica as any,
        status: leadForm.status,
      });
    }

    await updateEvent.mutateAsync({
      id: event.id,
      notes: leadForm.notes || null,
      title: eventForm.title,
    });

    setIsEditingLead(false);
    toast.success('Informações do lead atualizadas!');
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
            {isEditingEvent ? 'Editar evento' : event.title}
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
              <div className="col-span-2">
                <Label>Cor</Label>
                <Select value={eventForm.color} onValueChange={(value) => setEventForm((current) => ({ ...current, color: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>{color.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                          <button
                            type="button"
                            aria-label="Alterar cor ou status do evento"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                          >
                            <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white" style={{ backgroundColor: eventForm.color }} />
                            <span className="text-xs font-semibold text-slate-700">{eventColorLabel}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-72 rounded-2xl p-3">
                          <div className="mb-3">
                            <p className="text-sm font-bold text-slate-950">Status / cor do evento</p>
                            <p className="text-xs font-medium text-slate-500">{eventColorLabel}</p>
                            <p className="text-xs text-slate-500">Clique em uma cor para atualizar o marcador.</p>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {EVENT_COLOR_PRESET.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                aria-label={color.label}
                                onClick={async () => {
                                  setIsColorPickerOpen(false);
                                  await handleColorChange(color.value);
                                }}
                                className="group flex flex-col items-center gap-1 rounded-xl border border-slate-100 p-2 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                              >
                                <span
                                  className="h-7 w-7 rounded-full border border-white shadow-sm ring-1 ring-slate-200 transition group-hover:scale-105"
                                  style={{ backgroundColor: color.value }}
                                />
                                <span className="text-[10px] font-medium text-slate-500">{color.label}</span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <p className="text-[1.8rem] font-black tracking-tight text-slate-950">{event.client_name}</p>
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



