import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCommercial } from '@/contexts/CommercialContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Save, X, Orbit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManageFunisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageFunisDialog({ open, onOpenChange }: ManageFunisDialogProps) {
  const { funis, addFunil, updateFunil, deleteFunil, pipelineClients } = useCommercial();
  const { isAuthenticated } = useAuth();
  const canManageFunis = isAuthenticated;

  const [newFunil, setNewFunil] = useState('');
  const [editingFunil, setEditingFunil] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const funilUsage = useMemo(() => {
    const usage = new Map<string, number>();

    pipelineClients.forEach((client) => {
      const key = client.funil?.trim().toUpperCase();
      if (!key) return;
      usage.set(key, (usage.get(key) || 0) + 1);
    });

    return usage;
  }, [pipelineClients]);

  const getFunilUsage = (funil: string) => funilUsage.get(funil) || 0;

  const handleAdd = () => {
    if (!newFunil.trim()) {
      toast.error('Digite o nome do funil');
      return;
    }
    if (funis.includes(newFunil.toUpperCase())) {
      toast.error('Funil já existe');
      return;
    }
    addFunil(newFunil);
    setNewFunil('');
    toast.success('Funil adicionado!');
  };

  const handleStartEdit = (funil: string) => {
    if (!canManageFunis) return;
    setEditingFunil(funil);
    setEditValue(funil);
  };

  const handleSaveEdit = () => {
    if (!editValue.trim()) {
      toast.error('Nome não pode ser vazio');
      return;
    }
    if (editingFunil && editingFunil !== editValue.toUpperCase()) {
      if (funis.includes(editValue.toUpperCase())) {
        toast.error('Funil já existe');
        return;
      }
      updateFunil(editingFunil, editValue);
      toast.success('Funil atualizado!');
    }
    setEditingFunil(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingFunil(null);
    setEditValue('');
  };

  const handleDelete = (funil: string) => {
    const usage = getFunilUsage(funil);
    if (usage > 0) {
      toast.error(`Não é possível excluir: ${usage} lead(s) usam este funil`);
      return;
    }
    deleteFunil(funil);
    toast.success('Funil removido!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Orbit className="h-5 w-5 text-primary" />
            Gerenciar Funis
          </DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova funis disponíveis no pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Novo funil..."
            value={newFunil}
            onChange={(e) => setNewFunil(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            disabled={!canManageFunis}
          />
          <Button onClick={handleAdd} size="icon" disabled={!canManageFunis}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {funis.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                Nenhum funil cadastrado ainda. Use o campo acima para adicionar o primeiro.
              </div>
            ) : funis.map((funil) => {
              const usage = getFunilUsage(funil);
              const isEditing = editingFunil === funil;

              return (
                <div
                  key={funil}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border border-border/50 bg-surface-1 p-2',
                    isEditing && 'ring-2 ring-primary/50',
                  )}
                >
                  {isEditing ? (
                    <>
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={handleSaveEdit} disabled={!canManageFunis}>
                        <Save className="h-4 w-4 text-success" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{funil}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {usage} uso{usage !== 1 ? 's' : ''}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStartEdit(funil)}
                        className="h-8 w-8"
                        disabled={!canManageFunis}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(funil)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={usage > 0 || !canManageFunis}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
