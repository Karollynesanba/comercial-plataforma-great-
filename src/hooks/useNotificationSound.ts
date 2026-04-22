import { useState, useEffect, useCallback, useRef } from 'react';

// Generate notification sounds using Web Audio API
const createAudioContext = () => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  return new AudioContext();
};

const playNotificationBeep = (
  audioContext: AudioContext,
  type: 'urgent' | 'warning' = 'urgent'
) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Different tones for different urgency levels
  if (type === 'urgent') {
    oscillator.frequency.value = 880; // Higher pitch for urgent
    oscillator.type = 'sine';
  } else {
    oscillator.frequency.value = 440; // Lower pitch for warning
    oscillator.type = 'triangle';
  }

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};

interface UrgentNotification {
  id: string;
  title: string;
  message: string;
  type: 'TASK_DUE_SOON' | 'TASK_OVERDUE';
  createdAt: Date;
}

interface UseNotificationSoundOptions {
  enabled?: boolean;
  soundInterval?: number; // Interval in ms between sound alerts
}

export function useNotificationSound(options: UseNotificationSoundOptions = {}) {
  const { enabled = true, soundInterval = 30000 } = options; // Default: 30 seconds

  const [urgentNotifications, setUrgentNotifications] = useState<UrgentNotification[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [isMuted, setIsMuted] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play sound for urgent notifications
  const playSound = useCallback((type: 'urgent' | 'warning' = 'urgent') => {
    if (!enabled || isMuted) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = createAudioContext();
      }
      
      // Resume audio context if suspended (browser policy)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      playNotificationBeep(audioContextRef.current, type);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [enabled, isMuted]);

  // Trigger browser vibration if supported
  const vibrate = useCallback(() => {
    if (!enabled || isMuted) return;
    
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]); // Vibrate pattern
    }
  }, [enabled, isMuted]);

  // Add a new urgent notification
  const addUrgentNotification = useCallback((notification: Omit<UrgentNotification, 'createdAt'>) => {
    setUrgentNotifications(prev => {
      // Check if already exists
      if (prev.some(n => n.id === notification.id)) return prev;
      
      return [...prev, { ...notification, createdAt: new Date() }];
    });
  }, []);

  // Acknowledge a notification (stop sound for it)
  const acknowledgeNotification = useCallback((notificationId: string) => {
    setAcknowledgedIds(prev => new Set([...prev, notificationId]));
  }, []);

  // Acknowledge all notifications
  const acknowledgeAll = useCallback(() => {
    const allIds = urgentNotifications.map(n => n.id);
    setAcknowledgedIds(prev => new Set([...prev, ...allIds]));
  }, [urgentNotifications]);

  // Get unacknowledged notifications
  const unacknowledgedNotifications = urgentNotifications.filter(
    n => !acknowledgedIds.has(n.id)
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setUrgentNotifications([]);
    setAcknowledgedIds(new Set());
  }, []);

  // Play sound periodically for unacknowledged notifications
  useEffect(() => {
    if (unacknowledgedNotifications.length === 0 || !enabled || isMuted) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Play immediately when new urgent notification arrives
    const hasOverdue = unacknowledgedNotifications.some(n => n.type === 'TASK_OVERDUE');
    playSound(hasOverdue ? 'urgent' : 'warning');
    vibrate();

    // Set up interval for repeated alerts
    intervalRef.current = setInterval(() => {
      const hasOverdue = unacknowledgedNotifications.some(n => n.type === 'TASK_OVERDUE');
      playSound(hasOverdue ? 'urgent' : 'warning');
      vibrate();
    }, soundInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [unacknowledgedNotifications.length, enabled, isMuted, soundInterval, playSound, vibrate]);

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    urgentNotifications,
    unacknowledgedNotifications,
    acknowledgedIds,
    isMuted,
    addUrgentNotification,
    acknowledgeNotification,
    acknowledgeAll,
    toggleMute,
    clearAll,
    playSound,
    vibrate,
  };
}
