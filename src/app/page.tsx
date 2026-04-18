"use client";

import { useState, useEffect } from "react";
import {
    CloudSun, Building2, Store, School,
    HeartPulse, Landmark, Coffee, TrendingUp, Activity, 
    ShieldCheck, Star, LayoutGrid, List
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

// V2 전용 컴포넌트 임포트
import HeroSection from "@/components/dashboard/v2/HeroSection";
import QuestionSummaryV2 from "@/components/dashboard/v2/QuestionSummaryV2";
import LiveBoardTickerv2 from "@/components/dashboard/v2/LiveBoardTickerv2";
import OfficialEventSection from "@/features/events/components/OfficialEventSection";

import { useUIStore } from "@/lib/store/uiStore";
import { fetchPosts, subscribePosts, Post } from "@/services/postService";

export default function Home() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");
    const openBottomSheet = useUIStore((state) => state.openBottomSheet);

    const loadPosts = async () => {
        try {
            const data = await fetchPosts(10);
            setPosts(data);
        } catch (error) {
            console.error("Failed to load posts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
        const sub = subscribePosts(loadPosts);
        return () => { sub.unsubscribe(); };
    }, []);

    const categories = [
        { icon: CloudSun, label: "날씨", color: "bg-blue-100 text-blue-600" },
        { icon: Coffee, label: "카페", color: "bg-amber-100 text-amber-600" },
        { icon: Store, label: "가게", color: "bg-green-100 text-green-600" },
        { icon: Building2, label: "이사", color: "bg-orange-100 text-orange-600" },
        { icon: HeartPulse, label: "병원", color: "bg-red-100 text-red-600" },
        { icon: School, label: "교육", color: "bg-yellow-100 text-yellow-600" },
        { icon: Landmark, label: "공공", color: "bg-purple-100 text-purple-600" },
        { icon: LayoutGrid, label: "전체", color: "bg-gray-100 text-gray-600" },
    ];

    return (
        <div className="bg-background min-h-screen pb-32 transition-colors duration-500">
            {/* V2 Hero 영역 */}
            <HeroSection />

            {/* V2 실시간 동형 티커 */}
            <LiveBoardTickerv2 />



            {/* 공식 행사 섹션 (Phase 1 핵심 기능) */}
            <div className="mt-8">
                <OfficialEventSection />
            </div>

            {/* V2 AI 요약 캐러셀 */}
            <QuestionSummaryV2 />

            {/* 사회적 증명 (Social Proof) 배너 */}
            <section className="px-6 py-2">
                <div className="bg-foreground/[0.02] border border-foreground/5 rounded-[32px] p-6 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-secondary tracking-widest mb-1 uppercase">Community Power</p>
                        <h4 className="text-[15px] font-black text-foreground">30,000+ 이웃이 함께 기록 중</h4>
                    </div>
                    <div className="flex -space-x-2">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-foreground/10 overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" className="w-full h-full object-cover" />
                            </div>
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-black text-white">+</div>
                    </div>
                </div>
            </section>

            {/* 카테고리 그리드 섹션 */}
            <section className="px-6 py-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-foreground">어떤 소식이 궁금하세요?</h2>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {categories.map((cat, i) => (
                        <Link key={i} href={cat.label === "전체" ? "/news" : `/news?cat=${cat.label}`}>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex flex-col items-center space-y-2 w-full"
                            >
                                <div className={`w-14 h-14 ${cat.color} rounded-[20px] flex items-center justify-center shadow-sm border border-white dark:border-white/10`}>
                                    <cat.icon size={26} />
                                </div>
                                <span className="text-[11px] font-bold text-foreground/60">{cat.label}</span>
                            </motion.button>
                        </Link>
                    ))}
                </div>
            </section>

            {/* 메인 피드 섹션 */}
            <section className="px-6 py-10 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-foreground">지금 우리 동네는</h2>
                    <div className="flex bg-foreground/5 p-1 rounded-xl">
                        <button 
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-card-bg shadow-sm text-accent" : "text-foreground/40"}`}
                        >
                            <List size={16} />
                        </button>
                        <button 
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-card-bg shadow-sm text-accent" : "text-foreground/40"}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                </div>

                <div className={viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}>
                    {isLoading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-foreground/5 rounded-[24px] animate-pulse" />
                        ))
                    ) : (
                        posts.length > 0 ? (
                            posts.map((post) => (
                                <FeedItem key={post.id} post={post} mode={viewMode} onClick={() => openBottomSheet("postDetail", { ...post })} />
                            ))
                        ) : (
                            <div className="py-20 text-center text-foreground/20 font-bold border-2 border-dashed border-foreground/5 rounded-[32px]">
                                아직 올라온 소식이 없습니다.
                            </div>
                        )
                    )}
                </div>
            </section>
        </div>
    );
}

function FeedItem({ post, mode, onClick }: { post: Post, mode: "grid" | "list", onClick: () => void }) {
    const getTrustLevel = (score: number) => {
        if (score >= 0.8) return { label: "신용 높음", color: "text-blue-500 bg-blue-500/10", icon: <ShieldCheck size={10}/> };
        if (score >= 0.5) return { label: "보통 이웃", color: "text-green-500 bg-green-500/10", icon: <Star size={10}/> };
        return { label: "확인 필요", color: "text-orange-500 bg-orange-500/10", icon: <Activity size={10}/> };
    };
    const trust = getTrustLevel(post.score || 0.5);

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className={`bg-card-bg rounded-[24px] p-5 shadow-sm border border-border cursor-pointer transition-colors duration-500 flex flex-col`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center px-2 py-0.5 rounded-full text-[9px] font-black ${trust.color}`}>
                    {trust.icon}
                    <span className="ml-1">{trust.label}</span>
                </div>
                <span className="text-[10px] text-foreground/40 font-bold">
                    {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            
            <h3 className="text-[15px] font-black text-foreground mb-2 leading-tight line-clamp-2">
                {post.title || post.content}
            </h3>
            
            <div className="flex items-center mt-auto space-x-3 text-[10px] text-foreground/40 font-bold">
                <span className="flex items-center">
                    <TrendingUp size={10} className="mr-0.5 text-secondary" /> {post.likes_count}
                </span>
                <span>{post.comments_count} 댓글</span>
                <span className="flex-1 text-right text-[9px] text-foreground/20">#{post.category}</span>
            </div>
        </motion.div>
    );
}
