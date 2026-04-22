import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EQUIPE_OPTIONS,
  PACOTE_OPTIONS,
  PAGADOR_ANUNCIO_OPTIONS,
  PERIODO_OPTIONS,
  VENDEDOR_OPTIONS,
  type Equipe,
  type Pacote,
  type PagadorAnuncio,
  type Periodo,
  type Vendedor,
  useCommercial,
} from '@/contexts/CommercialContext';

const currencyToNumber = (value: unknown) => {
  const normalized = String(value || '').replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const baseSchema = z.object({
  vendedor: z.enum(['HERBERT', 'CLED', 'PEDRO_H', 'PEDRO_JUAN', 'CAETANO'] as const, {
    required_error: 'Selecione o vendedor',
  }),
  pacote: z.enum(['COMPLETO', 'TRAFEGO_E_CRIATIVOS', 'ATENDIMENTO', 'TRAFEGO', 'COMPLETO_NOVA_ERA', 'TRAFEGO_ARTES_IA', 'TRAFEGO_CONSULTORIA', 'IA', 'TRAFEGO_ROTEIRO', 'TRAFEGO_IA'] as const),
  periodo: z.enum(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'TAXA_INTERESSE'] as const),
  entrada: z.string().min(1, 'Valor de entrada e obrigatorio'),
  isMrr: z.enum(['SIM', 'NAO'] as const),
  mrrRemaining: z.string().optional(),
  clinicName: z.string().optional(),
  equipe: z.string().optional(),
  pagadorAnuncio: z.enum(['CLIENTE', 'GREAT'] as const).optional(),
});

type FormValues = z.input<typeof baseSchema>;

interface NegotiationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  currentClinicName?: string;
  targetStage: 'NEGOCIACAO' | 'FECHADO';
  onConfirm: (data: {
    vendedor: Vendedor;
    pacote: Pacote;
    periodo: Periodo;
    entrada: number;
    isMrr?: boolean;
    mrrRemaining?: number;
    clinicName?: string;
    equipe?: Equipe;
    pagadorAnuncio?: PagadorAnuncio;
  }) => void;
}

export function NegotiationDetailsDialog({
  open,
  onOpenChange,
  clientName,
  currentClinicName,
  targetStage,
  onConfirm,
}: NegotiationDetailsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { nextTeamInQueue, getNextTeamLabel } = useCommercial();

  const schema = baseSchema
    .refine((data) => currencyToNumber(data.entrada) > 0, {
      message: 'Informe um valor de entrada maior que zero',
      path: ['entrada'],
    })
    .refine((data) => data.isMrr === 'NAO' || currencyToNumber(data.mrrRemaining) > 0, {
      message: 'Informe o valor restante do contrato MRR',
      path: ['mrrRemaining'],
    })
    .refine((data) => targetStage !== 'FECHADO' || Boolean(data.clinicName && data.clinicName.trim().length >= 2), {
      message: 'Nome da clinica e obrigatorio',
      path: ['clinicName'],
    })
    .refine((data) => targetStage !== 'FECHADO' || Boolean(data.equipe), {
      message: 'Selecione a equipe',
      path: ['equipe'],
    })
    .refine((data) => targetStage !== 'FECHADO' || Boolean(data.pagadorAnuncio), {
      message: 'Selecione quem paga o anuncio',
      path: ['pagadorAnuncio'],
    });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendedor: undefined,
      pacote: 'COMPLETO',
      periodo: 'MENSAL',
      entrada: '',
      isMrr: 'NAO',
      mrrRemaining: '',
      clinicName: currentClinicName || '',
      equipe: nextTeamInQueue,
      pagadorAnuncio: undefined,
    },
  });

  const isMrr = form.watch('isMrr') === 'SIM';

  useEffect(() => {
    if (open) {
      form.reset({
        vendedor: undefined,
        pacote: 'COMPLETO',
        periodo: 'MENSAL',
        entrada: '',
        isMrr: 'NAO',
        mrrRemaining: '',
        clinicName: currentClinicName || '',
        equipe: nextTeamInQueue,
        pagadorAnuncio: undefined,
      });
    }
  }, [open, nextTeamInQueue, currentClinicName, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      onConfirm({
        vendedor: data.vendedor as Vendedor,
        pacote: data.pacote as Pacote,
        periodo: data.periodo as Periodo,
        entrada: currencyToNumber(data.entrada),
        isMrr: data.isMrr === 'SIM',
        mrrRemaining: data.isMrr === 'SIM' ? currencyToNumber(data.mrrRemaining) : 0,
        clinicName: data.clinicName || undefined,
        equipe: data.equipe as Equipe | undefined,
        pagadorAnuncio: data.pagadorAnuncio as PagadorAnuncio | undefined,
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stageLabel = targetStage === 'NEGOCIACAO' ? 'Negociacao' : 'Fechado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da proposta</DialogTitle>
          <DialogDescription>
            Para mover <span className="font-medium text-foreground">{clientName}</span> para {stageLabel}, informe os dados que alimentam as metricas.
          </DialogDescription>
        </DialogHeader>

        {targetStage === 'FECHADO' && (
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
            <p className="text-sm font-medium">Equipe da vez: <span className="text-primary">{getNextTeamLabel()}</span></p>
            <p className="text-xs text-muted-foreground">Voce ainda pode ajustar se precisar corrigir a distribuicao.</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vendedor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Closer responsavel</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o closer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {VENDEDOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pacote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pacote</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {PACOTE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {PERIODO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isMrr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Foi MRR?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      <SelectItem value="NAO">Nao</SelectItem>
                      <SelectItem value="SIM">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entrada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isMrr ? 'Valor de entrada coletado' : 'Valor da venda'}</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 1.500,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isMrr && (
                <FormField
                  control={form.control}
                  name="mrrRemaining"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor restante do contrato</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 3.000,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {targetStage === 'FECHADO' && (
              <>
                <FormField
                  control={form.control}
                  name="clinicName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da clinica *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da clinica" {...field} />
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
                      <FormLabel>Equipe</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a equipe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {EQUIPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                      <FormLabel>Quem paga anuncio?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {PAGADOR_ANUNCIO_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : `Mover para ${stageLabel}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
