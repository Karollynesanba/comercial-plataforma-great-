import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCommercial, Agendador, AGENDADOR_OPTIONS } from '@/contexts/CommercialContext';
import { Target } from 'lucide-react';
import { toast } from 'sonner';

interface EditSDRGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendador: Agendador;
  month: string;
}

export function EditSDRGoalDialog({ open, onOpenChange, agendador, month }: EditSDRGoalDialogProps) {
  const { setSDRGoal, getSDRStats } = useCommercial();
  const stats = getSDRStats(agendador, month);
  const [goalCount, setGoalCount] = useState(stats.goalCount.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const currentStats = getSDRStats(agendador, month);
      setGoalCount(currentStats.goalCount.toString());
    }
  }, [open, agendador, month, getSDRStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseInt(goalCount) || 0;
    setIsSubmitting(true);
    try {
      await setSDRGoal(agendador, month, value);
      toast.success('Meta salva com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save SDR goal:', error);
      toast.error('Erro ao salvar meta de agendamento na nuvem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const agendadorLabel = AGENDADOR_OPTIONS.find(a => a.value === agendador)?.label || agendador;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Definir Meta de {agendadorLabel}
          </DialogTitle>
          <DialogDescription>
            Defina a meta de agendamentos fechados para o mês.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goalCount">Meta de Fechamentos</Label>
            <Input
              id="goalCount"
              type="number"
              min="0"
              value={goalCount}
              onChange={(e) => setGoalCount(e.target.value)}
              placeholder="Ex: 10"
            />
            <p className="text-xs text-muted-foreground">
              Número de agendamentos que devem resultar em fechamento
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Meta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
