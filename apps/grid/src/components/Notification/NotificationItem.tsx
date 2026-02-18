import { Button } from "@blibliki/ui";
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

const colorMap = {
  success: {
    bg: "bg-green-50 dark:bg-green-900/80",
    border: "border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
    text: "text-green-900 dark:text-green-100",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-900/80",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    text: "text-red-900 dark:text-red-100",
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-900/80",
    border: "border-yellow-200 dark:border-yellow-800",
    icon: "text-yellow-600 dark:text-yellow-400",
    text: "text-yellow-900 dark:text-yellow-100",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/80",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    text: "text-blue-900 dark:text-blue-100",
  },
};

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
  const colors = colorMap[notification.type];

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
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        ${colors.bg} ${colors.border}
        animate-slideInRight
        min-w-[320px] max-w-md
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${colors.icon}`} />
      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold text-sm ${colors.text}`}>
          {notification.title}
        </h4>
        {notification.message && (
          <p className={`text-sm mt-1 ${colors.text} opacity-90`}>
            {notification.message}
          </p>
        )}
      </div>
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
    </div>
  );
}
