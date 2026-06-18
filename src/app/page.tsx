"use client";

import { motion } from "framer-motion";
import { ArrowRight, MapPinned, Zap } from "lucide-react";
import Link from "next/link";

export default function GatewayPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 80,
        damping: 15,
      },
    },
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 px-6 py-20 text-slate-100 flex flex-col justify-between">
      {/* 백그라운드 네온 오로라 효과 */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-purple-700/15 rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: "12s" }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-emerald-600/10 rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: "15s" }} />

      {/* 상단 브랜딩 영역 */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10"
      >
        <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black tracking-widest text-emerald-400 uppercase border border-emerald-500/10 shadow-sm mb-4">
          Dongple Gateway
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          동플
        </h1>
        <p className="mt-3 text-[14px] font-semibold text-slate-400 max-w-sm mx-auto leading-relaxed">
          당신의 동네 상황, 어떤 스타일로 확인하고 싶으신가요?
        </p>
      </motion.header>

      {/* 카드 선택 영역 */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="my-auto grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full z-10 pt-10 pb-10"
      >
        {/* 간편모드 카드 */}
        <motion.div variants={itemVariants}>
          <a
            href="https://dongple.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group block h-full relative overflow-hidden rounded-[32px] border border-slate-800/80 bg-slate-900/40 p-8 shadow-xl backdrop-blur-md transition-colors hover:border-amber-500/30 hover:bg-slate-900/60"
          >
            {/* 은은한 내부 조명 */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <Zap size={24} />
            </div>

            <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
              간편모드
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/10">간편</span>
            </h2>
            
            <p className="mt-3 text-[14px] font-semibold leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
              복잡한 지도와 정보 대시보드 없이, 버튼 두세 번의 터치로 동네 상황을 가장 신속하게 파악하고 현장 보고를 끝내는 미니멀한 퀵 액션 모드입니다.
            </p>

            <div className="mt-8 flex items-center justify-between text-amber-400 text-[13px] font-black pt-4 border-t border-slate-800/40 group-hover:border-amber-500/20 transition-colors">
              <span>간편모드 바로가기</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 group-hover:translate-x-1.5 transition-transform">
                <ArrowRight size={14} />
              </div>
            </div>
          </a>
        </motion.div>

        {/* 일반모드 카드 */}
        <motion.div variants={itemVariants}>
          <Link
            href="/home"
            className="group block h-full relative overflow-hidden rounded-[32px] border border-slate-800/80 bg-slate-900/40 p-8 shadow-xl backdrop-blur-md transition-colors hover:border-emerald-500/30 hover:bg-slate-900/60"
          >
            {/* 은은한 내부 조명 */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <MapPinned size={24} />
            </div>

            <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
              일반모드
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">일반</span>
            </h2>

            <p className="mt-3 text-[14px] font-semibold leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
              입체적인 인터랙티브 지도와 현장 질문 기능, 핫스팟 발견, 실시간 알림 기능까지 포함하여 우리 동네 소식을 더 깊고 정밀하게 탐색하는 프리미엄 정보형 모드입니다.
            </p>

            <div className="mt-8 flex items-center justify-between text-emerald-400 text-[13px] font-black pt-4 border-t border-slate-800/40 group-hover:border-emerald-500/20 transition-colors">
              <span>일반모드 시작하기</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 group-hover:translate-x-1.5 transition-transform">
                <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.main>

      {/* 하단 푸터 영역 */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="text-center z-10 text-[11px] font-bold text-slate-600"
      >
        © {new Date().getFullYear()} DONGPLE. All rights reserved.
      </motion.footer>
    </div>
  );
}
