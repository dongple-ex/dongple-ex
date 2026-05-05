"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Footprints, Home, LayoutList, MapPinned, Plus } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useUIStore } from "@/lib/store/uiStore";
import Link from "next/link";

export default function BottomNavV2() {
  const pathname = usePathname();
  const requireAuth = useRequireAuth();

  const navItems = [
    { icon: Home, label: "홈", path: "/" },
    { icon: LayoutList, label: "소식", path: "/news" },
    { icon: Plus, label: "기록", isCenter: true },
    { icon: MapPinned, label: "지도", path: "/map" },
    { icon: Footprints, label: "내발문자", path: "/album" },
  ];

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] px-5 pb-6">
      <div className="pointer-events-auto mx-auto flex h-20 max-w-md items-center justify-between rounded-[28px] border border-border bg-nav-bg px-4 shadow-2xl backdrop-blur-xl">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.path ? pathname === item.path : false;

          if (item.isCenter) {
            const defaultTab = pathname === "/news" ? "post" : "status";

            return (
              <div key={index} className="relative flex flex-1 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => useUIStore.getState().openBottomSheet("recordHub", { defaultTab })}
                  className="absolute top-[-42px] flex h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-foreground text-background shadow-xl"
                  aria-label="기록하기"
                >
                  <Plus size={30} />
                </motion.button>
                <span className="mt-6 text-[10px] font-black text-foreground/45">{item.label}</span>
              </div>
            );
          }

          if (item.path === "/album") {
            return (
              <button
                key={index}
                type="button"
                onClick={() => requireAuth({ type: "path", href: "/album" })}
                className="flex flex-1 flex-col items-center justify-center gap-1"
              >
                <Icon size={22} className={isActive ? "text-secondary" : "text-foreground/40"} />
                <span className={`text-[10px] font-black ${isActive ? "text-secondary" : "text-foreground/40"}`}>
                  {item.label}
                </span>
                {isActive && <motion.div layoutId="navTab" className="h-1 w-1 rounded-full bg-secondary" />}
              </button>
            );
          }

          return (
            <Link key={index} href={item.path || "#"} className="flex flex-1 flex-col items-center justify-center gap-1">
              <Icon size={22} className={isActive ? "text-secondary" : "text-foreground/40"} />
              <span className={`text-[10px] font-black ${isActive ? "text-secondary" : "text-foreground/40"}`}>
                {item.label}
              </span>
              {isActive && <motion.div layoutId="navTab" className="h-1 w-1 rounded-full bg-secondary" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
