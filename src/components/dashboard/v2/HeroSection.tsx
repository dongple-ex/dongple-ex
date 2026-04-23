"use client";

import { motion } from "framer-motion";
import { ArrowRight, MapPinned, Plus, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-b-[34px] bg-background px-6 pb-12 pt-9 text-foreground shadow-2xl transition-colors duration-500">
      <div className="absolute inset-0 opacity-90">
        <div className="absolute left-[-12%] top-[-10%] h-72 w-72 rounded-full bg-[#2E7D32]/12 blur-[100px]" />
        <div className="absolute right-[-18%] top-[5%] h-72 w-72 rounded-full bg-[#A67C52]/16 blur-[110px]" />
        <div className="absolute bottom-[-20%] left-[20%] h-64 w-64 rounded-full bg-[#1F5AA6]/12 blur-[110px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto max-w-md"
      >
        <div className="mb-4 inline-flex items-center space-x-2 rounded-full border border-foreground/10 bg-white/70 px-3 py-1.5 backdrop-blur-md">
          <Sparkles size={14} className="text-[#A67C52]" />
          <span className="text-[11px] font-bold tracking-tight text-foreground/80">
            행사와 일상의 지금 상태를 한 화면에서 확인
          </span>
        </div>

        <div className="space-y-4">
          <h1 className="text-[28px] font-black leading-[1.15] tracking-tight md:text-[34px]">
            지금 어디가 살아있는지
            <br />
            <span className="bg-gradient-to-r from-[#2E7D32] via-[#1F5AA6] to-[#A67C52] bg-clip-text text-transparent">
              지도에서 바로 확인하세요
            </span>
          </h1>

          <p className="max-w-[320px] whitespace-pre-line text-[13px] font-medium leading-relaxed text-foreground/65">
            공공데이터가 행사의 뼈대를 보여주고,
            이웃의 실시간 공유가 현장의 진짜 분위기를 채웁니다.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/map" className="flex-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group flex w-full items-center justify-center space-x-2 rounded-2xl bg-gradient-to-br from-[#1F2A37] to-[#3E2723] px-5 py-3.5 text-[14px] font-bold text-white shadow-xl"
            >
              <MapPinned size={18} />
              <span>지도에서 보기</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </motion.button>
          </Link>

          <Link href="/map?mode=share" className="flex-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center space-x-2 rounded-2xl border border-[#2E7D32]/20 bg-white/80 px-5 py-3.5 text-[14px] font-bold text-[#1F5F2A] shadow-sm backdrop-blur-md"
            >
              <Plus size={18} />
              <span>현장 공유하기</span>
            </motion.button>
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-foreground/8 bg-white/70 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#A67C52]">핵심 흐름</p>
            <p className="mt-1 text-[13px] font-bold text-foreground">상태 확인 후 바로 결정</p>
          </div>
          <div className="rounded-2xl border border-foreground/8 bg-white/70 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#2E7D32]">행사 + 일상</p>
            <p className="mt-1 text-[13px] font-bold text-foreground">행사로 들어오고 일상에서 반복 사용</p>
          </div>
          <div className="rounded-2xl border border-foreground/8 bg-white/70 p-3.5 backdrop-blur-md">
            <div className="flex items-center space-x-2">
              <ShieldCheck size={16} className="text-[#1F5AA6]" />
              <p className="text-[11px] font-black uppercase tracking-wider text-[#1F5AA6]">정확한 공유</p>
            </div>
            <p className="mt-1 text-[13px] font-bold text-foreground">많이보다 정확하게 남기는 구조</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
