"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface Category {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface MapOverlayProps {
    categories: Category[];
    selectedCategory: string;
    onCategorySelect: (id: string) => void;
    isResultOpen: boolean;
    searchResults: any[];
    onSelectPlace: (place: any) => void;
}

export default function MapOverlay({
    categories,
    selectedCategory,
    onCategorySelect,
    isResultOpen,
    searchResults,
    onSelectPlace
}: MapOverlayProps) {
    return (
        <div className="flex flex-col space-y-3">
            {/* Category Filter Chips */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 }}
                className="flex overflow-x-auto pb-2 space-x-2 no-scrollbar pointer-events-auto"
            >
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onCategorySelect(cat.id)}
                        className={`px-4 py-2.5 rounded-2xl text-[13px] font-black whitespace-nowrap transition-all border flex items-center space-x-2 ${
                            selectedCategory === cat.id
                            ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/20"
                            : "bg-nav-bg/80 backdrop-blur-xl text-foreground/50 border-border hover:bg-card-bg"
                        }`}
                    >
                        <cat.icon size={14} />
                        <span>{cat.label}</span>
                    </button>
                ))}
            </motion.div>

            <AnimatePresence>
                {isResultOpen && searchResults.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 10 }} 
                        className="bg-nav-bg backdrop-blur-2xl rounded-[32px] shadow-2xl mt-4 p-2 max-h-[400px] overflow-y-auto pointer-events-auto border border-border/50"
                    >
                        {searchResults.map((place, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => onSelectPlace(place)} 
                                className="p-4 hover:bg-foreground/5 rounded-2xl cursor-pointer"
                            >
                                <h5 className="font-black text-[15px] text-foreground mb-1" dangerouslySetInnerHTML={{ __html: place.title }} />
                                <p className="text-[12px] text-foreground/40 font-bold">{place.roadAddress || place.address}</p>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
