import { useMemo, useState } from 'react';
import { Calendar, CalendarDays, CalendarRange, Loader2, Search, Users, X } from 'lucide-react';
import { AgendaDayTimeline } from '@/components/comercial/agenda/AgendaDayTimeline';
import { AgendaMonthCalendar } from '@/components/comercial/agenda/AgendaMonthCalendar';
import { AgendaWeekTimeline } from '@/components/comercial/agenda/AgendaWeekTimeline';
import { AddEventDialog } from '@/components/comercial/agenda/AddEventDialog';
import { EventDetailsDialog } from '@/components/comercial/agenda/EventDetailsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AgendaEvent, useAgendaData } from '@/hooks/useAgendaData';
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

  const filteredEvents = useMemo(() => {
    let result = events;

    if (selectedTeamId !== 'all') {
      result = result.filter((e) => e.team_id === selectedTeamId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.client_name.toLowerCase().includes(query) ||
          e.client_phone.includes(query) ||
          e.title.toLowerCase().includes(query),
      );
    }

    return result;
  }, [events, selectedTeamId, searchQuery]);

  const handleEventClick = (event: AgendaEvent) => {
    setAddDialogOpen(false);
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  };

  const handleAddEvent = (date: Date, time?: string) => {
    setDetailsDialogOpen(false);
    setSelectedEvent(null);
    setDuplicatingEvent(null);
    setSelectedDate(date);
    setSelectedTime(time);
    setAddDialogOpen(true);
  };

  const handleDuplicateEvent = (event: AgendaEvent) => {
    setDuplicatingEvent(event);
    setSelectedDate(new Date());
    setSelectedTime(undefined);
    setAddDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#F7F7F9]">
      <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-4 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar cliente, telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-[320px] rounded-2xl border-slate-200 bg-white pl-10 pr-10 shadow-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-500/30"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="h-11 w-[220px] rounded-2xl border-slate-200 bg-white shadow-sm">
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

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as 'day' | 'week' | 'month')}
            className="rounded-[20px] border border-slate-200/70 bg-slate-100/90 p-1.5 shadow-inner"
          >
            <ToggleGroupItem
              value="day"
              aria-label="Visualização diária"
              className="gap-2 rounded-xl px-4 data-[state=on]:bg-white data-[state=on]:text-slate-950 data-[state=on]:shadow-sm"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Dia</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="week"
              aria-label="Visualização semanal"
              className="gap-2 rounded-xl px-4 data-[state=on]:bg-white data-[state=on]:text-slate-950 data-[state=on]:shadow-sm"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Semana</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="month"
              aria-label="Visualização mensal"
              className="gap-2 rounded-xl px-4 data-[state=on]:bg-white data-[state=on]:text-slate-950 data-[state=on]:shadow-sm"
            >
              <CalendarRange className="h-4 w-4" />
              <span className="hidden sm:inline">Mês</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

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

      <EventDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        event={selectedEvent}
        onDuplicate={handleDuplicateEvent}
      />
    </div>
  );
}
