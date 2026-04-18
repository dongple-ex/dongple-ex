"use client";

import { ArrowLeft, Search, X } from "lucide-react";
import { motion } from "framer-motion";

interface MapHeaderProps {
    searchQuery: string;
    onSearchChange: (val: string) => void;
    onSearchSubmit: () => void;
    onClear: () => void;
    onBack: () => void;
    onFocus: () => void;
}

export default function MapHeader({
    searchQuery,
    onSearchChange,
    onSearchSubmit,
    onClear,
    onBack,
    onFocus
}: MapHeaderProps) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex items-center space-x-3 pointer-events-auto"
        >
            <button 
                onClick={onBack} 
                className="p-3 bg-nav-bg backdrop-blur-xl border border-border rounded-2xl shadow-xl text-foreground/60 hover:text-accent active:scale-95 transition-all"
            >
                <ArrowLeft size={24} />
            </button>
            <div className="flex-1 relative group">
                <input 
                    type="text" 
                    placeholder="어디로 갈까요? 장소나 주소 검색..." 
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={onFocus}
                    onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                    className="w-full h-14 pl-12 pr-12 bg-nav-bg backdrop-blur-xl border border-border rounded-[24px] text-[15px] font-black text-foreground shadow-2xl transition-all outline-none placeholder:text-foreground/30"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={20} />
                {searchQuery && (
                    <button 
                        onClick={onClear} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-foreground/5 rounded-full text-foreground/40"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}
