import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAgendamentoData,
  TEM_SOCIO_OPTIONS,
  TEM_MKT_OPTIONS,
  TEM_SECRETARIA_OPTIONS,
  SALAO_OU_CLINICA_OPTIONS,
  FATURAMENTO_OPTIONS,
  FUNIL_OPTIONS,
  STATUS_OPTIONS,
  AgendamentoLeadInsert,
} from '@/hooks/useAgendamentoData';
import { Loader2 } from 'lucide-react';
import { formatPhoneInput } from '@/lib/phoneUtils';

interface AddAgendamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAgendamentoDialog({ open, onOpenChange }: AddAgendamentoDialogProps) {
  const { createLead } = useAgendamentoData();
  const currentYear = new Date().getFullYear();
  
  const [dateFields, setDateFields] = useState({ dia: '', mes: '', ano: String(currentYear) });
  const [formData, setFormData] = useState({
    data: '',
    nome: '',
    telefone: '',
    horario: '' as string,
    horario_especifico: '',
    tem_socio: 'NAO' as 'SIM' | 'NAO',
    tem_mkt: 'NAO' as 'SIM' | 'NAO',
    tem_secretaria: 'NAO' as 'SIM' | 'NAO',
    salao_ou_clinica: 'NAO_INFORMADO' as 'SALAO' | 'CLINICA' | 'NAO_INFORMADO',
    agendado_via: '' as string,
    faturamento: '0_A_10K' as '0_A_10K' | '10K_A_20K' | '20K_A_30K' | '30K_A_50K' | '50K_A_80K' | '80K_A_100K' | '100K_A_150K' | '150K_A_250K' | '250K_A_400K' | '400K_A_600K' | '600K_A_1M' | '1M_PLUS' | 'NAO_INFORMADO',
    funil: FUNIL_OPTIONS[0] as string,
    status: STATUS_OPTIONS[0].value as string,
  });

  const updateDateField = (field: 'dia' | 'mes' | 'ano', value: string) => {
    const numValue = value.replace(/\D/g, '');
    const maxLength = field === 'ano' ? 4 : 2;
    const cleanValue = numValue.slice(0, maxLength);
    
    const newDateFields = { ...dateFields, [field]: cleanValue };
    setDateFields(newDateFields);
    
    // Format as DD/MM/YYYY
    const { dia, mes, ano } = newDateFields;
    if (dia && mes && ano) {
      setFormData({ ...formData, data: `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}` });
    } else {
      setFormData({ ...formData, data: '' });
    }
  };

  const deriveHorario = (time: string): 'MANHA' | 'TARDE' | 'NOITE' => {
    if (!time) return 'MANHA';
    const hour = parseInt(time.split(':')[0], 10);
    if (hour >= 8 && hour <= 12) return 'MANHA';
    if (hour >= 13 && hour <= 17) return 'TARDE';
    return 'NOITE';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const horario = deriveHorario(formData.horario_especifico);
    await createLead.mutateAsync({ ...formData, horario } as any);
    onOpenChange(false);
    setDateFields({ dia: '', mes: '', ano: String(currentYear) });
    setFormData({
      data: '',
      nome: '',
      telefone: '',
      horario: '',
      horario_especifico: '',
      tem_socio: 'NAO',
      tem_mkt: 'NAO',
      tem_secretaria: 'NAO',
      salao_ou_clinica: 'NAO_INFORMADO',
      agendado_via: '',
      faturamento: '0_A_10K',
      funil: FUNIL_OPTIONS[0] as string,
      status: STATUS_OPTIONS[0].value as string,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Agendamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <div className="flex items-center gap-1">
                <Input
                  placeholder="DD"
                  className="w-14 text-center"
                  value={dateFields.dia}
                  onChange={(e) => updateDateField('dia', e.target.value)}
                  maxLength={2}
                  required
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  placeholder="MM"
                  className="w-14 text-center"
                  value={dateFields.mes}
                  onChange={(e) => updateDateField('mes', e.target.value)}
                  maxLength={2}
                  required
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  placeholder="AAAA"
                  className="w-20 text-center"
                  value={dateFields.ano}
                  onChange={(e) => updateDateField('ano', e.target.value)}
                  maxLength={4}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone (WhatsApp) *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => {
                  setFormData({ ...formData, telefone: e.target.value });
                }}
                placeholder="(81) 99999-9999 ou 5581999999999"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horario_especifico">Horário da Reunião *</Label>
              <Input
                id="horario_especifico"
                type="time"
                value={formData.horario_especifico || ''}
                onChange={(e) => setFormData({ ...formData, horario_especifico: e.target.value })}
                required
              />
              {formData.horario_especifico && (
                <p className="text-xs text-muted-foreground">
                  Período: {deriveHorario(formData.horario_especifico) === 'MANHA' ? 'Manhã' : deriveHorario(formData.horario_especifico) === 'TARDE' ? 'Tarde' : 'Noite'}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tem_socio">Tem Sócio? *</Label>
              <Select
                value={formData.tem_socio}
                onValueChange={(value) => setFormData({ ...formData, tem_socio: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEM_SOCIO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tem_mkt">Tem MKT? *</Label>
              <Select
                value={formData.tem_mkt}
                onValueChange={(value) => setFormData({ ...formData, tem_mkt: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEM_MKT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tem_secretaria">Tem Secretária? *</Label>
              <Select
                value={formData.tem_secretaria}
                onValueChange={(value) => setFormData({ ...formData, tem_secretaria: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEM_SECRETARIA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salao_ou_clinica">Salão ou Clínica? *</Label>
              <Select
                value={formData.salao_ou_clinica}
                onValueChange={(value) => setFormData({ ...formData, salao_ou_clinica: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALAO_OU_CLINICA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agendado_via">Agendado Por *</Label>
              <Select
                value={formData.agendado_via}
                onValueChange={(value) => setFormData({ ...formData, agendado_via: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIGACAO">Ligação</SelectItem>
                  <SelectItem value="MENSAGEM">Mensagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faturamento">Faturamento *</Label>
            <Select
              value={formData.faturamento}
              onValueChange={(value) => setFormData({ ...formData, faturamento: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FATURAMENTO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="funil">Funil *</Label>
            <Select
              value={formData.funil}
              onValueChange={(value) => setFormData({ ...formData, funil: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNIL_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
