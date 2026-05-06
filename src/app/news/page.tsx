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
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary/70">Explore Nearby</p>
              <h2 className="mt-2 text-[22px] font-black tracking-tighter leading-tight break-keep text-foreground/90">
                오늘 우리 동네 어디에<br /><span className="text-secondary">발자국</span> 남길지 찾아봐요
              </h2>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <MapPinned size={28} />
            </div>
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
    <div className="flex flex-col items-center rounded-2xl bg-nav-bg px-2 py-3.5 text-center">
      <div className="mb-1.5 flex h-5 items-center justify-center text-secondary">{icon}</div>
      <p className="text-[9px] font-black uppercase tracking-wider text-foreground/30">{eyebrow}</p>
      <p className="mt-1 text-[11px] font-bold leading-[1.3] break-keep">{label}</p>
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
