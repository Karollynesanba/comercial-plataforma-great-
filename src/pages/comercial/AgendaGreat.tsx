import { useState, useMemo } from 'react';
import { useAgendaData, AgendaEvent } from '@/hooks/useAgendaData';
import { AgendaDayTimeline } from '@/components/comercial/agenda/AgendaDayTimeline';
import { AgendaWeekTimeline } from '@/components/comercial/agenda/AgendaWeekTimeline';
import { AgendaMonthCalendar } from '@/components/comercial/agenda/AgendaMonthCalendar';
import { AddEventDialog } from '@/components/comercial/agenda/AddEventDialog';
import { EventDetailsDialog } from '@/components/comercial/agenda/EventDetailsDialog';
import { Loader2, Calendar, CalendarDays, CalendarRange, Users, Search, X } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EQUIPE_OPTIONS } from '@/contexts/CommercialContext';

export default function AgendaGreat() {
  const { events, isLoading } = useAgendaData();
  
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatingEvent, setDuplicatingEvent] = useState<AgendaEvent | null>(null);

  const teams = EQUIPE_OPTIONS.map((team) => ({ id: team.value, name: team.label }));

  // Filter events by team and search query
  const filteredEvents = useMemo(() => {
    let result = events;
    
    // Filter by team
    if (selectedTeamId !== 'all') {
      result = result.filter(e => e.team_id === selectedTeamId);
    }
    
    // Filter by search query (client name or phone)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(e => 
        e.client_name.toLowerCase().includes(query) ||
        e.client_phone.includes(query) ||
        e.title.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [events, selectedTeamId, searchQuery]);

  // Click on existing event - open details dialog
  const handleEventClick = (event: AgendaEvent) => {
    // Ensure we never show the "Novo Evento" dialog when clicking an existing event
    setAddDialogOpen(false);
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  };

  // Click to add new event - open add dialog
  const handleAddEvent = (date: Date, time?: string) => {
    // Ensure we never show details dialog when creating a new event
    setDetailsDialogOpen(false);
    setSelectedEvent(null);
    setDuplicatingEvent(null);
    setSelectedDate(date);
    setSelectedTime(time);
    setAddDialogOpen(true);
  };

  // Handle duplicating an event
  const handleDuplicateEvent = (event: AgendaEvent) => {
    setDuplicatingEvent(event);
    setSelectedDate(new Date());
    setSelectedTime(undefined);
    setAddDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search and Team Filter */}
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 w-[280px]"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Equipes</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Toggle */}
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(value) => value && setViewMode(value as 'day' | 'week' | 'month')}
          className="bg-muted/50 p-1 rounded-lg"
        >
          <ToggleGroupItem value="day" aria-label="Visualização diária" className="gap-2 data-[state=on]:bg-background">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Dia</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="week" aria-label="Visualização semanal" className="gap-2 data-[state=on]:bg-background">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Semana</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="month" aria-label="Visualização mensal" className="gap-2 data-[state=on]:bg-background">
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">Mês</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Timeline Views */}
      {viewMode === 'day' && (
        <AgendaDayTimeline
          events={filteredEvents}
          onEventClick={handleEventClick}
          onAddEvent={handleAddEvent}
        />
      )}
      {viewMode === 'week' && (
        <AgendaWeekTimeline
          events={filteredEvents}
          onEventClick={handleEventClick}
          onAddEvent={handleAddEvent}
        />
      )}
      {viewMode === 'month' && (
        <AgendaMonthCalendar
          events={filteredEvents}
          onEventClick={handleEventClick}
          onAddEvent={handleAddEvent}
        />
      )}

      {/* Add Event Dialog - for new events or duplicating */}
      <AddEventDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setDuplicatingEvent(null);
        }}
        selectedDate={selectedDate || undefined}
        selectedTime={selectedTime}
        duplicateFrom={duplicatingEvent}
      />

      {/* Event Details Dialog - for viewing/editing existing events */}
      <EventDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        event={selectedEvent}
        onDuplicate={handleDuplicateEvent}
      />
    </div>
  );
}
