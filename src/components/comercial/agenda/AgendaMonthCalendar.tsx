import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  addMinutes
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AgendaEvent } from '@/hooks/useAgendaData';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventCardTooltip } from './EventCardTooltip';

interface AgendaMonthCalendarProps {
  events: AgendaEvent[];
  onEventClick: (event: AgendaEvent) => void;
  onAddEvent: (date: Date, time?: string) => void;
  onDayClick?: (date: Date) => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function AgendaMonthCalendar({ events, onEventClick, onAddEvent, onDayClick }: AgendaMonthCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Get all days to display (including days from prev/next months to fill the grid)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    events.forEach(event => {
      const key = event.event_date;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    });
    // Sort events by time within each day
    map.forEach((dayEvents) => {
      dayEvents.sort((a, b) => a.event_time.localeCompare(b.event_time));
    });
    return map;
  }, [events]);

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    onDayClick?.(day);
  };

  // Get events for selected day
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return eventsByDay.get(key) || [];
  }, [selectedDay, eventsByDay]);

  return (
    <div className="bg-card rounded-xl border shadow-sm flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold capitalize">
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        <Button onClick={() => onAddEvent(selectedDay || new Date())}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div 
                key={day} 
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 flex-1">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isDayToday = isToday(day);
              const eventCount = dayEvents.length;

              return (
                <div
                  key={dateKey}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "min-h-[80px] p-1 rounded-lg cursor-pointer transition-all border",
                    isCurrentMonth 
                      ? "bg-background hover:bg-muted/50" 
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
                    isSelected && "ring-2 ring-primary",
                    "flex flex-col"
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between px-1">
                    <span
                      className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                        isDayToday && "bg-primary text-primary-foreground",
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {eventCount > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="h-5 px-1.5 text-xs"
                      >
                        {eventCount}
                      </Badge>
                    )}
                  </div>

                  {/* Event previews (show first 2-3) */}
                  <div className="flex-1 mt-1 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => (
                      <EventCardTooltip key={event.id} event={event}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                          className="text-[10px] px-1.5 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: event.color || '#3b82f6' }}
                        >
                          {event.event_time.slice(0, 5)} {event.title}
                        </div>
                      </EventCardTooltip>
                    ))}
                    {eventCount > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1.5">
                        +{eventCount - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel - Selected day details */}
        <div className="w-72 border-l bg-muted/20 flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">
              {selectedDay 
                ? format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })
                : 'Selecione um dia'
              }
            </h3>
            {selectedDay && (
              <p className="text-sm text-muted-foreground">
                {selectedDayEvents.length} evento{selectedDayEvents.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {selectedDay && selectedDayEvents.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhum evento neste dia
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onAddEvent(selectedDay)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              )}

              {selectedDayEvents.map((event) => {
                const endTime = format(
                  addMinutes(parseISO(`2000-01-01T${event.event_time}`), event.duration_minutes || 60),
                  'HH:mm'
                );

                return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="p-3 rounded-lg border bg-card cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: event.color || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.event_time.slice(0, 5)} – {endTime}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {event.client_name}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {selectedDay && (
            <div className="p-4 border-t">
              <Button 
                className="w-full" 
                size="sm"
                onClick={() => onAddEvent(selectedDay)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}