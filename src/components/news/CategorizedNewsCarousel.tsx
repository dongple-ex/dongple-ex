"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LucideIcon } from "lucide-react";
import NewsCard from "./NewsCard";
import { Post, fetchPostsByCategory } from "@/services/postService";

interface CategorizedNewsCarouselProps {
    title: string;
    category: string;
    icon: LucideIcon;
    color?: string;
}

export default function CategorizedNewsCarousel({ title, category, icon: Icon, color = "text-accent" }: CategorizedNewsCarouselProps) {
    const [items, setItems] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                // 특정 카테고리의 포스트를 가져옴
                const data = await fetchPostsByCategory(category, 6);
                
                // 만약 데이터가 너무 적으면 목 데이터 추가 (UI 확인용)
                if (data.length < 3) {
                    const mocks = generateMockNews(category, 5 - data.length);
                    setItems([...data, ...mocks]);
                } else {
                    setItems(data);
                }
            } catch (error) {
                console.error("Failed to load news for category:", category, error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [category]);

    return (
        <section id={`news-section-${category}`} className="py-8">
            <div className="px-6 flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 bg-foreground/5 rounded-2xl ${color}`}>
                        <Icon size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground transition-colors duration-500">{title}</h2>
                        <p className="text-[11px] font-bold text-foreground/40">우리 동네의 생생한 {title} 소식</p>
                    </div>
                </div>
                <button className="flex items-center text-xs font-black text-accent group">
                    더보기 <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            <div className="flex overflow-x-auto pb-8 px-6 space-x-6 no-scrollbar snap-x snap-mandatory">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="min-w-[280px] h-[380px] bg-foreground/5 rounded-[32px] animate-pulse" />
                    ))
                ) : (
                    items.map((item, i) => (
                        <div key={i} className="snap-start">
                            <NewsCard item={item} isRss={item.post_type === 'rss'} />
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}

// UI 확인을 위한 목 데이터 생성기
function generateMockNews(category: string, count: number): any[] {
    const newsTemplates: Record<string, string[]> = {
        "날씨": ["오늘 오후 갑작스러운 소나기 주의하세요!", "이번 주말 나들이 가기 딱 좋은 날씨입니다.", "내일 오전 미세먼지 농도 '나쁨', 마스크 챙기세요."],
        "카페": ["동네에 새로 생긴 디저트 카페, 분위기 너무 좋네요.", "오늘만 커피 1+1 이벤트 하는 카페 공유합니다!", "재택근무하기 좋은 조용한 카페 추천."],
        "이사": ["정자동 아파트 시가 정보 공유합니다.", "짐 많은 1인 가구 이사 업체 이용 후기.", "동네 부동산 시장이 다시 활기를 띠고 있네요."],
        "가게": ["시장 과일가게에서 오늘 샤인머스캣 박스 할인 중!", "철물점 위치 물어보시는 분들이 많아 공유합니다.", "오래된 동네 빵집의 변함없는 맛."],
        "병원": ["야간 진료 가능한 소아과 정보 업데이트.", "친절하고 과잉진료 없는 치과 추천해주세요.", "동네 약국 마스크 재고 현황 공유."],
        "공공": ["주민센터에서 진행하는 요가 프로그램 모집 중.", "우리 동네 도서관 신간 도서 목록.", "가로등 고장 신고 어디에 하나요?"],
    };

    const imagePool: Record<string, string[]> = {
        "날씨": [
            "1501785888041-af3ef285b470", // 풍경
            "1592210633469-a15766242ade", // 구름/비
            "1475113548554-5a3d09da6941"  // 숲/공원
        ],
        "카페": [
            "1495474472287-4d71bcdd2085", // 커피/디저트
            "1554118811-1e0d58224f24", // 카페 인테리어
            "1509042239860-f550ce710b93"  // 커피 잔
        ],
        "이사": [
            "1560518883-ce09059eeffa", // 아파트
            "1582268611958-ebfd161ef9cf", // 주택
            "1512917774080-9991f1c4c750"  // 거실 인테리어
        ],
        "가게": [
            "1441986300917-64674bd600d8", // 옷가게
            "1542838132-92c53300491e", // 식료품/시장
            "1516594798947-e65505dbb29d"  // 야채/과일
        ],
        "병원": [
            "1519494026892-80bbd2d6fd0d", // 병원 내부
            "1504813184581-01572f98c95a", // 수술/검진
            "1584308666738-95a706240d1f"  // 약국
        ],
        "공공": [
            "1523217582562-09d0def993a6", // 주택가
            "1523243170274-0cd3617bb7d5", // 도서관
            "1493246507139-91e8bef99c25"  // 풍경/산책로
        ],
    };

    const templates = newsTemplates[category] || ["우리 동네의 새로운 소식을 확인하세요.", "이웃들과 정보를 나누고 소통해보세요."];
    const categoryImages = imagePool[category] || ["1441986300917-64674bd600d8"];

    return Array.from({ length: count }).map((_, i) => ({
        id: `mock-${category}-${i}`,
        title: templates[i % templates.length],
        content: `${category} 카테고리에 대한 이웃들의 생생한 의견과 정보를 확인해보세요. 유용한 팁과 최신 소식이 가득합니다.`,
        category: category,
        post_type: i % 3 === 0 ? 'rss' : 'post',
        image_url: `https://images.unsplash.com/photo-${categoryImages[i % categoryImages.length]}?auto=format&fit=crop&w=600&q=80`,
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        likes_count: Math.floor(Math.random() * 50),
        comments_count: Math.floor(Math.random() * 20),
        score: 0.5 + Math.random() * 0.4
    }));
}
