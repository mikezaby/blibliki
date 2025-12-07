import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // in milliseconds, undefined means no auto-dismiss
}

interface NotificationsState {
  notifications: Notification[];
}

const initialState: NotificationsState = {
  notifications: [],
};

let notificationIdCounter = 0;

export const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (
      state,
      action: PayloadAction<Omit<Notification, "id">>,
    ) => {
      const id = `notification-${Date.now()}-${notificationIdCounter++}`;
      state.notifications.push({
        id,
        ...action.payload,
        duration: action.payload.duration ?? 5000, // default 5 seconds
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload,
      );
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const { addNotification, removeNotification, clearAllNotifications } =
  notificationsSlice.actions;

export default notificationsSlice.reducer;
