import { useEffect, useMemo, useState } from 'react';
import { Calendar, CalendarDays, CalendarRange, Search, Users, X, Filter, Trash2 } from 'lucide-react';
import { AgendaDayTimeline } from '@/components/comercial/agenda/AgendaDayTimeline';
import { AgendaMonthCalendar } from '@/components/comercial/agenda/AgendaMonthCalendar';
import { AgendaWeekTimeline } from '@/components/comercial/agenda/AgendaWeekTimeline';
import { AddEventDialog } from '@/components/comercial/agenda/AddEventDialog';
import { EventDetailsDialog } from '@/components/comercial/agenda/EventDetailsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AgendaEvent, EVENT_COLORS, useAgendaData } from '@/hooks/useAgendaData';
import { AGENDA_TEAM_IDS } from '@/lib/teamMapping';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { addMinutes, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AGENDA_COLOR_FILTER_STORAGE_KEY = 'great_agenda_color_filters';

const formatLocalDate = (dateString: string) => String(dateString || '').trim().slice(0, 10);

const parseLocalDate = (dateString: string) => {
  const [year, month, day] = formatLocalDate(dateString).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const COLOR_FILTER_LABELS: Record<string, string> = {
  '#3B82F6': 'Reunião Marcada',
  '#66FF00': 'Call Feita',
  '#FF0000': 'Call Não Comparecida',
  '#B000FF': 'Recontato',
  '#FFA500': 'Ficou de Confirmar',
  '#C8A27A': 'No Show Remarcado',
  '#808080': 'Reuniões - Great',
};

export default function AgendaGreat() {
  const { events } = useAgendaData();

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatingEvent, setDuplicatingEvent] = useState<AgendaEvent | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>(() => {
    try {
      const stored = safeGetItem(AGENDA_COLOR_FILTER_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  const teams = [
    { id: AGENDA_TEAM_IDS.TROPA_DE_ELITE, name: 'Tropa de Elite' },
    { id: AGENDA_TEAM_IDS.EQUIPE_7, name: 'Equipe 7' },
  ];

  useEffect(() => {
    safeSetItem(AGENDA_COLOR_FILTER_STORAGE_KEY, JSON.stringify(selectedColors));
  }, [selectedColors]);

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

    if (selectedColors.length > 0) {
      result = result.filter((e) => selectedColors.includes(e.color));
    }

    return result;
  }, [events, selectedTeamId, searchQuery, selectedColors]);

  const hasActiveFilters =
    selectedTeamId !== 'all' || Boolean(searchQuery.trim()) || selectedColors.length > 0;

  const toggleColorFilter = (colorValue: string) => {
    setSelectedColors((current) =>
      current.includes(colorValue)
        ? current.filter((item) => item !== colorValue)
        : [...current, colorValue]
    );
  };

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

  const initialFocusDate = useMemo(() => {
    const firstEvent = [...events].sort((a, b) => {
      const dateCompare = formatLocalDate(a.event_date).localeCompare(formatLocalDate(b.event_date));
      if (dateCompare !== 0) return dateCompare;
      return String(a.event_time).localeCompare(String(b.event_time));
    })[0];

    return firstEvent ? parseLocalDate(firstEvent.event_date) : null;
  }, [events]);

  const visibleAgendaEvents = useMemo(() => {
    return [...filteredEvents]
      .sort((a, b) => {
        const dateCompare = formatLocalDate(a.event_date).localeCompare(formatLocalDate(b.event_date));
        if (dateCompare !== 0) return dateCompare;
        return String(a.event_time).localeCompare(String(b.event_time));
      });
  }, [filteredEvents]);

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

        <div className="mt-4 rounded-[22px] border border-slate-200/70 bg-slate-50/70 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Cor</span>
            </div>
            {selectedColors.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 rounded-full px-3 text-xs text-slate-500 hover:bg-white hover:text-slate-950"
                onClick={() => setSelectedColors([])}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar filtro
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {EVENT_COLORS.map((color) => {
              const isActive = selectedColors.includes(color.value);
              const label = COLOR_FILTER_LABELS[color.value] || color.label;

              return (
                <Button
                  key={color.value}
                  type="button"
                  variant="outline"
                  onClick={() => toggleColorFilter(color.value)}
                  className={[
                    'h-9 rounded-full border px-4 text-xs font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                    isActive
                      ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/15'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                  ].join(' ')}
                >
                  <span
                    className="mr-2 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color.value }}
                    aria-hidden="true"
                  />
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-4 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Agenda carregada</p>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-950">
              {visibleAgendaEvents.length > 0
                ? `${visibleAgendaEvents.length} reunião${visibleAgendaEvents.length !== 1 ? 'es' : ''} visível${visibleAgendaEvents.length !== 1 ? 'is' : ''}`
                : 'Nenhuma reunião visível'}
            </h3>
          </div>
          <Button
            variant="outline"
            className="rounded-full border-slate-200 bg-white px-4 shadow-sm hover:bg-slate-50"
            onClick={() => {
              setSelectedTeamId('all');
              setSearchQuery('');
              setSelectedColors([]);
            }}
          >
            Limpar filtros
          </Button>
        </div>

        {visibleAgendaEvents.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleAgendaEvents.map((event) => {
              const endTime = format(
                parseISO(`2000-01-01T${event.event_time}`),
                'HH:mm'
              );

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleEventClick(event)}
                  className="group flex w-full items-start gap-3 rounded-[18px] border border-slate-200/70 bg-slate-50/80 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                >
                  <span
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: event.color || '#3B82F6' }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{event.title}</p>
                        <p className="text-xs text-slate-500">
                          {format(parseISO(event.event_date), "dd 'de' MMMM", { locale: ptBR })} às {event.event_time.slice(0, 5)} • {endTime}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 shadow-sm ring-1 ring-slate-200">
                        {event.client_name}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-xs text-slate-500">{event.description || 'Sem descrição'}</p>
                    </div>
                  </button>
                );
              })}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
            Não há reuniões visíveis com os filtros atuais. Se os eventos existirem no Supabase, eles aparecem quando a leitura estiver funcionando.
          </div>
        )}
      </div>

      {events.length > 0 && filteredEvents.length === 0 && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Os eventos do Supabase estão carregando, mas os filtros estão ocultando tudo.</p>
              <p className="text-amber-800">
                Existem {events.length} evento{events.length !== 1 ? 's' : ''} na base, porém nenhum ficou visível com a filtragem atual.
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                className="rounded-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                onClick={() => {
                  setSelectedTeamId('all');
                  setSearchQuery('');
                  setSelectedColors([]);
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      )}

      {viewMode === 'day' && (
        <AgendaDayTimeline
          events={filteredEvents}
          initialDate={initialFocusDate || undefined}
          onEventClick={handleEventClick}
          onAddEvent={handleAddEvent}
        />
      )}

      {viewMode === 'week' && (
        <AgendaWeekTimeline
          events={filteredEvents}
          initialDate={initialFocusDate || undefined}
          onEventClick={handleEventClick}
          onAddEvent={handleAddEvent}
        />
      )}

      {viewMode === 'month' && (
        <AgendaMonthCalendar
          events={filteredEvents}
          initialDate={initialFocusDate || undefined}
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
