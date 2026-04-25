"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Plus } from "lucide-react";

interface PulseMarkerProps {
    title: string;
    category: string;
    statusLabel?: string;
    updatedAgo?: string;
    statusIndicatorClass?: string;
    isSelected?: boolean;
    onClick?: () => void;
    onReport?: () => void;
}

export default function PulseMarker({
    title,
    category,
    statusLabel,
    updatedAgo,
    statusIndicatorClass = "bg-secondary",
    isSelected = false,
    onClick,
    onReport,
}: PulseMarkerProps) {
    return (
        <div 
            className={`relative flex flex-col items-center cursor-pointer group transition-all duration-300 pointer-events-auto ${isSelected ? 'z-50 scale-110' : 'z-10'}`}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            {/* Pulse Animation Outer Ring (Constant) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ 
                        scale: [1, 2],
                        opacity: [0.6, 0]
                    }}
                    transition={{ 
                        duration: 2.5, 
                        repeat: Infinity, 
                        ease: "easeOut" 
                    }}
                    className="w-full h-full bg-secondary/20 rounded-full"
                />
            </div>

            {/* Main Floating Body */}
            <motion.div 
                animate={{ 
                    y: [0, -6, 0] // Soft floating animation
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="flex flex-col items-center"
            >
                {/* Main Marker Circle */}
                <motion.div 
                    whileHover={{ scale: 1.15 }} 
                    whileTap={{ scale: 0.95 }}
                    className="relative z-10 w-9 h-9 bg-card-bg border-2 border-secondary rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.15)] transition-shadow group-hover:shadow-secondary/30"
                >
                    <BadgeCheck size={20} className="text-secondary" />
                    
                    {/* Top Right Active Dot */}
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-secondary text-white rounded-full flex items-center justify-center border-2 border-card-bg">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </div>
                </motion.div>

                {/* Label (Follows floating motion) */}
                <div className="mt-2 bg-secondary text-white px-3 py-1.5 rounded-xl border border-secondary/20 shadow-xl whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black opacity-70 uppercase tracking-tighter mb-0.5">{category}</span>
                        <span className="text-[13px] font-black">{title}</span>
                        {statusLabel ? (
                            <span className="mt-1 flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black">
                                <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${statusIndicatorClass}`} />
                                {statusLabel}
                                {updatedAgo ? <span className="ml-1 opacity-70">· {updatedAgo}</span> : null}
                            </span>
                        ) : (
                            <span className="mt-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-black opacity-80">
                                현장 상태 대기
                            </span>
                        )}
                    </div>
                </div>

                {/* Bottom Pointer attached to Label */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-secondary -mt-0.5" />

                {onReport && isSelected && (
                    <motion.button
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onReport();
                        }}
                        className="mt-2 inline-flex items-center rounded-full bg-foreground px-3 py-1.5 text-[11px] font-black text-background shadow-lg transition-transform active:scale-95 hover:bg-foreground/80"
                    >
                        <Plus size={12} className="mr-1" />
                        현장 공유하기
                    </motion.button>
                )}
            </motion.div>
        </div>
    );
}
