import { supabase } from '@/lib/supabase';

export interface OfficialEvent {
    id: number;
    title: string;
    category_code: string;
    description: string;
    lat: number;
    lng: number;
    address: string;
    event_start_date: string;
    event_end_date: string;
    thumbnail_url: string;
    trust_score: number;
    // 확장 필드
    meta?: any;
    source?: string;
}

/**
 * DB에서 공식 행사/축제 데이터를 가져옵니다. (P1-3: 확장 데이터 JOIN 반영)
 */
export async function fetchOfficialEvents(): Promise<OfficialEvent[]> {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*, events_ext(*)')
            .order('trust_score', { ascending: false });

        if (error) {
            console.error('공식 행사 조회 실패:', error);
            return [];
        }

        return (data || []).map((item: any) => ({
            ...item,
            meta: item.events_ext?.meta || {},
            source: item.events_ext?.source || 'TOURAPI'
        })) as OfficialEvent[];
    } catch (err) {
        console.error('이벤트 서비스 에러:', err);
        return [];
    }
}

/**
 * 특정 이벤트의 상세 정보 및 확장 메타데이터를 가져옵니다.
 */
export async function fetchEventDetail(eventId: number): Promise<OfficialEvent | null> {
    try {
        // 1. 기본 정보 조회
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError || !event) return null;

        // 2. 확장 정보 조회 (events_ext)
        const { data: ext, error: extError } = await supabase
            .from('events_ext')
            .select('*')
            .eq('event_id', eventId)
            .single();

        return {
            ...event,
            meta: ext?.meta || {},
            source: ext?.source || 'TOURAPI'
        } as OfficialEvent;
    } catch (err) {
        console.error('이벤트 상세 조회 에러:', err);
        return null;
    }
}
