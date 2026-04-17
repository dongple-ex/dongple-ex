"use client";

import { useState } from "react";
import {
  CloudSun, Building2, Store, School,
  HeartPulse, Landmark, Coffee, Gamepad2,
  Trees, BookOpen, Settings, TrendingUp,
  Activity, ShieldCheck, User as UserIcon, Star
} from "lucide-react";
import QuestionSummary from "@/components/dashboard/QuestionSummary";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";
import { Map as MapIcon, ChevronRight } from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { fetchPosts, subscribePosts, Post } from "@/services/postService";
import OfficialEventSection from "@/features/events/components/OfficialEventSection";
import LiveStatusBoard from "@/features/status/components/LiveStatusBoard";

type UserMode = "popular" | "interest";

export default function Home() {
  const [mode, setMode] = useState<UserMode>("popular");
  const [sortBy, setSortBy] = useState<"popular" | "recent">("popular");
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);
  const [myInterests] = useState(["부동산/이사", "병원/약국"]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPosts = async () => {
    try {
      const data = await fetchPosts(5);
      setPosts(data);
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    const sub = subscribePosts(loadPosts);
    return () => { sub.unsubscribe(); };
  }, []);

  // 전체 카테고리 정의
  const allCategories = [
    { icon: CloudSun, label: "날씨/교통", color: "bg-blue-50" },
    { icon: Building2, label: "부동산/이사", color: "bg-orange-50" },
    { icon: Store, label: "동네가게", color: "bg-green-50" },
    { icon: School, label: "학교/교육", color: "bg-yellow-50" },
    { icon: Landmark, label: "공공기관", color: "bg-purple-50" },
    { icon: HeartPulse, label: "병원/약국", color: "bg-red-50" },
    { icon: Trees, label: "경로당/공원", color: "bg-emerald-50" },
    { icon: Coffee, label: "카페/만화방", color: "bg-amber-50" },
    { icon: BookOpen, label: "독서실/학습", color: "bg-indigo-50" },
    { icon: Gamepad2, label: "놀이터", color: "bg-sky-50" },
  ];

  // 인기 카테고리 상위 3개 (통계 기반 예시)
  const popularCategories = [
    { icon: Coffee, label: "카페/만화방", color: "bg-amber-50" },
    { icon: CloudSun, label: "날씨/교통", color: "bg-blue-50" },
    { icon: HeartPulse, label: "병원/약국", color: "bg-red-50" },
  ];

  // 관심 키워드에 해당하는 카테고리만 필터링 (최대 2개)
  const interestCategories = allCategories.filter(cat => myInterests.includes(cat.label)).slice(0, 2);

  return (
    <div className="p-4 space-y-8 pb-10">
      {/* AI Summary Dashboard */}
      <QuestionSummary />

      {/* Map Explorer CTA */}
      <Link href="/map" className="block mx-4">
        <div className="bg-foreground text-white rounded-[32px] p-6 shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-500">
             <MapIcon size={120} />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black text-white/40 tracking-widest uppercase mb-1">MAP EXPLORER</p>
              <h3 className="text-xl font-black tracking-tight">지도로 동네 곳곳의 <br/>실시간 상황을 확인하세요</h3>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg">
               <ChevronRight size={24} />
            </div>
          </div>
        </div>
      </Link>

      {/* Real-time Live Status Certification */}
      <LiveStatusBoard />

      {/* Official Events Section */}
      <OfficialEventSection />

      {/* Mode Switcher (Underline Style) */}
      <div className="flex border-b border-gray-100 -mx-4 px-4">
        <button
          onClick={() => setMode("popular")}
          className={`relative pb-3 text-sm font-bold transition-all mr-6 ${mode === "popular" ? "text-[#795548]" : "text-gray-400"
            }`}
        >
          인기 생활
          {mode === "popular" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#795548]" />
          )}
        </button>
        <button
          onClick={() => setMode("interest")}
          className={`relative pb-3 text-sm font-bold transition-all ${mode === "interest" ? "text-[#795548]" : "text-gray-400"
            }`}
        >
          관심 생활
          {mode === "interest" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#795548]" />
          )}
        </button>
      </div>

      {/* Category Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#3E2723] flex items-center">
            {mode === "popular" ? (
              <>
                <TrendingUp size={18} className="mr-2 text-[#2E7D32]" />
                이웃들이 많이 찾는 생활
              </>
            ) : (
              "내가 찜한 동네생활"
            )}
          </h2>
          {mode === "interest" && (
            <button className="text-[11px] text-[#2E7D32] flex items-center font-medium">
              <Settings size={12} className="mr-1" /> 설정
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {mode === "popular" ? (
            popularCategories.map((cat, i) => (
              <CategoryButton key={i} {...cat} />
            ))
          ) : (
            <>
              {interestCategories.map((cat, i) => (
                <CategoryButton key={i} {...cat} />
              ))}
              {interestCategories.length === 0 && (
                <div className="col-span-full border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center py-6">
                  <p className="text-xs text-gray-400">나의 동플에서 관심사를 등록해보세요!</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Feed Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#3E2723]">지금 우리 동네는</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <button
              onClick={() => setSortBy("popular")}
              className={`${sortBy === "popular" ? "text-[#795548] font-bold" : ""}`}
            >
              인기순
            </button>
            <span className="text-gray-200">|</span>
            <button
              onClick={() => setSortBy("recent")}
              className={`${sortBy === "recent" ? "text-[#795548] font-bold" : ""}`}
            >
              최신순
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => {
            // 스코어에 따른 신뢰 등급 계산
            const getTrustLevel = (score: number) => {
              if (score >= 0.8) return { label: "신용 높음", color: "text-blue-600 bg-blue-50", icon: <ShieldCheck size={10}/> };
              if (score >= 0.5) return { label: "보통", color: "text-green-600 bg-green-50", icon: <Star size={10}/> };
              return { label: "확인 필요", color: "text-orange-600 bg-orange-50", icon: <Activity size={10}/> };
            };
            const trust = getTrustLevel(post.score || 0.5);

            return (
              <div 
                key={post.id} 
                className="border-b border-gray-100 pb-4 cursor-pointer hover:bg-gray-50/50 transition-colors -mx-4 px-4 pt-2"
                onClick={() => openBottomSheet("postDetail", { title: post.title || post.content.substring(0, 30) + "..." })}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center px-1.5 py-0.5 rounded text-[9px] font-black ${trust.color}`}>
                      {trust.icon}
                      <span className="ml-0.5">{trust.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center">
                      {post.is_anonymous ? <ShieldCheck size={10} className="mr-0.5 text-indigo-400"/> : <UserIcon size={10} className="mr-0.5 text-green-500"/>}
                      {post.is_anonymous ? post.public_id : (post.user_id ? "동네이웃" : "시스템")}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex justify-between items-start mb-2">
                  <div className="flex space-x-1.5">
                    <span className="bg-[#3E2723] px-2 py-0.5 rounded text-[9px] text-white font-black uppercase tracking-tighter ring-1 ring-[#3E2723]/10">
                      {post.post_type}
                    </span>
                    <span className="bg-[#2E7D32]/5 px-2 py-0.5 rounded text-[9px] text-[#2E7D32] font-black ring-1 ring-[#2E7D32]/20">
                      {post.category}
                    </span>
                  </div>
                </div>
                <p className="text-[14px] font-bold mb-2 text-[#3E2723] line-clamp-2 leading-snug">
                  {post.title || post.content}
                </p>
                <div className="flex items-center space-x-3 text-[10px] text-gray-400 font-bold">
                  <span className="flex items-center"><TrendingUp size={10} className="mr-0.5 text-gray-300"/> 공감 {post.likes_count}</span>
                  <span>댓글 {post.comments_count}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center border-2 border-dashed border-gray-50 rounded-3xl">
            <p className="text-sm text-gray-400">등록된 동네 소식이 없습니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryButton({ icon: Icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <div className="flex flex-col items-center space-y-2 cursor-pointer group">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform`}>
        <Icon size={24} className="text-gray-800" />
      </div>
      <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{label}</span>
    </div>
  );
}
