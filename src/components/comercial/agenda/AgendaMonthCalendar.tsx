import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  addMinutes,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
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

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    events.forEach((event) => {
      const key = event.event_date;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    });
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

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return eventsByDay.get(key) || [];
  }, [selectedDay, eventsByDay]);

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-white/60">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/70 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              onClick={goToPreviousMonth}
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
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-extrabold capitalize tracking-tight text-slate-950">
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        <Button
          onClick={() => onAddEvent(selectedDay || new Date())}
          className="rounded-xl bg-red-600 px-4 py-2.5 font-semibold shadow-[0_8px_24px_rgba(220,38,38,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-[0_12px_28px_rgba(220,38,38,0.28)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 grid grid-cols-7 gap-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2 text-center text-sm font-semibold tracking-wide text-slate-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7 gap-2">
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
                    'group min-h-[92px] cursor-pointer rounded-[18px] border border-slate-200/70 bg-white p-2.5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(15,23,42,0.08)]',
                    isCurrentMonth ? 'text-slate-950' : 'bg-slate-50/70 text-slate-400',
                    isSelected && 'ring-2 ring-red-500/40'
                  )}
                >
                  <div className="flex items-center justify-between px-1">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200',
                        isDayToday
                          ? 'bg-red-600 text-white shadow-[0_8px_18px_rgba(220,38,38,0.22)]'
                          : 'bg-slate-100 text-slate-900 group-hover:bg-slate-200'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {eventCount > 0 && (
                      <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px] font-semibold">
                        {eventCount}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => (
                      <EventCardTooltip key={event.id} event={event}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                          className="truncate rounded-lg px-2 py-1 text-[10px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                          style={{ backgroundColor: event.color || '#3b82f6' }}
                        >
                          {event.event_time.slice(0, 5)} {event.title}
                        </div>
                      </EventCardTooltip>
                    ))}
                    {eventCount > 3 && (
                      <div className="px-2 text-[10px] font-medium text-slate-500">+{eventCount - 3} mais</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex w-80 flex-col border-l border-slate-200/70 bg-slate-50/70">
          <div className="border-b border-slate-200/70 p-5">
            <h3 className="text-base font-bold text-slate-950">
              {selectedDay ? format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
            </h3>
            {selectedDay && (
              <p className="mt-1 text-sm text-slate-500">
                {selectedDayEvents.length} evento{selectedDayEvents.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-3 p-5">
              {selectedDay && selectedDayEvents.length === 0 && (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-5 text-center shadow-sm">
                  <p className="mb-3 text-sm text-slate-500">Nenhum evento neste dia</p>
                  <Button size="sm" variant="outline" onClick={() => onAddEvent(selectedDay)}>
                    <Plus className="mr-1 h-4 w-4" />
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
                    className="cursor-pointer rounded-[16px] border border-slate-200/70 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-1 h-3 w-3 flex-shrink-0 rounded-full shadow-sm"
                        style={{ backgroundColor: event.color || '#3b82f6' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">{event.title}</p>
                        <p className="text-xs text-slate-500">
                          {event.event_time.slice(0, 5)} – {endTime}
                        </p>
                        <p className="truncate text-xs text-slate-500">{event.client_name}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {selectedDay && (
            <div className="border-t border-slate-200/70 p-5">
              <Button className="w-full rounded-xl bg-red-600 font-semibold shadow-[0_8px_24px_rgba(220,38,38,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-[0_12px_28px_rgba(220,38,38,0.28)]" size="sm" onClick={() => onAddEvent(selectedDay)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Evento
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
