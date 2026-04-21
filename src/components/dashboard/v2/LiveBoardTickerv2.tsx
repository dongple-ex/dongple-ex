"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, MapPin, Plus, ArrowUpRight } from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { fetchLiveStatus, subscribeLiveUpdates, postLiveStatus, verifyStatusWithTrust } from "@/services/statusService";
import { getStatusTheme } from "@/lib/statusTheme";

type LiveUpdateItem = Awaited<ReturnType<typeof fetchLiveStatus>>[number];

export default function LiveBoardTickerv2() {
    const [liveUpdates, setLiveUpdates] = useState<LiveUpdateItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userId, setUserId] = useState("");
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
        let id = localStorage.getItem("dongple_temp_id");
        if (!id) {
            id = `user-${Math.random().toString(36).slice(2, 11)}`;
            localStorage.setItem("dongple_temp_id", id);
        }
        setUserId(id);
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
    const theme = getStatusTheme(current.status, current.is_request);
    const themeLabel = current.is_request ? "답변 요청" : current.status;

    const handleAgree = async () => {
        if (!userId) return;
        const success = await verifyStatusWithTrust(current.id, userId);
        if (!success) {
            alert("이미 인증했거나 인증 처리 중 문제가 발생했습니다.");
            return;
        }
        loadData();
    };

    const handleDisagree = () => {
        const defaultStatus = current.status === "여유" ? "보통" : "여유";

        openBottomSheet("liveReply", {
            mode: "disagree",
            defaultStatus,
            onSubmit: async ({ selectedStatus, replyText }: { selectedStatus: string; replyText: string }) => {
                const nextStatusColor =
                    selectedStatus === "여유"
                        ? "text-green-500"
                        : selectedStatus === "보통"
                            ? "text-blue-500"
                            : "text-red-500";

                await postLiveStatus({
                    place_name: current.place_name,
                    category: current.category || "기타",
                    status: selectedStatus,
                    status_color: nextStatusColor,
                    is_request: false,
                    verified_count: 1,
                    latitude: current.latitude,
                    longitude: current.longitude,
                    message: replyText,
                });
            },
        });
    };

    return (
        <section className="relative z-20 -mt-7 px-6">
            <div 
                onClick={() => openBottomSheet("liveDetail", { detailItem: current })}
                className={`group cursor-pointer ${theme.card} backdrop-blur-xl rounded-[32px] p-2 shadow-2xl shadow-foreground/5 border transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]`}
            >
                <div className="flex items-center">
                    {/* Live Badge */}
                    <div className="flex aspect-square min-w-[62px] flex-col items-center justify-center rounded-[22px] bg-foreground p-3 text-background transition-colors duration-500">
                        < Zap size={18} className="text-amber-400 mb-1" />
                        <span className="text-[10px] font-black tracking-tighter uppercase leading-none">Live</span>
                    </div>

                    {/* Ticker Content */}
                    <div className="flex-1 overflow-hidden px-3 py-1.5">
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
                                        {themeLabel}
                                    </span>
                                    <span className="text-[10px] text-foreground/40 font-bold flex items-center">
                                        <MapPin size={10} className="mr-0.5" />
                                        {current.category || "동네생활"}
                                    </span>
                                </div>
                                <h3 className="text-[14px] font-black text-foreground truncate leading-tight">
                                    {current.place_name}
                                </h3>
                                <p className="text-[11px] text-foreground/50 font-medium truncate mt-0.5">
                                    {current.message || "새로운 현황이 올라왔습니다."}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Action Button */}
                    <div className="mr-2 rounded-2xl bg-foreground/5 p-2.5 text-foreground transition-all group-hover:bg-foreground group-hover:text-background">
                        <ArrowUpRight size={18} />
                    </div>
                </div>
            </div>

            {/* Sub Actions & Hybrid Vote UI */}
            <div className="mt-3 flex items-center justify-between px-2">
                <p className="text-[11px] font-bold text-gray-400">
                    지금 {liveUpdates.length}곳의 실시간 상황이 올라왔어요
                </p>
                <div className="flex space-x-2">
                    <button 
                        onClick={handleDisagree}
                        className="text-[10px] font-black text-foreground/40 hover:text-red-500 flex items-center bg-foreground/5 px-3 py-1.5 rounded-full transition-all"
                    >
                        아니에요 👎
                    </button>
                    <button 
                        onClick={handleAgree}
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
