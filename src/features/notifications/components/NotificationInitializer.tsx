"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useNotificationStore } from "@/lib/store/notificationStore";

export default function NotificationInitializer() {
  const userId = useAuthStore((state) => state.userId);
  const isAuthInitialized = useAuthStore((state) => state.isAuthInitialized);
  const initNotifications = useNotificationStore((state) => state.init);
  const resetNotifications = useNotificationStore((state) => state.reset);

  useEffect(() => {
    if (!isAuthInitialized) return;
    if (!userId) {
      resetNotifications();
      return;
    }

    initNotifications(userId);
  }, [initNotifications, isAuthInitialized, resetNotifications, userId]);

  return null;
}
