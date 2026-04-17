"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, MapPin, CheckCircle2, Plus, HelpCircle, ArrowUpRight } from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { fetchLiveStatus, subscribeLiveUpdates, LiveStatus } from "@/services/statusService";

export default function LiveBoardTickerv2() {
    const [liveUpdates, setLiveUpdates] = useState<LiveStatus[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const openBottomSheet = useUIStore((state) => state.openBottomSheet);

    const loadData = async () => {
        try {
            const data = await fetchLiveStatus();
            setLiveUpdates(data);
        } catch (error) {
            console.error("Failed to load status:", error);
        }
    };

    useEffect(() => {
        loadData();
        const sub = subscribeLiveUpdates(loadData);
        return () => { sub.unsubscribe(); };
    }, []);

    useEffect(() => {
        if (liveUpdates.length === 0) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % liveUpdates.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [liveUpdates.length]);

    if (liveUpdates.length === 0) return null;

    const current = liveUpdates[currentIndex];

    const getStatusTheme = (status: string, isRequest: boolean) => {
        if (isRequest) return { 
            bg: "bg-orange-50/80 dark:bg-orange-900/10", 
            indicator: "bg-orange-500", 
            text: "text-orange-600 dark:text-orange-400", 
            label: "답변 요청", 
            icon: "🟠" 
        };
        if (status === "여유") return { 
            bg: "bg-green-50/80 dark:bg-green-900/10", 
            indicator: "bg-green-500", 
            text: "text-green-600 dark:text-green-400", 
            label: "여유", 
            icon: "🟢" 
        };
        if (status === "보통") return { 
            bg: "bg-blue-50/80 dark:bg-blue-900/10", 
            indicator: "bg-blue-500", 
            text: "text-blue-600 dark:text-blue-400", 
            label: "보통", 
            icon: "🔵" 
        };
        return { 
            bg: "bg-red-50/80 dark:bg-red-900/10", 
            indicator: "bg-red-500", 
            text: "text-red-600 dark:text-red-400", 
            label: "혼잡", 
            icon: "🔴" 
        };
    };

    const theme = getStatusTheme(current.status, current.is_request);

    return (
        <section className="px-6 -mt-10 relative z-20">
            <div 
                onClick={() => openBottomSheet("liveDetail", { detailItem: current })}
                className={`group cursor-pointer ${theme.bg} backdrop-blur-xl rounded-[32px] p-2 shadow-2xl shadow-foreground/5 border border-border transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]`}
            >
                <div className="flex items-center">
                    {/* Live Badge */}
                    <div className="flex flex-col items-center justify-center bg-foreground p-4 rounded-[24px] min-w-[70px] aspect-square text-background transition-colors duration-500">
                        < Zap size={20} className="text-amber-400 mb-1" />
                        <span className="text-[10px] font-black tracking-tighter uppercase leading-none">Live</span>
                    </div>

                    {/* Ticker Content */}
                    <div className="flex-1 px-4 py-2 overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={current.id}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="flex flex-col justify-center"
                            >
                                <div className="flex items-center space-x-2 mb-1">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-background/50 border border-foreground/5 ${theme.text} flex items-center`}>
                                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${theme.indicator} animate-pulse`} />
                                        {theme.label}
                                    </span>
                                    <span className="text-[10px] text-foreground/40 font-bold flex items-center">
                                        <MapPin size={10} className="mr-0.5" />
                                        {current.category || "동네생활"}
                                    </span>
                                </div>
                                <h3 className="text-[15px] font-black text-foreground truncate leading-tight">
                                    {current.place_name}
                                </h3>
                                <p className="text-[11px] text-foreground/50 font-medium truncate mt-0.5">
                                    {current.message || "새로운 현황이 올라왔습니다."}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Action Button */}
                    <div className="mr-2 p-3 bg-foreground/5 rounded-2xl text-foreground group-hover:bg-foreground group-hover:text-background transition-all">
                        <ArrowUpRight size={20} />
                    </div>
                </div>
            </div>

            {/* Sub Actions & Hybrid Vote UI */}
            <div className="flex items-center justify-between mt-4 px-2">
                <p className="text-[11px] font-bold text-gray-400">
                    지금 {liveUpdates.length}곳의 실시간 상황이 올라왔어요
                </p>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => openBottomSheet("liveCreate", { 
                            mode: "request",
                            address: current.place_name,
                            latitude: current.latitude,
                            longitude: current.longitude
                        })}
                        className="text-[10px] font-black text-foreground/40 hover:text-red-500 flex items-center bg-foreground/5 px-3 py-1.5 rounded-full transition-all"
                    >
                        아니에요 👎
                    </button>
                    <button 
                        onClick={() => {
                            // verifyStatus(current.id, "my-user-id") logic would go here
                            alert("인증 완료! 이웃들의 신뢰가 높아집니다.");
                        }}
                        className="text-[10px] font-black text-secondary flex items-center bg-secondary/10 px-3 py-1.5 rounded-full hover:bg-secondary hover:text-white transition-all shadow-sm"
                    >
                        맞아요 👍
                    </button>
                    <button 
                        onClick={() => openBottomSheet("liveCreate", { mode: "share" })}
                        className="ml-2 w-8 h-8 bg-foreground rounded-full flex items-center justify-center text-background shadow-lg shadow-foreground/10"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>
        </section>
    );
}
