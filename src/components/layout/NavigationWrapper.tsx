"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import BottomNavV2 from "@/components/layout/v2/BottomNavV2";

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // 헤더를 숨겨야 하는 경로 (홈 V2와 지도는 자체 플로팅 헤더 활용)
  const hideHeader = pathname === '/' || pathname === '/map';

  return (
    <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto min-h-screen bg-background shadow-sm flex flex-col relative">
      {!hideHeader && <Header />}
      <main className="flex-1 overflow-y-auto pb-28">
        {children}
      </main>
      <BottomNavV2 />
    </div>
  );
}
