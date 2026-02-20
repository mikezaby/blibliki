import { Stack } from "@blibliki/ui";
import { useAppSelector } from "@/hooks";
import { RootState } from "@/store";
import NotificationItem from "./NotificationItem";

export default function NotificationContainer() {
  const notifications = useAppSelector(
    (state: RootState) => state.notifications.notifications,
  );

  if (notifications.length === 0) return null;

  return (
    <Stack
      gap={3}
      className="pointer-events-none fixed right-4 top-[54px] z-10"
      aria-live="polite"
      aria-atomic="true"
    >
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem notification={notification} />
        </div>
      ))}
    </Stack>
  );
}
