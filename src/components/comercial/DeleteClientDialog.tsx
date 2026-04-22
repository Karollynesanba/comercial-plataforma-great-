import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCommercial, PipelineClient } from '@/contexts/CommercialContext';
import { toast } from 'sonner';

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: PipelineClient | null;
}

export function DeleteClientDialog({ open, onOpenChange, client }: DeleteClientDialogProps) {
  const { deletePipelineClient } = useCommercial();

  const handleDelete = () => {
    if (!client) return;
    
    deletePipelineClient(client.id);
    toast.success('Cliente removido do pipeline');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover cliente do pipeline?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a remover <strong>{client?.clientName}</strong> ({client?.clinicName}) do pipeline.
            <br /><br />
            Esta ação não pode ser desfeita. O valor de <strong>R$ {client?.entrada?.toLocaleString('pt-BR') || '0'}</strong> será removido do pipeline.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
