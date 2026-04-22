import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';

export type SalesColumnKey = 
  | 'clientName' 
  | 'vendedor' 
  | 'equipe' 
  | 'pacote' 
  | 'periodo' 
  | 'entrada' 
  | 'lastStageChange' 
  | 'stage'
  | 'telefone'
  | 'clinicName'
  | 'criativo'
  | 'pagadorAnuncio';

export const SALES_COLUMN_LABELS: Record<SalesColumnKey, string> = {
  clientName: 'Cliente',
  clinicName: 'Clínica',
  telefone: 'Telefone',
  vendedor: 'Vendedor',
  equipe: 'Equipe',
  pacote: 'Pacote',
  periodo: 'Período',
  entrada: 'Entrada',
  lastStageChange: 'Data',
  stage: 'Status',
  criativo: 'Criativo',
  pagadorAnuncio: 'Pagador Anúncio',
};

export const DEFAULT_VISIBLE_COLUMNS: SalesColumnKey[] = [
  'clientName',
  'vendedor',
  'equipe',
  'pacote',
  'periodo',
  'entrada',
  'lastStageChange',
  'stage',
];

interface SalesColumnVisibilityProps {
  visibleColumns: SalesColumnKey[];
  onVisibilityChange: (columns: SalesColumnKey[]) => void;
}

export function SalesColumnVisibility({ 
  visibleColumns, 
  onVisibilityChange 
}: SalesColumnVisibilityProps) {
  const allColumns: SalesColumnKey[] = Object.keys(SALES_COLUMN_LABELS) as SalesColumnKey[];

  const toggleColumn = (column: SalesColumnKey) => {
    if (visibleColumns.includes(column)) {
      // Don't allow hiding all columns
      if (visibleColumns.length > 1) {
        onVisibilityChange(visibleColumns.filter(c => c !== column));
      }
    } else {
      onVisibilityChange([...visibleColumns, column]);
    }
  };

  const resetToDefault = () => {
    onVisibilityChange(DEFAULT_VISIBLE_COLUMNS);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-10">
          <Settings2 className="h-4 w-4" />
          Colunas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover">
        <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column}
            checked={visibleColumns.includes(column)}
            onCheckedChange={() => toggleColumn(column)}
          >
            {SALES_COLUMN_LABELS[column]}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={resetToDefault}
          >
            Restaurar padrão
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
