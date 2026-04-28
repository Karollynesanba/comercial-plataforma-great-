import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgendaData, AgendaEvent, EVENT_COLORS } from '@/hooks/useAgendaData';
import { Loader2, UserPlus, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useCommercialSafe } from '@/contexts/CommercialContext';
import { useAgendamentoData } from '@/hooks/useAgendamentoData';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import { EQUIPE_OPTIONS } from '@/contexts/CommercialContext';
import { mapPipelineTeamToAgenda } from '@/lib/teamMapping';

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedTime?: string;
  editingEvent?: AgendaEvent | null;
  duplicateFrom?: AgendaEvent | null;
}

interface LeadOption {
  id: string;
  name: string;
  phone: string;
  source: 'pipeline' | 'agendamento';
  sourceLabel: string;
}

export function AddEventDialog({ open, onOpenChange, selectedDate, selectedTime, editingEvent, duplicateFrom }: AddEventDialogProps) {
  const { createEvent, updateEvent, deleteEvent } = useAgendaData();
  const commercial = useCommercialSafe();
  const { leads: agendamentoLeads } = useAgendamentoData();
  
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const isEditing = !!editingEvent;

  const teams = EQUIPE_OPTIONS.map((team) => ({ id: team.value, name: team.label }));
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    client_name: '',
    client_phone: '',
    event_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    event_time: selectedTime || '09:00',
    duration_minutes: 60,
    meeting_link: '',
    color: '#00E5FF',
    team_id: '' as string,
  });

  // Combine leads from Pipeline and Agendamento
  const allLeads = useMemo((): LeadOption[] => {
    const leads: LeadOption[] = [];
    
    // Add Pipeline clients
    if (commercial?.pipelineClients) {
      commercial.pipelineClients.forEach(client => {
        if (client.clientName && client.telefone) {
          leads.push({
            id: client.id,
            name: client.clientName,
            phone: client.telefone,
            source: 'pipeline',
            sourceLabel: 'Pipeline',
          });
        }
      });
    }
    
    // Add Agendamento leads
    agendamentoLeads.forEach(lead => {
      if (lead.nome && lead.telefone) {
        // Check if already added from pipeline (by name match)
        const exists = leads.some(l => l.name.toLowerCase() === lead.nome.toLowerCase());
        if (!exists) {
          leads.push({
            id: lead.id,
            name: lead.nome,
            phone: lead.telefone,
            source: 'agendamento',
            sourceLabel: 'Agendamento',
          });
        }
      }
    });
    
    return leads.sort((a, b) => a.name.localeCompare(b.name));
  }, [commercial?.pipelineClients, agendamentoLeads]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      notes: '',
      client_name: '',
      client_phone: '',
      event_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      event_time: selectedTime || '09:00',
      duration_minutes: 60,
      meeting_link: '',
      color: '#00E5FF',
      team_id: '',
    });
    setSelectedLead(null);
  };
  
  // Update form when dialog opens - either with editing data, duplicate data, or fresh
  useEffect(() => {
    if (open) {
      if (editingEvent) {
        setFormData({
          title: editingEvent.title,
          description: editingEvent.description || '',
          notes: editingEvent.notes || '',
          client_name: editingEvent.client_name,
          client_phone: formatPhoneInput(editingEvent.client_phone),
          event_date: editingEvent.event_date,
          event_time: editingEvent.event_time.slice(0, 5),
          duration_minutes: editingEvent.duration_minutes || 60,
          meeting_link: editingEvent.meeting_link || '',
          color: editingEvent.color || '#00E5FF',
          team_id: editingEvent.team_id || '',
        });
      } else if (duplicateFrom) {
        // Pre-fill form with duplicated event data, but with today's date
        setFormData({
          title: duplicateFrom.title,
          description: duplicateFrom.description || '',
          notes: duplicateFrom.notes || '',
          client_name: duplicateFrom.client_name,
          client_phone: formatPhoneInput(duplicateFrom.client_phone),
          event_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          event_time: selectedTime || duplicateFrom.event_time.slice(0, 5),
          duration_minutes: duplicateFrom.duration_minutes || 60,
          meeting_link: duplicateFrom.meeting_link || '',
          color: '#00E5FF',
          team_id: duplicateFrom.team_id || '',
        });
      } else {
        setFormData(prev => ({
          ...prev,
          event_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : prev.event_date,
          event_time: selectedTime || prev.event_time,
        }));
      }
    } else {
      // Reset when closing
      setConfirmDelete(false);
    }
  }, [open, selectedDate, selectedTime, editingEvent, duplicateFrom]);

  const handleSelectLead = (lead: LeadOption) => {
    setSelectedLead(lead);
    setFormData(prev => ({
      ...prev,
      client_name: lead.name,
      client_phone: formatPhoneInput(lead.phone),
      title: `Reunião com ${lead.name}`,
    }));
    setLeadSearchOpen(false);
  };

  const handleClearLead = () => {
    setSelectedLead(null);
    setFormData(prev => ({
      ...prev,
      client_name: '',
      client_phone: '',
      title: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedPhone = formatPhoneForWhatsApp(formData.client_phone);
    
    if (isEditing && editingEvent) {
      await updateEvent.mutateAsync({
        id: editingEvent.id,
        title: formData.title,
        description: formData.description || null,
        notes: formData.notes || null,
        client_name: formData.client_name,
        client_phone: normalizedPhone,
        event_date: formData.event_date,
        event_time: formData.event_time,
        duration_minutes: formData.duration_minutes,
        meeting_link: formData.meeting_link || null,
        color: formData.color,
        team_id: mapPipelineTeamToAgenda(formData.team_id) || null,
      });
    } else {
      await createEvent.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        notes: formData.notes || null,
        client_name: formData.client_name,
        client_phone: normalizedPhone,
        event_date: formData.event_date,
        event_time: formData.event_time,
        duration_minutes: formData.duration_minutes,
        meeting_link: formData.meeting_link || null,
        color: formData.color,
        team_id: mapPipelineTeamToAgenda(formData.team_id) || null,
        created_by_user_id: null,
        assigned_closer_id: null,
      });
    }
    
    resetForm();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    await deleteEvent.mutateAsync(editingEvent.id);
    resetForm();
    onOpenChange(false);
  };

  const formatPhoneInput = (value: string) => {
    // Accept any format - just return as-is for display
    return value;
  };

  const isPending = isEditing ? updateEvent.isPending : createEvent.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Evento' : duplicateFrom ? 'Duplicar Evento' : 'Novo Evento'}</DialogTitle>
          </DialogHeader>
        
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lead Selection */}
          <div className="space-y-2">
            <Label>Selecionar Lead Existente</Label>
            <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={leadSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedLead ? (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{selectedLead.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedLead.sourceLabel}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserPlus className="h-4 w-4" />
                      <span>Buscar lead do Pipeline ou Agendamento...</span>
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por nome..." />
                  <CommandList>
                    <CommandEmpty>Nenhum lead encontrado.</CommandEmpty>
                    <CommandGroup heading="Leads disponíveis">
                      {allLeads.map((lead) => (
                        <CommandItem
                          key={`${lead.source}-${lead.id}`}
                          value={lead.name}
                          onSelect={() => handleSelectLead(lead)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span>{lead.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatPhoneInput(lead.phone)}
                            </span>
                          </div>
                          <Badge 
                            variant={lead.source === 'pipeline' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {lead.sourceLabel}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedLead && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleClearLead}
                className="text-xs text-muted-foreground"
              >
                Limpar seleção e digitar manualmente
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Reunião de apresentação"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="client_name">Nome do Cliente *</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Nome do cliente"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="client_phone">WhatsApp do Cliente *</Label>
              <Input
                id="client_phone"
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: formatPhoneInput(e.target.value) })}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="event_date">Data *</Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="event_time">Horário *</Label>
              <Input
                id="event_time"
                type="time"
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Select
                value={String(formData.duration_minutes)}
                onValueChange={(value) => setFormData({ ...formData, duration_minutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="color">Cor</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: color.value }}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="team">Equipe</Label>
              <Select
                value={formData.team_id}
                onValueChange={(value) => setFormData({ ...formData, team_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="meeting_link">Link da Reunião</Label>
              <Input
                id="meeting_link"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes do evento..."
                rows={3}
              />
            </div>
            
            {/* Notes field for editing */}
            {isEditing && (
              <div className="col-span-2">
                <Label htmlFor="notes">📝 Anotações sobre o cliente</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Adicione notas importantes sobre este cliente..."
                  rows={3}
                  className="bg-muted/50"
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-between pt-4">
            {isEditing ? (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar Evento'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O evento será permanentemente removido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
