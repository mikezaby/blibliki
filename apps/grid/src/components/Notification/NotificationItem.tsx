import { Button, Stack, Surface } from "@blibliki/ui";
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

const toneMap = {
  success: "var(--ui-color-success-500)",
  error: "var(--ui-color-error-500)",
  warning: "var(--ui-color-warning-500)",
  info: "var(--ui-color-info-500)",
} as const;

const buttonColorMap = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "info",
} as const;

export default function NotificationItem({
  notification,
}: NotificationItemProps) {
  const dispatch = useAppDispatch();
  const Icon = iconMap[notification.type];
  const tone = toneMap[notification.type];

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
      className="min-w-[320px] max-w-md animate-slideInRight p-4"
      role="alert"
      style={{
        background: `color-mix(in oklab, ${tone}, var(--ui-color-surface-raised) 88%)`,
        borderColor: `color-mix(in oklab, ${tone}, var(--ui-color-border-subtle) 65%)`,
      }}
    >
      <Stack direction="row" align="start" gap={3}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: tone }} />
        <Stack gap={1} className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold">{notification.title}</h4>
          {notification.message && (
            <p
              className="text-sm"
              style={{ color: "var(--ui-color-text-secondary)" }}
            >
              {notification.message}
            </p>
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
