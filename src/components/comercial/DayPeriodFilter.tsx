import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DayPeriodFilterProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

export function DayPeriodFilter({ value, onChange }: DayPeriodFilterProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[180px] justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd 'de' MMM, yyyy", { locale: ptBR }) : 'Filtrar por dia'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// Hook for filtering by specific day
export function useDayFilter() {
  const filterByDay = (date: Date | undefined, selectedDay: Date | undefined): boolean => {
    if (!selectedDay) return true; // No filter applied
    if (!date) return false; // No date to compare
    
    const dateToCheck = date instanceof Date ? date : new Date(date);
    
    // Compare only year, month, and day
    return (
      dateToCheck.getFullYear() === selectedDay.getFullYear() &&
      dateToCheck.getMonth() === selectedDay.getMonth() &&
      dateToCheck.getDate() === selectedDay.getDate()
    );
  };

  return { filterByDay };
}
