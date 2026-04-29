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
import { Badge } from '@/components/ui/badge';
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
import { formatBRL } from '@/lib/utils';
import { 
  useCommercial, 
  PipelineClient,
  FUNIL_OPTIONS,
  VENDEDOR_OPTIONS,
  EQUIPE_OPTIONS,
  FATURAMENTO_OPTIONS,
  PACOTE_OPTIONS,
  PERIODO_OPTIONS,
  INDICACAO_OPTIONS,
  AGENDADOR_OPTIONS,
  TEAM_IDS,
  Vendedor,
  Equipe,
  Faturamento,
  Pacote,
  Periodo,
  Agendador,
} from '@/contexts/CommercialContext';
import { toast } from 'sonner';

const currencyToNumber = (value: unknown) => {
  const normalized = String(value || '').replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeFaturamentoBucket = (value?: string | null) => {
  switch (value) {
    case '0_A_10K':
    case '0_A_15K':
    case '0_10K':
    case 'FATURA_12K':
    case 'PODE_INVESTIR':
      return '0_A_10K';
    case '10K_A_20K':
    case '15K_A_30K':
    case '15K_MAIS':
      return '10K_A_20K';
    case '20K_A_30K':
      return '20K_A_30K';
    case '30K_A_50K':
      return '30K_A_50K';
    case '50K_A_80K':
    case '50K_A_100K':
      return '50K_A_80K';
    case '80K_A_100K':
      return '80K_A_100K';
    case '100K_A_150K':
    case '100K_PLUS':
      return '100K_A_150K';
    case '150K_A_250K':
      return '150K_A_250K';
    case '250K_A_400K':
      return '250K_A_400K';
    case '400K_A_600K':
      return '400K_A_600K';
    case '600K_A_1M':
      return '600K_A_1M';
    case '1M_PLUS':
      return '1M_PLUS';
    case 'NAO_INFORMADO':
    case 'PERSONALIZADO':
    default:
      return 'NAO_INFORMADO';
  }
};

const formSchema = z.object({
  clientName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  clinicName: z.string().min(2, 'Nome da clínica deve ter pelo menos 2 caracteres'),
  telefone: z.string().optional(),
  vendedor: z.enum(['HERBERT', 'CLED', 'PEDRO_H', 'PEDRO_JUAN', 'CAETANO'] as const).optional().nullable(),
  funil: z.string().min(1, 'Funil Ã© obrigatÃ³rio'),
  criativo: z.string().optional(),
  equipe: z.string(),
  faturamento: z.enum(['0_A_10K', '10K_A_20K', '20K_A_30K', '30K_A_50K', '50K_A_80K', '80K_A_100K', '100K_A_150K', '150K_A_250K', '250K_A_400K', '400K_A_600K', '600K_A_1M', '1M_PLUS', 'NAO_INFORMADO', 'PERSONALIZADO'] as const),
  faturamentoPersonalizado: z.string().optional(),
  pacote: z.enum(['COMPLETO', 'TRAFEGO_E_CRIATIVOS', 'ATENDIMENTO', 'TRAFEGO', 'COMPLETO_NOVA_ERA', 'TRAFEGO_ARTES_IA', 'TRAFEGO_CONSULTORIA', 'IA', 'TRAFEGO_ROTEIRO', 'TRAFEGO_IA'] as const),
  periodo: z.enum(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'TAXA_INTERESSE'] as const),
  indicacao: z.string().optional(),
  agendadoPor: z.enum(['MIGUEL', 'PEDRO', 'HEBERT', 'CLED', 'CAETANO'] as const).optional().nullable(),
  agendadoVia: z.enum(['LIGACAO', 'MENSAGEM', 'CALENDLY'] as const, { required_error: 'Informe como foi realizado o agendamento' }),
  isMrr: z.enum(['SIM', 'NAO'] as const),
  mrrRemaining: z.string().optional(),
  temSocio: z.enum(['SIM', 'NAO', 'NAO_PERGUNTADO'] as const).optional(),
  temMkt: z.enum(['SIM', 'NAO', 'NAO_PERGUNTADO'] as const).optional(),
  entrada: z.string().min(1, 'Valor é obrigatório').transform(val => {
    const num = parseFloat(val.replace(/[^\d,]/g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }),
}).refine((data) => {
  if (data.funil === 'INSTAGRAM') return true;
  return Boolean(data.criativo?.trim());
}, {
  message: 'Informe o criativo quando o funil nao for Instagram',
  path: ['criativo'],
});

type FormValues = z.input<typeof formSchema>;

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: PipelineClient | null;
}

export function EditClientDialog({ open, onOpenChange, client }: EditClientDialogProps) {
  const { updatePipelineClient, criativos, funis } = useCommercial();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNovoLead = client?.stage === 'NOVO';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      clinicName: '',
      telefone: '',
      vendedor: undefined,
      funil: 'INSTAGRAM',
      criativo: '',
      equipe: TEAM_IDS.TROPA_DE_ELITE,
      faturamento: 'NAO_INFORMADO',
      faturamentoPersonalizado: '',
      pacote: 'COMPLETO',
      periodo: 'MENSAL',
      indicacao: 'NAO',
      agendadoPor: undefined,
      agendadoVia: undefined,
      isMrr: 'NAO',
      mrrRemaining: '',
      entrada: '',
    },
  });

  const watchFaturamento = form.watch('faturamento');
  const watchFunil = form.watch('funil');
  const watchIsMrr = form.watch('isMrr');
  const watchEntrada = form.watch('entrada');
  const watchMrrRemaining = form.watch('mrrRemaining');
  const isMrr = watchIsMrr === 'SIM';
  const showMrrSection = Boolean(client?.stage === 'FECHADO' || client?.isMrr || client?.mrrRemaining || isMrr);
  const entradaValue = currencyToNumber(watchEntrada);
  const mrrRemainingValue = currencyToNumber(watchMrrRemaining);

  // Update form when client changes
  useEffect(() => {
    if (client) {
      form.reset({
        clientName: client.clientName,
        clinicName: client.clinicName,
        telefone: client.telefone || '',
        vendedor: client.stage === 'NOVO' ? undefined : client.vendedor,
        funil: client.funil || 'INSTAGRAM',
        criativo: client.criativo,
        equipe: client.equipe,
        faturamento: normalizeFaturamentoBucket(client.faturamento),
        faturamentoPersonalizado: client.faturamentoPersonalizado || '',
        pacote: client.pacote,
        periodo: client.periodo,
        indicacao: client.indicacao || 'NAO',
        agendadoPor: client.agendadoPor || undefined,
        agendadoVia: (client.agendadoVia as 'LIGACAO' | 'MENSAGEM' | 'CALENDLY') || undefined,
        isMrr: client.isMrr ? 'SIM' : 'NAO',
        mrrRemaining: client.mrrRemaining ? client.mrrRemaining.toString() : '',
        entrada: client.entrada.toString(),
      });
    }
  }, [client, form]);

  const onSubmit = async (data: FormValues) => {
    if (!client) return;
    
    setIsSubmitting(true);
    try {
      const entradaValue = typeof data.entrada === 'string' 
        ? parseFloat(data.entrada.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
        : data.entrada || 0;
      
      console.log('Updating client:', client.id, {
        clientName: data.clientName,
        criativo: data.criativo,
        funil: data.funil,
        entrada: entradaValue,
      });
      
      await updatePipelineClient(client.id, {
        clientName: data.clientName,
        clinicName: data.clinicName,
        telefone: data.telefone,
        vendedor: client.stage === 'NOVO' ? undefined : data.vendedor as Vendedor | undefined,
        criativo: data.criativo,
        funil: data.funil,
        equipe: data.equipe as Equipe,
        faturamento: normalizeFaturamentoBucket(data.faturamento) as Faturamento,
        faturamentoPersonalizado: data.faturamento === 'PERSONALIZADO' ? data.faturamentoPersonalizado : undefined,
        pacote: data.pacote as Pacote,
        periodo: data.periodo as Periodo,
        indicacao: data.indicacao,
        agendadoPor: data.agendadoPor as Agendador | undefined,
        agendadoVia: data.agendadoVia,
        entrada: entradaValue,
        isMrr: data.isMrr === 'SIM',
        mrrEntrada: data.isMrr === 'SIM' ? entradaValue : 0,
        mrrRemaining: data.isMrr === 'SIM' ? currencyToNumber(data.mrrRemaining) : 0,
      });
      toast.success('Lead atualizado!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erro ao atualizar lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
          <DialogDescription>
            Atualize as informações do lead no pipeline.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Cliente e Clínica */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clinicName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Clínica</FormLabel>
                    <FormControl>
                      <Input placeholder="Clínica Exemplo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 1.5: Telefone */}
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 2: Equipe e, quando aplicavel, Vendedor */}
            <div className={`grid gap-4 ${isNovoLead ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {!isNovoLead && (
                <FormField
                  control={form.control}
                  name="vendedor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendedor</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === '__none__' ? null : val)}
                        value={field.value || '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          <SelectItem value="__none__">Sem vendedor</SelectItem>
                          {VENDEDOR_OPTIONS.map(opt => (
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
              )}

              <FormField
                control={form.control}
                name="equipe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipe</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {EQUIPE_OPTIONS.map(opt => (
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
            </div>

            {/* Row 3: Funil, Criativo e Faturamento */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="funil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funil *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === 'INSTAGRAM') {
                          form.setValue('criativo', '');
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o funil" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {(funis.length > 0 ? funis : [...FUNIL_OPTIONS]).map(funil => (
                          <SelectItem key={funil} value={funil}>
                            {funil}
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
                name="criativo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Criativo {watchFunil === 'INSTAGRAM' ? '(opcional)' : '*'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o criativo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                        {criativos.length === 0 ? (
                          <SelectItem value="_empty" disabled>
                            Nenhum criativo cadastrado. Use o botão Criativos.
                          </SelectItem>
                        ) : (
                          criativos.map(criativo => (
                            <SelectItem key={criativo} value={criativo}>
                              {criativo}
                            </SelectItem>
                          ))
                        )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="faturamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faturamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {FATURAMENTO_OPTIONS.map(opt => (
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
            </div>

            {/* Campo de valor personalizado - aparece quando selecionado PERSONALIZADO */}
            {watchFaturamento === 'PERSONALIZADO' && (
              <FormField
                control={form.control}
                name="faturamentoPersonalizado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Informe o valor do faturamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 25K, 80K, 150K..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Row 4: Pacote e Período */}
            <div className="grid grid-cols-2 gap-4">
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
                        {PACOTE_OPTIONS.map(opt => (
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

              <FormField
                control={form.control}
                name="periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {PERIODO_OPTIONS.map(opt => (
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
            </div>

            {/* Row 5: Indicação e Agendado Por */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="indicacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indicação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {INDICACAO_OPTIONS.map(opt => (
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

              <FormField
                control={form.control}
                name="agendadoPor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agendado Por (SDR)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o SDR" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {AGENDADOR_OPTIONS.map(opt => (
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
            </div>

            {/* Row 5.5: Agendado Via */}
            <FormField
              control={form.control}
              name="agendadoVia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agendado Via *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ligação, Mensagem ou Calendly" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      <SelectItem value="LIGACAO">Ligação</SelectItem>
                      <SelectItem value="MENSAGEM">Mensagem</SelectItem>
                      <SelectItem value="CALENDLY">Calendly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 6: Entrada */}
            <FormField
              control={form.control}
              name="entrada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isMrr ? 'Valor de entrada coletado (R$)' : 'Valor de Entrada (R$)'}</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder={isMrr ? '2.000,00' : '5.000,00'} 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showMrrSection && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Fechamento MRR</p>
                    <p className="text-xs text-muted-foreground">
                      Mostra se o lead fechado entrou como recorrência e os valores associados.
                    </p>
                  </div>
                  <Badge variant={isMrr ? 'success' : 'secondary'}>
                    {isMrr ? 'MRR' : 'Não MRR'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-border bg-background/60 p-3">
                    <span className="block text-xs text-muted-foreground">Entrada</span>
                    <span className="font-semibold">{formatBRL(entradaValue)}</span>
                  </div>
                  <div className="rounded-md border border-border bg-background/60 p-3">
                    <span className="block text-xs text-muted-foreground">Restante</span>
                    <span className="font-semibold">
                      {isMrr ? formatBRL(mrrRemainingValue) : formatBRL(0)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                            <SelectItem value="NAO">Não</SelectItem>
                            <SelectItem value="SIM">Sim</SelectItem>
                          </SelectContent>
                        </Select>
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
                          <FormLabel>Valor restante (R$)</FormLabel>
                          <FormControl>
                            <Input placeholder="3.000,00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
