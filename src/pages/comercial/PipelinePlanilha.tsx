import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PipelineSpreadsheet } from '@/components/comercial/PipelineSpreadsheet';
import { EditClientDialog } from '@/components/comercial/EditClientDialog';
import { DeleteClientDialog } from '@/components/comercial/DeleteClientDialog';
import { type PipelineClient } from '@/contexts/CommercialContext';

export default function ComercialPipelinePlanilha() {
  const [clientToEdit, setClientToEdit] = useState<PipelineClient | null>(null);
  const [clientToDelete, setClientToDelete] = useState<PipelineClient | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleEditClient = (client: PipelineClient) => {
    setClientToEdit(client);
    setEditDialogOpen(true);
  };

  const handleDeleteClient = (client: PipelineClient) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in">
      <Card className="border-primary/20">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              <Table className="h-4 w-4" />
              Planilha do CRM
            </div>
            <h1 className="text-2xl font-bold">Leads em planilha</h1>
            <p className="text-sm text-muted-foreground">
              Visualize, edite e exclua leads em formato de planilha com os dados sincronizados.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/comercial/pipeline">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao CRM
            </Link>
          </Button>
        </CardContent>
      </Card>

      <PipelineSpreadsheet
        onEditClient={handleEditClient}
        onDeleteClient={handleDeleteClient}
        canExport
      />

      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={clientToEdit}
      />

      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        client={clientToDelete}
      />
    </div>
  );
}
