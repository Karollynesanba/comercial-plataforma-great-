import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  VENDEDOR_OPTIONS,
  EQUIPE_OPTIONS,
  PACOTE_OPTIONS,
  PERIODO_OPTIONS,
  PAGADOR_ANUNCIO_OPTIONS,
  Vendedor,
  Equipe,
  Pacote,
  Periodo,
  PagadorAnuncio,
} from '@/contexts/CommercialContext';

type CellType = 'text' | 'number' | 'select' | 'readonly';

interface SelectOption {
  value: string;
  label: string;
}

interface SalesEditableCellProps {
  value: string | number;
  type: CellType;
  field: string;
  onSave: (field: string, value: string | number) => void;
  options?: SelectOption[];
  className?: string;
  badgeClassName?: string;
  formatDisplay?: (value: string | number) => string;
}

export function SalesEditableCell({
  value,
  type,
  field,
  onSave,
  options = [],
  className,
  badgeClassName,
  formatDisplay,
}: SalesEditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    const newValue = type === 'number' ? Number(editValue) || 0 : editValue;
    if (newValue !== value) {
      onSave(field, newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(String(value));
      setIsEditing(false);
    }
  };

  if (type === 'readonly') {
    const displayValue = formatDisplay ? formatDisplay(value) : String(value);
    return (
      <span className={className}>
        {badgeClassName ? (
          <Badge variant="outline" className={cn("text-xs", badgeClassName)}>
            {displayValue}
          </Badge>
        ) : (
          displayValue
        )}
      </span>
    );
  }

  if (type === 'select') {
    return (
      <Select
        value={String(value)}
        onValueChange={(newValue) => onSave(field, newValue)}
      >
        <SelectTrigger className="h-8 w-full min-w-[100px] text-xs border-transparent hover:border-border bg-transparent">
          <SelectValue>
            {badgeClassName ? (
              <Badge variant="outline" className={cn("text-xs", badgeClassName)}>
                {options.find(o => o.value === value)?.label || value}
              </Badge>
            ) : (
              options.find(o => o.value === value)?.label || value
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn("h-8 text-xs", className)}
      />
    );
  }

  const displayValue = formatDisplay ? formatDisplay(value) : String(value);

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-muted/50 px-2 py-1 rounded min-h-[32px] flex items-center",
        className
      )}
    >
      {displayValue || <span className="text-muted-foreground italic">-</span>}
    </div>
  );
}

// Helper functions to get options and colors
export function getOptionsForField(field: string): SelectOption[] {
  switch (field) {
    case 'vendedor':
      return VENDEDOR_OPTIONS;
    case 'equipe':
      return EQUIPE_OPTIONS;
    case 'pacote':
      return PACOTE_OPTIONS;
    case 'periodo':
      return PERIODO_OPTIONS;
    case 'pagadorAnuncio':
      return PAGADOR_ANUNCIO_OPTIONS;
    default:
      return [];
  }
}

export const VENDEDOR_COLORS: Record<Vendedor, string> = {
  'HERBERT': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'CLED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'PEDRO_H': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'PEDRO_JUAN': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'CAETANO': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export const EQUIPE_COLORS: Record<Equipe, string> = {
  'LIRA': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'KAUAN': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

export const PERIODO_COLORS: Record<Periodo, string> = {
  'MENSAL': 'bg-green-500/20 text-green-400 border-green-500/30',
  'TRIMESTRAL': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'SEMESTRAL': 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  'TAXA_INTERESSE': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

export const PACOTE_COLORS: Record<Pacote, string> = {
  'COMPLETO': 'bg-red-500/20 text-red-400 border-red-500/30',
  'TRAFEGO_E_CRIATIVOS': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'ATENDIMENTO': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'TRAFEGO': 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  'COMPLETO_NOVA_ERA': 'bg-green-500/20 text-green-400 border-green-500/30',
  'TRAFEGO_ARTES_IA': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'TRAFEGO_CONSULTORIA': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'IA': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'TRAFEGO_ROTEIRO': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'TRAFEGO_IA': 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
};

export const PAGADOR_COLORS: Record<PagadorAnuncio, string> = {
  'CLIENTE': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'GREAT': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};
