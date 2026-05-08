import { supabase } from "@/lib/supabase";
import { createStatusResponseNotifications, createTrustNotification } from "@/services/notificationService";
export { normalizeStatus } from "@/lib/statusTheme";
import { normalizeStatus } from "@/lib/statusTheme";

interface LiveStatusHistoryItem {
  status: string;
  status_color: string;
  text: string;
  time: string;
}

type GroupedLiveStatus = LiveStatus & {
  history: LiveStatusHistoryItem[];
};

export interface LiveStatus {
  id: string;
  event_id?: string | null;
  place_name: string;
  category: string;
  status: string;
  status_color: string;
  is_request: boolean;
  verified_count: number;
  latitude?: number;
  longitude?: number;
  message?: string;
  trust_score: number;
  user_id?: string | null;
  tourapi_content_id?: string;
  is_hidden: boolean;
  created_at: string;
  expires_at: string;
}

export interface EventStatusSummary {
  level: string;
  label: string;
  updatedAgo: string;
  reportCount: number;
  topTags: string[];
  latestMessage?: string;
  colorClass?: string;
}

type EventLike = {
  id: string | number;
  title: string;
};

const STATUS_ORDER: Record<string, number> = {
  여유: 0,
  보통: 1,
  혼잡: 2,
};

export function formatUpdatedAgo(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

function isStatusLinkedToEvent(status: LiveStatus, event: EventLike) {
  const eventId = String(event.id);
  const eventTitle = event.title.trim();
  const placeName = status.place_name?.trim() || "";

  return (
    String(status.event_id || "") === eventId ||
    String(status.tourapi_content_id || "") === eventId ||
    placeName === eventTitle ||
    placeName.includes(eventTitle) ||
    eventTitle.includes(placeName)
  );
}

export function getEventStatusSummary(event: EventLike, statuses: LiveStatus[]): EventStatusSummary | null {
  const linkedStatuses = statuses
    .filter((status) => !status.is_request && isStatusLinkedToEvent(status, event))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (linkedStatuses.length === 0) return null;

  const latest = linkedStatuses[0];
  const statusScores = linkedStatuses.map((status) => STATUS_ORDER[normalizeStatus(status.status)] ?? 1);
  const averageScore = statusScores.reduce((sum, score) => sum + score, 0) / statusScores.length;
  const level = averageScore >= 1.5 ? "혼잡" : averageScore <= 0.5 ? "여유" : "보통";
  const topTags = linkedStatuses.map((status) => status.message?.trim()).filter(Boolean).slice(0, 2) as string[];

  return {
    level,
    label: `지금 ${level}`,
    updatedAgo: formatUpdatedAgo(latest.created_at),
    reportCount: linkedStatuses.length,
    topTags,
    latestMessage: latest.message,
    colorClass:
      level === "여유"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : level === "혼잡"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
  };
}

export async function fetchLiveStatus(includeExpired = false) {
  let query = supabase
    .from("live_status")
    .select("*")
    .eq("is_hidden", false);

  if (!includeExpired) {
    query = query.gt("expires_at", new Date().toISOString());
  } else {
    // 과거 이력을 볼 때는 최근 48시간 이내의 기록만 가져옴 (너무 오래된 데이터 방지)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    query = query.gt("created_at", fortyEightHoursAgo);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;

  const items = data as LiveStatus[];
  const grouped = new Map<string, GroupedLiveStatus>();

  for (const item of items) {
    if (!grouped.has(item.place_name)) {
      grouped.set(item.place_name, { ...item, status: normalizeStatus(item.status), history: [] });
    }

    const root = grouped.get(item.place_name);
    if (!root) continue;

    root.history.push({
      status: normalizeStatus(item.status),
      status_color: item.status_color,
      text: item.message || (item.is_request ? "현장 공유를 요청했습니다." : "새로운 상태를 업데이트했습니다."),
      time: new Date(item.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  return Array.from(grouped.values());
}

export async function postLiveStatus(payload: Partial<LiveStatus>) {
  if (!payload.place_name || !payload.status) {
    console.error("[StatusService] Missing required fields:", payload);
    throw new Error("필수 정보가 누락되었습니다.");
  }

  if (payload.latitude === 0 || payload.longitude === 0) {
    console.warn("[StatusService] Suspicious coordinates (0,0):", payload);
  }

  const expiresAt = payload.expires_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const initialTrust = payload.tourapi_content_id ? 1.2 : 1.0;

  console.log("[StatusService] Inserting live status:", payload);

  const { data, error } = await supabase
    .from("live_status")
    .insert([{ ...payload, expires_at: expiresAt, trust_score: initialTrust }])
    .select();

  if (error) {
    console.error("[StatusService] Insert error:", error);
    throw error;
  }
  
  const createdStatus = data[0] as LiveStatus;
  console.log("[StatusService] Successfully created status:", createdStatus.id);
  
  // 알림 생성은 백그라운드에서 처리 (사용자 대기 방지)
  createStatusResponseNotifications(createdStatus).catch(notifError => {
    console.warn("[StatusService] Notification creation failed (non-critical):", notifError);
  });
  
  return createdStatus;
}

export async function verifyStatusWithTrust(statusId: string, userId: string) {
  try {
    const { data: isSuccess, error: rpcError } = await supabase.rpc("verify_status_once", {
      p_status_id: statusId,
      p_user_id: userId,
    });

    if (rpcError) throw rpcError;
    
    if (isSuccess) {
      const { data: statusData } = await supabase
        .from("live_status")
        .select("user_id, place_name, trust_score")
        .eq("id", statusId)
        .single();
        
      if (statusData && statusData.user_id && statusData.user_id !== userId) {
        createTrustNotification({
          userId: statusData.user_id,
          placeName: statusData.place_name,
          newScore: statusData.trust_score,
          statusId: statusId
        }).catch(err => console.warn("Trust notification failed:", err));
      }
    }

    return isSuccess;
  } catch (err) {
    console.error("verifyStatusWithTrust error:", err);
    return false;
  }
}

export function subscribeLiveUpdates(onUpdate: (payload: unknown) => void) {
  return supabase
    .channel("live_status_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_status",
      },
      onUpdate,
    )
    .subscribe();
}
