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
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AgendaEvent } from '@/hooks/useAgendaData';
import { EventCardTooltip } from './EventCardTooltip';

interface AgendaDayTimelineProps {
  events: AgendaEvent[];
  onEventClick: (event: AgendaEvent) => void;
  onAddEvent: (date: Date, time?: string) => void;
}

const HOUR_HEIGHT = 60; // pixels per hour
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

export function AgendaDayTimeline({ events, onEventClick, onAddEvent }: AgendaDayTimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const dayEvents = useMemo(() => {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    return events.filter((e) => e.event_date === dateKey);
  }, [events, currentDate]);

  // Calculate overlapping groups and positions
  const positionedEvents = useMemo(() => {
    if (dayEvents.length === 0) return [];

    // Sort events by start time
    const sorted = [...dayEvents].sort((a, b) => {
      return a.event_time.localeCompare(b.event_time);
    });

    // Find overlapping groups
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
        // Overlaps with current group
        currentGroup.push(event);
        if (eventEnd > currentGroupEnd) {
          currentGroupEnd = eventEnd;
        }
      } else {
        // New group
        groups.push(currentGroup);
        currentGroup = [event];
        currentGroupEnd = eventEnd;
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    // Assign columns within each group
    const result: PositionedEvent[] = [];

    groups.forEach((group) => {
      const columns: AgendaEvent[][] = [];

      group.forEach((event) => {
        const eventStart = event.event_time;
        
        // Find first available column
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

      // Create positioned events
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
  }, [dayEvents]);

  const weekDay = format(currentDate, 'EEE', { locale: ptBR }).toUpperCase();
  const dayNumber = format(currentDate, 'd');

  // Get current time position for the red line
  const now = new Date();
  const showCurrentTimeLine = isSameDay(currentDate, now);
  const currentTimeTop = useMemo(() => {
    if (!showCurrentTimeLine) return 0;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < START_HOUR || hours >= END_HOUR) return -1;
    return ((hours - START_HOUR) * 60 + minutes) / 60 * HOUR_HEIGHT;
  }, [showCurrentTimeLine, now]);

  return (
    <div className="bg-card rounded-xl border shadow-sm flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold">
            {format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        <Button onClick={() => onAddEvent(currentDate)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-[600px]">
          {/* Day header column */}
          <div className="w-20 flex-shrink-0 border-r">
            <div className="h-16 flex flex-col items-center justify-center border-b">
              <span className="text-xs font-medium text-primary">
                {weekDay}
              </span>
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
                  isToday(currentDate) 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground"
                )}
              >
                {dayNumber}
              </div>
            </div>
            {/* Time labels */}
            <div className="relative">
              {TIME_SLOTS.map((hour) => (
                <div 
                  key={hour} 
                  className="h-[60px] flex items-start justify-end pr-2 text-xs text-muted-foreground"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Events area */}
          <div className="flex-1 relative">
            {/* Header space */}
            <div className="h-16 border-b bg-muted/20" />
            
            {/* Time grid */}
            <div 
              className="relative cursor-pointer" 
              style={{ height: TIME_SLOTS.length * HOUR_HEIGHT }}
              onClick={(e) => {
                // Get click position relative to the grid
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                
                // Calculate the hour from the click position
                const totalMinutes = (y / HOUR_HEIGHT) * 60;
                const hours = Math.floor(totalMinutes / 60) + START_HOUR;
                const minutes = Math.floor(totalMinutes % 60 / 15) * 15; // Round to nearest 15 min
                
                if (hours >= START_HOUR && hours < END_HOUR) {
                  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                  onAddEvent(currentDate, timeStr);
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
              {showCurrentTimeLine && currentTimeTop >= 0 && (
                <div 
                  className="absolute w-full flex items-center z-20 pointer-events-none"
                  style={{ top: currentTimeTop }}
                >
                  <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </div>
              )}

              {/* Events */}
              {positionedEvents.map(({ event, column, totalColumns, top, height }) => {
                const width = `calc((100% - 8px) / ${totalColumns})`;
                const left = `calc(4px + (100% - 8px) / ${totalColumns} * ${column})`;
                
                const endTime = format(
                  addMinutes(parseISO(`2000-01-01T${event.event_time}`), event.duration_minutes || 60),
                  'HH:mm'
                );

                return (
                  <EventCardTooltip key={event.id} event={event}>
                    <div
                      className="absolute rounded-md cursor-pointer hover:opacity-90 transition-all shadow-sm overflow-hidden"
                      style={{
                        top: top,
                        height: Math.max(height, 24),
                        width: width,
                        left: left,
                        backgroundColor: event.color || '#3b82f6',
                        borderLeft: `4px solid ${event.color || '#3b82f6'}`,
                      }}
                      onClick={(e) => {
                        // Prevent bubbling to the grid click handler (which opens "Novo Evento")
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <div className="p-2 h-full flex flex-col text-white">
                        <p className="font-semibold text-sm leading-tight truncate">
                          {event.title}
                        </p>
                        <p className="text-xs opacity-90">
                          {event.event_time.slice(0, 5)} – {endTime}
                        </p>
                      </div>
                    </div>
                  </EventCardTooltip>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
