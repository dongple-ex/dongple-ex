"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
    Heart, MessageSquare, Share2, ShieldCheck, 
    Star, Activity, Clock, User as UserIcon,
    Shield
} from "lucide-react";
import { Post, fetchComments, likePost } from "@/services/postService";

interface PostDetailProps {
    post: Post;
    onUpdate?: () => void;
}

export default function PostDetail({ post, onUpdate }: PostDetailProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [localLikes, setLocalLikes] = useState(post.likes_count);
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        const loadComments = async () => {
            setIsLoading(true);
            try {
                const data = await fetchComments(post.id);
                setComments(data);
            } catch (error) {
                console.error("Failed to load comments:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadComments();
    }, [post.id]);

    const handleLike = async () => {
        try {
            await likePost(post.id);
            setLocalLikes(prev => prev + 1);
            setIsLiked(true);
            onUpdate?.();
        } catch (error) {
            console.error("Like failed:", error);
        }
    };

    const getTrustLevel = (score: number) => {
        if (score >= 0.8) return { label: "매우 신뢰", color: "text-blue-500", bg: "bg-blue-50", icon: <ShieldCheck size={14}/> };
        if (score >= 0.5) return { label: "인증된 이웃", color: "text-green-500", bg: "bg-green-50", icon: <Star size={14}/> };
        return { label: "확인 필요", color: "text-orange-500", bg: "bg-orange-50", icon: <Activity size={14}/> };
    };

    const trust = getTrustLevel(post.score || 0.5);

    return (
        <div className="flex flex-col bg-white">
            {/* Header Content */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-accent/10 text-accent font-black text-[11px] rounded-full uppercase tracking-widest">
                        {post.category}
                    </span>
                    <div className="flex items-center text-foreground/30 text-[11px] font-bold">
                        <Clock size={12} className="mr-1" />
                        {new Date(post.created_at).toLocaleString([], { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>

                <h2 className="text-2xl font-black text-foreground leading-[1.3] tracking-tight">
                    {post.title || post.content.substring(0, 30) + '...'}
                </h2>

                {/* Author Info */}
                <div className="flex items-center justify-between py-4 border-y border-foreground/5">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-foreground/5 rounded-2xl flex items-center justify-center text-foreground/40">
                            <UserIcon size={20} />
                        </div>
                        <div>
                            <p className="text-[14px] font-black text-foreground">이웃 주민</p>
                            <p className="text-[11px] font-bold text-foreground/40">{post.is_anonymous ? "익명 작성됨" : "실명 인증됨"}</p>
                        </div>
                    </div>
                    <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ${trust.bg} ${trust.color}`}>
                        {trust.icon}
                        <span className="text-[11px] font-black">{trust.label}</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="py-2 text-[16px] text-foreground/80 leading-relaxed min-h-[120px] whitespace-pre-wrap font-medium">
                    {post.content}
                </div>

                {/* Interactions */}
                <div className="flex items-center space-x-6 py-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={handleLike}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl transition-all ${
                            isLiked ? "bg-secondary text-white shadow-lg" : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
                        }`}
                    >
                        <Heart size={18} className={isLiked ? "fill-current" : ""} />
                        <span className="text-sm font-black">{localLikes}</span>
                    </motion.button>
                    
                    <div className="flex items-center space-x-2 text-foreground/40">
                        <MessageSquare size={18} />
                        <span className="text-sm font-black">{post.comments_count}</span>
                    </div>

                    <button className="p-2.5 bg-foreground/5 rounded-full text-foreground/40 hover:bg-foreground/10 transition-colors ml-auto">
                        <Share2 size={18} />
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            <div className="mt-8 pt-8 border-t-8 border-foreground/5">
                <div className="flex items-center justify-between mb-6 px-1">
                    <h3 className="text-lg font-black text-foreground flex items-center">
                        댓글 <span className="text-secondary ml-1.5">{comments.length}</span>
                    </h3>
                </div>

                <div className="space-y-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => (
                                <div key={i} className="h-20 bg-foreground/5 rounded-3xl animate-pulse" />
                            ))}
                        </div>
                    ) : comments.length > 0 ? (
                        comments.map((comment, idx) => (
                            <div key={idx} className="flex space-x-4 items-start group">
                                <div className="w-9 h-9 bg-foreground/5 rounded-2xl shrink-0 flex items-center justify-center text-foreground/30">
                                    <UserIcon size={16} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[13px] font-black text-foreground">
                                            {comment.is_anonymous ? `익명 이웃` : "정다운 이웃"}
                                        </p>
                                        <span className="text-[10px] font-bold text-foreground/30">
                                            {new Date(comment.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-[14px] text-foreground/70 leading-relaxed font-medium bg-foreground/5 p-4 rounded-3xl rounded-tl-none">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-foreground/20 italic">
                            <MessageSquare size={40} className="mb-2 opacity-10" />
                            <p className="text-sm font-bold tracking-tight">첫 번째 따뜻한 댓글을 남겨보세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
