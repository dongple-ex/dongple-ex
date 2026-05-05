"use client";

import { useState } from "react";
import { MessageCircle, Mail, ShieldCheck, CheckCircle2, Lock } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

export default function LoginModal() {
    const { signInWithProvider } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState<"kakao" | "google" | null>(null);

    const handleSignIn = async (provider: "kakao" | "google") => {
        setIsSubmitting(provider);
        try {
            await signInWithProvider(provider);
        } catch (error) {
            console.error("OAuth sign in failed:", error);
            alert("로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.");
            setIsSubmitting(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 py-2">
            <div className="rounded-[28px] border border-border bg-nav-bg/70 p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary shadow-sm">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary">Trust & Safety</p>
                        <h4 className="mt-1 text-[20px] font-black leading-tight text-foreground">기록을 남길 때만 확인할게요</h4>
                        <p className="mt-2 text-[13px] font-medium leading-relaxed text-foreground/55">
                            둘러보기는 로그인 없이도 자유롭습니다. <br />
                            다만 <strong>기록하기, 상황 요청, 내발문자</strong> 등 내 활동을 저장하는 순간에만 최소한의 인증을 진행합니다.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <button
                    type="button"
                    onClick={() => handleSignIn("kakao")}
                    disabled={Boolean(isSubmitting)}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] px-4 py-4 text-[15px] font-black text-[#191919] shadow-lg shadow-yellow-500/10 transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-60"
                >
                    <MessageCircle size={20} fill="currentColor" />
                    {isSubmitting === "kakao" ? "카카오 인증 준비 중..." : "카카오톡으로 계속하기"}
                </button>
                <button
                    type="button"
                    onClick={() => handleSignIn("google")}
                    disabled={Boolean(isSubmitting)}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card-bg px-4 py-4 text-[15px] font-black text-foreground shadow-sm transition-all hover:bg-foreground/5 active:scale-[0.98] disabled:opacity-60"
                >
                    <Mail size={20} />
                    {isSubmitting === "google" ? "Google 인증 준비 중..." : "Google 이메일로 계속하기"}
                </button>
            </div>

            <div className="rounded-2xl bg-foreground/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Lock size={14} className="text-foreground/40" />
                    <span className="text-[12px] font-black text-foreground/60">개인정보 처리 및 서비스 이용 안내</span>
                </div>
                <ul className="space-y-1.5 text-[11px] font-medium leading-relaxed text-foreground/45">
                    <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-secondary" />
                        <span>본 인증을 통해 수집된 정보(이메일, 닉네임)는 서비스 내 프로필 관리 및 본인 확인 용도로만 사용됩니다.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-secondary" />
                        <span>로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의한 것으로 간주됩니다.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-secondary" />
                        <span>익명 활동 시에도 최소한의 신뢰도 관리를 위해 인증된 정보가 백엔드에서 매칭될 수 있습니다.</span>
                    </li>
                </ul>
            </div>

            <p className="px-2 text-center text-[11px] font-medium leading-relaxed text-foreground/40">
                로그인 후에는 방금 누른 작업(기록/요청 등) 화면으로 <br /> 자동으로 안전하게 이어집니다.
            </p>
        </div>
    );
}
