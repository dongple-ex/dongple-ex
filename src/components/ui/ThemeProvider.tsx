"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store/uiStore";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { theme, setTheme } = useUIStore();

    useEffect(() => {
        // 1. 초기 로드 시 로컬 스토리지 또는 시스템 설정 확인
        const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark");
        }
    }, [setTheme]);

    useEffect(() => {
        // 2. 테마 변경 시 HTML 클래스 및 로컬 스토리지 업데이트
        const root = window.document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            root.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [theme]);

    return <>{children}</>;
}
