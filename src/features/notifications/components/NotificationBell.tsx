"use client";

import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useNotificationStore } from "@/lib/store/notificationStore";
import { useUIStore } from "@/lib/store/uiStore";

export default function NotificationBell() {
  const userId = useAuthStore((state) => state.userId);
  const isAuthInitialized = useAuthStore((state) => state.isAuthInitialized);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const initNotifications = useNotificationStore((state) => state.init);
  const resetNotifications = useNotificationStore((state) => state.reset);
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);

  useEffect(() => {
    if (!isAuthInitialized) return;
    if (!userId) {
      resetNotifications();
      return;
    }

    initNotifications(userId);
  }, [initNotifications, isAuthInitialized, resetNotifications, userId]);

  return (
    <button
      type="button"
      onClick={() => openBottomSheet("notifications")}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-secondary active:scale-95"
      aria-label="알림 열기"
    >
      <Bell size={22} />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white shadow-sm">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

