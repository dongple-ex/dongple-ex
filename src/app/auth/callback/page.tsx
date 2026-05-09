"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { initAuth } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase client-side SDK will automatically handle the URL parameters
        // and update the session in localStorage.
        await initAuth();
        
        // Give it a small delay to ensure state is synchronized
        setTimeout(() => {
          router.replace("/");
        }, 500);
      } catch (error) {
        console.error("Auth callback error:", error);
        router.replace("/?error=auth_callback_failed");
      }
    };

    handleCallback();
  }, [initAuth, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary/10 text-secondary mb-6">
        <Loader2 size={32} className="animate-spin" />
      </div>
      <h1 className="text-xl font-black mb-2">로그인 처리 중</h1>
      <p className="text-sm text-foreground/50 font-medium">
        잠시만 기다려주세요. <br />
        안전하게 로그인을 완료하고 있습니다.
      </p>
    </div>
  );
}
