import { useState } from 'react';
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
import { Plus, Pencil, Trash2, Save, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManageCriativosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageCriativosDialog({ open, onOpenChange }: ManageCriativosDialogProps) {
  const { criativos, addCriativo, updateCriativo, deleteCriativo, pipelineClients } = useCommercial();
  const { canEdit } = useAuth();
  
  const [newCriativo, setNewCriativo] = useState('');
  const [editingCriativo, setEditingCriativo] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Count usage of each criativo
  const getCriativoUsage = (criativo: string) => {
    return pipelineClients.filter(c => c.criativo === criativo).length;
  };

  const handleAdd = () => {
    if (!newCriativo.trim()) {
      toast.error('Digite o nome do criativo');
      return;
    }
    if (criativos.includes(newCriativo.toUpperCase())) {
      toast.error('Criativo já existe');
      return;
    }
    addCriativo(newCriativo);
    setNewCriativo('');
    toast.success('Criativo adicionado!');
  };

  const handleStartEdit = (criativo: string) => {
    setEditingCriativo(criativo);
    setEditValue(criativo);
  };

  const handleSaveEdit = () => {
    if (!editValue.trim()) {
      toast.error('Nome não pode ser vazio');
      return;
    }
    if (editingCriativo && editingCriativo !== editValue.toUpperCase()) {
      if (criativos.includes(editValue.toUpperCase())) {
        toast.error('Criativo já existe');
        return;
      }
      updateCriativo(editingCriativo, editValue);
      toast.success('Criativo atualizado!');
    }
    setEditingCriativo(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCriativo(null);
    setEditValue('');
  };

  const handleDelete = (criativo: string) => {
    const usage = getCriativoUsage(criativo);
    if (usage > 0) {
      toast.error(`Não é possível excluir: ${usage} lead(s) usam este criativo`);
      return;
    }
    deleteCriativo(criativo);
    toast.success('Criativo removido!');
  };

  if (!canEdit) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerenciar Criativos
          </DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova criativos disponíveis no pipeline.
          </DialogDescription>
        </DialogHeader>

        {/* Add new criativo */}
        <div className="flex gap-2">
          <Input
            placeholder="Novo criativo..."
            value={newCriativo}
            onChange={(e) => setNewCriativo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* List of criativos */}
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {criativos.map((criativo) => {
              const usage = getCriativoUsage(criativo);
              const isEditing = editingCriativo === criativo;

              return (
                <div
                  key={criativo}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-surface-1",
                    isEditing && "ring-2 ring-primary/50"
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
                      <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                        <Save className="h-4 w-4 text-success" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{criativo}</span>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                        {usage} uso{usage !== 1 ? 's' : ''}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStartEdit(criativo)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(criativo)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={usage > 0}
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
