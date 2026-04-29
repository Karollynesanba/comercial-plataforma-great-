import { useState } from 'react';
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
  FormDescription,
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
  AGENDADOR_OPTIONS,
  FUNIL_OPTIONS,
  FATURAMENTO_OPTIONS,
  SALAO_OU_CLINICA_OPTIONS,
  type Agendador,
  type Faturamento,
  type PipelineStage,
  type TemMkt,
  type TemSecretaria,
  type TemSocio,
  useCommercial,
} from '@/contexts/CommercialContext';
import { toast } from 'sonner';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';

const formSchema = z.object({
  clientName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().min(1, 'Telefone e obrigatorio'),
  funil: z.string().min(1, 'Funil e obrigatorio'),
  criativo: z.string().optional(),
  faturamento: z.enum(['0_A_10K', '10K_A_20K', '20K_A_30K', '30K_A_50K', '50K_A_80K', '80K_A_100K', '100K_A_150K', '150K_A_250K', '250K_A_400K', '400K_A_600K', '600K_A_1M', '1M_PLUS'] as const, {
    required_error: 'Faturamento e obrigatorio',
  }),
  podeInvestir: z.enum(['SIM', 'NAO'] as const).optional(),
  agendadoPor: z.enum(['MIGUEL', 'PEDRO', 'HEBERT', 'CLED', 'CAETANO'] as const, {
    required_error: 'Informe quem agendou',
  }),
  agendadoVia: z.enum(['LIGACAO', 'MENSAGEM', 'CALENDLY'] as const, { required_error: 'Informe como foi realizado o agendamento' }),
  temSocio: z.enum(['SIM', 'NAO'] as const, { required_error: 'Informe se tem socio' }),
  temMkt: z.enum(['SIM', 'NAO'] as const, { required_error: 'Informe se tem marketing' }),
  temSecretaria: z.enum(['SIM', 'NAO'] as const, { required_error: 'Informe se tem secretaria' }),
  areaAtuacao: z.string().trim().min(1, 'Area de atuacao e obrigatoria'),
  meetingDate: z.string().min(1, 'Data da reuniao e obrigatoria'),
  meetingTime: z.string().min(1, 'Horario da reuniao e obrigatorio'),
}).refine((data) => {
  if (data.funil === 'INSTAGRAM') return true;
  return Boolean(data.criativo?.trim());
}, {
  message: 'Informe o criativo quando o funil nao for Instagram',
  path: ['criativo'],
}).refine((data) => data.faturamento !== '0_A_10K' || Boolean(data.podeInvestir), {
  message: 'Informe se o lead pode investir',
  path: ['podeInvestir'],
});

