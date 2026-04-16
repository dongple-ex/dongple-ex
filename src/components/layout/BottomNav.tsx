"use client";

import Link from "next/link";
import { Home, Search, MessageSquare, User, PlusCircle, Map, Image as ImageIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/lib/store/uiStore";

export default function BottomNav() {
    const pathname = usePathname();
    const openBottomSheet = useUIStore((state) => state.openBottomSheet);

    const navItems = [
        { icon: Home, label: "홈", path: "/" },
        { icon: Map, label: "지도", path: "/map" },
        { icon: PlusCircle, label: "글쓰기", path: "/write" },
        { icon: ImageIcon, label: "앨범", path: "/album" },
        { icon: User, label: "나의 동플", path: "/profile" },
    ];

    return (
        <nav className="fixed bottom-0 w-full max-w-md md:max-w-2xl lg:max-w-4xl bg-nav-bg/80 backdrop-blur-xl border-t border-border flex justify-around items-center h-16 px-4 z-50">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;

                if (item.path === "/write") {
                    return (
                        <button
                            key={item.path}
                            onClick={() => openBottomSheet("write")}
                            className="flex flex-col items-center justify-center space-y-1 text-gray-400 hover:text-[#795548]"
                        >
                            <Icon size={24} />
                            <span className="text-xs">{item.label}</span>
                        </button>
                    );
                }

                return (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`flex flex-col items-center justify-center space-y-1 ${isActive ? "text-[#795548]" : "text-gray-400"
                            }`}
                    >
                        <Icon size={24} />
                        <span className="text-xs">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
