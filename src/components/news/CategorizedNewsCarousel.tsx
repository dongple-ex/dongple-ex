"use client";

import { useEffect, useState } from "react";
import { ArrowRight, LucideIcon } from "lucide-react";
import NewsCard from "./NewsCard";
import { Post } from "@/services/postService";
import { useLocationStore } from "@/lib/store/locationStore";

type TourEventItem = {
  id: string | number;
  title: string;
  description?: string;
  category_code?: string;
  address?: string;
  event_start_date?: string;
  event_end_date?: string;
  thumbnail_url?: string;
  trust_score?: number;
  source?: string;
  meta?: Record<string, unknown>;
  lat?: number;
  lng?: number;
};

interface CategorizedNewsCarouselProps {
  title: string;
  category: string;
  icon: LucideIcon;
  color?: string;
  festivalScope?: "local" | "national";
  description?: string;
}

export default function CategorizedNewsCarousel({
  title,
  category,
  icon: Icon,
  color = "text-accent",
  festivalScope = "local",
  description,
}: CategorizedNewsCarouselProps) {
  const [items, setItems] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { latitude, longitude, regionName } = useLocationStore();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const isFestival = category === "15";
        const today = toTourApiDate(new Date());
        const params = new URLSearchParams({
          numOfRows: isFestival ? "100" : "10",
        });

        let url: string;
        if (isFestival) {
          params.set("arrange", "C");
          params.set("eventStartDate", today);
          if (festivalScope === "local") {
            params.set("mapX", String(longitude));
            params.set("mapY", String(latitude));
            params.set("radius", "25000");
          }
          url = `/api/tour/events?${params.toString()}`;
        } else {
          params.set("contentTypeId", category);
          params.set("mapX", String(longitude));
          params.set("mapY", String(latitude));
          url = `/api/tour/places?${params.toString()}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.items) {
          setItems(isFestival ? data.items.map(mapEventToPost) : data.items);
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error("Failed to load news for category:", category, error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [category, festivalScope, latitude, longitude]);

  const helperText =
    description ||
    (category === "15" && festivalScope === "local"
      ? `${regionName || "내 동네"} 주변에서 열리는 축제`
      : category === "15"
        ? "전국에서 진행 중이거나 예정된 축제"
        : `${regionName || "내 동네"} 주변 ${title} 소식`);

  return (
    <section id={`news-section-${category}-${festivalScope}`} className="py-8">
      <div className="mb-6 flex items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <div className={`rounded-2xl bg-foreground/5 p-2 ${color}`}>
            <Icon size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground transition-colors duration-500">{title}</h2>
            <p className="text-[11px] font-bold text-foreground/40">{helperText}</p>
          </div>
        </div>
        <button className="group flex items-center text-xs font-black text-accent">
          더보기
          <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <div className="no-scrollbar flex snap-x snap-mandatory space-x-6 overflow-x-auto px-6 pb-8">
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-[380px] min-w-[280px] shrink-0 animate-pulse rounded-[32px] bg-foreground/5" />)
        ) : items.length === 0 ? (
          <div className="w-full py-12 text-center text-sm font-medium text-foreground/50">
            {category === "15" && festivalScope === "local"
              ? "현재 위치 주변 25km 안에서 진행 중인 축제를 찾지 못했어요."
              : "조건에 맞는 소식이 없습니다."}
          </div>
        ) : (
          items.map((item, i) => (
            <div key={`${item.id}-${i}`} className="shrink-0 snap-start">
              <NewsCard item={item} isRss={item.post_type === "rss"} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function toTourApiDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function mapEventToPost(
  item: TourEventItem,
): Post & {
  image_url?: string;
  event_start_date?: string;
  event_end_date?: string;
  source?: string;
  meta?: Record<string, unknown>;
  address?: string;
  latitude?: number;
  longitude?: number;
} {
  return {
    id: String(item.id),
    title: item.title || "이름 없는 행사",
    content: item.description || item.address || "행사 상세 정보가 준비 중입니다.",
    post_type: "post",
    category: item.category_code || "15",
    user_id: null,
    public_id: null,
    is_anonymous: false,
    score: item.trust_score || 1,
    created_at: new Date().toISOString(),
    likes_count: 0,
    comments_count: 0,
    image_url: item.thumbnail_url,
    event_start_date: item.event_start_date,
    event_end_date: item.event_end_date,
    source: item.source,
    meta: item.meta,
    address: item.address,
    latitude: item.lat,
    longitude: item.lng,
  };
}
