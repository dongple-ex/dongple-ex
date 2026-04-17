import { supabase } from "@/lib/supabase";

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
    message?: string; // 상세 메시지 추가
    created_at: string;
    expires_at: string;
}

/**
 * 전역 실시간 상황 목록 조회 (만료되지 않은 것만)
 */
export async function fetchLiveStatus() {
    const { data, error } = await supabase
        .from("live_status")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as LiveStatus[];
}

/**
 * 실시간 상황 공유하기 (상태 업데이트)
 */
export async function postLiveStatus(payload: Partial<LiveStatus>) {
    // expires_at이 없으면 기본적으로 2시간 후로 설정
    const expiresAt = payload.expires_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from("live_status")
        .insert([{
            ...payload,
            expires_at: expiresAt
        }])
        .select();

    if (error) throw error;
    return data[0] as LiveStatus;
}

/**
 * 상황 인증하기 (나도 여기에요 버튼 클릭 시)
 * RPC verify_status_once(p_status_id UUID, p_user_id TEXT) 사용
 */
export async function verifyStatus(statusId: string, userId: string): Promise<boolean> {
    const { data: isSuccess, error: rpcError } = await supabase.rpc('verify_status_once', {
        p_status_id: statusId,
        p_user_id: userId
    });

    if (rpcError) {
        console.error("RPC error:", rpcError);
        throw rpcError;
    }

    return isSuccess as boolean;
}

/**
 * 실시간 구독 설정 (Broadcast)
 */
export function subscribeLiveUpdates(onUpdate: (payload: any) => void) {
    return supabase
        .channel('live_status_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'live_status'
        }, onUpdate)
        .subscribe();
}
