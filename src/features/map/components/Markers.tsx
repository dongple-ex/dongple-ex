"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { getStatusTheme } from "@/lib/statusTheme";

/**
 * 실시간 제보 상태 마커
 */
interface StatusMarkerProps {
    status: string;
    isRequest: boolean;
    isSelected: boolean;
    isExpired?: boolean;
}

export function StatusMarker({ status, isRequest, isSelected, isExpired }: StatusMarkerProps) {
    const theme = getStatusTheme(status, isRequest);

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: isSelected ? 1.2 : 1, opacity: 1 }}
            className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${isSelected ? 'z-50' : 'hover:scale-110 z-10'} filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)]`}
            style={{ 
                position: 'absolute',
                left: 0,
                top: 0,
                transform: 'translate(-50%, -50%)'
            }}
        >
            {/* 상단 상태 인디케이터 점 (Status Light) - 과거 이력이면 숨김 */}
            {!isExpired && (
                <div className="flex flex-col items-center mb-1">
                    {isRequest && (
                        <motion.div 
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className={`mb-1 px-2 py-0.5 rounded-full text-[9px] font-black shadow-md border whitespace-nowrap ${theme.tone} ${theme.text}`}
                            style={{ borderColor: theme.color }}
                        >
                            상태요청
                        </motion.div>
                    )}
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`w-3 h-3 rounded-full border-2 border-white shadow-sm`}
                        style={{ backgroundColor: theme.color }}
                    />
                </div>
            )}

            {/* 메인 아이콘 컨테이너 */}
            <div 
                className={`relative w-10 h-10 bg-white rounded-full border-[3.5px] shadow-sm flex items-center justify-center transition-colors ${isExpired ? 'opacity-80' : ''}`}
                style={{ borderColor: isExpired ? '#A1887F' : theme.color }}
            >
                <Image
                    src="/favicon_marker.png"
                    alt="상태"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover p-1.5 z-10"
                />
            </div>
        </motion.div>
    );
}

/**
 * 클릭 지점 타겟 마커 (제보용)
 */
interface ClickTargetMarkerProps {
    address: string;
    placeName?: string;
    onReport: () => void;
    onRequest: () => void;
}

export function ClickTargetMarker({ address, placeName, onReport, onRequest }: ClickTargetMarkerProps) {
    return (
        <div className="relative flex flex-col items-center group pointer-events-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-20 bg-card-bg px-5 py-3 rounded-2xl shadow-2xl border border-secondary/20 whitespace-nowrap flex items-center space-x-4 translate-y-2"
            >
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-secondary uppercase tracking-tighter">{placeName ? "선택한 장소" : "선택한 위치"}</span>
                    <span className="text-[14px] font-black text-foreground max-w-[150px] truncate">{placeName || address || '주소 확인 중...'}</span>
                    {placeName && (
                        <span className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{address}</span>
                    )}
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRequest();
                        }}
                        className="bg-[#795548] text-white text-[11px] px-3.5 py-2 rounded-xl font-black hover:bg-[#5D4037] transition-colors shadow-lg shadow-[#795548]/20"
                    >
                        여기는요?
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onReport();
                        }}
                        className="bg-secondary text-white text-[11px] px-3.5 py-2 rounded-xl font-black shadow-lg shadow-secondary/20 active:scale-95 transition-all"
                    >
                        여기는요!
                    </button>
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card-bg rotate-45 border-r border-b border-secondary/20"></div>
            </motion.div>
            {/* 마커 본체: 바운싱하는 내발문자 아이콘 */}
            <div className="w-10 h-10 bg-white rounded-full border-2 border-secondary/20 shadow-2xl flex items-center justify-center animate-bounce overflow-hidden relative">
                <Image
                    src="/favicon_marker.png"
                    alt="위치 선택"
                    width={40}
                    height={40}
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
