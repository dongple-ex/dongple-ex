"use client";

import { motion } from "framer-motion";
import { MapPinned, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-b-[34px] bg-background text-foreground shadow-xl">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(10,18,15,.16), rgba(10,18,15,.76)), url('https://www.suwon.go.kr/webcontent/ckeditor/2026/5/4/d88dc018-7cb8-429f-a49c-478f47654b43.jpg')",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto flex min-h-[365px] max-w-md flex-col justify-end px-6 pb-12 pt-16 text-white"
      >
        <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 backdrop-blur-md">
          <Sparkles size={14} className="text-amber-200" />
          <span className="text-[11px] font-black tracking-tight">내발문자: 내 발자국이 머문 자리</span>
        </div>

        <h1 className="text-[31px] font-black leading-[1.12] tracking-normal md:text-[38px]">
          가볼 곳을 발견하고,
          <br />
          지금 상태를 확인하고,
          <br />
          다시 꺼내보세요.
        </h1>

        <p className="mt-4 max-w-[350px] text-[14px] font-medium leading-relaxed text-white/82">
          소식은 “왜 갈지”를, 지도는 “지금 괜찮은지”를, 내발문자는 “다음에 다시 볼 이유”를 남깁니다.
        </p>

        <div className="mt-6 flex gap-2.5">
          <Link
            href="/news"
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-[13px] font-black text-[#193b2d]"
          >
            가볼 곳 찾기
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-[13px] font-black text-white backdrop-blur-md"
          >
            <MapPinned size={16} className="mr-1.5" />
            지금 상태 보기
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
