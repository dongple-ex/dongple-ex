"use client";

import { BellOff, CheckCheck, MapPinned, Megaphone, MessageCircle, ShieldCheck, TrafficCone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useNotificationStore } from "@/lib/store/notificationStore";
import { useUIStore } from "@/lib/store/uiStore";
import type { NotificationItem, NotificationType } from "@/services/notificationService";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

function getNotificationIcon(type: NotificationType) {
  if (type === "reply") return MessageCircle;
  if (type === "status_response") return TrafficCone;
  if (type === "trust") return ShieldCheck;
  if (type === "place_update") return MapPinned;
  return Megaphone;
}

function getIconClass(type: NotificationType) {
  if (type === "reply") return "bg-sky-50 text-sky-600";
  if (type === "status_response") return "bg-emerald-50 text-emerald-600";
  if (type === "trust") return "bg-amber-50 text-amber-600";
  if (type === "place_update") return "bg-rose-50 text-rose-600";
  return "bg-violet-50 text-violet-600";
}

function NotificationRow({ item, onSelect }: { item: NotificationItem; onSelect: (item: NotificationItem) => void }) {
  const Icon = getNotificationIcon(item.type);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`relative w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
        item.is_read
          ? "border-border bg-card-bg text-foreground/65"
          : "border-secondary/20 bg-secondary/5 text-foreground shadow-sm"
      }`}
    >
      {!item.is_read && <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-red-500" />}
      <div className="flex gap-3 pr-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${getIconClass(item.type)}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`truncate text-[14px] ${item.is_read ? "font-bold" : "font-black"}`}>{item.title}</p>
            <span className="shrink-0 text-[10px] font-bold text-foreground/35">{formatTime(item.created_at)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-relaxed text-foreground/55">
            {item.content}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function NotificationSheet() {
  const router = useRouter();
  const closeBottomSheet = useUIStore((state) => state.closeBottomSheet);
  const userId = useAuthStore((state) => state.userId);
  const items = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  const handleSelect = async (item: NotificationItem) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }

    closeBottomSheet();
    router.push(item.link_url || "/");
  };

  const handleMarkAll = async () => {
    await markAllAsRead(userId);
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-[82px] rounded-2xl bg-foreground/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-nav-bg/50 px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-card-bg text-foreground/25">
          <BellOff size={26} />
        </div>
        <p className="text-[15px] font-black text-foreground">아직 알림이 없어요</p>
        <p className="mt-2 max-w-[240px] text-[12px] font-medium leading-relaxed text-foreground/45">
          댓글, 상황응답, 신뢰도 변화가 생기면 여기에 모입니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-black text-foreground/45">읽지 않은 알림 {unreadCount}개</p>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-2 text-[11px] font-black text-foreground/55 transition-colors hover:bg-foreground/10 disabled:opacity-35"
        >
          <CheckCheck size={14} />
          모두 읽음
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <NotificationRow key={item.id} item={item} onSelect={handleSelect} />
        ))}
      </div>
    </div>
  );
}

