"use client";

import { useEffect } from "react";
import { Award, ShieldCheck, User as UserIcon, Zap } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

interface IdentityHeaderProps {
  compact?: boolean;
}

export default function IdentityHeader({ compact = false }: IdentityHeaderProps) {
  const { profile, initAuth, isAnonymous } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (!profile) return null;

  const getReputation = (score: number) => {
    if (score >= 0.9) {
      return { label: "메이커", color: "text-indigo-600", bg: "bg-indigo-50", icon: <Award size={14} /> };
    }
    if (score >= 0.7) {
      return { label: "프로", color: "text-blue-600", bg: "bg-blue-50", icon: <ShieldCheck size={14} /> };
    }
    if (score >= 0.5) {
      return { label: "새싹", color: "text-green-600", bg: "bg-green-50", icon: <Zap size={14} /> };
    }
    return { label: "관찰자", color: "text-gray-500", bg: "bg-gray-50", icon: <UserIcon size={14} /> };
  };

  const rep = getReputation(profile.trust_score);

  return (
    <div className={`mx-4 ${compact ? "mb-3" : "mb-6"}`}>
      <div
        className={`flex items-center justify-between border border-border bg-card-bg shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${
          compact ? "rounded-[20px] px-4 py-3" : "rounded-[24px] p-5"
        }`}
      >
        <div className={`flex items-center ${compact ? "space-x-3" : "space-x-4"}`}>
          <div
            className={`${compact ? "h-10 w-10" : "h-12 w-12"} ${rep.bg} dark:bg-foreground/10 flex rounded-full items-center justify-center text-foreground shadow-inner`}
          >
            {rep.icon}
          </div>
          <div>
            <div className={`mb-0.5 flex items-center ${compact ? "space-x-1.5" : "space-x-2"}`}>
              <span className={`${compact ? "text-[10px]" : "text-[12px]"} font-black uppercase tracking-tighter text-foreground/40`}>
                {isAnonymous ? "ANONYMOUS IDENTITY" : "VERIFIED MEMBER"}
              </span>
              <div className={`rounded-full border border-current/10 px-2 py-0.5 text-[9px] font-bold ${rep.color} ${rep.bg} dark:bg-foreground/10`}>
                Lv. {rep.label}
              </div>
            </div>
            <h3 className={`${compact ? "text-[14px]" : "text-[16px]"} font-black tracking-tight text-foreground`}>
              {profile.nickname}
              <span className="ml-1 text-foreground/30">✨</span>
            </h3>
          </div>
        </div>

        <div className="text-right">
          <p className={`${compact ? "text-[9px]" : "text-[10px]"} mb-1 font-bold text-foreground/40`}>나의 기여도</p>
          <div className={`flex items-center justify-end ${compact ? "space-x-2.5" : "space-x-3"}`}>
            <div className="text-center">
              <p className={`${compact ? "text-[12px]" : "text-[13px]"} font-black text-foreground`}>
                {profile.activity_count}
              </p>
              <p className="text-[8px] font-bold uppercase text-foreground/30">Total</p>
            </div>
            <div className={`w-[1px] bg-border ${compact ? "h-5" : "h-6"}`} />
            <div className="text-center">
              <p className={`${compact ? "text-[12px]" : "text-[13px]"} font-black text-secondary`}>
                {profile.trust_score.toFixed(1)}
              </p>
              <p className="text-[8px] font-bold uppercase text-foreground/30">Trust</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
