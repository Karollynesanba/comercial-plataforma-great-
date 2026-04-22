import { useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseCalendarDate } from '@/lib/preVendaAnalytics';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type RaioXFilterMode = 'all' | 'month' | 'week' | 'day';

export interface RaioXFilterState {
  mode: RaioXFilterMode;
  date: Date;
}

interface RaioXFiltersProps {
  value: RaioXFilterState;
  onChange: (value: RaioXFilterState) => void;
}

export function getDefaultRaioXFilter(): RaioXFilterState {
  return { mode: 'month', date: new Date() };
}

export function filterClientByRaioX(
  clientDate: string | null | undefined,
  filter: RaioXFilterState
): boolean {
  if (filter.mode === 'all') return true;
  if (!clientDate) return false;

  const d = parseCalendarDate(clientDate);
  if (!d) return false;
  const ref = new Date(filter.date.getFullYear(), filter.date.getMonth(), filter.date.getDate());

  switch (filter.mode) {
    case 'month': {
      return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
    }
    case 'week': {
      const ws = startOfWeek(ref, { weekStartsOn: 1 });
      ws.setHours(0, 0, 0, 0);
      const we = endOfWeek(ref, { weekStartsOn: 1 });
      we.setHours(23, 59, 59, 999);
      return d >= ws && d <= we;
    }
    case 'day': {
      return d.getTime() === ref.getTime();
    }
    default:
      return true;
  }
}

export function RaioXFilters({ value, onChange }: RaioXFiltersProps) {
  const [calOpen, setCalOpen] = useState(false);

  const handleModeChange = (mode: string) => {
    onChange({ ...value, mode: mode as RaioXFilterMode });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange({ ...value, date });
      setCalOpen(false);
    }
  };

  const navigateMonth = (delta: number) => {
    const newDate = new Date(value.date);
    newDate.setMonth(newDate.getMonth() + delta);
    onChange({ ...value, date: newDate });
  };

  const navigateWeek = (delta: number) => {
    const newDate = new Date(value.date);
    newDate.setDate(newDate.getDate() + delta * 7);
    onChange({ ...value, date: newDate });
  };

  const navigateDay = (delta: number) => {
    const newDate = new Date(value.date);
    newDate.setDate(newDate.getDate() + delta);
    onChange({ ...value, date: newDate });
  };

  const getLabel = () => {
    const d = value.date;
    switch (value.mode) {
      case 'all':
        return 'Todo o período';
      case 'month':
        return format(d, "MMMM 'de' yyyy", { locale: ptBR }).replace(/^./, c => c.toUpperCase());
      case 'week': {
        const ws = startOfWeek(d, { weekStartsOn: 1 });
        const we = endOfWeek(d, { weekStartsOn: 1 });
        return `${format(ws, 'dd/MM')} — ${format(we, 'dd/MM/yyyy')}`;
      }
      case 'day':
        return format(d, "dd 'de' MMMM, yyyy", { locale: ptBR });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={value.mode} onValueChange={handleModeChange}>
        <SelectTrigger className="w-[130px] bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">Tudo</SelectItem>
          <SelectItem value="month">Mês</SelectItem>
          <SelectItem value="week">Semana</SelectItem>
          <SelectItem value="day">Dia</SelectItem>
        </SelectContent>
      </Select>

      {value.mode !== 'all' && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              value.mode === 'month' ? navigateMonth(-1) :
              value.mode === 'week' ? navigateWeek(-1) :
              navigateDay(-1)
            }
          >
            ‹
          </Button>

          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[180px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {getLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.date}
                onSelect={handleDateSelect}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              value.mode === 'month' ? navigateMonth(1) :
              value.mode === 'week' ? navigateWeek(1) :
              navigateDay(1)
            }
          >
            ›
          </Button>
        </div>
      )}
    </div>
  );
}
