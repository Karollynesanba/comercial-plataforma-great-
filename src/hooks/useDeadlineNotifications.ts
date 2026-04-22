import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MyDayItemWithDeadline {
  id: string;
  title: string;
  deadline_time: string | null;
  deadline_notified: boolean;
  status: string;
}

interface ActiveAlarm {
  itemId: string;
  title: string;
  deadline: string;
}

// Default alarm sound - iPhone style alarm (can be customized by user)
const DEFAULT_ALARM_SOUND = '/sounds/alarm-iphone.mp3';
const CHECK_INTERVAL_MS = 60000; // Check every minute
const ALERT_BEFORE_MINUTES = 60; // 1 hour before deadline
const ALARM_REPEAT_INTERVAL_MS = 3000; // Repeat sound every 3 seconds

export function useDeadlineNotifications() {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([]);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  // Get custom alarm sound from localStorage or use default
  const getAlarmSoundUrl = useCallback(() => {
    const customSound = localStorage.getItem('deadline_alarm_sound');
    return customSound || DEFAULT_ALARM_SOUND;
  }, []);

  // Set custom alarm sound
  const setCustomAlarmSound = useCallback((url: string) => {
    localStorage.setItem('deadline_alarm_sound', url);
    // Update audio element with new sound
    if (audioRef.current) {
      audioRef.current.src = url;
    }
  }, []);

  // Clear custom alarm sound (use default)
  const clearCustomAlarmSound = useCallback(() => {
    localStorage.removeItem('deadline_alarm_sound');
    if (audioRef.current) {
      audioRef.current.src = DEFAULT_ALARM_SOUND;
    }
  }, []);

  const playAlarmOnce = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(getAlarmSoundUrl());
      audioRef.current.volume = 0.8;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(console.error);
  }, [getAlarmSoundUrl]);

  const startRepeatingAlarm = useCallback(() => {
    if (isAlarmPlaying) return;
    
    setIsAlarmPlaying(true);
    playAlarmOnce(); // Play immediately

    // Then repeat every 3 seconds
    alarmIntervalRef.current = setInterval(() => {
      playAlarmOnce();
    }, ALARM_REPEAT_INTERVAL_MS);
  }, [isAlarmPlaying, playAlarmOnce]);

  const stopAlarm = useCallback(async (itemId?: string) => {
    // Stop the repeating sound
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setIsAlarmPlaying(false);

    if (itemId) {
      // Remove specific alarm from active alarms
      setActiveAlarms(prev => prev.filter(a => a.itemId !== itemId));
      
      // Mark as notified in database
      await supabase
        .from('my_day_items')
        .update({ deadline_notified: true })
        .eq('id', itemId);
    } else {
      // Stop all alarms
      const alarmIds = activeAlarms.map(a => a.itemId);
      setActiveAlarms([]);
      
      // Mark all as notified
      for (const id of alarmIds) {
        await supabase
          .from('my_day_items')
          .update({ deadline_notified: true })
          .eq('id', id);
      }
    }
  }, [activeAlarms]);

  const checkDeadlines = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    try {
      // Fetch items with deadlines that are not completed and not yet notified
      const { data: items, error } = await supabase
        .from('my_day_items')
        .select('id, title, deadline_time, deadline_notified, status')
        .eq('user_id', user.id)
        .eq('date', today)
        .not('deadline_time', 'is', null)
        .neq('status', 'CONCLUIDO')
        .eq('deadline_notified', false);

      if (error) throw error;

      const newAlarms: ActiveAlarm[] = [];

      for (const item of items || []) {
        if (!item.deadline_time) continue;

        // Parse deadline time (format: "HH:MM:SS" or "HH:MM")
        const [hours, minutes] = item.deadline_time.split(':').map(Number);
        const deadlineInMinutes = hours * 60 + minutes;
        const minutesUntilDeadline = deadlineInMinutes - currentTimeInMinutes;

        // If within 1 hour (60 minutes) of deadline, trigger alarm
        if (minutesUntilDeadline > 0 && minutesUntilDeadline <= ALERT_BEFORE_MINUTES) {
          // Check if this alarm is already active
          const alreadyActive = activeAlarms.some(a => a.itemId === item.id);
          if (!alreadyActive) {
            newAlarms.push({
              itemId: item.id,
              title: item.title,
              deadline: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
            });
          }
        }
      }

      if (newAlarms.length > 0) {
        setActiveAlarms(prev => [...prev, ...newAlarms]);
        startRepeatingAlarm();
      }
    } catch (error) {
      console.error('Error checking deadlines:', error);
    }
  }, [user, activeAlarms, startRepeatingAlarm]);

  useEffect(() => {
    if (!user) return;

    // Initial check
    checkDeadlines();

    // Set up interval
    intervalRef.current = setInterval(checkDeadlines, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
    };
  }, [user, checkDeadlines]);

  return { 
    activeAlarms, 
    isAlarmPlaying, 
    stopAlarm, 
    checkDeadlines,
    setCustomAlarmSound,
    clearCustomAlarmSound,
    getAlarmSoundUrl,
  };
}
