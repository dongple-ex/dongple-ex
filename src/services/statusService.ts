import { supabase } from "@/lib/supabase";

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
    trust_score: number; // 신뢰도 점수 (기본 1.0)
    tourapi_content_id?: string; // TourAPI 매칭용 ID
    is_hidden: boolean; // 노출 여부
    created_at: string;
    expires_at: string;
}

export interface EventStatusSummary {
    level: string;
    label: string;
    colorClass: string;
    indicatorClass: string;
    updatedAgo: string;
    reportCount: number;
    topTags: string[];
    latestMessage?: string;
}

type EventLike = {
    id: string | number;
    title: string;
};

const STATUS_ORDER: Record<string, number> = {
    "한산": 0,
    "여유": 0,
    "보통": 1,
    "붐빔": 2,
    "혼잡": 2,
};

function formatUpdatedAgo(value: string) {
    const diffMs = Date.now() - new Date(value).getTime();
    const diffMin = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    return `${Math.floor(diffHour / 24)}일 전`;
}

function normalizeStatus(status: string) {
    if (status === "여유") return "한산";
    if (status === "혼잡") return "붐빔";
    return status || "보통";
}

function getStatusClasses(level: string) {
    if (level === "붐빔") {
        return {
            colorClass: "bg-red-500 text-white border-red-500",
            indicatorClass: "bg-red-500",
        };
    }
    if (level === "한산") {
        return {
            colorClass: "bg-green-500 text-white border-green-500",
            indicatorClass: "bg-green-500",
        };
    }
    return {
        colorClass: "bg-yellow-400 text-[#3E2723] border-yellow-400",
        indicatorClass: "bg-yellow-400",
    };
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

export function getEventStatusSummary(
    event: EventLike,
    statuses: LiveStatus[],
): EventStatusSummary | null {
    const linkedStatuses = statuses
        .filter((status) => !status.is_request && isStatusLinkedToEvent(status, event))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (linkedStatuses.length === 0) return null;

    const latest = linkedStatuses[0];
    const statusScores = linkedStatuses.map((status) => STATUS_ORDER[normalizeStatus(status.status)] ?? 1);
    const averageScore = statusScores.reduce((sum, score) => sum + score, 0) / statusScores.length;
    const level = averageScore >= 1.5 ? "붐빔" : averageScore <= 0.5 ? "한산" : "보통";
    const classes = getStatusClasses(level);
    const topTags = linkedStatuses
        .map((status) => status.message?.trim())
        .filter(Boolean)
        .slice(0, 2) as string[];

    return {
        level,
        label: `지금 ${level}`,
        updatedAgo: formatUpdatedAgo(latest.created_at),
        reportCount: linkedStatuses.length,
        topTags,
        latestMessage: latest.message,
        ...classes,
    };
}

/**
 * 전역 실시간 상황 목록 조회 (만료되지 않고 숨겨지지 않은 것만)
 */
export async function fetchLiveStatus() {
    const { data, error } = await supabase
        .from("live_status")
        .select("*")
        .eq("is_hidden", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

    if (error) throw error;
    
    // 장소 기준 최신순 그룹화 및 history 병합
    const items = data as LiveStatus[];
    const grouped = new Map<string, GroupedLiveStatus>();

    for (const item of items) {
        if (!grouped.has(item.place_name)) {
            grouped.set(item.place_name, {
                ...item,
                history: []
            });
        }
        
        const root = grouped.get(item.place_name);
        if (!root) continue;
        root.history.push({
            status: item.status,
            status_color: item.status_color,
            text: item.message || (item.is_request ? "상황 공유를 요청했습니다." : "새로운 상태를 업데이트했습니다."),
            time: new Date(item.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        });
    }

    return Array.from(grouped.values());
}

/**
 * 실시간 상황 공유하기 (상태 업데이트)
 */
export async function postLiveStatus(payload: Partial<LiveStatus>) {
    // expires_at이 없으면 기본적으로 2시간 후로 설정
    const expiresAt = payload.expires_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    
    // TourAPI 매칭 시 신뢰도 보너스 (+0.2) 적용 로직
    const initialTrust = payload.tourapi_content_id ? 1.2 : 1.0;

    const { data, error } = await supabase
        .from("live_status")
        .insert([{
            ...payload,
            expires_at: expiresAt,
            trust_score: initialTrust
        }])
        .select();

    if (error) throw error;
    return data[0] as LiveStatus;
}

/**
 * 상황 인증하기 (나도 여기에요 버튼 클릭 시)
 * 신뢰도 점수를 소폭 상승시킴 (+0.05)
 */
export async function verifyStatusWithTrust(statusId: string, userId: string) {
    try {
        // 1. 기존 RPC 호출로 인증 처리
        const { data: isSuccess, error: rpcError } = await supabase.rpc('verify_status_once', {
            p_status_id: statusId,
            p_user_id: userId
        });

        if (rpcError) throw rpcError;

        return isSuccess;
    } catch (err) {
        console.error("verifyStatusWithTrust error:", err);
        return false;
    }
}

export function subscribeLiveUpdates(onUpdate: (payload: unknown) => void) {
    return supabase
        .channel('live_status_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'live_status'
        }, onUpdate)
        .subscribe();
}
