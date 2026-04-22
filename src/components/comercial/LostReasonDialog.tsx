import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const VENDEDORES = [
  { value: 'HERBERT', label: 'Hebert' },
  { value: 'CLED', label: 'Cled' },
  { value: 'PEDRO_H', label: 'Pedro H' },
  { value: 'PEDRO_JUAN', label: 'Pedro Juan' },
  { value: 'CAETANO', label: 'Caetano' },
];

const MOTIVOS_RAPIDOS = [
  'Valor alto',
  'Saiu para pensar',
  'Não era o que buscava',
  'Busca atendimento humano',
];

interface LostReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  onConfirm: (reason: string, vendedor: string) => void;
}

export function LostReasonDialog({ 
  open, 
  onOpenChange, 
  clientName,
  onConfirm 
}: LostReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [vendedor, setVendedor] = useState('');

  const handleConfirm = () => {
    if (!vendedor) {
      toast.error('Por favor, selecione o vendedor que fez a reunião');
      return;
    }
    if (!reason.trim()) {
      toast.error('Por favor, informe o motivo da perda');
      return;
    }
    onConfirm(reason, vendedor);
    setReason('');
    setVendedor('');
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason('');
      setVendedor('');
    }
    onOpenChange(open);
  };

  const selectQuickReason = (motivo: string) => {
    setReason(motivo);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Motivo da Perda</DialogTitle>
          <DialogDescription>
            Informe por que perdemos o cliente <strong>{clientName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendedor">Vendedor que fez a reunião *</Label>
            <Select value={vendedor} onValueChange={setVendedor}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {VENDEDORES.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo rápido</Label>
            <div className="grid grid-cols-2 gap-2">
              {MOTIVOS_RAPIDOS.map((motivo) => (
                <Button
                  key={motivo}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-auto py-2 px-3 text-left justify-start whitespace-normal",
                    reason === motivo && "border-destructive bg-destructive/10 text-destructive"
                  )}
                  onClick={() => selectQuickReason(motivo)}
                >
                  {motivo}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo detalhado *</Label>
            <Textarea
              id="reason"
              placeholder="Selecione acima ou descreva o motivo..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirm}
            >
              Confirmar Perda
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
