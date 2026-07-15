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
  CRIATIVO_REQUIRED_FUNIS,
  FUNIL_OPTIONS,
  getFunilLabel,
  FATURAMENTO_OPTIONS,
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
import { getCommercialLeadOrigin } from '@/lib/commercialOrigin';

const PROFESSION_OPTIONS = [
  'Dentista',
  'Médico',
  'Cirurgião',
  'Esteta',
  'Nutrição',
  'Psicologia',
  'Não identificado',
] as const;

const formSchema = z.object({
  clientName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().min(1, 'Telefone e obrigatorio'),
  profession: z.enum(PROFESSION_OPTIONS),
  funil: z.string().min(1, 'Funil e obrigatorio'),
  criativo: z.string().optional(),
  faturamento: z.enum(['0_A_10K', '10K_A_20K', '20K_A_30K', '30K_A_50K', '50K_A_80K', '80K_A_100K', '100K_A_150K', '150K_A_250K', '250K_A_400K', '400K_A_600K', '600K_A_1M', '1M_PLUS', 'NAO_INFORMADO'] as const, {
    required_error: 'Faturamento e obrigatorio',
  }),
  podeInvestir: z.enum(['SIM', 'NAO'] as const).optional(),
  agendadoPor: z.enum(['MIGUEL', 'PEDRO_H', 'PEDRO_JUAN', 'HEBERT', 'ALAN', 'CLED', 'CAETANO'] as const, {
    required_error: 'Informe quem agendou',
  }),
  agendadoVia: z.enum(['LIGACAO', 'MENSAGEM', 'CALENDLY'] as const, { required_error: 'Informe como foi realizado o agendamento' }),
  temSocio: z.enum(['SIM', 'NAO'] as const, { required_error: 'Informe se tem socio' }),
  temMkt: z.enum(['SIM', 'NAO'] as const, { required_error: 'Informe se tem marketing' }),
  temSecretaria: z.enum(['SIM', 'NAO', 'NAO_SEI'] as const, { required_error: 'Informe se tem secretaria' }),
  meetingDate: z.string().min(1, 'Data da reuniao e obrigatoria').regex(/^\d{4}-\d{2}-\d{2}$/, 'Data da reuniao invalida'),
  meetingTime: z.string().min(1, 'Horario da reuniao e obrigatorio').regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horario da reuniao invalido'),
}).refine((data) => {
  if (!CRIATIVO_REQUIRED_FUNIS.includes(data.funil as (typeof CRIATIVO_REQUIRED_FUNIS)[number])) return true;
  return Boolean(data.criativo?.trim());
}, {
  message: 'Informe o criativo quando o funil for WhatsApp ou Forms',
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
  const { addPipelineClient, criativos } = useCommercial();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      telefone: '',
      profession: 'Não identificado',
      funil: '',
      criativo: '',
      faturamento: undefined,
      podeInvestir: undefined,
      agendadoPor: undefined,
      agendadoVia: undefined,
      temSocio: undefined,
      temMkt: undefined,
      temSecretaria: undefined,
      meetingDate: '',
      meetingTime: '',
    },
  });

  const watchFunil = form.watch('funil');
  const shouldRequireCriativo = CRIATIVO_REQUIRED_FUNIS.includes(watchFunil as (typeof CRIATIVO_REQUIRED_FUNIS)[number]);
  const showLowRevenueOptions = form.watch('faturamento') === '0_A_10K';

  const handleFunilChange = (value: string) => {
    form.setValue('funil', value, { shouldDirty: true, shouldTouch: true });

    if (!CRIATIVO_REQUIRED_FUNIS.includes(value as (typeof CRIATIVO_REQUIRED_FUNIS)[number])) {
      form.setValue('criativo', '', { shouldDirty: true, shouldTouch: true });
      form.clearErrors('criativo');
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const formattedPhone = formatPhoneForWhatsApp(data.telefone);
      const leadPayload = {
        ativo: true,
        clientName: data.clientName,
        clinicName: data.clientName,
        telefone: formattedPhone,
        profession: data.profession,
        vendedor: undefined,
        funil: data.funil,
        criativo: getCommercialLeadOrigin({
          funil: data.funil,
          criativo: CRIATIVO_REQUIRED_FUNIS.includes(data.funil as (typeof CRIATIVO_REQUIRED_FUNIS)[number])
            ? data.criativo
            : undefined,
        }),
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
        entrada: 0,
        isMrr: false,
        mrrEntrada: 0,
        mrrRemaining: 0,
        dataEntrada: new Date(),
        stage: 'NOVO' as PipelineStage,
        meetingDate: data.meetingDate,
        meetingTime: data.meetingTime,
      };
      console.info('[commercial:create-lead] form submit', {
        clientName: data.clientName,
        telefone: data.telefone,
        formattedPhone,
        profession: data.profession,
        funil: data.funil,
        criativo: data.criativo || null,
        faturamento: data.faturamento,
        agendadoPor: data.agendadoPor,
        agendadoVia: data.agendadoVia,
        meetingDate: data.meetingDate,
        meetingTime: data.meetingTime,
      });
      console.info('[commercial:create-lead] payload', leadPayload);

      await addPipelineClient(leadPayload);
      console.info('[commercial:create-lead] lead creation completed');
      toast.success('Cliente adicionado ao pipeline!');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('[commercial:create-lead] erro ao criar cliente no pipeline', {
        error,
        message: error instanceof Error ? error.message : String(error),
        details: typeof error === 'object' && error !== null ? (error as any).details : undefined,
        hint: typeof error === 'object' && error !== null ? (error as any).hint : undefined,
      });
      const message = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as any).message)
          : 'Erro ao criar cliente';
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
              name="profession"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissão</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a profissão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover z-[9999]">
                      {PROFESSION_OPTIONS.map((profession) => (
                        <SelectItem key={profession} value={profession}>
                          {profession}
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
                      {FUNIL_OPTIONS.map((funil) => (
                        <SelectItem key={funil} value={funil}>
                          {getFunilLabel(funil)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {shouldRequireCriativo ? (
              <FormField
                control={form.control}
                name="criativo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Criativo *</FormLabel>
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
                      Escolha o criativo depois de confirmar o funil.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="temSocio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tem sócio?</FormLabel>
                    <FormControl>
                      <Select onValueChange={(value) => field.onChange(value)} value={field.value || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="SIM">Sim</SelectItem>
                          <SelectItem value="NAO">Nao</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
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
                    <FormControl>
                      <Select onValueChange={(value) => field.onChange(value)} value={field.value || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="SIM">Sim</SelectItem>
                          <SelectItem value="NAO">Nao</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temSecretaria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tem secretária?</FormLabel>
                    <FormControl>
                      <Select onValueChange={(value) => field.onChange(value)} value={field.value || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="SIM">Sim</SelectItem>
                          <SelectItem value="NAO">Nao</SelectItem>
                          <SelectItem value="NAO_SEI">Nao sei</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