type FormValues = z.input<typeof formSchema>;

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClientDialog({ open, onOpenChange }: CreateClientDialogProps) {
  const { addPipelineClient, criativos, funis } = useCommercial();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      telefone: '',
      funil: 'INSTAGRAM',
      criativo: '',
      faturamento: undefined,
      podeInvestir: undefined,
      agendadoPor: undefined,
      agendadoVia: undefined,
      temSocio: undefined,
      temMkt: undefined,
      temSecretaria: undefined,
      areaAtuacao: '',
      meetingDate: '',
      meetingTime: '',
    },
  });

  const watchFunil = form.watch('funil');
  const shouldRequireCriativo = watchFunil !== 'INSTAGRAM';
  const funnelOptions = funis.length > 0 ? funis : [...FUNIL_OPTIONS];
  const showLowRevenueOptions = form.watch('faturamento') === '0_A_10K';

  const handleFunilChange = (value: string) => {
    form.setValue('funil', value, { shouldDirty: true, shouldTouch: true });

    if (value === 'INSTAGRAM') {
      form.setValue('criativo', '', { shouldDirty: true, shouldTouch: true });
      form.clearErrors('criativo');
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const formattedPhone = formatPhoneForWhatsApp(data.telefone);

      await addPipelineClient({
        ativo: true,
        clientName: data.clientName,
        clinicName: data.clientName,
        telefone: formattedPhone,
        vendedor: undefined,
        funil: data.funil,
        criativo: data.funil === 'INSTAGRAM' ? 'NAO IDENTIFICADO' : (data.criativo || 'NAO IDENTIFICADO'),
        equipe: undefined,
        faturamento: data.faturamento as Faturamento,
        faturamentoPersonalizado: undefined,
        podeInvestir: data.faturamento === '0_A_10K' ? data.podeInvestir : undefined,
        pacote: 'COMPLETO',
        periodo: 'MENSAL',
        indicacao: undefined,
        agendadoPor: data.agendadoPor as Agendador | undefined,
        agendadoVia: data.agendadoVia,
        temSocio: data.temSocio as TemSocio,
        temMkt: data.temMkt as TemMkt,
        temSecretaria: data.temSecretaria as TemSecretaria,
        salaoOuClinica: data.areaAtuacao,
        entrada: 0,
        isMrr: false,
        mrrEntrada: 0,
        mrrRemaining: 0,
        dataEntrada: new Date(),
        stage: 'NOVO' as PipelineStage,
        meetingDate: data.meetingDate,
        meetingTime: data.meetingTime,
      });
      toast.success('Cliente adicionado ao pipeline!');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar cliente no pipeline:', error);
      const message = error instanceof Error ? error.message : 'Erro ao criar cliente';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>Adicione um novo lead ao pipeline comercial.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Joao Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (WhatsApp) *</FormLabel>
                  <FormControl>
                    <Input placeholder="(81) 99999-9999 ou 5581999999999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="funil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funil *</FormLabel>
                  <Select
                    onValueChange={handleFunilChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover z-[9999]">
                      {funnelOptions.map((funil) => (
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
                  <FormLabel>Criativo {shouldRequireCriativo ? '*' : '(opcional com Instagram)'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o criativo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover z-[9999]">
                      {criativos.length === 0 ? (
                        <SelectItem value="_empty" disabled>
                          Nenhum criativo cadastrado. Use o botão Criativos.
                        </SelectItem>
                      ) : (
                        criativos.map((criativo) => (
                          <SelectItem key={criativo} value={criativo}>
                            {criativo}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {shouldRequireCriativo
                      ? 'Obrigatório para funis diferentes de Instagram.'
                      : 'Para Instagram, não é necessário informar criativo.'}
                  </FormDescription>
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
                      {FATURAMENTO_OPTIONS.map((opt) => (
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

            {showLowRevenueOptions && (
              <FormField
                control={form.control}
                name="podeInvestir"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pode investir?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        <SelectItem value="SIM">Sim</SelectItem>
                        <SelectItem value="NAO">Nao</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="temSocio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tem Socio?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        <SelectItem value="SIM">Sim</SelectItem>
                        <SelectItem value="NAO">Nao</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temMkt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tem MKT?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        <SelectItem value="SIM">Sim</SelectItem>
                        <SelectItem value="NAO">Nao</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temSecretaria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tem Secretaria?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        <SelectItem value="SIM">Sim</SelectItem>
                        <SelectItem value="NAO">Nao</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
                name="areaAtuacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area de atuacao *</FormLabel>
                    <FormControl>
                      <Input list="create-client-area-options" placeholder="Ex: Odontologia" {...field} value={field.value || ''} />
                    </FormControl>
                  <datalist id="create-client-area-options">
                    {SALAO_OU_CLINICA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agendadoPor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quem agendou?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {AGENDADOR_OPTIONS.map((opt) => (
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
              name="agendadoVia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agendado por</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      <SelectItem value="LIGACAO">Ligacao</SelectItem>
                      <SelectItem value="MENSAGEM">Mensagem</SelectItem>
                      <SelectItem value="CALENDLY">Calendly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="meetingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Reuniao *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meetingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horario da Reuniao *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar Lead'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
