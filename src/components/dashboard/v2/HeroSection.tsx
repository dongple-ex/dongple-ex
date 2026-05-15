"use client";

import { motion } from "framer-motion";
import { MapPinned, Newspaper, Radio, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-b-[34px] bg-background text-foreground shadow-xl">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(8,15,12,.08), rgba(8,15,12,.42) 42%, rgba(8,15,12,.84)), url('https://www.suwon.go.kr/webcontent/ckeditor/2026/5/4/d88dc018-7cb8-429f-a49c-478f47654b43.jpg')",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto flex min-h-[405px] max-w-md flex-col px-6 pb-16 pt-12 text-white"
      >
        <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 backdrop-blur-md">
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/favicon_marker.png')" }}
          />
          <span className="text-[11px] font-black tracking-tight">내발문자: 내 발자국이 머문 자리</span>
        </div>

        <div className="mt-auto">
          <p className="mb-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-black text-white/90 backdrop-blur-md">
            <Sparkles size={13} className="mr-1.5" />
            오늘 수원에서 바로 판단하기
          </p>
          <h1 className="text-[32px] font-black leading-[1.1] tracking-normal md:text-[38px]">
            지금 가도
            <br />
            괜찮은 곳부터
            <br />
            먼저 보여드릴게요.
          </h1>
          <p className="mt-4 max-w-[310px] text-[14px] font-semibold leading-relaxed text-white/78">
            공식 행사와 현장 공유를 함께 보고, 붐비는 곳은 피하고 좋은 순간은 기록하세요.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-black/18 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md">
              <Radio size={12} className="mr-1.5 text-red-300" />
              라이브 현장
            </span>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-black/18 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md">
              <MapPinned size={12} className="mr-1.5 text-emerald-200" />
              지도 상태
            </span>
          </div>

          <div className="mt-6 flex gap-2.5">
            <Link
              href="/news"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-[13px] font-black text-[#193b2d]"
            >
              <Newspaper size={16} className="mr-1.5" />
              오늘 갈 곳
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-[13px] font-black text-white backdrop-blur-md"
            >
              <MapPinned size={16} className="mr-1.5" />
              지금 상태
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
