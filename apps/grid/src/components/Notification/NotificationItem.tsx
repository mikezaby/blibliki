import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
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
    bg: "green.50",
    bgDark: "green.900",
    border: "green.200",
    borderDark: "green.800",
    icon: "green.600",
    iconDark: "green.400",
    text: "green.900",
    textDark: "green.100",
  },
  error: {
    bg: "red.50",
    bgDark: "red.900",
    border: "red.200",
    borderDark: "red.800",
    icon: "red.600",
    iconDark: "red.400",
    text: "red.900",
    textDark: "red.100",
  },
  warning: {
    bg: "yellow.50",
    bgDark: "yellow.900",
    border: "yellow.200",
    borderDark: "yellow.800",
    icon: "yellow.600",
    iconDark: "yellow.400",
    text: "yellow.900",
    textDark: "yellow.100",
  },
  info: {
    bg: "blue.50",
    bgDark: "blue.900",
    border: "blue.200",
    borderDark: "blue.800",
    icon: "blue.600",
    iconDark: "blue.400",
    text: "blue.900",
    textDark: "blue.100",
  },
};

const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(10px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

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
    <Flex
      role="alert"
      align="flex-start"
      gap="3"
      p="4"
      rounded="lg"
      borderWidth="1px"
      boxShadow="lg"
      bg={colors.bg}
      borderColor={colors.border}
      _dark={{ bg: colors.bgDark, borderColor: colors.borderDark }}
      animation={`${slideInRight} 0.18s ease-out`}
      minW="320px"
      maxW="md"
    >
      <Box
        mt="0.5"
        flexShrink={0}
        color={colors.icon}
        _dark={{ color: colors.iconDark }}
      >
        <Icon size={20} />
      </Box>
      <Box flex="1" minW="0">
        <Text
          fontWeight="semibold"
          fontSize="sm"
          color={colors.text}
          _dark={{ color: colors.textDark }}
        >
          {notification.title}
        </Text>
        {notification.message && (
          <Text
            fontSize="sm"
            mt="1"
            opacity={0.9}
            color={colors.text}
            _dark={{ color: colors.textDark }}
          >
            {notification.message}
          </Text>
        )}
      </Box>
      <chakra.button
        onClick={handleClose}
        aria-label="Close notification"
        flexShrink={0}
        rounded="md"
        p="1"
        transition="colors 0.2s"
        color={colors.text}
        _dark={{ color: colors.textDark }}
        _hover={{ bg: "blackAlpha.100" }}
      >
        <X size={16} />
      </chakra.button>
    </Flex>
  );
}
