import { Component, ReactNode } from "react";
import { addNotification } from "@/notificationsSlice";
import { store } from "@/store";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Dispatch notification to Redux store
    store.dispatch(
      addNotification({
        type: "error",
        title: "Application Error",
        message: error.message,
        duration: 10000, // 10 seconds for critical errors
      }),
    );
  }

  render() {
    if (this.state.hasError) {
      // Return fallback UI if provided, otherwise return null
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}
