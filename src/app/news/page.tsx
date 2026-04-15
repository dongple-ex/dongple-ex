"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    CloudSun, Coffee, Building2, Store,
    HeartPulse, Landmark, Bell, Search,
    Plus, ChevronLeft
} from "lucide-react";
import Link from "next/link";
import CategorizedNewsCarousel from "@/components/news/CategorizedNewsCarousel";
import BottomNavV2 from "@/components/layout/v2/BottomNavV2";

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
                    <Link href="/v2">
                        <button className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                            <ChevronLeft size={24} className="text-foreground" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-foreground">동네 소식들</h1>
                        <p className="text-[11px] font-bold text-accent">수원시 정자동 기준</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                        <Search size={22} className="text-foreground/60" />
                    </button>
                    <button className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                        <Bell size={22} className="text-foreground/60" />
                    </button>
                </div>
            </header>

            {/* Quick Hero Banner with Background Image */}
            <section className="px-6 pt-8 pb-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative h-56 bg-foreground/10 rounded-[40px] px-8 py-10 flex flex-col justify-end text-white shadow-2xl overflow-hidden group"
                >
                    <motion.img
                        src="https://tse1.mm.bing.net/th/id/OIP.5DdnYb82wRb8F3a84o0lJQHaEK?rs=1&pid=ImgDetMain&o=7&rm=3"
                        alt="Neighborhood"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="relative z-10">
                        <motion.span
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-[11px] font-black px-4 py-1.5 bg-accent/90 text-white rounded-full backdrop-blur-md mb-4 inline-block shadow-lg"
                        >
                            실시간 핫이슈
                        </motion.span>
                        <h2 className="text-3xl font-black leading-tight mb-2 tracking-tight">
                            만석공원 이번 주말<br />벚꽃 축제가 열립니다!
                        </h2>
                        <p className="text-xs text-white/70 font-bold mb-1">우리 이웃들이 가장 많이 확인한 소식</p>
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

            {/* Bottom Nav Integration */}
            <BottomNavV2 />

            <style jsx global>{`
                /* Hide header/footer from base layout if necessary */
                header.base-header, nav.base-nav {
                    display: none !important;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
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
