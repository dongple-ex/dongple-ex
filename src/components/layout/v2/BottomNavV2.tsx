"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Image as ImageIcon, LayoutList, Plus, Search } from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";

export default function BottomNavV2() {
  const pathname = usePathname();
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);

  const navItems = [
    { icon: Home, label: "홈", path: "/" },
    { icon: Search, label: "지도", path: "/map" },
    { icon: Plus, label: "기록", isCenter: true },
    { icon: LayoutList, label: "소식", path: "/news" },
    { icon: ImageIcon, label: "나의 동플", path: "/album" },
  ];

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] px-6 pb-8">
      <div className="pointer-events-auto flex h-20 items-center justify-between rounded-[32px] border border-border bg-nav-bg px-4 shadow-2xl backdrop-blur-xl transition-colors duration-500">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.path ? pathname === item.path : false;

          if (item.isCenter) {
            const defaultTab = pathname === "/news" ? "post" : "status";

            return (
              <div key={index} className="relative flex flex-1 justify-center">
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => openBottomSheet("recordHub", { defaultTab })}
                  className="absolute top-[-44px] flex h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-gradient-to-br from-[#A67C52] to-[#795548] text-white shadow-2xl shadow-[#795548]/40 transition-colors duration-500"
                >
                  <Plus size={30} />
                </motion.button>
                <span className="mt-6 text-[10px] font-bold text-gray-500">{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={index}
              href={item.path || "#"}
              className="flex flex-1 flex-col items-center justify-center space-y-1"
            >
              <Icon size={22} className={`transition-colors ${isActive ? "text-[#A67C52]" : "text-gray-500"}`} />
              <span
                className={`text-[10px] font-black tracking-tight transition-colors ${
                  isActive ? "text-[#A67C52]" : "text-gray-500"
                }`}
              >
                {item.label}
              </span>
              {isActive && <motion.div layoutId="navTab" className="h-1 w-1 rounded-full bg-[#A67C52]" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
