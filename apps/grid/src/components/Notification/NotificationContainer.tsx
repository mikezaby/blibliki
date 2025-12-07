import { useAppSelector } from "@/hooks";
import { RootState } from "@/store";
import NotificationItem from "./NotificationItem";

export default function NotificationContainer() {
  const notifications = useAppSelector(
    (state: RootState) => state.notifications.notifications,
  );

  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed top-[54px] right-4 z-10 flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem notification={notification} />
        </div>
      ))}
    </div>
  );
}
