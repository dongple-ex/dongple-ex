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
  onFocus,
}: MapHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto flex items-center gap-3"
    >
      <button
        onClick={onBack}
        className="rounded-2xl border border-border bg-nav-bg p-3 text-foreground/60 shadow-xl backdrop-blur-xl transition-all hover:text-secondary active:scale-95"
        aria-label="뒤로"
      >
        <ArrowLeft size={24} />
      </button>
      <div className="group relative flex-1">
        <input
          type="text"
          placeholder="지금 상태가 궁금한 장소 검색"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
          className="h-14 w-full rounded-[24px] border border-border bg-nav-bg pl-12 pr-12 text-left text-[15px] font-black text-foreground shadow-2xl backdrop-blur-xl outline-none transition-all placeholder:text-[13px] placeholder:text-foreground/30"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={20} />
        {searchQuery && (
          <button onClick={onClear} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-foreground/5 p-1 text-foreground/40" aria-label="검색어 지우기">
            <X size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
