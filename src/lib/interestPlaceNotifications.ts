import type { AlbumMemory } from "@/lib/albumMemory";
import type { NotificationItem } from "@/services/notificationService";
import type { Post } from "@/services/postService";
import type { LiveStatus } from "@/services/statusService";

export type InterestPlaceSourceType = "post" | "status";

export type InterestPlaceTarget = {
  id: string;
  label: string;
  normalizedNames: string[];
};

type InterestPlaceNotificationInput = {
  userId: string;
  sourceId: string;
  sourceType: InterestPlaceSourceType;
  placeName: string;
  title?: string | null;
  content?: string | null;
  createdAt?: string | null;
};

const MAX_CONTENT_LENGTH = 72;
const LOCAL_NOTIFICATION_STORAGE_PREFIX = "dongple.interest-place-notifications";

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isBrowser() {
  return typeof window !== "undefined";
}

function getLocalNotificationStorageKey(userId: string) {
  return `${LOCAL_NOTIFICATION_STORAGE_PREFIX}:${userId}`;
}

function parseLocalNotifications(raw: string | null) {
  if (!raw) return [] as NotificationItem[];

  try {
    const parsed = JSON.parse(raw) as NotificationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalNotifications(userId: string, notifications: NotificationItem[]) {
  if (!isBrowser() || !userId) return;
  window.localStorage.setItem(
    getLocalNotificationStorageKey(userId),
    JSON.stringify(notifications.slice(0, 50)),
  );
}

export function normalizePlaceText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFKC")
    .replace(/<[^>]*>/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣]+/g, "")
    .trim();
}

function compactContent(value: string | null | undefined, maxLength = MAX_CONTENT_LENGTH) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function isInterestMemory(memory: AlbumMemory) {
  return memory.favorite || memory.type === "place";
}

export function getInterestPlaceTargets(memories: AlbumMemory[]) {
  return memories
    .filter(isInterestMemory)
    .map((memory) => {
      const names = unique([memory.title, memory.locationLabel]);
      const normalizedNames = unique(names.map((name) => normalizePlaceText(name))).filter(
        (name) => name.length >= 2,
      );

      return {
        id: memory.id,
        label: names[0] || "관심장소",
        normalizedNames,
      };
    })
    .filter((target) => target.normalizedNames.length > 0);
}

function isPlaceNameMatch(left: string, right: string) {
  if (!left || !right) return false;
  if (left === right) return true;

  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;

  return shorter.length >= 3 && longer.includes(shorter);
}

export function findMatchingInterestPlace(placeName: string | null | undefined, targets: InterestPlaceTarget[]) {
  const normalizedPlaceName = normalizePlaceText(placeName);
  if (!normalizedPlaceName) return null;

  return (
    targets.find((target) =>
      target.normalizedNames.some((targetName) => isPlaceNameMatch(normalizedPlaceName, targetName)),
    ) || null
  );
}

export function buildInterestPlaceNotification(input: InterestPlaceNotificationInput): NotificationItem {
  const dedupeKey = `place_update:${input.sourceType}:${input.sourceId}`;
  const isPost = input.sourceType === "post";
  const preview = compactContent(input.title || input.content);
  const title = isPost ? "관심장소에 새 소식이 왔어요" : "관심장소 현장상황이 올라왔어요";
  const contentPrefix = isPost
    ? `${input.placeName}에 새 소식이 올라왔어요.`
    : `${input.placeName}의 현장상황이 새로 공유됐어요.`;

  return {
    id: `local-${dedupeKey}`,
    user_id: input.userId,
    type: "place_update",
    title,
    content: preview ? `${contentPrefix} ${preview}` : contentPrefix,
    link_url: isPost ? `/news/post/${input.sourceId}` : `/map?place=${encodeURIComponent(input.placeName)}`,
    metadata: {
      local: true,
      source_id: input.sourceId,
      source_type: input.sourceType,
      place_name: input.placeName,
    },
    is_read: false,
    read_at: null,
    dedupe_key: dedupeKey,
    created_at: input.createdAt || new Date().toISOString(),
  };
}

export function getLocalInterestPlaceNotifications(userId: string) {
  if (!isBrowser() || !userId) return [] as NotificationItem[];

  return parseLocalNotifications(window.localStorage.getItem(getLocalNotificationStorageKey(userId))).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function hasLocalInterestPlaceNotification(userId: string, dedupeKey: string) {
  if (!dedupeKey) return false;
  return getLocalInterestPlaceNotifications(userId).some((item) => item.dedupe_key === dedupeKey);
}

export function saveLocalInterestPlaceNotification(notification: NotificationItem) {
  if (!notification.user_id || !notification.metadata?.local) return;

  const existing = getLocalInterestPlaceNotifications(notification.user_id).filter(
    (item) => item.id !== notification.id && item.dedupe_key !== notification.dedupe_key,
  );

  writeLocalNotifications(notification.user_id, [notification, ...existing]);
}

export function markLocalInterestPlaceNotificationAsRead(userId: string, notificationId: string, readAt: string) {
  const nextNotifications = getLocalInterestPlaceNotifications(userId).map((item) =>
    item.id === notificationId ? { ...item, is_read: true, read_at: item.read_at || readAt } : item,
  );

  writeLocalNotifications(userId, nextNotifications);
}

export function markAllLocalInterestPlaceNotificationsAsRead(userId: string, readAt: string) {
  const nextNotifications = getLocalInterestPlaceNotifications(userId).map((item) => ({
    ...item,
    is_read: true,
    read_at: item.read_at || readAt,
  }));

  writeLocalNotifications(userId, nextNotifications);
}

export function getPostPlaceName(post: Partial<Post>) {
  return post.place_name || null;
}

export function getStatusPlaceName(status: Partial<LiveStatus>) {
  return status.place_name || null;
}
