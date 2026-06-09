import {
  hasLocalInterestPlaceNotification,
  normalizePlaceText,
} from "@/lib/interestPlaceNotifications";
import type { NotificationItem } from "@/services/notificationService";

export type NearbyActionKind =
  | "answer_request"
  | "verify_status"
  | "correct_status"
  | "share_here"
  | "share_event_status";

export type NearbyStatusCandidate = {
  id?: string | null;
  user_id?: string | null;
  place_name?: string | null;
  category?: string | null;
  status?: string | null;
  is_request?: boolean | null;
  is_hidden?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  message?: string | null;
  event_id?: string | number | null;
  tourapi_content_id?: string | number | null;
  created_at?: string | null;
  expires_at?: string | null;
};

type GpsFix = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  receivedAt: string | null;
};

type NearbyActionCandidate = {
  notification: NotificationItem;
  placeKey: string;
};

type NearbyActionHistoryItem = {
  dedupeKey: string;
  placeKey: string;
  createdAt: string;
};

const GPS_MAX_AGE_MS = 10 * 60 * 1000;
const GPS_MAX_ACCURACY_M = 100;
const STATUS_WINDOW_MS = 30 * 60 * 1000;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const PLACE_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const DAILY_MAX_NOTIFICATIONS = 3;
const HISTORY_PREFIX = "dongple.nearby-action-history";

function isBrowser() {
  return typeof window !== "undefined";
}

function getHistoryKey(userId: string) {
  return `${HISTORY_PREFIX}:${userId}`;
}

function parseHistory(raw: string | null) {
  if (!raw) return [] as NearbyActionHistoryItem[];

  try {
    const parsed = JSON.parse(raw) as NearbyActionHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getHistory(userId: string) {
  if (!isBrowser() || !userId) return [] as NearbyActionHistoryItem[];
  return parseHistory(window.localStorage.getItem(getHistoryKey(userId)));
}

function writeHistory(userId: string, history: NearbyActionHistoryItem[]) {
  if (!isBrowser() || !userId) return;
  window.localStorage.setItem(getHistoryKey(userId), JSON.stringify(history.slice(0, 80)));
}

function compactText(value: string | null | undefined, maxLength = 64) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function toTime(value: string | null | undefined) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
}

function getTodayKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidCoordinate(lat: unknown, lng: unknown) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 33 &&
    lat <= 39 &&
    lng >= 124 &&
    lng <= 132
  );
}

export function getDistanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadiusM = 6371000;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

export function isFreshGpsFix(fix: GpsFix, now = Date.now()) {
  if (!isValidCoordinate(fix.latitude, fix.longitude)) return false;
  if (fix.accuracy === null || !Number.isFinite(fix.accuracy) || fix.accuracy > GPS_MAX_ACCURACY_M) return false;

  const receivedAt = toTime(fix.receivedAt);
  if (!receivedAt) return false;
  return now - receivedAt <= GPS_MAX_AGE_MS;
}

function getRadiusMeters(status: NearbyStatusCandidate) {
  if (status.event_id || status.tourapi_content_id) return 500;

  const category = status.category || "";
  if (category.includes("카페") || category.includes("식당")) return 150;
  return 250;
}

function getActionKind(status: NearbyStatusCandidate): NearbyActionKind {
  return status.is_request ? "answer_request" : "verify_status";
}

function getActionText(kind: NearbyActionKind, status: NearbyStatusCandidate) {
  const placeName = status.place_name || "근처 장소";
  const statusText = status.status || "새 상태";
  const preview = compactText(status.message);

  if (kind === "answer_request") {
    return {
      title: "근처에 확인 요청이 있어요",
      content: `${placeName}, 지금 어떤가요?`,
      cta: "현장 답하기",
    };
  }

  return {
    title: "여기 지금도 맞나요?",
    content: preview
      ? `${placeName}이 ${statusText}로 공유됐어요. ${preview}`
      : `${placeName}이 ${statusText}로 공유됐어요.`,
    cta: "맞아요",
  };
}

