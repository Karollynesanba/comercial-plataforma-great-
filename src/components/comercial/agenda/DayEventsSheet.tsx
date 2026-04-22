import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Clock, User, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendaEvent } from '@/hooks/useAgendaData';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DayEventsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: AgendaEvent[];
  onEventClick: (event: AgendaEvent) => void;
  onAddEvent: () => void;
}

export function DayEventsSheet({ 
  open, 
  onOpenChange, 
  date, 
  events, 
  onEventClick, 
  onAddEvent 
}: DayEventsSheetProps) {
  if (!date) return null;

  const formatPhoneDisplay = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return phone;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
            <Button size="sm" onClick={onAddEvent}>
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum evento neste dia</p>
              <Button variant="link" onClick={onAddEvent}>
                Criar primeiro evento
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {events
                .sort((a, b) => a.event_time.localeCompare(b.event_time))
                .map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  style={{ borderLeftWidth: '4px', borderLeftColor: event.color }}
                  onClick={() => onEventClick(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{event.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{event.event_time.slice(0, 5)}</span>
                        <span>•</span>
                        <span>{event.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{event.client_name}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://wa.me/55${event.client_phone}`, '_blank');
                      }}
                    >
                      <MessageCircle className="h-4 w-4 text-green-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
