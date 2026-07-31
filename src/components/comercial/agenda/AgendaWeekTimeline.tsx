import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  addDays,
  addMinutes,
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AgendaEvent } from '@/hooks/useAgendaData';
import { AGENDADOR_OPTIONS } from '@/contexts/CommercialContext';
import { EventCardTooltip } from './EventCardTooltip';

interface AgendaWeekTimelineProps {
  events: AgendaEvent[];
  initialDate?: Date;
  onEventClick: (event: AgendaEvent) => void;
  onAddEvent: (date: Date, time?: string) => void;
}

const HOUR_HEIGHT = 50;
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

const formatLocalDate = (value: string) => String(value || '').trim().slice(0, 10);

export function AgendaWeekTimeline({ events, initialDate, onEventClick, onAddEvent }: AgendaWeekTimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const hasAppliedInitialDate = useRef(false);

  useEffect(() => {
    if (!initialDate || hasAppliedInitialDate.current) return;
    setCurrentDate(initialDate);
    hasAppliedInitialDate.current = true;
  }, [initialDate]);

  const getScheduledByLabel = (event: AgendaEvent) =>
    event.scheduled_by
      ? AGENDADOR_OPTIONS.find((option) => option.value === event.scheduled_by)?.label || event.scheduled_by
      : null;

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    weekDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      map.set(dateKey, events.filter((e) => formatLocalDate(e.event_date) === dateKey));
    });
    return map;
  }, [events, weekDays]);

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

    if (currentGroup.length > 0) groups.push(currentGroup);

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

  const currentTimeTop = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < START_HOUR || hours >= END_HOUR) return -1;
    return (((hours - START_HOUR) * 60 + minutes) / 60) * HOUR_HEIGHT;
  }, []);

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-white/60">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/70 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              onClick={goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-slate-200 bg-white px-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              onClick={goToToday}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              onClick={goToNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-950">
            {format(weekStart, "d 'de' MMM", { locale: ptBR })} – {format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        <Button
          onClick={() => onAddEvent(new Date())}
          className="rounded-xl bg-red-600 px-4 py-2.5 font-semibold shadow-[0_8px_24px_rgba(220,38,38,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-[0_12px_28px_rgba(220,38,38,0.28)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex min-w-[900px]">
          <div className="w-20 flex-shrink-0 border-r border-slate-200/70 bg-white">
            <div className="h-16 border-b border-slate-200/70 bg-slate-50/80" />
            <div className="relative">
              {TIME_SLOTS.map((hour) => (
                <div
                  key={hour}
                  className="flex items-start justify-end pr-3 text-xs font-medium text-slate-400"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(dateKey) || [];
            const positionedEvents = getPositionedEvents(dayEvents);
            const isCurrentDay = isToday(day);

            return (
              <div key={dateKey} className="min-w-[120px] flex-1 border-r border-slate-200/70 last:border-r-0">
                <div className="flex h-16 flex-col items-center justify-center border-b border-slate-200/70 bg-slate-50/80">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase tracking-[0.18em]',
                      isCurrentDay ? 'text-primary' : 'text-slate-500'
                    )}
                  >
                    {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                  </span>
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all duration-200',
                      isCurrentDay
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white text-slate-950 ring-1 ring-slate-200'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>

                <div
                  className="relative cursor-pointer"
                  style={{ height: TIME_SLOTS.length * HOUR_HEIGHT }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const totalMinutes = (y / HOUR_HEIGHT) * 60;
                    const hours = Math.floor(totalMinutes / 60) + START_HOUR;
                    const minutes = Math.floor((totalMinutes % 60) / 15) * 15;

                    if (hours >= START_HOUR && hours < END_HOUR) {
                      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                      onAddEvent(day, timeStr);
                    }
                  }}
                >
                  {TIME_SLOTS.map((hour) => (
                    <div
                      key={hour}
                      className="pointer-events-none absolute w-full border-b border-slate-200/60"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}

                  {isCurrentDay && currentTimeTop >= 0 && (
                    <div
                      className="pointer-events-none absolute z-20 flex w-full items-center"
                      style={{ top: currentTimeTop }}
                    >
                      <div className="h-2.5 w-2.5 -ml-1 rounded-full bg-red-500" />
                      <div className="h-0.5 flex-1 bg-red-500" />
                    </div>
                  )}

                  {positionedEvents.map(({ event, column, totalColumns, top, height }) => {
                    const width = `calc((100% - 8px) / ${totalColumns})`;
                    const left = `calc(4px + (100% - 8px) / ${totalColumns} * ${column})`;
                    const scheduledByLabel = getScheduledByLabel(event);

                    return (
                      <EventCardTooltip key={event.id} event={event}>
                        <div
                          className="absolute cursor-pointer overflow-hidden rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.12)] hover:brightness-105"
                          style={{
                            top,
                            height: Math.max(height, 20),
                            width,
                            left,
                            backgroundColor: event.color || '#3b82f6',
                            borderLeft: `4px solid ${event.color || '#3b82f6'}`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          <div className="flex h-full flex-col px-2.5 py-2 text-white">
                            <p className="truncate text-xs font-semibold leading-tight drop-shadow-sm">
                              {event.title}
                            </p>
                            {height >= 30 && (
                              <p className="text-[10px] font-medium opacity-90">
                                {event.event_time.slice(0, 5)}
                              </p>
                            )}
                            {height >= 36 && scheduledByLabel && (
                              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
                                {scheduledByLabel}
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
