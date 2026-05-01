import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";
import { addNotification } from "@/notificationsSlice";
import { store } from "@/store";

export function RouterErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  useEffect(() => {
    // Dispatch error notification when error occurs
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An error occurred while loading this page";

    store.dispatch(
      addNotification({
        type: "error",
        title: "Route Error",
        message: errorMessage,
        duration: 10000, // 10 seconds for route errors
      }),
    );
  }, [error]);

  // Navigate back to home page on route error
  useEffect(() => {
    const timeout = setTimeout(() => {
      void router.navigate({ to: "/" });
      reset();
    }, 500);

    return () => {
      clearTimeout(timeout);
    };
  }, [router, reset]);

  // Return null since we're showing toast notification and auto-navigating
  return null;
}
