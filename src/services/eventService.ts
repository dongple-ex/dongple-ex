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
}

/**
 * DB에서 공식 행사/축제 데이터를 가져옵니다.
 */
export async function fetchOfficialEvents(): Promise<OfficialEvent[]> {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('trust_score', { ascending: false });

        if (error) {
            console.error('공식 행사 조회 실패:', error);
            return [];
        }

        return data as OfficialEvent[];
    } catch (err) {
        console.error('이벤트 서비스 에러:', err);
        return [];
    }
}
