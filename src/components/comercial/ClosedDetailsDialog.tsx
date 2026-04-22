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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  PAGADOR_ANUNCIO_OPTIONS,
  EQUIPE_OPTIONS,
  PagadorAnuncio,
  Equipe,
  useCommercial,
} from '@/contexts/CommercialContext';

const formSchema = z.object({
  clinicName: z.string().min(2, 'Nome da clínica é obrigatório (mín. 2 caracteres)'),
  equipe: z.string({
    required_error: 'Selecione a equipe',
  }),
  pagadorAnuncio: z.enum(['CLIENTE', 'GREAT'] as const, {
    required_error: 'Selecione quem paga o anúncio',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface ClosedDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  currentClinicName?: string;
  onConfirm: (equipe: Equipe, pagadorAnuncio: PagadorAnuncio, clinicName: string) => void;
}

export function ClosedDetailsDialog({ 
  open, 
  onOpenChange, 
  clientName,
  currentClinicName,
  onConfirm 
}: ClosedDetailsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { nextTeamInQueue, getNextTeamLabel } = useCommercial();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clinicName: currentClinicName || '',
      equipe: nextTeamInQueue,
      pagadorAnuncio: undefined,
    },
  });

  // Update defaults when dialog opens
  useEffect(() => {
    if (open) {
      form.setValue('equipe', nextTeamInQueue);
      form.setValue('clinicName', currentClinicName || '');
    }
  }, [open, nextTeamInQueue, currentClinicName, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      onConfirm(data.equipe, data.pagadorAnuncio, data.clinicName);
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>🎉 Fechando Negócio</DialogTitle>
          <DialogDescription>
            Para fechar <span className="font-medium text-foreground">{clientName}</span>, 
            informe os dados abaixo.
          </DialogDescription>
        </DialogHeader>

        {/* Team indicator banner */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Equipe da vez: <span className="text-primary font-semibold">{getNextTeamLabel()}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Distribuição igualitária entre equipes (round-robin)
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clinicName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Clínica *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da clínica" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="equipe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Equipe
                    {field.value === nextTeamInQueue && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        ✓ Da vez
                      </span>
                    )}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={field.value === nextTeamInQueue ? 'border-primary ring-1 ring-primary/30' : ''}>
                        <SelectValue placeholder="Selecione a equipe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {EQUIPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            {opt.label}
                            {opt.value === nextTeamInQueue && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                Da vez
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pagadorAnuncio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quem paga anúncio?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione quem paga" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {PAGADOR_ANUNCIO_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Fechar Negócio'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
