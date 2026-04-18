"use client";

import { motion } from "framer-motion";

/**
 * 실시간 제보 상태 마커
 */
interface StatusMarkerProps {
    status: string;
    isRequest: boolean;
    isSelected: boolean;
}

export function StatusMarker({ status, isRequest, isSelected }: StatusMarkerProps) {
    const statusColorClass = isRequest ? 'bg-orange-500' : status === '여유' ? 'bg-green-500' : status === '보통' ? 'bg-blue-500' : 'bg-red-500';
    
    return (
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: isSelected ? 1.25 : 1, opacity: 1 }}
            className={`flex flex-col items-center transform -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-300 ${isSelected ? 'z-50' : 'hover:scale-110 z-10'}`}
        >
            <div className="px-3 py-1.5 ring-1 ring-black/5 shadow-2xl rounded-2xl text-white text-[12px] font-black flex items-center bg-white/90 backdrop-blur-xl border border-white/40">
                <div className={`w-2.5 h-2.5 rounded-full mr-2 ${statusColorClass} ${isSelected ? 'animate-ping' : 'animate-pulse'} shadow-sm`}></div>
                <span className="text-foreground font-black">{isRequest ? '요청' : status}</span>
            </div>
            <div className="w-2 h-2 bg-white/90 rotate-45 -translate-y-1 shadow-sm border-r border-b border-black/5"></div>
        </motion.div>
    );
}

/**
 * 클릭 지점 타겟 마커 (제보용)
 */
interface ClickTargetMarkerProps {
    address: string;
    onReport: () => void;
}

export function ClickTargetMarker({ address, onReport }: ClickTargetMarkerProps) {
    return (
        <div className="relative flex flex-col items-center group pointer-events-auto">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-16 bg-card-bg px-4 py-2.5 rounded-2xl shadow-2xl border border-secondary/20 whitespace-nowrap flex items-center space-x-3 translate-y-2"
            >
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-secondary uppercase tracking-tighter">선택한 위치</span>
                    <span className="text-[12px] font-black text-foreground max-w-[120px] truncate">{address || '주소 확인 중...'}</span>
                </div>
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onReport(); 
                    }}
                    className="bg-secondary text-white text-[11px] px-3 py-1.5 rounded-lg font-black shadow-lg active:scale-95 transition-transform"
                >
                    제보
                </button>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card-bg rotate-45 border-r border-b border-secondary/20"></div>
            </motion.div>
            {/* 마커 본체: 바운싱하는 동플 아이콘 */}
            <div className="w-10 h-10 bg-white rounded-full border-2 border-secondary/20 shadow-2xl flex items-center justify-center animate-bounce overflow-hidden relative">
                <img 
                    src="/favicon-marker.png" 
                    alt="동플 선택" 
                    className="w-full h-full object-cover p-1.5"
                />
                {/* 링 효과 */}
                <div className="absolute inset-0 border-2 border-secondary/10 rounded-full"></div>
            </div>
            {/* 그림자 */}
            <div className="w-6 h-1.5 bg-black/10 rounded-[100%] blur-[2px] mt-1"></div>
        </div>
    );
}
