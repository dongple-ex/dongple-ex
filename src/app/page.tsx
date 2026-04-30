"use client";

import { useEffect, useState } from "react";
import {
    Activity,
    ArrowRight,
    LayoutGrid,
    List,
    MapPinned,
    PartyPopper,
    ShieldCheck,
    Star,
    TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import HeroSection from "@/components/dashboard/v2/HeroSection";
import LiveBoardTickerv2 from "@/components/dashboard/v2/LiveBoardTickerv2";
import OfficialEventSection from "@/features/events/components/OfficialEventSection";
import { useLocationStore } from "@/lib/store/locationStore";
import { useUIStore } from "@/lib/store/uiStore";
import { fetchPosts, Post, subscribePosts } from "@/services/postService";

export default function Home() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");
    const openBottomSheet = useUIStore((state) => state.openBottomSheet);
    const regionName = useLocationStore((state) => state.regionName);

    const loadPosts = async () => {
        setIsLoading(true);
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

        return () => {
            sub.unsubscribe();
        };
    }, [regionName]);

    return (
        <div className="min-h-screen bg-background pb-32 transition-colors duration-500">
            <HeroSection />
            <LiveBoardTickerv2 />

            <section className="px-6 pt-5">
                <div className="rounded-[28px] border border-border bg-card-bg p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-secondary">Map Hub</p>
                            <h2 className="mt-1.5 text-[22px] font-black text-foreground">
                                지금 가장 핫한 곳을 바로 확인하기
                            </h2>
                            <p className="mt-2.5 max-w-[320px] text-[13px] font-medium leading-relaxed text-foreground/60">
                                내발문자는 당신이 머문 장소의 지금 상태를 기록하고 보여주며,
                                그다음에 공유와 판단으로 이어지게 설계했습니다.
                            </p>
                        </div>
                        <MapPinned className="mt-1 shrink-0 text-secondary" size={26} />
                    </div>

                    <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                        <Link
                            href="/map"
                            className="inline-flex items-center justify-center rounded-2xl bg-foreground px-5 py-3 text-[13px] font-black text-background"
                        >
                            지도 바로 보기
                            <ArrowRight size={16} className="ml-2" />
                        </Link>
                        <Link
                            href="/events"
                            className="inline-flex items-center justify-center rounded-2xl border border-border px-5 py-3 text-[13px] font-black text-foreground/70"
                        >
                            오늘 행사 보기
                        </Link>
                    </div>
                </div>
            </section>

            <div className="mt-5">
                <OfficialEventSection />
            </div>

            <section className="px-6 py-8">
                <div className="flex items-center justify-between rounded-[32px] border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div>
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                            Community Power
                        </p>
                        <h4 className="text-[15px] font-black text-foreground">
                            현장 공유가 쌓일수록 동네의 지금이 더 선명해집니다
                        </h4>
                        <p className="mt-2 text-[12px] font-medium text-foreground/55">
                            많이 올리는 것보다 정확하게 남긴 정보가 더 큰 영향을 만들도록 보상 구조를 잡고 있습니다.
                        </p>
                    </div>

                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="h-8 w-8 overflow-hidden rounded-full border-2 border-background bg-foreground/10"
                            >
                                <Image
                                    src={`https://i.pravatar.cc/100?img=${i + 10}`}
                                    alt="user"
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        ))}
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-secondary text-[10px] font-black text-white">
                            +
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-6 pb-4 pt-2">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Community Feed</p>
                        <h2 className="mt-2 text-xl font-black text-foreground">동네 이야기와 추가 현장 제보</h2>
                    </div>
                    <div className="rounded-full border border-border bg-card-bg px-3 py-1 text-[11px] font-bold text-foreground/45">
                        보조 섹션
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-[12px] font-bold text-foreground/50">
                        <PartyPopper size={14} className="text-secondary" />
                        <span>핵심 탐색 아래에서 이어지는 지역 커뮤니티 흐름</span>
                    </div>
                    <div className="flex rounded-xl bg-foreground/5 p-1">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`rounded-lg p-1.5 transition-all ${viewMode === "list" ? "bg-card-bg text-accent shadow-sm" : "text-foreground/40"}`}
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`rounded-lg p-1.5 transition-all ${viewMode === "grid" ? "bg-card-bg text-accent shadow-sm" : "text-foreground/40"}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                </div>

                <div className={`mt-6 ${viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}`}>
                    {isLoading ? (
                        [1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-32 animate-pulse rounded-[24px] bg-foreground/5" />
                        ))
                    ) : posts.length > 0 ? (
                        posts.map((post) => (
                            <FeedItem
                                key={post.id}
                                post={post}
                                onClick={() => openBottomSheet("postDetail", { ...post })}
                            />
                        ))
                    ) : (
                        <div className="rounded-[32px] border-2 border-dashed border-foreground/5 py-20 text-center font-bold text-foreground/20">
                            아직 올라온 현장 소식이 없습니다.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function FeedItem({ post, onClick }: { post: Post; onClick: () => void }) {
    const getTrustLevel = (score: number) => {
        if (score >= 0.8) {
            return {
                label: "신뢰 높음",
                color: "bg-blue-500/10 text-blue-500",
                icon: <ShieldCheck size={10} />
            };
        }

        if (score >= 0.5) {
            return {
                label: "보통 신뢰",
                color: "bg-green-500/10 text-green-500",
                icon: <Star size={10} />
            };
        }

        return {
            label: "확인 필요",
            color: "bg-orange-500/10 text-orange-500",
            icon: <Activity size={10} />
        };
    };

    const trust = getTrustLevel(post.score || 0.5);

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="flex cursor-pointer flex-col rounded-[24px] border border-border bg-card-bg p-5 shadow-sm transition-colors duration-500"
            onClick={onClick}
        >
            <div className="mb-3 flex items-center justify-between">
                <div className={`flex items-center rounded-full px-2 py-0.5 text-[9px] font-black ${trust.color}`}>
                    {trust.icon}
                    <span className="ml-1">{trust.label}</span>
                </div>
                <span className="text-[10px] font-bold text-foreground/40">
                    {new Date(post.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>

            <h3 className="mb-2 line-clamp-2 text-[15px] font-black leading-tight text-foreground">
                {post.title || post.content}
            </h3>

            <div className="mt-auto flex items-center space-x-3 text-[10px] font-bold text-foreground/40">
                <span className="flex items-center">
                    <TrendingUp size={10} className="mr-0.5 text-secondary" /> {post.likes_count}
                </span>
                <span>{post.comments_count} 댓글</span>
                <span className="flex-1 text-right text-[9px] text-foreground/20">#{post.category}</span>
            </div>
        </motion.div>
    );
}
