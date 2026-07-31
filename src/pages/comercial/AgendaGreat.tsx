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

const AGENDA_COLOR_FILTER_STORAGE_KEY = 'great_agenda_color_filters';

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

      {events.length === 0 && !hasActiveFilters && (
        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Nenhum evento foi retornado do Supabase agora. Se a base estiver populada e isso continuar, o próximo passo é
          checar conexão, auth ou RLS do banco.
        </div>
      )}

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
