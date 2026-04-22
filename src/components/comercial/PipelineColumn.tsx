import { useDroppable } from '@dnd-kit/core';
import { PipelineClient, PipelineStage, STAGE_LABELS } from '@/contexts/CommercialContext';
import { PipelineCard } from './PipelineCard';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatBRL } from '@/lib/utils';
import { getClientRevenue } from '@/lib/commercialMetrics';
import { Plus, Users } from 'lucide-react';

interface PipelineColumnProps {
  stage: PipelineStage;
  clients: PipelineClient[];
  totalPipelineValue: number;
  onAddClient?: () => void;
  onEditClient?: (client: PipelineClient) => void;
  onDeleteClient?: (client: PipelineClient) => void;
  onNotesClient?: (client: PipelineClient) => void;
  selectedCardIds?: Set<string>;
  onSelectToggle?: (clientId: string) => void;
  onSelectAllInColumn?: (stage: PipelineStage, clientIds: string[]) => void;
  selectionMode?: boolean;
}

const STAGE_COLORS: Record<PipelineStage, string> = {
  'NOVO': 'border-t-blue-500',
  'NO_SHOW': 'border-t-orange-500',
  'TAXA_INTERESSE': 'border-t-yellow-500',
  'NEGOCIACAO': 'border-t-purple-500',
  'PERDIDO': 'border-t-destructive',
  'FECHADO': 'border-t-success',
};

const STAGE_BG_COLORS: Record<PipelineStage, string> = {
  'NOVO': 'bg-blue-500/10',
  'NO_SHOW': 'bg-orange-500/10',
  'TAXA_INTERESSE': 'bg-yellow-500/10',
  'NEGOCIACAO': 'bg-purple-500/10',
  'PERDIDO': 'bg-destructive/10',
  'FECHADO': 'bg-success/10',
};

export function PipelineColumn({ stage, clients, totalPipelineValue, onAddClient, onEditClient, onDeleteClient, onNotesClient, selectedCardIds, onSelectToggle, onSelectAllInColumn, selectionMode }: PipelineColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage,
  });

  const columnClientIds = clients.map(c => c.id);
  const allSelected = clients.length > 0 && columnClientIds.every(id => selectedCardIds?.has(id));
  const someSelected = clients.some(c => selectedCardIds?.has(c.id));

  const totalValue = clients.reduce((sum, c) => sum + getClientRevenue(c), 0);
  const percentageOfPipeline = totalPipelineValue > 0 ? (totalValue / totalPipelineValue) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[300px] w-[300px] bg-surface rounded-xl border border-border transition-colors',
        'border-t-4',
        STAGE_COLORS[stage],
        isOver && 'bg-surface-2 border-primary/50'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => onSelectAllInColumn?.(stage, columnClientIds)}
              className="h-4 w-4"
            />
            <h3 className="font-semibold text-foreground">{STAGE_LABELS[stage]}</h3>
          </div>
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            STAGE_BG_COLORS[stage]
          )}>
            <Users className="h-3 w-3" />
            <span>{clients.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <p className="text-muted-foreground tabular-nums">
            {formatBRL(totalValue)}
          </p>
          <span className="text-muted-foreground/60">•</span>
          <p className="text-muted-foreground tabular-nums">
            {percentageOfPipeline.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
        {clients.map(client => (
          <PipelineCard 
            key={client.id} 
            client={client} 
            onEdit={onEditClient}
            onDelete={onDeleteClient}
            onNotes={onNotesClient}
            selected={selectedCardIds?.has(client.id)}
            onSelectToggle={onSelectToggle}
            selectionMode={selectionMode || someSelected}
          />
        ))}

        {clients.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Arraste clientes para cá
          </div>
        )}
      </div>

      {/* Add button (only for NOVO stage) */}
      {stage === 'NOVO' && onAddClient && (
        <button
          onClick={onAddClient}
          className="m-3 p-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Adicionar Lead</span>
        </button>
      )}
    </div>
  );
}
