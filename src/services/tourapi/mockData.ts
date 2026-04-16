export interface FestivalMockItem {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    category: string;
    address: string;
    is_official: boolean;
    trust_score: number;
    thumbnail?: string;
    date: string;
}

export const TOURAPI_MOCK_DATA: FestivalMockItem[] = [
    {
        id: "tour-suwon-001",
        title: "수원화성 달빛 산책",
        latitude: 37.2844,
        longitude: 127.0173,
        category: "문화제",
        address: "경기도 수원시 팔달구 정조로 825",
        is_official: true,
        trust_score: 1.0,
        thumbnail: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=300",
        date: "2026.04.01 - 2026.10.31"
    },
    {
        id: "tour-suwon-002",
        title: "광교호수공원 재즈 페스티벌",
        latitude: 37.2841,
        longitude: 127.0592,
        category: "음악/공연",
        address: "경기도 수원시 영통구 광교호수로 57",
        is_official: true,
        trust_score: 0.95,
        thumbnail: "https://images.unsplash.com/photo-1511192336575-5a79af67a621?auto=format&fit=crop&q=80&w=300",
        date: "2026.05.15 - 2026.05.17"
    },
    {
        id: "tour-suwon-003",
        title: "행궁동 벽화마을 야간 투어",
        latitude: 37.2811,
        longitude: 127.0135,
        category: "체험/관광",
        address: "경기도 수원시 팔달구 행궁동 일대",
        is_official: true,
        trust_score: 1.0,
        thumbnail: "https://images.unsplash.com/photo-1544911845-1f34a3eb46b1?auto=format&fit=crop&q=80&w=300",
        date: "2026.04.16 - 2026.06.30"
    }
];
