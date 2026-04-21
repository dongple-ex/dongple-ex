import { supabase } from '@/lib/supabase';

type EventMeta = Record<string, unknown>;

interface OfficialEventRow {
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
    events_ext?: {
        meta?: EventMeta;
        source?: string;
    } | null;
}

export interface OfficialEvent {
    id: number | string;
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
    meta?: EventMeta;
    source?: string;
}

interface TourApiEventsResponse {
    items?: OfficialEvent[];
}

async function fetchTourApiEvents(): Promise<OfficialEvent[]> {
    try {
        const response = await fetch('/api/tour/events?numOfRows=30', {
            cache: 'no-store'
        });

        if (!response.ok) {
            return [];
        }

        const data = (await response.json()) as TourApiEventsResponse;
        return data.items || [];
    } catch (err) {
        console.error('TourAPI live fetch failed:', err);
        return [];
    }
}

function mapDbEvents(data: OfficialEventRow[]) {
    return data.map((item) => ({
        ...item,
        meta: item.events_ext?.meta || {},
        source: item.events_ext?.source || 'TOURAPI'
    }));
}

export async function fetchOfficialEvents(): Promise<OfficialEvent[]> {
    try {
        const liveEvents = await fetchTourApiEvents();
        if (liveEvents.length > 0) {
            return liveEvents;
        }

        const { data, error } = await supabase
            .from('events')
            .select('*, events_ext(*)')
            .order('trust_score', { ascending: false });

        if (error) {
            console.error('공식 행사 조회 실패:', error);
            return [];
        }

        return mapDbEvents((data || []) as OfficialEventRow[]);
    } catch (err) {
        console.error('이벤트 서비스 오류:', err);
        return [];
    }
}

export async function fetchEventDetail(eventId: number | string): Promise<OfficialEvent | null> {
    try {
        const liveEvents = await fetchTourApiEvents();
        const liveMatch = liveEvents.find((item) => String(item.id) === String(eventId));
        if (liveMatch) {
            return liveMatch;
        }

        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError || !event) return null;

        const { data: ext } = await supabase
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
        console.error('이벤트 상세 조회 오류:', err);
        return null;
    }
}
