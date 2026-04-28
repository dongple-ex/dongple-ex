"use client";

import { useEffect, useState } from "react";
import { ArrowRight, LucideIcon } from "lucide-react";
import NewsCard from "./NewsCard";
import { Post } from "@/services/postService";
import { useLocationStore } from "@/lib/store/locationStore";

interface CategorizedNewsCarouselProps {
    title: string;
    category: string;
    icon: LucideIcon;
    color?: string;
}

export default function CategorizedNewsCarousel({ title, category, icon: Icon, color = "text-accent" }: CategorizedNewsCarouselProps) {
    const [items, setItems] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { latitude, longitude } = useLocationStore();

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                // 특정 카테고리의 장소/소식을 가져옴 (현재 동네 위치 기준)
                const res = await fetch(`/api/tour/places?contentTypeId=${category}&mapX=${longitude}&mapY=${latitude}`);
                const data = await res.json();
                
                if (data.items) {
                    setItems(data.items);
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
                        <div key={i} className="min-w-[280px] h-[380px] bg-foreground/5 rounded-[32px] animate-pulse shrink-0" />
                    ))
                ) : items.length === 0 ? (
                    <div className="w-full py-12 text-center text-foreground/50 text-sm font-medium">
                        주변에 해당하는 장소나 소식이 없습니다.
                    </div>
                ) : (
                    items.map((item, i) => (
                        <div key={i} className="snap-start shrink-0">
                            <NewsCard item={item} isRss={item.post_type === 'rss'} />
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
