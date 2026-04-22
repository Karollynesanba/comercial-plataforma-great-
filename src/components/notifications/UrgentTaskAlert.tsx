import { useEffect, useMemo } from 'react';
import { AlertTriangle, Check, Clock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useMyOverdueTasks } from '@/hooks/useOverdueTasks';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function UrgentTaskAlert() {
  const { data: overdueTasks = [] } = useMyOverdueTasks();
  const {
    unacknowledgedNotifications,
    isMuted,
    addUrgentNotification,
    acknowledgeNotification,
    acknowledgeAll,
    toggleMute,
  } = useNotificationSound({ soundInterval: 45000 }); // Play sound every 45 seconds

  // Convert overdue tasks to urgent notifications
  useEffect(() => {
    overdueTasks.forEach((task) => {
      const type = task.isOverdue ? 'TASK_OVERDUE' : 'TASK_DUE_SOON';
      const dueDate = format(new Date(task.due_date), "dd/MM", { locale: ptBR });
      
      let message = '';
      if (task.isOverdue) {
        message = `Estava prevista para ${dueDate}. Conclua urgentemente!`;
      } else if (task.isDueToday) {
        message = `Vence hoje! Finalize o mais rápido possível.`;
      } else {
        message = `Vence em ${dueDate}. Não se esqueça!`;
      }

      addUrgentNotification({
        id: task.id,
        title: task.title,
        message,
        type,
      });
    });
  }, [overdueTasks, addUrgentNotification]);

  // Filter notifications that still have corresponding overdue tasks
  const activeNotifications = useMemo(() => {
    const overdueTaskIds = new Set(overdueTasks.map(t => t.id));
    return unacknowledgedNotifications.filter(n => overdueTaskIds.has(n.id));
  }, [unacknowledgedNotifications, overdueTasks]);

  if (activeNotifications.length === 0) return null;

  const hasOverdue = activeNotifications.some(n => n.type === 'TASK_OVERDUE');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        className="fixed top-4 right-4 z-[100] max-w-sm w-full"
      >
        <div
          className={cn(
            'rounded-lg shadow-2xl border-2 overflow-hidden',
            hasOverdue 
              ? 'bg-destructive/10 border-destructive animate-pulse' 
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
          )}
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center justify-between px-4 py-2',
              hasOverdue ? 'bg-destructive text-destructive-foreground' : 'bg-orange-500 text-white'
            )}
          >
            <div className="flex items-center gap-2">
              {hasOverdue ? (
                <AlertTriangle className="h-5 w-5 animate-bounce" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              <span className="font-semibold text-sm">
                {hasOverdue ? 'Tarefas Atrasadas!' : 'Tarefas Urgentes'}
              </span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-bold">
                {activeNotifications.length}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-current hover:bg-white/20"
                onClick={toggleMute}
                title={isMuted ? 'Ativar som' : 'Silenciar'}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[200px] overflow-y-auto divide-y divide-border">
            {activeNotifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'px-4 py-3 flex items-start gap-3',
                  notification.type === 'TASK_OVERDUE' && 'bg-destructive/5'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {notification.type === 'TASK_OVERDUE' ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {notification.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs flex-shrink-0"
                  onClick={() => acknowledgeNotification(notification.id)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  OK
                </Button>
              </div>
            ))}
          </div>

          {activeNotifications.length > 5 && (
            <div className="px-4 py-2 text-center text-xs text-muted-foreground border-t border-border">
              +{activeNotifications.length - 5} mais notificações
            </div>
          )}

          {/* Footer with "Acknowledge All" button */}
          <div className="px-4 py-3 border-t border-border bg-background/50">
            <Button
              onClick={acknowledgeAll}
              className={cn(
                'w-full gap-2',
                hasOverdue 
                  ? 'bg-destructive hover:bg-destructive/90' 
                  : 'bg-orange-500 hover:bg-orange-600'
              )}
            >
              <Check className="h-4 w-4" />
              Visualizado - Parar Alerta
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
