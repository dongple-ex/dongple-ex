"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, ChevronLeft, CloudSun, Coffee, HeartPulse, Landmark, LayoutList, MapPinned, PencilLine, Search, Store } from "lucide-react";
import Link from "next/link";
import CategorizedNewsCarousel from "@/components/news/CategorizedNewsCarousel";
import { useLocationStore } from "@/lib/store/locationStore";

function NewsContent() {
  const searchParams = useSearchParams();
  const targetCat = searchParams.get("cat");
  const targetScope = searchParams.get("scope") || "local";
  const { regionName } = useLocationStore();

  useEffect(() => {
    if (!targetCat) return;
    const element =
      document.getElementById(`news-section-${targetCat}-${targetScope}`) ||
      document.getElementById(`news-section-${targetCat}-local`);
    if (element) setTimeout(() => element.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }, [targetCat, targetScope]);

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/86 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="rounded-full p-2 transition-colors hover:bg-foreground/5" aria-label="뒤로">
              <ChevronLeft size={24} />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-black">소식</h1>
            <p className="text-[11px] font-bold text-secondary">{regionName || "내 동네"} 기준</p>
          </div>
        </div>
      </header>

      <section className="px-6 pb-3 pt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-border bg-card-bg p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary">Step 1. Discover</p>
              <h2 className="mt-2 text-[26px] font-black tracking-normal">소식은 “가볼 이유”를 고르는 화면입니다.</h2>
              <p className="mt-3 max-w-[340px] text-[13px] font-medium leading-relaxed text-foreground/60">
                행사, 카페, 시장, 산책 코스처럼 오늘 방문할 명분이 되는 정보를 모았습니다. 관심 있는 소식을 열고, 지도에서 지금 상태까지 확인해보세요.
              </p>
            </div>
            <LayoutList size={26} className="shrink-0 text-secondary" />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <FlowCard icon={<Search size={15} />} eyebrow="발견" label="갈 이유 찾기" />
            <FlowCard icon={<MapPinned size={15} />} eyebrow="확인" label="지도에서 상태 보기" />
            <FlowCard icon={<PencilLine size={15} />} eyebrow="기록" label="다음 방문으로 저장" />
          </div>
        </motion.div>
      </section>

      <div className="space-y-4">
        <CategorizedNewsCarousel
          title="동네 축제"
          category="15"
          icon={Landmark}
          color="text-violet-500"
          festivalScope="local"
          description={`${regionName || "내 동네"} 주변 25km 안의 축제`}
        />
        <CategorizedNewsCarousel
          title="전국 축제"
          category="15"
          icon={Landmark}
          color="text-sky-500"
          festivalScope="national"
          description="위치와 상관없이 전국에서 열리는 축제"
        />
        <CategorizedNewsCarousel title="문화와 전시" category="14" icon={Building2} color="text-orange-500" />
        <CategorizedNewsCarousel title="카페와 맛집" category="39" icon={Coffee} color="text-amber-500" />
        <CategorizedNewsCarousel title="쇼핑과 시장" category="38" icon={Store} color="text-emerald-500" />
        <CategorizedNewsCarousel title="레포츠와 활동" category="28" icon={HeartPulse} color="text-rose-500" />
        <CategorizedNewsCarousel title="추천 관광지" category="12" icon={CloudSun} color="text-sky-500" />
      </div>
    </div>
  );
}

function FlowCard({ icon, eyebrow, label }: { icon: React.ReactNode; eyebrow: string; label: string }) {
  return (
    <div className="rounded-2xl bg-nav-bg px-3 py-3 text-center">
      <div className="mx-auto mb-1 flex justify-center text-secondary">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-wider text-foreground/40">{eyebrow}</p>
      <p className="mt-1 text-[12px] font-bold">{label}</p>
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
