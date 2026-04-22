import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { 
  format, 
  addDays, 
  subDays, 
  parseISO,
  isToday,
  addMinutes,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AgendaEvent } from '@/hooks/useAgendaData';
import { EventCardTooltip } from './EventCardTooltip';

interface AgendaWeekTimelineProps {
  events: AgendaEvent[];
  onEventClick: (event: AgendaEvent) => void;
  onAddEvent: (date: Date, time?: string) => void;
}

const HOUR_HEIGHT = 50; // pixels per hour (smaller for week view)
const START_HOUR = 7;
const END_HOUR = 22;
const TIME_SLOTS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

interface PositionedEvent {
  event: AgendaEvent;
  column: number;
  totalColumns: number;
  top: number;
  height: number;
}

export function AgendaWeekTimeline({ events, onEventClick, onAddEvent }: AgendaWeekTimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get week days (Monday to Sunday)
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      map.set(dateKey, events.filter(e => e.event_date === dateKey));
    });
    return map;
  }, [events, weekDays]);

  // Calculate positions for events in a day
  const getPositionedEvents = (dayEvents: AgendaEvent[]): PositionedEvent[] => {
    if (dayEvents.length === 0) return [];

    const sorted = [...dayEvents].sort((a, b) => a.event_time.localeCompare(b.event_time));

    const groups: AgendaEvent[][] = [];
    let currentGroup: AgendaEvent[] = [];
    let currentGroupEnd = '';

    sorted.forEach((event) => {
      const eventStart = event.event_time;
      const eventEnd = format(
        addMinutes(parseISO(`2000-01-01T${event.event_time}`), event.duration_minutes || 60),
        'HH:mm:ss'
      );

      if (currentGroup.length === 0) {
        currentGroup.push(event);
        currentGroupEnd = eventEnd;
      } else if (eventStart < currentGroupEnd) {
        currentGroup.push(event);
        if (eventEnd > currentGroupEnd) {
          currentGroupEnd = eventEnd;
        }
      } else {
        groups.push(currentGroup);
        currentGroup = [event];
        currentGroupEnd = eventEnd;
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    const result: PositionedEvent[] = [];

    groups.forEach((group) => {
      const columns: AgendaEvent[][] = [];

      group.forEach((event) => {
        const eventStart = event.event_time;
        
        let columnIndex = columns.findIndex((col) => {
          const lastEvent = col[col.length - 1];
          const lastEventEnd = format(
            addMinutes(parseISO(`2000-01-01T${lastEvent.event_time}`), lastEvent.duration_minutes || 60),
            'HH:mm:ss'
          );
          return eventStart >= lastEventEnd;
        });

        if (columnIndex === -1) {
          columnIndex = columns.length;
          columns.push([]);
        }

        columns[columnIndex].push(event);
      });

      columns.forEach((col, colIndex) => {
        col.forEach((event) => {
          const [hours, minutes] = event.event_time.split(':').map(Number);
          const startMinutes = (hours - START_HOUR) * 60 + minutes;
          const duration = event.duration_minutes || 60;

          result.push({
            event,
            column: colIndex,
            totalColumns: columns.length,
            top: (startMinutes / 60) * HOUR_HEIGHT,
            height: (duration / 60) * HOUR_HEIGHT,
          });
        });
      });
    });

    return result;
  };

  const goToPreviousWeek = () => setCurrentDate(subDays(currentDate, 7));
  const goToNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToToday = () => setCurrentDate(new Date());

  // Get current time position for the red line
  const now = new Date();
  const currentTimeTop = useMemo(() => {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < START_HOUR || hours >= END_HOUR) return -1;
    return ((hours - START_HOUR) * 60 + minutes) / 60 * HOUR_HEIGHT;
  }, [now]);

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  return (
    <div className="bg-card rounded-xl border shadow-sm flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold">
            {format(weekStart, "d 'de' MMM", { locale: ptBR })} – {format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        <Button onClick={() => onAddEvent(new Date())}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-[900px]">
          {/* Time labels column */}
          <div className="w-16 flex-shrink-0 border-r">
            <div className="h-16 border-b" />
            <div className="relative">
              {TIME_SLOTS.map((hour) => (
                <div 
                  key={hour} 
                  className="flex items-start justify-end pr-2 text-xs text-muted-foreground"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Days columns */}
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(dateKey) || [];
            const positionedEvents = getPositionedEvents(dayEvents);
            const isCurrentDay = isToday(day);

            return (
              <div key={dateKey} className="flex-1 min-w-[100px] border-r last:border-r-0">
                {/* Day header */}
                <div className="h-16 flex flex-col items-center justify-center border-b bg-muted/20">
                  <span className={cn(
                    "text-xs font-medium",
                    isCurrentDay && "text-primary"
                  )}>
                    {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                  </span>
                  <div 
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5",
                      isCurrentDay 
                        ? "bg-primary text-primary-foreground" 
                        : "text-foreground"
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>

                {/* Events area */}
                <div 
                  className="relative cursor-pointer"
                  style={{ height: TIME_SLOTS.length * HOUR_HEIGHT }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const totalMinutes = (y / HOUR_HEIGHT) * 60;
                    const hours = Math.floor(totalMinutes / 60) + START_HOUR;
                    const minutes = Math.floor(totalMinutes % 60 / 15) * 15;
                    
                    if (hours >= START_HOUR && hours < END_HOUR) {
                      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                      onAddEvent(day, timeStr);
                    }
                  }}
                >
                  {/* Hour lines */}
                  {TIME_SLOTS.map((hour) => (
                    <div 
                      key={hour}
                      className="absolute w-full border-b border-border/50 pointer-events-none"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Current time line */}
                  {isCurrentDay && currentTimeTop >= 0 && (
                    <div 
                      className="absolute w-full flex items-center z-20 pointer-events-none"
                      style={{ top: currentTimeTop }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  )}

                  {/* Events */}
                  {positionedEvents.map(({ event, column, totalColumns, top, height }) => {
                    const width = `calc((100% - 4px) / ${totalColumns})`;
                    const left = `calc(2px + (100% - 4px) / ${totalColumns} * ${column})`;
                    
                    return (
                      <EventCardTooltip key={event.id} event={event}>
                        <div
                          className="absolute rounded cursor-pointer hover:opacity-90 transition-all shadow-sm overflow-hidden"
                          style={{
                            top: top,
                            height: Math.max(height, 20),
                            width: width,
                            left: left,
                            backgroundColor: event.color || '#3b82f6',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          <div className="p-1 h-full flex flex-col text-white">
                            <p className="font-medium text-xs leading-tight truncate">
                              {event.title}
                            </p>
                            {height >= 30 && (
                              <p className="text-[10px] opacity-90">
                                {event.event_time.slice(0, 5)}
                              </p>
                            )}
                          </div>
                        </div>
                      </EventCardTooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}