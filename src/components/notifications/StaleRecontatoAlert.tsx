import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AlertTriangle, Volume2, VolumeX, X, Phone, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCommercial } from '@/contexts/CommercialContext';
import { AnimatePresence, motion } from 'framer-motion';
import { differenceInDays } from 'date-fns';

const STALE_DAYS_THRESHOLD = 5;

// Use the existing iPhone alarm sound
const ALARM_SOUND_URL = '/sounds/alarm-iphone.mp3';

interface StaleClient {
  id: string;
  clientName: string;
  daysInStage: number;
  stage: string;
}

export function StaleRecontatoAlert() {
  const { pipelineClients } = useCommercial();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(ALARM_SOUND_URL);
    audioRef.current.loop = false;
    audioRef.current.volume = 0.7;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Find clients in Recontato stages (NO_SHOW, TAXA_INTERESSE, NEGOCIACAO) 
  // that have been stale for more than 5 days
  const staleClients = useMemo<StaleClient[]>(() => {
    const recontatoStages = ['NO_SHOW', 'TAXA_INTERESSE', 'NEGOCIACAO'];
    
    return pipelineClients
      .filter(client => {
        if (!client.ativo) return false;
        if (!recontatoStages.includes(client.stage)) return false;
        if (!client.lastStageChange) return false;
        
        const daysInStage = differenceInDays(new Date(), new Date(client.lastStageChange));
        return daysInStage > STALE_DAYS_THRESHOLD;
      })
      .map(client => ({
        id: client.id,
        clientName: client.clientName,
        daysInStage: differenceInDays(new Date(), new Date(client.lastStageChange!)),
        stage: client.stage,
      }))
      .sort((a, b) => b.daysInStage - a.daysInStage);
  }, [pipelineClients]);

  // Filter out dismissed clients
  const activeAlerts = useMemo(() => {
    return staleClients.filter(c => !dismissedIds.has(c.id));
  }, [staleClients, dismissedIds]);

  const dismissClient = useCallback((clientId: string) => {
    setDismissedIds(prev => new Set([...prev, clientId]));
  }, []);

  const dismissAll = useCallback(() => {
    setDismissedIds(new Set(staleClients.map(c => c.id)));
    setSoundEnabled(false);
  }, [staleClients]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Play sound function
  const playSound = useCallback(() => {
    if (isMuted || !soundEnabled || activeAlerts.length === 0) return;
    
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => {
          console.log('Audio play failed:', err);
        });
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [isMuted, soundEnabled, activeAlerts.length]);

  // Enable sound with user interaction (required by browsers)
  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    // Play immediately after enabling
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Audio play failed:', err);
      });
    }
  }, []);

  // Vibrate if supported
  const vibrate = useCallback(() => {
    if (isMuted || activeAlerts.length === 0) return;
    
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }
  }, [isMuted, activeAlerts.length]);

  // Play sound periodically for active alerts (only if sound is enabled)
  useEffect(() => {
    if (activeAlerts.length === 0 || isMuted || !soundEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Play immediately when sound is enabled
    playSound();
    vibrate();

    // Set up interval for repeated alerts (every 45 seconds)
    intervalRef.current = setInterval(() => {
      playSound();
      vibrate();
    }, 45000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeAlerts.length, isMuted, soundEnabled, playSound, vibrate]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (activeAlerts.length === 0) return null;

  const STAGE_LABELS: Record<string, string> = {
    'NO_SHOW': 'No Show',
    'TAXA_INTERESSE': 'Taxa de Interesse',
    'NEGOCIACAO': 'Negociação',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.8 }}
        animate={{ 
          opacity: 1, 
          x: 0, 
          scale: 1,
          transition: { type: 'spring', stiffness: 300, damping: 20 }
        }}
        exit={{ opacity: 0, x: 100, scale: 0.8 }}
        className="fixed top-4 right-4 z-[200] max-w-md w-full"
      >
        <div
          className={cn(
            'rounded-xl shadow-2xl border-4 overflow-hidden',
            'bg-gradient-to-br from-red-600 to-orange-600',
            'border-yellow-400',
            'animate-pulse'
          )}
          style={{
            boxShadow: '0 0 40px rgba(239, 68, 68, 0.6), 0 0 80px rgba(239, 68, 68, 0.4)',
          }}
        >
          {/* Header - Always visible */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/30">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ 
                  rotate: [0, -15, 15, -15, 15, 0],
                  scale: [1, 1.2, 1, 1.2, 1]
                }}
                transition={{ 
                  duration: 0.5, 
                  repeat: Infinity, 
                  repeatDelay: 2 
                }}
              >
                <AlertTriangle className="h-7 w-7 text-yellow-300" />
              </motion.div>
              <div>
                <span className="font-black text-lg text-white uppercase tracking-wide">
                  ⚠️ ALERTA DE RECONTATO! ⚠️
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="bg-yellow-400 text-black px-2 py-0.5 rounded-full text-xs font-bold animate-bounce">
                    {activeAlerts.length} CLIENTE{activeAlerts.length > 1 ? 'S' : ''} PARADO{activeAlerts.length > 1 ? 'S' : ''}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {!soundEnabled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-yellow-300 hover:bg-white/20 gap-1 text-xs font-bold animate-pulse"
                  onClick={enableSound}
                  title="Clique para ativar o som do alarme"
                >
                  <Play className="h-4 w-4" />
                  ATIVAR SOM
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={toggleMute}
                  title={isMuted ? 'Ativar som' : 'Silenciar'}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? '+' : '−'}
              </Button>
            </div>
          </div>

          {/* Content - Collapsible */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                {/* Client list */}
                <div className="max-h-[250px] overflow-y-auto bg-black/20">
                  {activeAlerts.slice(0, 5).map((client, index) => (
                    <motion.div
                      key={client.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="px-4 py-3 border-b border-white/20 last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Phone className="h-4 w-4 text-yellow-300" />
                            <span className="text-white font-bold text-base truncate">
                              {client.clientName.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-yellow-200 text-sm font-medium">
                            🚨 {client.daysInStage} DIAS NA ABA DE RECONTATO!
                          </p>
                          <p className="text-white/80 text-xs mt-1">
                            Etapa: {STAGE_LABELS[client.stage] || client.stage}
                          </p>
                          <p className="text-yellow-300 text-xs font-semibold mt-1 animate-pulse">
                            👉 FAÇA O FOLLOW UP AGORA!
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/20 border-white/40 text-white hover:bg-white/30 text-xs shrink-0"
                          onClick={() => dismissClient(client.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          OK
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {activeAlerts.length > 5 && (
                  <div className="px-4 py-2 text-center text-white/80 text-sm bg-black/30 border-t border-white/20">
                    +{activeAlerts.length - 5} mais clientes precisam de atenção!
                  </div>
                )}

                {/* Footer */}
                <div className="px-4 py-3 bg-black/40">
                  <Button
                    onClick={dismissAll}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    ENTENDI - FECHAR TODOS OS ALERTAS
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
