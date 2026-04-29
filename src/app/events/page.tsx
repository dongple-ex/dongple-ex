"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, Calendar, Ghost, MapPin, Music, PartyPopper, Search, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";

import { useUIStore } from "@/lib/store/uiStore";
import { fetchOfficialEvents, OfficialEvent } from "@/services/eventService";
import { fetchLiveStatus, getEventStatusSummary, LiveStatus } from "@/services/statusService";

const CATEGORIES = [
    { id: "all", label: "전체", icon: PartyPopper },
    { id: "15", label: "축제", icon: PartyPopper },
    { id: "14", label: "문화관광", icon: Music },
    { id: "28", label: "레포츠", icon: Trophy },
];

function formatDday(dateString: string) {
    const target = new Date(dateString).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return "오늘";
    return `진행 ${Math.abs(diff)}일째`;
}

export default function EventsPage() {
    const router = useRouter();
    const openBottomSheet = useUIStore((state) => state.openBottomSheet);
    const [events, setEvents] = useState<OfficialEvent[]>([]);
    const [statuses, setStatuses] = useState<LiveStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const loadEvents = async (query?: string, category?: string) => {
        setIsLoading(true);
        try {
            const [eventData, liveData] = await Promise.all([
                fetchOfficialEvents(query, category),
                fetchLiveStatus()
            ]);

            // 서버에서 이미 카테고리 필터링을 해서 보냈으므로, 
            // 클라이언트에서는 'all'이 아닐 때만 보조적으로 확인
            const finalEvents = category && category !== "all" 
                ? eventData.filter(e => String(e.category_code) === String(category))
                : eventData;

            setEvents(finalEvents);
            setStatuses(liveData);
        } catch (error) {
            console.error("Failed to load events:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // 검색어 및 카테고리 변경 통합 효과 (디바운스 포함)
    useEffect(() => {
        const delay = searchQuery ? 500 : 0;
        const timer = setTimeout(() => {
            loadEvents(searchQuery, activeTab);
        }, delay);

        return () => clearTimeout(timer);
    }, [searchQuery, activeTab]);

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            loadEvents(searchQuery, activeTab);
        }
    };

    const clearSearch = () => {
        setSearchQuery("");
        loadEvents("", activeTab);
    };

    const filteredEvents = events; 

    const handleEventClick = (event: OfficialEvent) => {
        const summary = getEventStatusSummary(event, statuses);
        const statusBlock = summary
            ? `[지금 상태]\n${summary.label} (${summary.updatedAgo})\n${summary.latestMessage || "최근 현장 공유가 있습니다."}`
            : "[지금 상태]\n아직 공유된 현장 상태가 없습니다.\n행사 현장 공유로 첫 상태를 남겨보세요.";

        openBottomSheet("postDetail", {
            id: event.id,
            eventId: event.id,
            defaultPlaceName: event.title,
            address: event.address,
            latitude: event.lat,
            longitude: event.lng,
            title: event.title,
            content: `${event.address}\n\n[행사 일정]\n${event.event_start_date} ~ ${event.event_end_date}\n\n${statusBlock}\n\n${event.description || "행사 기본 정보만 있고, 현장 분위기는 아직 비어 있습니다."}`,
            is_official: true,
            meta: event.meta,
            source: event.source
        });
    };

    return (
        <div className="min-h-screen bg-background pb-24">
            <div className="sticky top-0 z-30 border-b border-border bg-background/80 px-5 pb-5 pt-12 backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-foreground/40 transition-colors hover:text-foreground"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-black text-foreground">인기 지역 보기</h1>
                    <div className="w-10" />
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col">
                        <span className="mb-1 text-[11px] font-black uppercase tracking-widest text-secondary">
                            OFFICIAL EVENTS
                        </span>
                        <h2 className="text-2xl font-black tracking-tight text-foreground">
                            오늘 즐길거리 보고 가보자고!
                        </h2>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="행사 이름이나 위치를 검색해보세요"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="h-12 w-full rounded-2xl border-none bg-foreground/[0.06] pl-11 pr-11 text-sm font-bold text-foreground outline-none transition-all focus:ring-2 focus:ring-secondary/20 placeholder:text-foreground/25"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={18} />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-foreground/10 p-1 text-foreground/40 hover:bg-foreground/20 hover:text-foreground"
                            >
                                <ArrowLeft className="rotate-45" size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex space-x-2 overflow-x-auto py-1 no-scrollbar">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`flex items-center space-x-1.5 rounded-xl px-4 py-2.5 text-xs font-black whitespace-nowrap transition-all ${activeTab === cat.id
                                    ? "bg-foreground text-background shadow-lg"
                                    : "border border-border bg-card-bg text-foreground/50 hover:bg-foreground/5"
                                    }`}
                            >
                                <cat.icon size={14} />
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-5 py-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-56 animate-pulse rounded-[32px] bg-foreground/5" />
                        ))}
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {filteredEvents.map((event, idx) => {
                            const summary = getEventStatusSummary(event, statuses);

                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={event.id}
                                    onClick={() => handleEventClick(event)}
                                    className="group cursor-pointer overflow-hidden rounded-[32px] border border-border bg-card-bg shadow-sm transition-all hover:border-secondary/20 hover:shadow-xl"
                                >
                                    <div className="relative h-44 overflow-hidden bg-foreground/5">
                                        {event.thumbnail_url ? (
                                            <Image
                                                src={event.thumbnail_url}
                                                alt={event.title}
                                                fill
                                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                    (e.target as HTMLImageElement).parentElement
                                                        ?.querySelector(".fallback-icon")
                                                        ?.classList.remove("hidden");
                                                }}
                                            />
                                        ) : null}

                                        <div
                                            className={`fallback-icon flex h-full w-full items-center justify-center text-foreground/20 ${event.thumbnail_url ? "hidden" : ""
                                                }`}
                                        >
                                            <Ghost size={48} />
                                        </div>

                                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-6">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-secondary/90 px-3 py-1 text-[10px] font-black text-white backdrop-blur-md">
                                                    공식 연동
                                                </span>
                                                <span className="rounded-full bg-black/40 px-3 py-1 text-[10px] font-black text-white backdrop-blur-md">
                                                    {formatDday(event.event_start_date)}
                                                </span>
                                                <span
                                                    className={`rounded-full px-3 py-1 text-[10px] font-black backdrop-blur-md ${summary
                                                        ? summary.colorClass
                                                        : "border border-white/30 bg-white/15 text-white"
                                                        }`}
                                                >
                                                    {summary ? `${summary.label} ${summary.updatedAgo}` : "현장 상태 대기"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <div className="mb-3 flex items-start justify-between">
                                            <h3 className="line-clamp-1 text-[17px] font-black text-foreground transition-colors group-hover:text-secondary">
                                                {event.title}
                                            </h3>
                                            <BadgeCheck size={20} className="shrink-0 text-secondary" />
                                        </div>

                                        {summary?.latestMessage && (
                                            <div className="mb-3 line-clamp-1 rounded-2xl bg-foreground/5 px-4 py-3 text-[12px] font-bold text-foreground/50">
                                                {summary.latestMessage}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <div className="flex items-center text-[12px] font-bold text-foreground/40">
                                                <Calendar size={14} className="mr-2" />
                                                <span>{event.event_start_date} ~ {event.event_end_date}</span>
                                            </div>
                                            <div className="flex items-center text-[12px] font-bold text-foreground/40">
                                                <MapPin size={14} className="mr-2" />
                                                <span className="line-clamp-1">{event.address}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-foreground/5 text-foreground/20">
                            <Search size={32} />
                        </div>
                        <p className="font-black text-foreground/40">조건에 맞는 행사를 찾지 못했어요.</p>
                        <p className="mt-1 text-sm text-foreground/30">다른 검색어나 카테고리로 다시 찾아보세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
