import { Button, Stack, Surface, Text } from "@blibliki/ui";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { useAppDispatch } from "@/hooks";
import { Notification, removeNotification } from "@/notificationsSlice";

interface NotificationItemProps {
  notification: Notification;
}

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const buttonColorMap = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "info",
} as const;

const surfaceIntentMap = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "info",
} as const;

const iconColorClassMap = {
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
  info: "text-info",
} as const;

export default function NotificationItem({
  notification,
}: NotificationItemProps) {
  const dispatch = useAppDispatch();
  const Icon = iconMap[notification.type];

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        dispatch(removeNotification(notification.id));
      }, notification.duration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [notification.id, notification.duration, dispatch]);

  const handleClose = () => {
    dispatch(removeNotification(notification.id));
  };

  return (
    <Surface
      tone="raised"
      border="subtle"
      radius="lg"
      intent={surfaceIntentMap[notification.type]}
      className="min-w-[320px] max-w-md animate-slideInRight p-4"
      role="alert"
    >
      <Stack direction="row" align="start" gap={3}>
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${iconColorClassMap[notification.type]}`}
        />
        <Stack gap={1} className="min-w-0 flex-1">
          <Text asChild size="sm" weight="semibold">
            <h4>{notification.title}</h4>
          </Text>
          {notification.message && (
            <Text tone="secondary">{notification.message}</Text>
          )}
        </Stack>
        <Button
          onClick={handleClose}
          size="icon"
          variant="text"
          color={buttonColorMap[notification.type]}
          className="h-6 w-6 shrink-0 p-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </Button>
      </Stack>
    </Surface>
  );
}
