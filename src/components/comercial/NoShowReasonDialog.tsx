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

const VENDEDORES = [
{ value: 'HERBERT', label: 'Herbert' },
  { value: 'CLED', label: 'Cled' },
  { value: 'PEDRO_H', label: 'Pedro H' },
  { value: 'PEDRO_JUAN', label: 'Pedro Juan' },
  { value: 'CAETANO', label: 'Caetano' },
];

interface NoShowReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  onConfirm: (reason: string, vendedor: string) => void;
}

export function NoShowReasonDialog({ 
  open, 
  onOpenChange, 
  clientName,
  onConfirm 
}: NoShowReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [vendedor, setVendedor] = useState('');

  const handleConfirm = () => {
    if (!vendedor) {
      toast.error('Por favor, selecione o vendedor responsável');
      return;
    }
    if (!reason.trim()) {
      toast.error('Por favor, informe o motivo do No Show');
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Motivo do No Show</DialogTitle>
          <DialogDescription>
            Informe por que o cliente <strong>{clientName}</strong> não compareceu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendedor">Vendedor responsável *</Label>
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
            <Label htmlFor="noShowReason">Motivo *</Label>
            <Textarea
              id="noShowReason"
              placeholder="Ex: Cliente não atendeu, reagendou, cancelou em cima da hora..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
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
              variant="default"
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleConfirm}
            >
              Confirmar No Show
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
