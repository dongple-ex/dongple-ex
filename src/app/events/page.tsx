"use client";

import { useState, useEffect } from "react";
import { 
    ArrowLeft, Calendar, MapPin, BadgeCheck, Search, Filter, 
    PartyPopper, Trophy, Music, Ghost 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchOfficialEvents, OfficialEvent } from "@/services/eventService";
import { useUIStore } from "@/lib/store/uiStore";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
    { id: "all", label: "전체", icon: PartyPopper },
    { id: "15", label: "축제", icon: PartyPopper },
    { id: "14", label: "문화관광", icon: Music },
    { id: "28", label: "레포츠", icon: Trophy },
];

export default function EventsPage() {
    const router = useRouter();
    const openBottomSheet = useUIStore((state) => state.openBottomSheet);
    const [events, setEvents] = useState<OfficialEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const loadEvents = async () => {
            setIsLoading(true);
            try {
                const data = await fetchOfficialEvents();
                setEvents(data);
            } catch (error) {
                console.error("Failed to load events:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadEvents();
    }, []);

    const filteredEvents = events.filter(event => {
        const matchesTab = activeTab === "all" || event.category_code === activeTab;
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              event.address.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const handleEventClick = (event: OfficialEvent) => {
        openBottomSheet("postDetail", {
            id: event.id,
            title: event.title,
            content: `${event.address}\n\n[축제 일정]\n시작: ${event.event_start_date}\n종료: ${event.event_end_date}\n\n${event.description || "상세 정보가 아직 등록되지 않았습니다."}`,
            is_official: true,
            meta: event.meta,
            source: event.source
        });
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 pt-12 pb-5">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-400 hover:text-foreground transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-black text-foreground absolute left-1/2 -translate-x-1/2">동네 소식</h1>
                    <div className="w-10"></div>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-secondary tracking-widest uppercase mb-1">OFFICIAL EVENTS</span>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">우리 동네 공식 소식</h2>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="축제 이름이나 장소를 검색해보세요"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-11 pr-4 bg-gray-100 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-secondary/20 transition-all outline-none"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>

                    {/* Category Tabs */}
                    <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                                    activeTab === cat.id 
                                    ? "bg-foreground text-white shadow-lg" 
                                    : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
                                }`}
                            >
                                <cat.icon size={14} />
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="px-5 py-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-gray-200 rounded-[32px] animate-pulse" />
                        ))}
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {filteredEvents.map((event, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className="group bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:border-secondary/20 transition-all cursor-pointer overflow-hidden"
                            >
                                {/* Event Image (P2-2: 실제 이미지 렌더링 및 Fallback) */}
                                <div className="relative h-44 bg-gray-100 overflow-hidden">
                                    {event.thumbnail_url ? (
                                        <img 
                                            src={event.thumbnail_url} 
                                            alt={event.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div className={`fallback-icon w-full h-full flex items-center justify-center text-gray-200 ${event.thumbnail_url ? 'hidden' : ''}`}>
                                        <Ghost size={48} />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6">
                                        <div className="flex items-center space-x-2">
                                            <span className="px-3 py-1 bg-secondary/90 text-white text-[10px] font-black rounded-full backdrop-blur-md">
                                                공식 인증
                                            </span>
                                            <span className="px-3 py-1 bg-black/40 text-white text-[10px] font-black rounded-full backdrop-blur-md">
                                                D-{Math.ceil((new Date(event.event_start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-[17px] font-black text-foreground group-hover:text-secondary transition-colors line-clamp-1">
                                            {event.title}
                                        </h3>
                                        <BadgeCheck size={20} className="text-secondary shrink-0" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center text-gray-400 text-[12px] font-bold">
                                            <Calendar size={14} className="mr-2" />
                                            <span>{event.event_start_date} ~ {event.event_end_date}</span>
                                        </div>
                                        <div className="flex items-center text-gray-400 text-[12px] font-bold">
                                            <MapPin size={14} className="mr-2" />
                                            <span className="line-clamp-1">{event.address}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
                            <Search size={32} />
                        </div>
                        <p className="font-black text-gray-400">찾으시는 소식이 없네요 :(</p>
                        <p className="text-gray-300 text-sm mt-1">다른 동네나 키워드로 검색해보세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
