import { useMemo, useState } from 'react';
import { endOfWeek, format, isSameDay, isSameMonth, isSameYear, startOfWeek, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export type PeriodFilterValue =
  | 'current_day'
  | 'day'
  | 'current_month'
  | 'all_time'
  | 'current_week'
  | 'last_week'
  | 'custom';

export interface PeriodFilterState {
  value: PeriodFilterValue;
  customStart?: Date;
  customEnd?: Date;
}

interface PeriodFilterProps {
  value: PeriodFilterValue;
  onChange: (value: PeriodFilterValue) => void;
  customStart?: Date;
  customEnd?: Date;
  onCustomChange?: (start: Date | undefined, end: Date | undefined) => void;
  showIcon?: boolean;
  className?: string;
}

export function PeriodFilter({
  value,
  onChange,
  customStart,
  customEnd,
  onCustomChange,
  showIcon = true,
  className,
}: PeriodFilterProps) {
  const todayLabel = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
  const currentMonthLabel = format(new Date(), 'MMMM yyyy', { locale: ptBR });
  const capitalizedMonth = currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1);

  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const currentWeekLabel = useMemo(() => {
    const now = new Date();
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now, { weekStartsOn: 1 });
    return `${format(ws, 'dd/MM')} - ${format(we, 'dd/MM')}`;
  }, []);

  const lastWeekLabel = useMemo(() => {
    const ws = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const we = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    return `${format(ws, 'dd/MM')} - ${format(we, 'dd/MM')}`;
  }, []);

  const handleChange = (nextValue: PeriodFilterValue) => {
    if (nextValue === 'day' && !customStart) {
      onCustomChange?.(new Date(), undefined);
    }
    if (nextValue !== 'custom' && nextValue !== 'day') {
      onCustomChange?.(undefined, undefined);
    }
    onChange(nextValue);
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className || ''}`}>
      {showIcon && <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
      <Select value={value} onValueChange={(nextValue) => handleChange(nextValue as PeriodFilterValue)}>
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="current_day">Hoje ({todayLabel})</SelectItem>
          <SelectItem value="day">Dia específico</SelectItem>
          <SelectItem value="current_month">Mês específico ({capitalizedMonth})</SelectItem>
          <SelectItem value="current_week">Esta semana ({currentWeekLabel})</SelectItem>
          <SelectItem value="last_week">Semana passada ({lastWeekLabel})</SelectItem>
          <SelectItem value="all_time">Todo o período</SelectItem>
          <SelectItem value="custom">Período personalizado</SelectItem>
        </SelectContent>
      </Select>

      {value === 'day' && (
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'min-w-[150px] justify-start text-left font-normal',
                !customStart && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {customStart ? format(customStart, 'dd/MM/yyyy') : 'Escolher dia'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customStart}
              onSelect={(date) => {
                onCustomChange?.(date, undefined);
                setStartOpen(false);
              }}
              initialFocus
              className="p-3 pointer-events-auto"
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      )}

      {value === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'min-w-[120px] justify-start text-left font-normal',
                  !customStart && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {customStart ? format(customStart, 'dd/MM/yyyy') : 'Data início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={(date) => {
                  onCustomChange?.(date, customEnd);
                  setStartOpen(false);
                }}
                initialFocus
                className="p-3 pointer-events-auto"
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground text-sm">até</span>

          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'min-w-[120px] justify-start text-left font-normal',
                  !customEnd && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {customEnd ? format(customEnd, 'dd/MM/yyyy') : 'Data fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={(date) => {
                  onCustomChange?.(customStart, date);
                  setEndOpen(false);
                }}
                disabled={(date) => customStart ? date < customStart : false}
                initialFocus
                className="p-3 pointer-events-auto"
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

export function usePeriodFilter() {
  const filterByPeriod = (
    date: Date | string | undefined | null,
    period: PeriodFilterValue,
    customStart?: Date,
    customEnd?: Date
  ): boolean => {
    if (period === 'all_time') return true;
    if (!date) return false;

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(dateObj.getTime())) return false;

    const now = new Date();

    switch (period) {
      case 'current_day':
        return isSameDay(dateObj, now);
      case 'day':
        return customStart ? isSameDay(dateObj, customStart) : true;
      case 'current_month':
        return isSameMonth(dateObj, now) && isSameYear(dateObj, now);
      case 'current_week': {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        weekEnd.setHours(23, 59, 59, 999);
        return dateObj >= weekStart && dateObj <= weekEnd;
      }
      case 'last_week': {
        const lastWeek = subWeeks(now, 1);
        const weekStart = startOfWeek(lastWeek, { weekStartsOn: 1 });
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = endOfWeek(lastWeek, { weekStartsOn: 1 });
        weekEnd.setHours(23, 59, 59, 999);
        return dateObj >= weekStart && dateObj <= weekEnd;
      }
      case 'custom': {
        if (!customStart && !customEnd) return true;
        const start = customStart ? new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0, 0) : null;
        const end = customEnd ? new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59, 999) : null;
        if (start && dateObj < start) return false;
        if (end && dateObj > end) return false;
        return true;
      }
      default:
        return true;
    }
  };

  return { filterByPeriod };
}
