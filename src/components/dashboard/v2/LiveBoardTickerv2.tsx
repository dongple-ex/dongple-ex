"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, MapPin, Plus } from "lucide-react";
import { useLocationStore } from "@/lib/store/locationStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { fetchLiveStatus, postLiveStatus, subscribeLiveUpdates, verifyStatusWithTrust } from "@/services/statusService";
import { getStatusTheme, normalizeStatus } from "@/lib/statusTheme";

type LiveUpdateItem = Awaited<ReturnType<typeof fetchLiveStatus>>[number];

export default function LiveBoardTickerv2() {
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdateItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);
  const { userId } = useAuthStore();
  const requireAuth = useRequireAuth();
  const regionName = useLocationStore((state) => state.regionName);

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
    return () => {
      sub.unsubscribe();
    };
  }, [regionName]);

  useEffect(() => {
    if (liveUpdates.length === 0) return;
    const timer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % liveUpdates.length), 4000);
    return () => clearInterval(timer);
  }, [liveUpdates.length]);

  if (liveUpdates.length === 0) return null;

  const current = liveUpdates[currentIndex];
  const statusLabel = current.is_request ? "요청" : normalizeStatus(current.status);
  const theme = getStatusTheme(current.status, current.is_request);

  const handleAgree = async () => {
    let finalUserId: string | null = userId;

    if (!finalUserId) {
      let guestId = localStorage.getItem("dongple_guest_id");
      if (!guestId) {
        guestId = `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
        localStorage.setItem("dongple_guest_id", guestId);
      }
      finalUserId = guestId;
    }

    try {
      const success = await verifyStatusWithTrust(current.id, finalUserId);
      if (success) {
        loadData();
        alert("확인이 반영되었습니다!");
      } else {
        alert("이미 확인하셨거나 처리 중 문제가 생겼습니다.");
      }
    } catch (error) {
      console.error("Agree failed:", error);
      alert("이미 확인하셨거나 오류가 발생했습니다.");
    }
  };

  const handleDisagree = () => {
    const defaultStatus = normalizeStatus(current.status) === "여유" ? "보통" : "여유";

    openBottomSheet("liveReply", {
      mode: "disagree",
      defaultStatus,
      onSubmit: async ({ selectedStatus, replyText }: { selectedStatus: string; replyText: string }) => {
        const nextStatusColor =
          selectedStatus === "여유" ? "text-emerald-500" : selectedStatus === "보통" ? "text-amber-500" : "text-rose-500";

        let finalUserId: string | null = userId;
        if (!finalUserId) {
          finalUserId = localStorage.getItem("dongple_guest_id");
          if (!finalUserId) {
            finalUserId = `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
            localStorage.setItem("dongple_guest_id", finalUserId);
          }
        }

        await postLiveStatus({
          place_name: current.place_name,
          category: current.category || "동네생활",
          status: selectedStatus,
          status_color: nextStatusColor,
          is_request: false,
          verified_count: 1,
          latitude: current.latitude,
          longitude: current.longitude,
          message: replyText,
          user_id: finalUserId,
        });

        loadData();
      },
    });
  };

  return (
    <section className="relative z-20 -mt-7 px-6">
      <div
        onClick={() => openBottomSheet("liveDetail", { detailItem: current })}
        className={`group cursor-pointer rounded-[28px] border p-2 shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] ${theme.card}`}
      >
        <div className="flex items-center">
          <div className="flex aspect-square min-w-[62px] flex-col items-center justify-center rounded-[22px] bg-foreground p-3 text-background">
            <div className="mb-1.5 h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="text-[10px] font-black uppercase leading-none">Live</span>
          </div>

          <div className="flex-1 overflow-hidden px-3 py-1.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex flex-col justify-center"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={`flex items-center rounded-full border border-foreground/5 bg-background/60 px-2 py-0.5 text-[10px] font-black ${theme.text}`}>
                    <span className={`mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full ${theme.indicator}`} />
                    {statusLabel}
                  </span>
                  <span className="flex items-center text-[10px] font-bold text-foreground/40">
                    <MapPin size={10} className="mr-0.5" />
                    {current.category || "동네생활"}
                  </span>
                </div>
                <h3 className="truncate text-[14px] font-black leading-tight text-foreground">{current.place_name}</h3>
                <p className="mt-0.5 truncate text-[11px] font-medium text-foreground/55">
                  {current.message || "새로운 현장 상태가 올라왔습니다."}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mr-2 rounded-2xl bg-foreground/5 p-2.5 text-foreground transition-all group-hover:bg-foreground group-hover:text-background">
            <ArrowUpRight size={18} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between px-2 gap-3">
        <p className="flex-1 text-[11px] font-bold leading-tight text-foreground/40 break-keep">
          지금 {liveUpdates.length}곳의 현장 상태가 공유되고 있어요.
        </p>
        <div className="flex gap-2 shrink-0 items-center">
          <button onClick={handleDisagree} className="rounded-full bg-foreground/5 px-3 py-1.5 text-[10px] font-black text-foreground/45 hover:text-rose-500 whitespace-nowrap transition-colors">
            달라요
          </button>
          <button onClick={handleAgree} className="rounded-full bg-secondary/10 px-3 py-1.5 text-[10px] font-black text-secondary hover:bg-secondary hover:text-white whitespace-nowrap transition-colors">
            맞아요
          </button>
          <button onClick={() => requireAuth({ type: "bottomSheet", content: "liveCreate", data: { mode: "share" } })} className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:scale-105 active:scale-95 transition-all">
            <Plus size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
