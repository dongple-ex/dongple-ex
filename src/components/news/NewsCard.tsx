"use client";

import { motion } from "framer-motion";
import { MessageSquare, Heart, Share2, ShieldCheck, Star, Activity, ExternalLink, LayoutList } from "lucide-react";
import { Post, likePost } from "@/services/postService";
import { useUIStore } from "@/lib/store/uiStore";
import { useState } from "react";

interface NewsCardProps {
    item: Post | any;
    isRss?: boolean;
    onUpdate?: () => void;
}

export default function NewsCard({ item, isRss, onUpdate }: NewsCardProps) {
    const openBottomSheet = useUIStore(state => state.openBottomSheet);
    const [localLikes, setLocalLikes] = useState(item.likes_count);
    const [isLiked, setIsLiked] = useState(false);

    const handleCardClick = () => {
        openBottomSheet("postDetail", item);
    };

    const handleLikeClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await likePost(item.id);
            setLocalLikes((prev: number) => prev + 1);
            setIsLiked(true);
            onUpdate?.();
        } catch (error) {
            console.error("Like failed:", error);
        }
    };

    const handleShareClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title || "동네 소식",
                    text: item.content,
                    url: window.location.href,
                });
            } catch (err) {
                console.error("Share failed:", err);
            }
        } else {
            alert("공유 기능을 지원하지 않는 브라우저입니다.");
        }
    };

    const getTrustLevel = (score: number) => {
        if (score >= 0.8) return { label: "신용 높음", color: "text-blue-500 bg-blue-500/10", icon: <ShieldCheck size={10}/> };
        if (score >= 0.5) return { label: "보통 이웃", color: "text-green-500 bg-green-500/10", icon: <Star size={10}/> };
        return { label: "확인 필요", color: "text-orange-500 bg-orange-500/10", icon: <Activity size={10}/> };
    };

    const trust = getTrustLevel(item.score || 0.5);

    return (
        <motion.div
            whileHover={{ y: -12, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCardClick}
            className="min-w-[280px] max-w-[320px] h-[440px] bg-card-bg/70 backdrop-blur-2xl rounded-[40px] border border-white/20 shadow-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-500 group"
        >
            {/* ... rest unchanged ... */}
            <div className="h-64 bg-gradient-to-br from-foreground/5 to-foreground/10 relative overflow-hidden">
                {item.image_url ? (
                    <motion.img 
                        initial={{ scale: 1.1 }}
                        whileHover={{ scale: 1.2 }}
                        transition={{ duration: 0.8 }}
                        src={item.image_url} 
                        alt={item.title} 
                        className="w-full h-full object-cover" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <LayoutList size={48} />
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                {isRss && (
                    <div className="absolute top-5 left-5 px-3 py-1.5 bg-black/60 backdrop-blur-lg rounded-full text-[10px] font-black text-white flex items-center shadow-lg">
                        <ExternalLink size={10} className="mr-1.5" /> 외부 소식
                    </div>
                )}

                {!isRss && (
                    <div className={`absolute top-5 left-5 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center ${trust.color} backdrop-blur-lg shadow-lg`}>
                        {trust.icon} <span className="ml-1.5">{trust.label}</span>
                    </div>
                )}
            </div>

            <div className="p-7 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black text-accent uppercase tracking-[0.1em]">{item.category}</span>
                    <span className="text-[10px] text-foreground/40 font-bold">
                        {new Date(item.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' })}
                    </span>
                </div>

                <h3 className="text-[19px] font-black text-foreground mb-4 leading-[1.3] tracking-tight transition-colors duration-500 line-clamp-2">
                    {item.title || item.content}
                </h3>

                <div className="mt-auto flex items-center justify-between pt-5 border-t border-foreground/5">
                    <div className="flex items-center space-x-5">
                        <motion.button 
                            whileTap={{ scale: 0.8 }}
                            onClick={handleLikeClick}
                            className={`flex items-center space-x-1.5 text-[12px] font-bold transition-colors ${isLiked ? 'text-secondary' : 'text-foreground/60'}`}
                        >
                            <Heart size={16} className={isLiked ? "fill-current" : ""} />
                            <span>{localLikes}</span>
                        </motion.button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                            className="flex items-center space-x-1.5 text-[12px] font-bold text-foreground/60"
                        >
                            <MessageSquare size={16} />
                            <span>{item.comments_count || 0}</span>
                        </button>
                    </div>
                    <motion.button 
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.05)' }}
                        onClick={handleShareClick}
                        className="p-2.5 rounded-full transition-colors"
                    >
                        <Share2 size={16} className="text-foreground/40" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}

