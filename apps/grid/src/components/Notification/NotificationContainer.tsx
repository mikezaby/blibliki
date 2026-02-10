import { Box, Flex } from "@chakra-ui/react";
import { useAppSelector } from "@/hooks";
import { RootState } from "@/store";
import NotificationItem from "./NotificationItem";

export default function NotificationContainer() {
  const notifications = useAppSelector(
    (state: RootState) => state.notifications.notifications,
  );

  if (notifications.length === 0) return null;

  return (
    <Flex
      position="fixed"
      top="54px"
      right="4"
      zIndex="10"
      direction="column"
      gap="3"
      pointerEvents="none"
      aria-live="polite"
      aria-atomic="true"
    >
      {notifications.map((notification) => (
        <Box key={notification.id} pointerEvents="auto">
          <NotificationItem notification={notification} />
        </Box>
      ))}
    </Flex>
  );
}
