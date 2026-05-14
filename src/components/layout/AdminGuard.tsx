"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const { isAuthInitialized, isAdmin } = useAuthStore();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (!isAuthInitialized) return;

        if (!isAdmin) {
            router.replace("/");
        } else {
            setIsChecking(false);
        }
    }, [isAuthInitialized, isAdmin, router]);

    if (!isAuthInitialized || isChecking) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600"></div>
                    <p className="mt-4 text-sm font-medium text-gray-500">관리자 권한 확인 중...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
