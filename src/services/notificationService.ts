import { supabase } from "@/lib/supabase";
import type { LiveStatus } from "@/services/statusService";

export type NotificationType = "reply" | "status_response" | "trust" | "system";

export type NotificationMetadata = Record<string, unknown>;

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  link_url: string;
  metadata: NotificationMetadata;
  is_read: boolean;
  read_at: string | null;
  dedupe_key: string | null;
  created_at: string;
}

type RawNotification = Partial<NotificationItem> & {
  body?: string | null;
  href?: string | null;
};

type PostNotificationSource = {
  id: string;
  title?: string | null;
  content?: string | null;
  user_id?: string | null;
};

type StatusRequestSource = Pick<
  LiveStatus,
  "id" | "place_name" | "event_id" | "tourapi_content_id" | "user_id"
>;

export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  link_url: string;
  metadata?: NotificationMetadata;
  dedupe_key?: string | null;
}

export interface ReplyNotificationInput {
  postId: string;
  commentId: string;
  commentContent: string;
  commenterUserId?: string | null;
}

const DEFAULT_NOTIFICATION_LIMIT = 50;

function toNotificationType(value: unknown): NotificationType {
  if (value === "reply" || value === "status_response" || value === "trust" || value === "system") {
    return value;
  }
  return "system";
}

export function normalizeNotification(row: RawNotification): NotificationItem {
  return {
    id: String(row.id || ""),
    user_id: String(row.user_id || ""),
    type: toNotificationType(row.type),
    title: row.title || "새 알림",
    content: row.content || row.body || "",
    link_url: row.link_url || row.href || "/",
    metadata: row.metadata || {},
    is_read: Boolean(row.is_read ?? row.read_at),
    read_at: row.read_at || null,
    dedupe_key: row.dedupe_key || null,
    created_at: row.created_at || new Date().toISOString(),
  };
}

function compactContent(value: string | null | undefined, maxLength = 72) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function isMissingColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("column") || error?.message?.includes("schema cache"));
}

export async function fetchNotifications(userId: string, limit = DEFAULT_NOTIFICATION_LIMIT) {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((row) => normalizeNotification(row as RawNotification));
  } catch (error) {
    console.warn("Notification fetch skipped:", error);
    return [];
  }
}

export async function createNotification(payload: CreateNotificationInput) {
  if (!payload.user_id) return null;

  const nextPayload = {
    user_id: payload.user_id,
    type: payload.type,
    title: payload.title,
    content: payload.content,
    link_url: payload.link_url,
    metadata: payload.metadata || {},
    dedupe_key: payload.dedupe_key || null,
  };

  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert([nextPayload])
      .select("*")
      .single();

    if (error) throw error;
    return normalizeNotification(data as RawNotification);
  } catch (error) {
    const maybeError = error as { message?: string };
    if (!isMissingColumnError(maybeError)) {
      console.warn("Notification creation skipped:", error);
      return null;
    }

    try {
      const { data, error: fallbackError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: payload.user_id,
            type: payload.type,
            title: payload.title,
            body: payload.content,
            href: payload.link_url,
          },
        ])
        .select("*")
        .single();

      if (fallbackError) throw fallbackError;
      return normalizeNotification(data as RawNotification);
    } catch (fallbackError) {
      console.warn("Notification fallback creation skipped:", fallbackError);
      return null;
    }
  }
}

export async function markNotificationAsRead(id: string) {
  if (!id) return;

  const readAt = new Date().toISOString();
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: readAt })
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    const maybeError = error as { message?: string };
    if (!isMissingColumnError(maybeError)) {
      console.warn("Notification read update skipped:", error);
      return;
    }

    try {
      await supabase.from("notifications").update({ read_at: readAt }).eq("id", id);
    } catch (fallbackError) {
      console.warn("Notification fallback read update skipped:", fallbackError);
    }
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  if (!userId) return;

  const readAt = new Date().toISOString();
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: readAt })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
  } catch (error) {
    const maybeError = error as { message?: string };
    if (!isMissingColumnError(maybeError)) {
      console.warn("Notifications read-all update skipped:", error);
      return;
    }

    try {
      await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .eq("user_id", userId)
        .is("read_at", null);
    } catch (fallbackError) {
      console.warn("Notifications fallback read-all update skipped:", fallbackError);
    }
  }
}

