import { useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export interface MonthOption {
  value: string;
  label: string;
  startDate: Date;
  endDate: Date;
}

interface MonthPeriodFilterProps {
  value: string;
  onChange: (value: string) => void;
  monthsToShow?: number;
}

export function useMonthFilter(monthsToShow: number = 12) {
  const monthOptions = useMemo(() => {
    const options: MonthOption[] = [];
    const now = new Date();
    
    for (let i = 0; i < monthsToShow; i++) {
      const date = subMonths(now, i);
      const year = date.getFullYear();
      const month = date.getMonth();
      // Use local time to match database dates that are parsed in local timezone
      const startDate = new Date(year, month, 1, 0, 0, 0, 0);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy', { locale: ptBR });
      
      options.push({
        value,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        startDate,
        endDate,
      });
    }
    
    // Add "all time" option
    options.push({
      value: 'all',
      label: 'Todo o período',
      startDate: new Date(2020, 0, 1, 0, 0, 0, 0),
      endDate: new Date(2030, 11, 31, 23, 59, 59, 999),
    });
    
    return options;
  }, [monthsToShow]);

  const filterByMonth = (date: Date | undefined, selectedMonth: string): boolean => {
    if (selectedMonth === 'all') return true;
    if (!date) return false;
    
    const option = monthOptions.find(o => o.value === selectedMonth);
    if (!option) return true;
    
    // Parse the date and compare in local timezone
    const dateToCheck = date instanceof Date ? date : new Date(date);
    return dateToCheck >= option.startDate && dateToCheck <= option.endDate;
  };

  return { monthOptions, filterByMonth };
}

export function MonthPeriodFilter({ value, onChange, monthsToShow = 12 }: MonthPeriodFilterProps) {
  const { monthOptions } = useMonthFilter(monthsToShow);

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {monthOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
