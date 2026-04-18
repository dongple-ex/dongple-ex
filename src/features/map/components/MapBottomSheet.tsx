"use client";

import { motion } from "framer-motion";
import { MapPin, HelpCircle, Plus } from "lucide-react";
import { LiveStatus } from "@/services/statusService";

interface MapBottomSheetProps {
    sheetHeight: number;
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    markers: LiveStatus[];
    expandedCardId: number | null;
    onCardClick: (id: number, lat: number, lng: number) => void;
    onOpenCreate: (mode: string) => void;
}

export default function MapBottomSheet({
    sheetHeight,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    markers,
    expandedCardId,
    onCardClick,
    onOpenCreate
}: MapBottomSheetProps) {
    return (
        <div 
            className={`absolute bottom-0 left-0 w-full z-[60] bg-nav-bg backdrop-blur-3xl rounded-t-[44px] shadow-2xl border-t border-border flex flex-col transition-all duration-700`} 
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
                        <span className="text-[11px] font-black text-secondary tracking-widest uppercase mb-1">DONGPLE LIVE</span>
                        <h3 className="font-black text-foreground text-2xl tracking-tighter">
                            주변의 순간들 <span className="text-secondary opacity-30 ml-1">{markers.length}</span>
                        </h3>
                    </div>
                    <div className="flex space-x-2">
                         <button onClick={() => onOpenCreate("request")} className="p-3 bg-foreground/5 rounded-2xl text-foreground/40 hover:text-foreground transition-all">
                             <HelpCircle size={22} />
                         </button>
                         <button onClick={() => onOpenCreate("share")} className="p-3 bg-secondary text-white rounded-2xl shadow-lg shadow-secondary/30 transition-all">
                             <Plus size={22} />
                         </button>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1 pb-32 no-scrollbar">
                {markers.length > 0 ? markers.map(card => (
                    <motion.div 
                        key={card.id} 
                        id={`card-${card.id}`} 
                        onClick={() => onCardClick(card.id, card.latitude || 37.3015, card.longitude || 126.9930)} 
                        className={`p-6 rounded-[32px] border border-border bg-card-bg/50 transition-all duration-500 ${expandedCardId === card.id ? 'ring-4 ring-secondary/5 bg-card-bg border-secondary/20 shadow-2xl' : ''}`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">{card.category}</span>
                                    {card.message && <span className="text-[10px] font-black text-secondary uppercase animate-pulse">상세있음</span>}
                                </div>
                                <h4 className="font-black text-foreground text-[18px] leading-tight mb-2">{card.place_name}</h4>
                                <div className={`text-[13px] font-black flex items-center ${card.is_request ? 'text-orange-600' : card.status === '여유' ? 'text-green-600' : card.status === '보통' ? 'text-blue-600' : 'text-red-600'}`}>
                                    <div className={`w-2 h-2 rounded-full mr-1.5 ${card.is_request ? 'bg-orange-500' : card.status === '여유' ? 'bg-green-500' : card.status === '보통' ? 'bg-blue-500' : 'bg-red-500'} ${expandedCardId === card.id ? 'animate-ping' : ''}`} />
                                    {card.is_request ? '답변 요청' : `${card.status} 상황`}
                                </div>
                            </div>
                            <div className="w-14 h-14 bg-foreground/5 rounded-3xl flex items-center justify-center text-foreground/30">
                                <MapPin size={24} />
                            </div>
                        </div>
                        {expandedCardId === card.id && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-6 border-t border-foreground/5 space-y-5">
                                {card.message && (
                                    <div className="bg-foreground/[0.03] p-4 rounded-2xl border border-foreground/5">
                                        <p className="text-[13px] text-foreground/70 font-medium leading-relaxed italic">"{card.message}"</p>
                                    </div>
                                )}
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onOpenCreate("request"); }} 
                                        className="flex-1 py-3.5 bg-foreground/5 text-foreground/60 rounded-2xl font-black text-[13px]"
                                    >
                                        정보 업데이트
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onOpenCreate("share"); }} 
                                        className="flex-1 py-3.5 bg-secondary text-white rounded-2xl font-black text-[13px] shadow-lg shadow-secondary/20"
                                    >
                                        여기에 제보
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )) : (
                    <div className="py-20 flex flex-col items-center justify-center text-foreground/10 text-center">
                        <MapPin size={48} className="mb-4 opacity-5" />
                        <p className="font-black text-lg">주변에 등록된 소식이 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
