"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, HelpCircle, MapPin, ShieldCheck } from "lucide-react";
import { LiveStatus, formatUpdatedAgo, getActiveLiveStatusCount, normalizeStatus } from "@/services/statusService";
import { getStatusTheme } from "@/lib/statusTheme";

interface MapBottomSheetProps {
  sheetHeight: number;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  markers: LiveStatus[];
  expandedCardId: string | null;
  showHistory: boolean;
  onToggleHistory: () => void;
  onCardClick: (id: string, lat: number, lng: number) => void;
  onOpenCreate: (mode: string, lat?: number, lng?: number, address?: string, placeName?: string) => void;
  onVerify: (id: string) => Promise<boolean>;
  onToggleHeight: () => void;
}

export default function MapBottomSheet({
  sheetHeight,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  markers,
  expandedCardId,
  showHistory,
  onToggleHistory,
  onCardClick,
  onOpenCreate,
  onVerify,
  onToggleHeight,
}: MapBottomSheetProps) {
  const isExpanded = sheetHeight > 50;
  const activeCount = getActiveLiveStatusCount(markers);
  const recentCount = Math.max(0, markers.length - activeCount);

  return (
    <div
      className="absolute bottom-0 left-0 z-[60] flex w-full flex-col rounded-t-[36px] border-t border-border bg-nav-bg shadow-2xl backdrop-blur-3xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{ height: `${sheetHeight}vh` }}
    >
      <div
        className="flex w-full shrink-0 cursor-ns-resize flex-col items-center pb-3 pt-5 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="mb-4 h-1.5 w-12 rounded-full bg-foreground/10" />
        <div className="flex w-full items-center justify-between px-6">
          <div className="flex flex-1 flex-col">
            <div className="flex items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/80">Step 2. Check now</span>
            </div>
            <h3 className="flex items-center text-[22px] font-black tracking-tighter text-foreground whitespace-nowrap">
              지금 상태 확인
              <span className="ml-2 rounded-full bg-secondary/10 px-2.5 py-0.5 text-[14px] font-black text-secondary">{markers.length}</span>
            </h3>
            <p className="mt-1 text-[11px] font-bold text-foreground/35">
              라이브 {activeCount}곳 · 최근 기록 {recentCount}곳
            </p>
          </div>
          <div className="flex flex-col items-end gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenCreate("request")}
                title="현장 상태 요청"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5 text-foreground/45 transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
              >
                <HelpCircle size={15} />
              </button>
              <button
                onClick={onToggleHeight}
                title={isExpanded ? "접기" : "펼치기"}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-white shadow-lg shadow-secondary/30 transition-all active:scale-95"
              >
                {isExpanded ? <ChevronDown size={15} strokeWidth={3} /> : <ChevronUp size={15} strokeWidth={3} />}
              </button>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleHistory();
              }}
              className="flex items-center gap-1.5 group pr-0.5"
            >
              <span className={`text-[10px] font-black transition-colors ${showHistory ? 'text-secondary' : 'text-foreground/30 group-hover:text-foreground/50'}`}>최근 기록 포함</span>
              <div className={`relative w-6 h-3 rounded-full transition-colors duration-300 ${showHistory ? 'bg-secondary' : 'bg-foreground/10'}`}>
                <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all duration-300 ${showHistory ? 'left-3.5' : 'left-0.5'}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-4 pb-44">
        {markers.length > 0 ? (
          markers.map((card) => {
            const normalized = normalizeStatus(card.status);
            const timeAgo = formatUpdatedAgo(card.created_at);
            const theme = getStatusTheme(card.status, card.is_request);
            const isExpired = new Date(card.expires_at).getTime() < Date.now();

            return (
              <motion.div
                key={card.id}
                id={`card-${card.id}`}
                onClick={() => onCardClick(card.id, card.latitude || 37.3015, card.longitude || 126.9930)}
                layout
                className={`relative overflow-hidden rounded-[30px] border border-border bg-card-bg p-5 transition-all duration-500 ${
                  expandedCardId === card.id ? "border-secondary/20 bg-card-bg shadow-xl ring-2 ring-secondary/20" : "hover:bg-card-bg"
                } ${isExpired ? 'opacity-70' : ''}`}
              >
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-foreground/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-foreground/35">{card.category}</span>
                      {isExpired && (
                        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-tight text-amber-600 border border-amber-500/20">
                          최근 기록
                        </span>
                      )}
                      <div className="flex items-center text-[10px] font-bold text-foreground/40">
                        <Clock size={10} className="mr-1" />
                        {timeAgo}
                      </div>
                      {!isExpired && (
                        <span className={`flex items-center rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-tight border ${
                          card.trust_score >= 1.2 
                            ? "bg-sky-500/10 text-sky-500 border-sky-500/20" 
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}>
                          <ShieldCheck size={10} className="mr-0.5" /> 
                          신뢰도 {Math.min(99, Math.floor(60 + (card.trust_score - 1.0) * 40))}%
                        </span>
                      )}
                    </div>

                    <h4 className="mb-3 text-[19px] font-black leading-tight tracking-normal text-foreground">{card.place_name}</h4>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className={`flex items-center rounded-xl border px-3 py-1.5 text-[12px] font-black shadow-sm backdrop-blur-md ${theme.tone} ${theme.border}`}>
                        <div className={`mr-2 h-2 w-2 rounded-full ${theme.indicator} ${expandedCardId === card.id ? "animate-pulse" : ""}`} />
                        {card.is_request ? "확인 요청 중" : isExpired ? `${normalized} 기록` : `${normalized} 상태`}
                      </div>

                      <div className="flex items-center text-[11px] font-bold text-foreground/40">
                        <CheckCircle2 size={12} className="mr-1 text-secondary opacity-60" />
                        {card.verified_count}명이 확인
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick(card.id, card.latitude || 37.3015, card.longitude || 126.9930);
                      onToggleHeight(); // 접기
                    }}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-secondary/10 text-secondary transition-all hover:bg-secondary/20 active:scale-95"
                    title="지도에서 위치 보기"
                  >
                    <MapPin size={24} />
                  </button>
                </div>

                {expandedCardId === card.id && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-5 border-t border-foreground/5 pt-6">
                    {card.message && (
                      <div className="rounded-[22px] border border-foreground/5 bg-foreground/[0.03] p-4">
                        <p className="text-[14px] font-semibold leading-relaxed text-foreground/80">&quot;{card.message}&quot;</p>
                      </div>
                    )}

                    <div className="flex gap-2.5">
                      {!card.is_request && !isExpired && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onVerify(card.id);
                          }}
                          className="flex-1 rounded-[20px] bg-foreground py-4 text-[14px] font-black text-background shadow-lg shadow-foreground/10 transition-all hover:scale-[1.02] active:scale-95"
                        >
                          맞아요
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCreate("share", card.latitude, card.longitude, undefined, card.place_name);
                        }}
                        className={`rounded-[20px] py-4 font-black transition-all ${
                          card.is_request 
                            ? "flex-1 bg-secondary text-white text-[14px] shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95" 
                            : "flex-1 bg-foreground/5 text-[13px] text-foreground/60 hover:bg-foreground/10"
                        }`}
                      >
                        {card.is_request ? "내가 알려주기" : "새 상태 공유"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center text-foreground/10">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[40px] bg-foreground/5">
              <MapPin size={40} className="opacity-10" />
            </div>
            <p className="text-xl font-black text-foreground/20">아직 주변 현장 상태가 없어요.</p>
            <p className="mt-2 text-[13px] font-bold text-foreground/20">첫 현장 공유를 남기거나 확인을 요청해보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
