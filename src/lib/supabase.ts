import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 유효한 설정이 없을 때 에러를 방지하기 위한 더미 클라이언트
const mockEvents = [
  {
    id: 101,
    title: "수원화성문화제 2026",
    category_code: "문화/예술",
    description: "유네스코 세계문화유산 수원화성을 배경으로 펼쳐지는 대한민국 대표 전통문화 축제입니다.",
    lat: 37.2826,
    lng: 127.0142,
    address: "경기도 수원시 팔달구 정조로 825 (화성행궁)",
    event_start_date: "2026-10-02",
    event_end_date: "2026-10-04",
    thumbnail_url: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=400",
    trust_score: 1.0
  },
  {
    id: 102,
    title: "수원연극축제 (Suwon Theatre Festival)",
    category_code: "공연/전시",
    description: "국내외 우수 거리공연 예술가들이 선사하는 화려한 연극의 향연.",
    lat: 37.2995,
    lng: 126.9912, // 정자동 인근
    address: "경기도 수원시 장안구 정자동 대평로",
    event_start_date: "2026-05-22",
    event_end_date: "2026-05-24",
    thumbnail_url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=400",
    trust_score: 0.95
  },
  {
    id: 103,
    title: "화성행궁 야간개장 '달빛정담'",
    category_code: "관광/체험",
    description: "달빛 아래 성곽길을 거닐며 역사의 숨결을 느끼는 로맨틱한 야간 투어.",
    lat: 37.2811,
    lng: 127.0135,
    address: "수원 화성행궁 일원",
    event_start_date: "2026-05-01",
    event_end_date: "2026-10-31",
    thumbnail_url: "https://images.unsplash.com/photo-1544911845-1f34a3eb46b1?q=80&w=400",
    trust_score: 1.0
  },
  {
    id: 104,
    title: "수원 통닭거리 축제",
    category_code: "음식/축제",
    description: "수원의 명물 통닭거리를 즐길 수 있는 맛있는 축제!",
    lat: 37.2801,
    lng: 127.0155,
    address: "경기도 수원시 팔달구 팔달로1가",
    event_start_date: "2026-06-12",
    event_end_date: "2026-06-14",
    thumbnail_url: "https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?q=80&w=400",
    trust_score: 0.88
  }
];

type MockQueryResult<T> = Promise<{ data: T; error: null }>;

type MockEvent = (typeof mockEvents)[number];

interface MockSupabaseClient {
  from: (table: string) => {
    select: () => {
      order: () => {
        limit: () => MockQueryResult<MockEvent[] | []>;
        gt: () => { order: () => MockQueryResult<[]> };
      };
      eq: () => { order: () => MockQueryResult<[]> };
    };
    insert: () => { select: () => MockQueryResult<[]> };
    update: () => { eq: () => MockQueryResult<[]> };
  };
  channel: () => {
    on: () => {
      subscribe: () => { unsubscribe: () => void };
    };
  };
  rpc: () => Promise<{ data: null; error: null }>;
}

const mockSupabase: MockSupabaseClient = {
  from: (table: string) => ({
    select: () => ({
      order: () => ({
        limit: () => Promise.resolve({ 
          data: table === 'events' ? mockEvents : [], 
          error: null 
        }),
        gt: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) 
      }),
      eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) })
    }),
    insert: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
    update: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
  }),
  channel: () => ({
    on: () => ({
      subscribe: () => ({ unsubscribe: () => {} })
    })
  }),
  rpc: () => Promise.resolve({ data: null, error: null })
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Anon Key is missing. Mock client is being used.');
}

export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockSupabase;
