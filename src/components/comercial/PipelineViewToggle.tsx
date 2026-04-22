import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LayoutGrid, Table, BarChart3, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PipelineView = 'kanban' | 'table' | 'analytics' | 'sales';

interface PipelineViewToggleProps {
  view: PipelineView;
  onViewChange: (view: PipelineView) => void;
  showAnalytics?: boolean;
}

export function PipelineViewToggle({ view, onViewChange, showAnalytics = false }: PipelineViewToggleProps) {
  return (
    <ToggleGroup 
      type="single" 
      value={view} 
      onValueChange={(value) => value && onViewChange(value as PipelineView)}
      className="bg-surface border border-border rounded-lg p-1"
    >
      <ToggleGroupItem 
        value="kanban" 
        aria-label="Visão Kanban"
        className={cn(
          "gap-2 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
          "transition-all"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Kanban</span>
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="table" 
        aria-label="Planilha Leads"
        className={cn(
          "gap-2 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
          "transition-all"
        )}
      >
        <Table className="h-4 w-4" />
        <span className="hidden sm:inline">Planilha Leads</span>
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="sales" 
        aria-label="Planilha Vendas"
        className={cn(
          "gap-2 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
          "transition-all"
        )}
      >
        <DollarSign className="h-4 w-4" />
        <span className="hidden sm:inline">Planilha Vendas</span>
      </ToggleGroupItem>
      {showAnalytics && (
        <ToggleGroupItem 
          value="analytics" 
          aria-label="Visão Analítica"
          className={cn(
            "gap-2 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
            "transition-all"
          )}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Analítico</span>
        </ToggleGroupItem>
      )}
    </ToggleGroup>
  );
}
