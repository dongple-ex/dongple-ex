"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Clock3, MapPin, Plus, Radio } from "lucide-react";
import { useLocationStore } from "@/lib/store/locationStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  fetchLiveStatus,
  formatUpdatedAgo,
  isLiveStatusActive,
  postLiveStatus,
  subscribeLiveUpdates,
  verifyStatusWithTrust,
} from "@/services/statusService";
import { getStatusTheme, normalizeStatus } from "@/lib/statusTheme";

type LiveUpdateItem = Awaited<ReturnType<typeof fetchLiveStatus>>[number];

export default function LiveBoardTickerv2() {
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdateItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);
  const { userId } = useAuthStore();
  const requireAuth = useRequireAuth();
  const regionName = useLocationStore((state) => state.regionName);

  const loadData = async () => {
    try {
      const data = await fetchLiveStatus(true);
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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentIndex >= liveUpdates.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, liveUpdates.length]);

  const activeCount = useMemo(() => liveUpdates.filter((item) => isLiveStatusActive(item, now)).length, [liveUpdates, now]);
  const recentCount = Math.max(0, liveUpdates.length - activeCount);

  if (liveUpdates.length === 0) {
    return (
      <section className="relative z-20 -mt-7 px-6">
        <div className="rounded-[28px] border border-dashed border-secondary/25 bg-card-bg p-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-[62px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[22px] bg-secondary/10 text-secondary">
              <Radio size={19} />
              <span className="mt-1 text-[10px] font-black uppercase leading-none">Ready</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/70">Live signal</p>
              <h3 className="mt-1 text-[15px] font-black leading-tight text-foreground">아직 최근 현장 신호가 없어요</h3>
              <p className="mt-1 text-[11px] font-bold leading-snug text-foreground/45">궁금한 장소를 요청하거나 지금 상태를 남기면 바로 라이브 보드에 올라옵니다.</p>
            </div>
            <button
              onClick={() => requireAuth({ type: "bottomSheet", content: "liveCreate", data: { mode: "share" } })}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all hover:scale-105 active:scale-95"
              title="현장 상태 공유"
            >
              <Plus size={17} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  const current = liveUpdates[currentIndex];
  const isCurrentActive = isLiveStatusActive(current, now);
  const statusLabel = current.is_request ? "요청" : normalizeStatus(current.status);
  const theme = getStatusTheme(current.status, current.is_request);
  const currentTimeAgo = formatUpdatedAgo(current.created_at);
  const cardTone = isCurrentActive
    ? theme.card
    : "border-amber-100 bg-card-bg shadow-amber-900/5";

  const handleAgree = async () => {
    if (!isCurrentActive) {
      requireAuth({
        type: "bottomSheet",
        content: "liveCreate",
        data: {
          mode: "share",
          defaultPlaceName: current.place_name,
          latitude: current.latitude,
          longitude: current.longitude,
        },
      });
      return;
    }

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
        className={`group cursor-pointer overflow-hidden rounded-[28px] border p-2 shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] ${cardTone}`}
      >
        <div className="mb-2 flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${isCurrentActive ? "animate-pulse bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" : "bg-amber-500"}`} />
            <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${isCurrentActive ? "text-red-500" : "text-amber-600"}`}>
              {isCurrentActive ? "Live now" : "Recent signal"}
            </span>
          </div>
          <span className="flex items-center text-[10px] font-bold text-foreground/35">
            <Clock3 size={10} className="mr-1" />
            {currentTimeAgo}
          </span>
        </div>
        <div className="flex items-center">
          <div className={`flex aspect-square min-w-[62px] flex-col items-center justify-center rounded-[22px] p-3 ${isCurrentActive ? "bg-foreground text-background" : "bg-amber-500/10 text-amber-700"}`}>
            <div className={`mb-1.5 h-2 w-2 rounded-full ${isCurrentActive ? "animate-pulse bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-amber-500"}`} />
            <span className="text-[10px] font-black uppercase leading-none">{isCurrentActive ? "Live" : "최근"}</span>
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
                  {!isCurrentActive && (
                    <span className="rounded-full border border-amber-500/15 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-700">
                      갱신 필요
                    </span>
                  )}
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
        <div className="flex-1">
          <p className="text-[11px] font-bold leading-tight text-foreground/45 break-keep">
            지금 켜진 현장 {activeCount}곳, 최근 흐름 {recentCount}곳을 이어서 보고 있어요.
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            {liveUpdates.slice(0, 6).map((item) => (
              <span
                key={item.id}
                className={`h-1.5 rounded-full transition-all ${isLiveStatusActive(item, now) ? "w-5 bg-red-500/70" : "w-2 bg-foreground/15"}`}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <button onClick={handleDisagree} className="rounded-full bg-foreground/5 px-3 py-1.5 text-[10px] font-black text-foreground/45 hover:text-rose-500 whitespace-nowrap transition-colors">
            {isCurrentActive ? "달라요" : "갱신"}
          </button>
          <button onClick={handleAgree} className="rounded-full bg-secondary/10 px-3 py-1.5 text-[10px] font-black text-secondary hover:bg-secondary hover:text-white whitespace-nowrap transition-colors">
            {isCurrentActive ? "맞아요" : "새로"}
          </button>
          <button onClick={() => requireAuth({ type: "bottomSheet", content: "liveCreate", data: { mode: "share" } })} className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:scale-105 active:scale-95 transition-all">
            <Plus size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
