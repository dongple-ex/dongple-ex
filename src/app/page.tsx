"use client";

import { useState, useEffect } from "react";
import {
    TrendingUp, Activity,
    ShieldCheck, Star, LayoutGrid, List, ArrowRight, MapPinned, PartyPopper
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

// V2 전용 컴포넌트 임포트
import HeroSection from "@/components/dashboard/v2/HeroSection";
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

    return (
        <div className="bg-background min-h-screen pb-32 transition-colors duration-500">
            <HeroSection />
            <LiveBoardTickerv2 />

            <section className="px-6 pt-5">
                <div className="rounded-[28px] border border-border bg-card-bg p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-secondary">Map Hub</p>
                            <h2 className="mt-1.5 text-[22px] font-black text-foreground">실시간 탐색의 중심은 지도입니다</h2>
                            <p className="mt-2.5 max-w-[320px] text-[13px] font-medium leading-relaxed text-foreground/60">
                                지금 있는 위치를 기준으로 이웃 제보와 공식 이벤트를 함께 보고, 바로 공유와 검증으로 이어질 수 있게 설계되어 있습니다.
                            </p>
                        </div>
                        <MapPinned className="mt-1 shrink-0 text-secondary" size={26} />
                    </div>
                    <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                        <Link
                            href="/map"
                            className="inline-flex items-center justify-center rounded-2xl bg-foreground px-5 py-3 text-[13px] font-black text-white"
                        >
                            지도 허브 열기
                            <ArrowRight size={16} className="ml-2" />
                        </Link>
                        <Link
                            href="/events"
                            className="inline-flex items-center justify-center rounded-2xl border border-border px-5 py-3 text-[13px] font-black text-foreground/70"
                        >
                            공식 소식 전체보기
                        </Link>
                    </div>
                </div>
            </section>

            <div className="mt-5">
                <OfficialEventSection />
            </div>

            <section className="px-6 py-8">
                <div className="bg-foreground/[0.02] border border-foreground/5 rounded-[32px] p-6 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-secondary tracking-widest mb-1 uppercase">Community Power</p>
                        <h4 className="text-[15px] font-black text-foreground">30,000+ 이웃이 함께 동네 상황을 기록 중</h4>
                        <p className="mt-2 text-[12px] font-medium text-foreground/55">
                            실시간 공유가 잠잠한 순간에도 공식 소식과 이웃 제보가 이어지도록 홈을 구성합니다.
                        </p>
                    </div>
                    <div className="flex -space-x-2">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-foreground/10 overflow-hidden">
                                <Image src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" width={32} height={32} className="w-full h-full object-cover" />
                            </div>
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-black text-white">+</div>
                    </div>
                </div>
            </section>

            <section className="px-6 pt-2 pb-4">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Community Feed</p>
                        <h2 className="mt-2 text-xl font-black text-foreground">동네 이야기와 추가 소식</h2>
                    </div>
                    <div className="rounded-full border border-border bg-card-bg px-3 py-1 text-[11px] font-bold text-foreground/45">
                        보조 섹션
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-[12px] font-bold text-foreground/50">
                        <PartyPopper size={14} className="text-secondary" />
                        <span>실시간 상황과 공식 소식 아래에 배치된 보조 커뮤니티 피드</span>
                    </div>
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

                <div className={`mt-6 ${viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}`}>
                    {isLoading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-foreground/5 rounded-[24px] animate-pulse" />
                        ))
                    ) : (
                        posts.length > 0 ? (
                            posts.map((post) => (
                                <FeedItem key={post.id} post={post} onClick={() => openBottomSheet("postDetail", { ...post })} />
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

function FeedItem({ post, onClick }: { post: Post, onClick: () => void }) {
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
