import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatBRL } from "@/lib/utils";
import { useCommercialSafe } from "@/contexts/CommercialContext";
import {
  useDeleteNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from "@/hooks/useNotifications";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "agora";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "client_new":
      return "👤";
    case "payment_reminder":
      return "💰";
    default:
      return "🔔";
  }
}

interface DisplayNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}

export function NotificationsPopover() {
  const commercialContext = useCommercialSafe();
  const paymentReminders = commercialContext?.paymentReminders ?? [];
  const dismissReminder = commercialContext?.dismissReminder ?? (() => {});

  const { data: dbNotifications = [] } = useNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const formattedDbNotifications: DisplayNotification[] = dbNotifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.message || "",
    read: notification.read,
    createdAt: new Date(notification.created_at),
  }));

  const paymentNotifications: DisplayNotification[] = paymentReminders
    .filter((reminder) => !reminder.dismissed)
    .map((reminder) => ({
      id: `payment-${reminder.id}`,
      type: "payment_reminder",
      title: "Cobranca de pagamento",
      body: `${reminder.clientName} (${reminder.clinicName}) - ${formatBRL(reminder.dealValue)} - Vencimento: ${format(new Date(reminder.paymentDeadline), "dd/MM/yyyy", { locale: ptBR })}`,
      read: false,
      createdAt: reminder.createdAt,
    }));

  const allNotifications = [...paymentNotifications, ...formattedDbNotifications].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const unreadCount = allNotifications.filter((notification) => !notification.read).length;
  const filteredNotifications =
    filter === "unread" ? allNotifications.filter((notification) => !notification.read) : allNotifications;

  const handleMarkAsRead = (id: string) => {
    if (id.startsWith("payment-")) {
      dismissReminder(id.replace("payment-", ""));
      return;
    }

    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
    paymentReminders.forEach((reminder) => {
      if (!reminder.dismissed) dismissReminder(reminder.id);
    });
  };

  const handleDeleteNotification = (id: string) => {
    if (id.startsWith("payment-")) {
      dismissReminder(id.replace("payment-", ""));
      return;
    }

    deleteNotificationMutation.mutate(id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificacoes"
          className="relative text-white/75 hover:text-white hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 bg-card border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold">Notificacoes</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs text-muted-foreground">
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <div className="flex gap-1 px-4 py-2 border-b border-border">
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-xs h-7"
          >
            Todas
          </Button>
          <Button
            variant={filter === "unread" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("unread")}
            className="text-xs h-7"
          >
            Nao lidas {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </div>

        <ScrollArea className="h-[320px]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificacao</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-4 py-3 hover:bg-surface-2 transition-colors cursor-pointer group",
                    !notification.read && "bg-primary/5",
                    notification.type === "payment_reminder" && !notification.read && "bg-destructive/5",
                  )}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm",
                            !notification.read && "font-medium",
                            notification.type === "payment_reminder" && !notification.read && "text-destructive",
                          )}
                        >
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
