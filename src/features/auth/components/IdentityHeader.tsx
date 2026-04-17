"use client";

import { useAuthStore } from "@/lib/store/authStore";
import { useEffect } from "react";
import { ShieldCheck, User as UserIcon, Award, Zap } from "lucide-react";

export default function IdentityHeader() {
  const { profile, initAuth, isAnonymous } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  if (!profile) return null;

  // 신뢰 점수에 따른 배지 및 색상 결정
  const getReputation = (score: number) => {
    if (score >= 0.9) return { label: "메이트", color: "text-indigo-600", bg: "bg-indigo-50", icon: <Award size={14}/> };
    if (score >= 0.7) return { label: "프로", color: "text-blue-600", bg: "bg-blue-50", icon: <ShieldCheck size={14}/> };
    if (score >= 0.5) return { label: "새싹", color: "text-green-600", bg: "bg-green-50", icon: <Zap size={14}/> };
    return { label: "관찰자", color: "text-gray-500", bg: "bg-gray-50", icon: <UserIcon size={14}/> };
  };

  const rep = getReputation(profile.trust_score);

  return (
    <div className="mx-4 mb-6">
      <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 ${rep.bg} rounded-full flex items-center justify-center text-gray-800 shadow-inner`}>
             {rep.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-0.5">
              <span className="text-[12px] font-black text-gray-400 tracking-tighter uppercase">{isAnonymous ? "ANONYMOUS IDENTITY" : "VERIFIED MEMBER"}</span>
              <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${rep.color} ${rep.bg} border border-current/10`}>
                Lv. {rep.label}
              </div>
            </div>
            <h3 className="text-[16px] font-black text-[#3E2723] tracking-tight group cursor-default">
              {profile.nickname}
              <span className="ml-1 text-gray-300 group-hover:text-amber-400 transition-colors">✨</span>
            </h3>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400 mb-1">나의 기여도</p>
          <div className="flex items-center justify-end space-x-3">
             <div className="text-center">
                <p className="text-[13px] font-black text-[#3E2723]">{profile.activity_count}</p>
                <p className="text-[8px] font-bold text-gray-300 uppercase">Total</p>
             </div>
             <div className="w-[1px] h-6 bg-gray-100"></div>
             <div className="text-center">
                <p className="text-[13px] font-black text-[#2E7D32]">{profile.trust_score.toFixed(1)}</p>
                <p className="text-[8px] font-bold text-gray-300 uppercase">Trust</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
