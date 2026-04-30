"use client";

import { motion } from "framer-motion";
import { MapPin, HelpCircle, Clock, ShieldCheck, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";
import { LiveStatus, formatUpdatedAgo, normalizeStatus } from "@/services/statusService";

interface MapBottomSheetProps {
    sheetHeight: number;
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    markers: LiveStatus[];
    expandedCardId: string | null;
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
    onCardClick,
    onOpenCreate,
    onVerify,
    onToggleHeight
}: MapBottomSheetProps) {
    const isExpanded = sheetHeight > 50;
    return (
        <div 
            className={`absolute bottom-0 left-0 w-full z-[60] bg-nav-bg/95 backdrop-blur-3xl rounded-t-[44px] shadow-2xl border-t border-border flex flex-col transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]`} 
            style={{ height: `${sheetHeight}vh` }}
        >
            <div 
                className="w-full pt-5 pb-3 cursor-ns-resize flex flex-col items-center shrink-0 touch-none" 
                onPointerDown={onPointerDown} 
                onPointerMove={onPointerMove} 
                onPointerUp={onPointerUp}
            >
                <div className="w-12 h-1.5 bg-foreground/10 rounded-full mb-4" />
                <div className="w-full px-8 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-secondary tracking-[0.2em] uppercase mb-1 opacity-80">내 주변 실시간 상태</span>
                        <h3 className="font-black text-foreground text-2xl tracking-tighter flex items-center">
                            주변 순간들 
                            <span className="bg-secondary/10 text-secondary text-[14px] px-2.5 py-0.5 rounded-full ml-2.5 font-black">
                                {markers.length}
                            </span>
                        </h3>
                    </div>
                    <div className="flex space-x-2.5">
                         <button 
                            onClick={() => onOpenCreate("request")} 
                            title="확인 요청"
                            className="p-3.5 bg-foreground/5 rounded-2xl text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-all active:scale-95"
                         >
                             <HelpCircle size={20} />
                         </button>
                         <button 
                            onClick={onToggleHeight} 
                            title={isExpanded ? "접기" : "펼치기"}
                            className="p-3.5 bg-secondary text-white rounded-2xl shadow-lg shadow-secondary/30 transition-all active:scale-95 flex items-center justify-center"
                         >
                             {isExpanded ? <ChevronDown size={20} strokeWidth={3} /> : <ChevronUp size={20} strokeWidth={3} />}
                         </button>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1 pb-44 no-scrollbar">
                {markers.length > 0 ? markers.map(card => {
                    const normalized = normalizeStatus(card.status);
                    const timeAgo = formatUpdatedAgo(card.created_at);
                    const isTrustHigh = card.trust_score >= 1.1;

                    return (
                        <motion.div 
                            key={card.id} 
                            id={`card-${card.id}`} 
                            onClick={() => onCardClick(card.id, card.latitude || 37.3015, card.longitude || 126.9930)} 
                            layout
                            className={`p-6 rounded-[36px] border border-border bg-card-bg/40 transition-all duration-500 relative overflow-hidden ${expandedCardId === card.id ? 'ring-2 ring-secondary/20 bg-card-bg border-secondary/20 shadow-xl' : 'hover:bg-card-bg/60'}`}
                        >
                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <span className="text-[10px] font-black text-foreground/30 uppercase tracking-widest bg-foreground/5 px-2 py-0.5 rounded-md">{card.category}</span>
                                        <div className="flex items-center text-[10px] font-bold text-foreground/40">
                                            <Clock size={10} className="mr-1" />
                                            {timeAgo}
                                        </div>
                                        {isTrustHigh && (
                                            <span className="flex items-center text-[9px] font-black text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                                <ShieldCheck size={10} className="mr-0.5" /> 신뢰 높음
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h4 className="font-black text-foreground text-[19px] leading-tight mb-3 tracking-tight">{card.place_name}</h4>
                                    
                                    <div className="flex items-center space-x-3">
                                        <div className={`px-3 py-1.5 rounded-xl text-[12px] font-black flex items-center shadow-sm ${
                                            card.is_request ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' : 
                                            normalized === '한산' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 
                                            normalized === '보통' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 
                                            'bg-red-500/10 text-red-600 border border-red-500/20'
                                        }`}>
                                            <div className={`w-2 h-2 rounded-full mr-2 ${
                                                card.is_request ? 'bg-orange-500' : 
                                                normalized === '한산' ? 'bg-green-500' : 
                                                normalized === '보통' ? 'bg-blue-500' : 
                                                'bg-red-500'
                                            } ${expandedCardId === card.id ? 'animate-pulse' : ''}`} />
                                            {card.is_request ? '답변 요청 중' : `${normalized} 상황`}
                                        </div>

                                        {card.verified_count > 0 && (
                                            <div className="flex items-center text-[11px] font-bold text-foreground/40">
                                                <CheckCircle2 size={12} className="mr-1 text-secondary opacity-60" />
                                                {card.verified_count}명이 확인
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="w-14 h-14 bg-foreground/5 rounded-[22px] flex items-center justify-center text-foreground/20 shrink-0">
                                    <MapPin size={24} />
                                </div>
                            </div>

                            {expandedCardId === card.id && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="mt-6 pt-6 border-t border-foreground/5 space-y-5"
                                >
                                    {card.message && (
                                        <div className="bg-foreground/[0.03] p-4.5 rounded-[24px] border border-foreground/5 relative">
                                            <p className="text-[14px] text-foreground/80 font-semibold leading-relaxed">&quot;{card.message}&quot;</p>
                                        </div>
                                    )}
                                    
                                    <div className="flex space-x-2.5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onVerify(card.id); }} 
                                            className="flex-1 py-4 bg-foreground text-background rounded-[20px] font-black text-[14px] shadow-lg shadow-foreground/10 hover:scale-[1.02] active:scale-95 transition-all"
                                        >
                                            맞아요
                                        </button>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                onOpenCreate("share", card.latitude, card.longitude, undefined, card.place_name); 
                                            }} 
                                            className="flex-1 py-4 bg-foreground/5 text-foreground/60 rounded-[20px] font-black text-[13px] hover:bg-foreground/10 transition-all"
                                        >
                                            상황이 달라요
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    );
                }) : (
                    <div className="py-24 flex flex-col items-center justify-center text-foreground/10 text-center">
                        <div className="w-20 h-20 bg-foreground/5 rounded-[40px] flex items-center justify-center mb-6">
                            <MapPin size={40} className="opacity-10" />
                        </div>
                        <p className="font-black text-xl text-foreground/20">아직 주변 순간이 없습니다.</p>
                        <p className="text-[13px] font-bold text-foreground/10 mt-2">첫 현장 공유를 남겨보세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
