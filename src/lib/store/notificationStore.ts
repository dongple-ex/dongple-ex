import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  getLocalInterestPlaceNotifications,
  markAllLocalInterestPlaceNotificationsAsRead,
  markLocalInterestPlaceNotificationAsRead,
  saveLocalInterestPlaceNotification,
} from "@/lib/interestPlaceNotifications";
import { supabase } from "@/lib/supabase";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  normalizeNotification,
  type NotificationItem,
} from "@/services/notificationService";

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isSubscribed: boolean;
  error: string | null;
  currentUserId: string | null;
  channel: RealtimeChannel | null;
  init: (userId: string) => Promise<void>;
  fetch: (userId: string) => Promise<void>;
  subscribe: (userId: string) => void;
  unsubscribe: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  prepend: (notification: NotificationItem) => void;
  reset: () => void;
}

function getUnreadCount(items: NotificationItem[]) {
  return items.filter((item) => !item.is_read).length;
}

function upsertNotification(items: NotificationItem[], nextItem: NotificationItem) {
  const nextItems = items.filter((item) => item.id !== nextItem.id);
  return [nextItem, ...nextItems].slice(0, 50);
}

function isLocalNotification(item: NotificationItem | undefined) {
  return Boolean(item?.metadata?.local);
}

function mergeNotifications(items: NotificationItem[]) {
  const seen = new Set<string>();

  return items
    .filter((item) => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,
  isSubscribed: false,
  error: null,
  currentUserId: null,
  channel: null,

  init: async (userId) => {
    if (!userId) {
      get().reset();
      return;
    }

    const { currentUserId, isSubscribed } = get();
    if (currentUserId === userId && isSubscribed) return;

    get().unsubscribe();
    set({ currentUserId: userId });
    await get().fetch(userId);
    get().subscribe(userId);
  },

  fetch: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const remoteItems = await fetchNotifications(userId);
      const localItems = getLocalInterestPlaceNotifications(userId);
      const items = mergeNotifications([...remoteItems, ...localItems]);
      set({
        items,
        unreadCount: getUnreadCount(items),
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "알림을 불러오지 못했습니다.",
      });
    }
  },

  subscribe: (userId) => {
    if (!userId) return;

    try {
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.eventType !== "INSERT" && payload.eventType !== "UPDATE") return;
            const nextItem = normalizeNotification(payload.new as Record<string, unknown>);

            set((state) => {
              const items = upsertNotification(state.items, nextItem);
              return {
                items,
                unreadCount: getUnreadCount(items),
              };
            });
          },
        )
        .subscribe((status) => {
          set({ isSubscribed: status === "SUBSCRIBED" });
        });

      set({ channel });
    } catch (error) {
      console.warn("Notification realtime subscription skipped:", error);
      set({ isSubscribed: false });
    }
  },

  unsubscribe: () => {
    const { channel } = get();
    if (channel) {
      channel.unsubscribe();
    }

    set({ channel: null, isSubscribed: false });
  },

  markAsRead: async (id) => {
    if (!id) return;

    const currentItem = get().items.find((item) => item.id === id);
    const readAt = new Date().toISOString();
    set((state) => {
      const items = state.items.map((item) =>
        item.id === id ? { ...item, is_read: true, read_at: item.read_at || readAt } : item,
      );
      return { items, unreadCount: getUnreadCount(items) };
    });

    if (isLocalNotification(currentItem) && currentItem?.user_id) {
      markLocalInterestPlaceNotificationAsRead(currentItem.user_id, id, readAt);
      return;
    }

    await markNotificationAsRead(id);
  },

  markAllAsRead: async (userId) => {
    if (!userId) return;

    const hasRemoteUnread = get().items.some((item) => !item.is_read && !isLocalNotification(item));
    const readAt = new Date().toISOString();
    set((state) => {
      const items = state.items.map((item) => ({ ...item, is_read: true, read_at: item.read_at || readAt }));
      return { items, unreadCount: 0 };
    });

    markAllLocalInterestPlaceNotificationsAsRead(userId, readAt);
    if (!hasRemoteUnread) return;
    await markAllNotificationsAsRead(userId);
  },

  prepend: (notification) => {
    if (isLocalNotification(notification)) {
      saveLocalInterestPlaceNotification(notification);
    }

    set((state) => {
      const items = upsertNotification(state.items, notification);
      return { items, unreadCount: getUnreadCount(items) };
    });
  },

  reset: () => {
    const { channel } = get();
    if (channel) {
      channel.unsubscribe();
    }

    set({
      items: [],
      unreadCount: 0,
      isLoading: false,
      isSubscribed: false,
      error: null,
      currentUserId: null,
      channel: null,
    });
  },
}));