async function fetchPostNotificationSource(postId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("id,title,content,user_id")
    .eq("id", postId)
    .single();

  if (error) return null;
  return data as PostNotificationSource;
}

export async function createReplyNotification(input: ReplyNotificationInput) {
  try {
    const post = await fetchPostNotificationSource(input.postId);
    if (!post) return null;

    const recipientId = post.user_id || null;
    const commenterId = input.commenterUserId || null;
    if (!recipientId || recipientId === commenterId) return null;

    const postLabel = compactContent(post.title || post.content || "내가 쓴 소식", 36);
    const commentPreview = compactContent(input.commentContent, 64);

    return createNotification({
      user_id: recipientId,
      type: "reply",
      title: "새 댓글이 달렸어요",
      content: commentPreview ? `${postLabel}에 "${commentPreview}"` : `${postLabel}에 새 댓글이 달렸습니다.`,
      link_url: `/news/post/${input.postId}`,
      metadata: {
        post_id: input.postId,
        comment_id: input.commentId,
      },
      dedupe_key: `reply:${input.postId}:${input.commentId}`,
    });
  } catch (error) {
    console.warn("Reply notification skipped:", error);
    return null;
  }
}

function uniqueStatusRequests(items: StatusRequestSource[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function fetchMatchingStatusRequests(response: LiveStatus) {
  if (!response.place_name) return [];

  try {
    const { data, error } = await supabase
      .from("live_status")
      .select("id,place_name,event_id,tourapi_content_id,user_id")
      .eq("is_request", true)
      .eq("place_name", response.place_name)
      .limit(20);

    if (error) throw error;
    return (data || []) as StatusRequestSource[];
  } catch (error) {
    console.warn("Status request lookup skipped:", error);
    return [];
  }
}

export async function createStatusResponseNotifications(response: LiveStatus) {
  if (!response || response.is_request) return;

  const responseAuthorId = response.user_id || null;
  const requests = uniqueStatusRequests(await fetchMatchingStatusRequests(response));

  await Promise.all(
    requests.map(async (request) => {
      const recipientId = request.user_id || null;
      if (!recipientId || recipientId === responseAuthorId) return null;

      return createNotification({
        user_id: recipientId,
        type: "status_response",
        title: "요청한 장소에 새 소식이 왔어요",
        content: `${response.place_name} 상태가 ${response.status || "새 정보"}로 공유됐습니다.`,
        link_url: `/map?place=${encodeURIComponent(response.place_name)}`,
        metadata: {
          request_status_id: request.id,
          response_status_id: response.id,
          place_name: response.place_name,
          event_id: response.event_id || request.event_id || null,
          tourapi_content_id: response.tourapi_content_id || request.tourapi_content_id || null,
        },
        dedupe_key: `status_response:${request.id}:${response.id}`,
      });
    }),
  );
}

export interface TrustNotificationInput {
  userId: string;
  placeName: string;
  newScore: number;
  statusId: string;
}

export async function createTrustNotification(input: TrustNotificationInput) {
  if (!input.userId) return null;
  
  // 0.2 단위로 알림 구간 설정 (0.8, 1.0, 1.2 등)
  const scoreLevel = Math.floor(input.newScore * 5); 
  
  return createNotification({
    user_id: input.userId,
    type: "trust",
    title: "신뢰도가 상승했어요",
    content: `"${input.placeName}" 상태 정보가 검증되어 신뢰도가 올랐습니다.`,
    link_url: `/map?place=${encodeURIComponent(input.placeName)}`,
    metadata: {
      status_id: input.statusId,
      new_score: input.newScore,
    },
    dedupe_key: `trust:${input.statusId}:${scoreLevel}`,
  });
}
