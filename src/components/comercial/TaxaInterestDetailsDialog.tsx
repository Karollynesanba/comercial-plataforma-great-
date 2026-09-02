import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VENDEDOR_OPTIONS, type Vendedor } from '@/contexts/CommercialContext';

interface TaxaInterestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  onConfirm: (data: { vendedor: Vendedor; valor: number }) => void;
}

export function TaxaInterestDetailsDialog({
  open,
  onOpenChange,
  clientName,
  onConfirm,
}: TaxaInterestDetailsDialogProps) {
  const [taxaVendedor, setTaxaVendedor] = useState('');
  const [taxaValor, setTaxaValor] = useState('');

  const handleConfirm = () => {
    const valor = Number(taxaValor.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    if (!taxaVendedor || valor <= 0) return;

    onConfirm({ vendedor: taxaVendedor as Vendedor, valor });
    setTaxaVendedor('');
    setTaxaValor('');
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTaxaVendedor('');
      setTaxaValor('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Closer responsável</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Selecione o closer responsável por <strong>{clientName}</strong>:
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium">Valor da taxa de interesse</label>
          <Input
            value={taxaValor}
            onChange={(event) => setTaxaValor(event.target.value)}
            placeholder="Ex: 200,00"
          />
        </div>
        <Select value={taxaVendedor} onValueChange={setTaxaVendedor}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o closer" />
          </SelectTrigger>
          <SelectContent>
            {VENDEDOR_OPTIONS.map((vendedor) => (
              <SelectItem key={vendedor.value} value={vendedor.value}>
                {vendedor.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!taxaVendedor || !taxaValor}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
