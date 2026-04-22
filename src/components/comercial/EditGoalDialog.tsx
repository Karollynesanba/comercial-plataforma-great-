import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCommercial } from '@/contexts/CommercialContext';
import { toast } from 'sonner';

const formSchema = z.object({
  goalValue: z.string().min(1, 'Valor é obrigatório'),
});

type FormValues = z.infer<typeof formSchema>;

interface EditGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const parseMoneyValue = (val: string): number => {
  const num = parseFloat(val.replace(/[^\d,]/g, '').replace(',', '.'));
  return isNaN(num) ? 0 : num;
};

export function EditGoalDialog({ open, onOpenChange }: EditGoalDialogProps) {
  const { currentGoal, setSalesGoal } = useCommercial();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goalValue: currentGoal?.goalValue.toString() || '0',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        goalValue: currentGoal?.goalValue.toString() || '0',
      });
    }
  }, [open, currentGoal, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const goalValue = parseMoneyValue(data.goalValue);
      await setSalesGoal(currentMonth, goalValue);
      toast.success('Meta atualizada com sucesso!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar meta na nuvem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Editar Meta</DialogTitle>
          <DialogDescription>
            Defina a meta comercial para {monthLabel}. O valor vendido será calculado automaticamente pelo pipeline.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="goalValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Mensal (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="300.000" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
