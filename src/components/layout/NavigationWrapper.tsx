"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import BottomNavV2 from "@/components/layout/v2/BottomNavV2";

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // V2 디자인이 적용된 경로들
  const isV2Path = pathname?.startsWith('/v2') || pathname === '/map' || pathname === '/news';
  // 헤더를 숨겨야 하는 경로 (지도는 자체 플로팅 헤더 사용)
  const hideHeader = pathname === '/map';

  return (
    <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto min-h-screen bg-white shadow-sm flex flex-col relative">
      {!hideHeader && <Header />}
      <main className={`flex-1 overflow-y-auto ${!isV2Path ? 'pb-16' : ''}`}>
        {children}
      </main>
      {isV2Path ? <BottomNavV2 /> : <BottomNav />}
    </div>
  );
}
