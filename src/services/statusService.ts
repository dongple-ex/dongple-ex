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
    return data as LiveStatus[];
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

        if (isSuccess) {
            // 2. 신뢰도 보정 (+0.05) - 단순 RPC가 카운트만 올린다면 여기서 추가 업데이트
            // 실제 운영 환경에서는 별도의 RPC나 트리거로 처리하는 것이 안전함
            await supabase.rpc('increment_trust_score', {
                p_status_id: statusId,
                p_amount: 0.05
            });
        }

        return isSuccess;
    } catch (err) {
        console.error("verifyStatusWithTrust error:", err);
        return false;
    }
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
