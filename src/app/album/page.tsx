"use client";

import { motion } from "framer-motion";
import { 
    Calendar, Map as MapIcon, Camera, Clock, 
    Share2, ArrowLeft, Trophy, Sparkles, Footprints,
    Navigation, Heart, Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function JourneyAlbumPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);

    // 가상의 오늘 여정 데이터
    const journeyData = {
        date: "2026.04.16",
        neighborhood: "정자동/판교",
        totalDistance: "3.2km",
        totalPOIs: 12,
        bestMoment: {
            title: "판교테크노밸리 벚꽃 버스킹",
            time: "14:30 PM",
            type: "공연/행사",
            thumbnail: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800"
        },
        style: "활기찬 장소를 좋아하는 탐험가",
        summary: "오늘 당신은 정자동의 여유로움과 판교의 활기를 동시에 만끽했네요! 이웃들과 12번의 소중한 순간을 함께 나누었습니다. 🌿"
    };

    useEffect(() => {
        // 단계별 애니메이션 전환
        const timer = setTimeout(() => {
            if (step < 3) setStep(step + 1);
        }, 2000);
        return () => clearTimeout(timer);
    }, [step]);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
            {/* Header */}
            <header className="p-6 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-md">
                <button onClick={() => router.back()} className="p-2 -ml-2 text-foreground/60">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-lg font-black tracking-tighter uppercase">Journey's Album</h1>
                <button className="p-2 -mr-2 text-secondary">
                    <Share2 size={24} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Intro Section: 발자국 */}
                <section className="px-6 py-8">
                    <div className="flex items-center space-x-3 mb-8">
                        <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
                            <Footprints size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-secondary tracking-widest uppercase">Intro</p>
                            <h2 className="text-2xl font-black tracking-tighter">오늘의 발자국</h2>
                        </div>
                    </div>

                    <div className="relative aspect-square w-full bg-nav-bg rounded-[40px] border border-border shadow-inner overflow-hidden flex items-center justify-center">
                        {/* 여정 지도 애니메이션 (간단한 드로잉 형상화) */}
                        <svg width="250" height="250" viewBox="0 0 250 250" className="relative z-10">
                            <motion.path 
                                d="M 50,50 Q 80,100 120,80 T 200,120 T 150,200"
                                fill="none"
                                stroke="var(--secondary)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 3, ease: "easeInOut" }}
                            />
                            <motion.circle 
                                cx="50" cy="50" r="4" fill="var(--secondary)" 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            />
                            <motion.circle 
                                cx="150" cy="200" r="6" fill="var(--secondary)" 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
                            />
                        </svg>
                        
                        {/* 지도 배경 패턴 */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        
                        <div className="absolute bottom-6 left-6 right-6 flex justify-between">
                            <div className="bg-card-bg/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-border shadow-xl">
                                <span className="text-[10px] font-black opacity-40 block uppercase">이동 거리</span>
                                <span className="text-[15px] font-black">{journeyData.totalDistance}</span>
                            </div>
                            <div className="bg-card-bg/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-border shadow-xl">
                                <span className="text-[10px] font-black opacity-40 block uppercase">탐색 지점</span>
                                <span className="text-[15px] font-black">{journeyData.totalPOIs}곳</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Best Moment Section */}
                <motion.section 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="px-6 py-8"
                >
                    <div className="flex items-center space-x-3 mb-8">
                        <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                            <Trophy size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-accent tracking-widest uppercase">Best Moment</p>
                            <h2 className="text-2xl font-black tracking-tighter">오늘 최고의 순간</h2>
                        </div>
                    </div>

                    <div className="relative group overflow-hidden rounded-[40px] shadow-2xl border border-border">
                        <img 
                            src={journeyData.bestMoment.thumbnail} 
                            alt="Best Moment"
                            className="w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-10 left-8 right-8 text-white">
                            <div className="flex items-center space-x-2 mb-2">
                                <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">
                                    {journeyData.bestMoment.type}
                                </span>
                                <span className="text-[10px] font-medium opacity-70 flex items-center">
                                    <Clock size={10} className="mr-1" /> {journeyData.bestMoment.time}
                                </span>
                            </div>
                            <h3 className="text-2xl font-black leading-tight tracking-tighter">{journeyData.bestMoment.title}</h3>
                            <button className="mt-6 flex items-center text-[12px] font-black bg-white text-black px-6 py-2.5 rounded-full hover:bg-secondary hover:text-white transition-colors">
                                <Sparkles size={14} className="mr-2" /> 상세 정보 보기
                            </button>
                        </div>
                    </div>
                </motion.section>

                {/* Ending Section */}
                <motion.section 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="px-6 py-12"
                >
                    <div className="bg-secondary rounded-[40px] p-10 text-white shadow-2xl shadow-secondary/20 relative overflow-hidden">
                        <Navigation className="absolute -top-10 -right-10 w-40 h-40 opacity-10 rotate-12" />
                        
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-6">
                                <Heart size={32} />
                            </div>
                            <h3 className="text-[13px] font-black opacity-70 uppercase tracking-[0.2em] mb-3">당신의 여정 스타일</h3>
                            <h2 className="text-2xl font-black tracking-tighter mb-6">"{journeyData.style}"</h2>
                            <p className="text-[15px] leading-relaxed font-medium opacity-90 max-w-[280px]">
                                {journeyData.summary}
                            </p>
                            
                            <div className="mt-10 pt-8 border-t border-white/20 w-full flex justify-between">
                                <div className="text-center flex-1 border-r border-white/10">
                                    <p className="text-[10px] opacity-60 font-black uppercase mb-1">매칭 지수</p>
                                    <p className="text-xl font-black">98%</p>
                                </div>
                                <div className="text-center flex-1">
                                    <p className="text-[10px] opacity-60 font-black uppercase mb-1">활동 점수</p>
                                    <p className="text-xl font-black">+1,240</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.section>
            </div>

            {/* Sticky Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
                <div className="max-w-md mx-auto flex space-x-3 pointer-events-auto">
                    <button 
                        onClick={() => router.push('/map')}
                        className="flex-1 h-16 bg-card-bg border border-border rounded-3xl font-black flex items-center justify-center space-x-2 shadow-xl hover:bg-nav-bg transition-colors active:scale-95"
                    >
                        <MapIcon size={20} className="text-secondary" />
                        <span>다시 탐색하기</span>
                    </button>
                    <button className="h-16 w-16 bg-secondary text-white rounded-3xl flex items-center justify-center shadow-xl shadow-secondary/30 active:scale-95 transition-all">
                        <Share2 size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
}