function getPlaceKey(status: NearbyStatusCandidate) {
  if (status.event_id || status.tourapi_content_id) {
    return `event:${status.event_id || status.tourapi_content_id}`;
  }
  return normalizePlaceText(status.place_name || "") || `status:${status.id}`;
}

export function buildNearbyActionNotification(
  userId: string,
  status: NearbyStatusCandidate,
  gps: { latitude: number; longitude: number },
  now = Date.now(),
): NearbyActionCandidate | null {
  if (!userId || !status.id || status.is_hidden) return null;
  if (status.user_id && status.user_id === userId) return null;
  if (!isValidCoordinate(status.latitude, status.longitude)) return null;

  const expiresAt = toTime(status.expires_at);
  if (!expiresAt || expiresAt <= now) return null;

  const createdAt = toTime(status.created_at);
  if (!createdAt) return null;

  const maxAge = status.is_request ? REQUEST_WINDOW_MS : STATUS_WINDOW_MS;
  if (now - createdAt > maxAge) return null;

  const distanceM = Math.round(
    getDistanceMeters(gps.latitude, gps.longitude, Number(status.latitude), Number(status.longitude)),
  );
  const radiusM = getRadiusMeters(status);
  if (distanceM > radiusM) return null;

  const kind = getActionKind(status);
  const placeName = status.place_name || "근처 장소";
  const placeKey = getPlaceKey(status);
  const dedupeKey = `nearby_action:${kind}:${status.id}`;
  const actionText = getActionText(kind, status);
  const params = new URLSearchParams({
    lat: String(status.latitude),
    lng: String(status.longitude),
    statusId: String(status.id),
    action: kind,
    title: placeName,
  });

  return {
    placeKey,
    notification: {
      id: `local-${dedupeKey}`,
      user_id: userId,
      type: "place_update",
      title: actionText.title,
      content: `${actionText.content} 약 ${distanceM}m 근처예요.`,
      link_url: `/map?${params.toString()}`,
      metadata: {
        local: true,
        source_type: "live_status",
        source_id: status.id,
        action_kind: kind,
        action_label: actionText.cta,
        place_name: placeName,
        latitude: status.latitude,
        longitude: status.longitude,
        distance_m: distanceM,
        radius_m: radiusM,
        status: status.status || null,
        is_request: Boolean(status.is_request),
        event_id: status.event_id || status.tourapi_content_id || null,
        expires_at: status.expires_at || null,
      },
      is_read: false,
      read_at: null,
      dedupe_key: dedupeKey,
      created_at: new Date(now).toISOString(),
    },
  };
}

export function canCreateNearbyActionNotification(userId: string, dedupeKey: string, placeKey: string, now = Date.now()) {
  if (!userId || !dedupeKey || !placeKey) return false;
  if (hasLocalInterestPlaceNotification(userId, dedupeKey)) return false;

  const history = getHistory(userId);
  const todayKey = getTodayKey(new Date(now));
  const todayCount = history.filter((item) => getTodayKey(new Date(item.createdAt)) === todayKey).length;
  if (todayCount >= DAILY_MAX_NOTIFICATIONS) return false;

  const recentSamePlace = history.some((item) => {
    if (item.placeKey !== placeKey) return false;
    const createdAt = toTime(item.createdAt);
    return createdAt > 0 && now - createdAt < PLACE_COOLDOWN_MS;
  });

  return !recentSamePlace;
}

export function recordNearbyActionNotification(userId: string, dedupeKey: string, placeKey: string, now = Date.now()) {
  if (!userId || !dedupeKey || !placeKey) return;

  const cutoff = now - 7 * 24 * 60 * 60 * 1000;
  const history = getHistory(userId).filter((item) => toTime(item.createdAt) >= cutoff);
  writeHistory(userId, [
    {
      dedupeKey,
      placeKey,
      createdAt: new Date(now).toISOString(),
    },
    ...history.filter((item) => item.dedupeKey !== dedupeKey),
  ]);
}

export function getNearbyActionLabel(item: Pick<NotificationItem, "metadata">) {
  const label = item.metadata?.action_label;
  return typeof label === "string" ? label : null;
}

