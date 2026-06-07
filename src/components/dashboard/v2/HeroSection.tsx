"use client";

import { motion } from "framer-motion";
import { MapPin, Radio, Compass, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatUpdatedAgo, normalizeStatus } from "@/services/statusService";

interface HeroSectionProps {
  neighborhoodSummary: {
    total: number;
    crowded: number;
    normal: number;
    pleasant: number;
  };
  liveTickerUpdates: Array<{
    id: string;
    place_name: string;
    status: string;
    created_at: string;
    message?: string;
    is_request: boolean;
    latitude?: number;
    longitude?: number;
  }>;
}

export default function HeroSection({ neighborhoodSummary, liveTickerUpdates }: HeroSectionProps) {
  const latestFeeds = liveTickerUpdates.slice(0, 2);

  return (
    <section className="relative overflow-hidden rounded-b-[34px] bg-background text-foreground shadow-xl">
      {/* 자개 무늬 일러스트 배경 */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(8,15,12,.2), rgba(8,15,12,.4) 50%, rgba(8,15,12,.8)), url('https://www.suwon.go.kr/webcontent/ckeditor/2026/5/4/d88dc018-7cb8-429f-a49c-478f47654b43.jpg')",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto flex min-h-[360px] max-w-md flex-col justify-center px-5 pb-10 pt-8 text-white sm:min-h-[400px] md:min-h-[440px] md:max-w-[1120px] md:justify-between md:px-6 md:pb-9 md:pt-8 lg:min-h-[500px]"
      >
        {/* 서비스 타이틀 */}
        <div className="mb-5">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 shadow-lg shadow-black/15 backdrop-blur-md md:px-4 md:py-2">
            <Compass size={11} className="text-secondary animate-spin-slow" />
            <span className="text-[10px] font-black tracking-tight text-white/90 md:text-[12px]">동플 라이브 대시보드</span>
          </div>
          <h1 className="mt-4 text-[42px] font-black leading-none text-white md:text-[60px]">동플</h1>
          <p className="mt-2 text-[15px] font-bold text-white/78 md:text-[18px]">우리 동네 순간을 기록하자</p>
        </div>

        {/* 좌우 카드 레이아웃 */}
        <div className="mt-3 grid grid-cols-2 gap-3.5 md:mx-auto md:mt-auto md:w-full md:max-w-[1040px] md:gap-5 lg:max-w-[1080px]">
          {/* 1. 왼쪽 카드: MY NEIGHBORHOOD */}
          <div className="flex min-h-[165px] flex-col justify-between rounded-[22px] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/25 backdrop-blur-md md:min-h-[132px] md:rounded-[18px] md:bg-black/35 md:px-7 md:py-4">
            <div>
              <div className="flex items-center gap-1 text-white/60">
                <MapPin size={12} className="text-secondary-light" />
                <span className="text-[9px] font-black uppercase tracking-[0.12em]">MY NEIGHBORHOOD</span>
              </div>

              <div className="mt-3 flex flex-col gap-1.5 md:max-w-[360px] md:gap-1">
                <div className="flex items-center justify-between text-[11px] font-bold md:text-[12px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    한산함
                  </span>
                  <span className="font-black text-emerald-300">{neighborhoodSummary.pleasant}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold md:text-[12px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    보통
                  </span>
                  <span className="font-black text-amber-300">{neighborhoodSummary.normal}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold md:text-[12px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                    붐빔
                  </span>
                  <span className="font-black text-rose-300">{neighborhoodSummary.crowded}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-center text-[9px] font-medium text-white/40 md:text-[10px]">
              반경 2km 이내 요약
            </div>
          </div>

          {/* 2. 오른쪽 카드: LIVE FEED */}
          <div className="flex min-h-[165px] flex-col justify-between rounded-[22px] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/25 backdrop-blur-md md:min-h-[132px] md:rounded-[18px] md:bg-black/35 md:px-7 md:py-4">
            <div>
              <div className="flex items-center gap-1 text-white/60">
                <Radio size={12} className="text-rose-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.12em]">LIVE FEED</span>
              </div>

              <div className="mt-2.5 flex flex-col gap-2 md:gap-1.5">
                {latestFeeds.length > 0 ? (
                  latestFeeds.map((feed) => {
                    const statusNormalized = normalizeStatus(feed.status);
                    const isCrowded = statusNormalized === "혼잡";
                    const isPleasant = statusNormalized === "여유";

                    return (
                      <Link
                        key={feed.id}
                        href={`/map?lat=${feed.latitude}&lng=${feed.longitude}&statusId=${feed.id}&title=${encodeURIComponent(feed.place_name)}`}
                        className="group block"
                      >
                        <div className="truncate text-[11px] font-black text-white/90 transition-colors group-hover:text-secondary-light md:text-[13px]">
                          {feed.place_name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-white/50 md:text-[10px]">
                          <span className={`${
                            isCrowded ? "text-rose-300" : isPleasant ? "text-emerald-300" : "text-amber-300"
                          }`}>
                            {statusNormalized}
                          </span>
                          <span>•</span>
                          <span>{formatUpdatedAgo(feed.created_at)}</span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="text-[10px] font-bold text-white/40 py-2 text-center">
                    실시간 피드가 없습니다
                  </div>
                )}
              </div>
            </div>
            {latestFeeds.length > 0 && (
              <div className="mt-1 flex justify-end">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/70 hover:text-white"
                >
                  전체보기
                  <ArrowRight size={10} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
