import { Bell, BellOff, Clock, X, Upload, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface ActiveAlarm {
  itemId: string;
  title: string;
  deadline: string;
}

interface DeadlineAlarmAlertProps {
  alarms: ActiveAlarm[];
  isPlaying: boolean;
  onStopAlarm: (itemId?: string) => void;
  onSetCustomSound: (url: string) => void;
  onClearCustomSound: () => void;
}

export function DeadlineAlarmAlert({ 
  alarms, 
  isPlaying, 
  onStopAlarm,
  onSetCustomSound,
  onClearCustomSound,
}: DeadlineAlarmAlertProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSoundSettings, setShowSoundSettings] = useState(false);

  if (alarms.length === 0) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Por favor, selecione um arquivo de áudio');
      return;
    }

    // Create a blob URL for the audio file
    const url = URL.createObjectURL(file);
    onSetCustomSound(url);
    toast.success('Som personalizado definido!');
    setShowSoundSettings(false);
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2 duration-300">
      <div 
        className={cn(
          "w-80 rounded-lg border-2 shadow-2xl overflow-hidden",
          isPlaying 
            ? "border-destructive bg-destructive/10 animate-pulse" 
            : "border-warning bg-warning/10"
        )}
      >
        {/* Header */}
        <div className={cn(
          "px-4 py-3 flex items-center justify-between",
          isPlaying ? "bg-destructive/20" : "bg-warning/20"
        )}>
          <div className="flex items-center gap-2">
            <Bell className={cn(
              "h-5 w-5",
              isPlaying ? "text-destructive animate-bounce" : "text-warning"
            )} />
            <span className="font-semibold text-foreground">
              ⏰ Prazo Próximo!
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSoundSettings(!showSoundSettings)}
              className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground"
              title="Configurar som"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              onClick={() => onStopAlarm()}
              className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground"
              title="Fechar todos"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sound settings */}
        {showSoundSettings && (
          <div className="px-4 py-2 bg-background/50 border-b border-border flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              <Upload className="h-3 w-3 mr-1" />
              Carregar som
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                onClearCustomSound();
                toast.success('Som padrão restaurado');
              }}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Padrão
            </Button>
          </div>
        )}

        {/* Alarms list */}
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto bg-card">
          {alarms.map((alarm) => (
            <div 
              key={alarm.itemId}
              className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {alarm.title}
                </p>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Clock className="h-3 w-3" />
                  <span>Prazo: {alarm.deadline}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onStopAlarm(alarm.itemId)}
                className="ml-2 shrink-0"
              >
                <BellOff className="h-4 w-4 mr-1" />
                Parar
              </Button>
            </div>
          ))}
        </div>

        {/* Stop all button */}
        {alarms.length > 1 && (
          <div className="p-3 border-t border-border bg-background/50">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onStopAlarm()}
            >
              <BellOff className="h-4 w-4 mr-2" />
              Parar Todos os Alarmes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
