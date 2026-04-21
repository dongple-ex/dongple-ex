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
