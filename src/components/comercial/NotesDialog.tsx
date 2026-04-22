import { useState, useEffect } from 'react';
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
import { PipelineClient, useCommercial } from '@/contexts/CommercialContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StickyNote, Trash2, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: PipelineClient | null;
}

interface Note {
  id: string;
  content: string;
  createdAt: Date;
}

function parseNotes(value: unknown): Note[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value as Note[];
  }

  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed as Note[];
    }
  } catch {
    // Legacy notes can be stored as plain text in older data.
  }

  return [
    {
      id: `legacy-${value.replace(/\s+/g, '-').slice(0, 32)}`,
      content: value,
      createdAt: new Date(0),
    },
  ];
}

export function NotesDialog({ 
  open, 
  onOpenChange, 
  client
}: NotesDialogProps) {
  const { updatePipelineClient } = useCommercial();
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (client) {
      setNotes(parseNotes(client.notes));
    }
  }, [client]);

  const handleAddNote = () => {
    if (!newNote.trim() || !client) {
      toast.error('Por favor, escreva uma anotação');
      return;
    }

    const note: Note = {
      id: crypto.randomUUID(),
      content: newNote.trim(),
      createdAt: new Date(),
    };

    const updatedNotes = [...notes, note];
    setNotes(updatedNotes);
    updatePipelineClient(client.id, { notes: JSON.stringify(updatedNotes) });
    setNewNote('');
    toast.success('Anotação adicionada!');
  };

  const handleDeleteNote = (noteId: string) => {
    if (!client) return;
    
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    updatePipelineClient(client.id, { notes: JSON.stringify(updatedNotes) });
    toast.success('Anotação removida');
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Anotações - {client.clientName}
          </DialogTitle>
          <DialogDescription>
            Adicione observações e notas importantes sobre este lead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new note */}
          <div className="space-y-2">
            <Label htmlFor="newNote">Nova Anotação</Label>
            <div className="flex gap-2">
              <Textarea
                id="newNote"
                placeholder="Digite sua anotação..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <Button onClick={handleAddNote} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Anotação
            </Button>
          </div>

          {/* Existing notes */}
          {notes.length > 0 ? (
            <div className="space-y-2">
              <Label>Histórico de Anotações</Label>
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-3">
                  {notes.slice().reverse().map((note) => (
                    <div 
                      key={note.id} 
                      className="p-3 rounded-lg bg-muted/50 border border-border group relative"
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <p className="text-sm text-foreground pr-8">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(note.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma anotação ainda</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
