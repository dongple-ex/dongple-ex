"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    CloudSun, Coffee, Building2, Store,
    HeartPulse, Landmark, ChevronLeft, LayoutList, MessageSquare, Share2
} from "lucide-react";
import Link from "next/link";
import CategorizedNewsCarousel from "@/components/news/CategorizedNewsCarousel";

function NewsContent() {
    const searchParams = useSearchParams();
    const targetCat = searchParams.get("cat");

    useEffect(() => {
        if (targetCat) {
            const element = document.getElementById(`news-section-${targetCat}`);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 300);
            }
        }
    }, [targetCat]);

    return (
        <div className="bg-background min-h-screen pb-32 transition-colors duration-500">
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between transition-colors duration-500">
                <div className="flex items-center space-x-4">
                    <Link href="/">
                        <button className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                            <ChevronLeft size={24} className="text-foreground" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-foreground">동네 소식들</h1>
                        <p className="text-[11px] font-bold text-accent">수원시 정자동 기준</p>
                    </div>
                </div>
            </header>

            <section className="px-6 pt-6 pb-3">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[32px] border border-border bg-card-bg p-6 shadow-sm"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-accent">Community Board</p>
                            <h2 className="mt-2 text-[26px] font-black tracking-tight text-foreground">동네 소식란</h2>
                            <p className="mt-3 max-w-[320px] text-[13px] font-medium leading-relaxed text-foreground/60">
                                상황공유가 지금 당장의 현장을 빠르게 전하는 기능이라면,
                                소식란은 경험과 정보, 질문과 추천을 게시글로 남기는 동네 커뮤니티 공간입니다.
                            </p>
                        </div>
                        <LayoutList size={26} className="shrink-0 text-accent" />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2.5">
                        <div className="rounded-2xl bg-nav-bg px-3 py-3 text-center">
                            <MessageSquare size={15} className="mx-auto mb-1 text-secondary" />
                            <p className="text-[10px] font-black uppercase tracking-wider text-foreground/40">대화형</p>
                            <p className="mt-1 text-[12px] font-bold text-foreground">댓글로 이어짐</p>
                        </div>
                        <div className="rounded-2xl bg-nav-bg px-3 py-3 text-center">
                            <Share2 size={15} className="mx-auto mb-1 text-secondary" />
                            <p className="text-[10px] font-black uppercase tracking-wider text-foreground/40">게시형</p>
                            <p className="mt-1 text-[12px] font-bold text-foreground">글과 공유 중심</p>
                        </div>
                        <div className="rounded-2xl bg-nav-bg px-3 py-3 text-center">
                            <LayoutList size={15} className="mx-auto mb-1 text-secondary" />
                            <p className="text-[10px] font-black uppercase tracking-wider text-foreground/40">맥락형</p>
                            <p className="mt-1 text-[12px] font-bold text-foreground">설명과 경험 축적</p>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Categorized Carousels */}
            <div className="space-y-4">
                <CategorizedNewsCarousel
                    title="날씨 소식"
                    category="날씨"
                    icon={CloudSun}
                    color="text-blue-500"
                />
                <CategorizedNewsCarousel
                    title="동네 카페"
                    category="카페"
                    icon={Coffee}
                    color="text-amber-500"
                />
                <CategorizedNewsCarousel
                    title="이사/생활"
                    category="이사"
                    icon={Building2}
                    color="text-orange-500"
                />
                <CategorizedNewsCarousel
                    title="우리동네 가게"
                    category="가게"
                    icon={Store}
                    color="text-green-500"
                />
                <CategorizedNewsCarousel
                    title="건강/의료"
                    category="병원"
                    icon={HeartPulse}
                    color="text-red-500"
                />
                <CategorizedNewsCarousel
                    title="공공 소식"
                    category="공공"
                    icon={Landmark}
                    color="text-purple-500"
                />
            </div>
        </div>
    );
}

export default function NewsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewsContent />
        </Suspense>
    );
}
