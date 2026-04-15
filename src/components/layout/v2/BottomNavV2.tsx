"use client";

import { motion } from "framer-motion";
import { Home, Search, Plus, Bell, User, LayoutList } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUIStore } from "@/lib/store/uiStore";

export default function BottomNavV2() {
    const pathname = usePathname();
    const openBottomSheet = useUIStore((state) => state.openBottomSheet);

    const navItems = [
        { icon: Home, label: "홈", path: "/v2" },
        { icon: Search, label: "지도", path: "/map" },
        { icon: Plus, label: "기록", isCenter: true },
        { icon: LayoutList, label: "소식", path: "/news" },
        { icon: User, label: "내 정보", path: "#" },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] px-6 pb-8 pointer-events-none">
            <div className="bg-nav-bg backdrop-blur-xl rounded-[32px] border border-border shadow-2xl pointer-events-auto h-20 flex items-center justify-between px-4 transition-colors duration-500">
                {navItems.map((item, i) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;

                    if (item.isCenter) {
                        return (
                            <div key={i} className="relative flex-1 flex justify-center">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => openBottomSheet("write")}
                                    className="absolute top-[-44px] w-16 h-16 bg-gradient-to-br from-[#A67C52] to-[#795548] rounded-full flex items-center justify-center text-white shadow-2xl shadow-[#795548]/40 border-4 border-background transition-colors duration-500"
                                >
                                    <Plus size={32} />
                                </motion.button>
                                <span className="text-[10px] font-bold text-gray-500 mt-6">{item.label}</span>
                            </div>
                        );
                    }

                    return (
                        <Link key={i} href={item.path || "#"} className="flex-1 flex flex-col items-center justify-center space-y-1">
                            <Icon 
                                size={22} 
                                className={`transition-colors ${isActive ? 'text-[#A67C52]' : 'text-gray-500'}`} 
                            />
                            <span className={`text-[10px] font-black tracking-tight transition-colors ${isActive ? 'text-[#A67C52]' : 'text-gray-500'}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <motion.div 
                                    layoutId="navTab"
                                    className="w-1 h-1 rounded-full bg-[#A67C52]" 
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
