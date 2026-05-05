"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Bell, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLocationStore } from "@/lib/store/locationStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { getVillageWeather, WeatherData } from "@/services/api";

interface HeaderProps {
  isSearchMode?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSearch?: () => void;
  showBackButton?: boolean;
  backUrl?: string;
  rightElement?: React.ReactNode;
  placeholder?: string;
  onClearSearch?: () => void;
}

export default function Header({
  isSearchMode = false,
  searchValue = "",
  onSearchChange,
  onSearch,
  showBackButton = false,
  backUrl,
  rightElement,
  placeholder = "장소나 동네 소식 검색",
  onClearSearch,
}: HeaderProps) {
  const { regionName, latitude, longitude, fetchLocation, isLoading } = useLocationStore();
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);
  const { isAuthenticated, profile } = useAuthStore();
  const router = useRouter();
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!isSearchMode && !regionName) fetchLocation();
  }, [fetchLocation, isSearchMode, regionName]);

  useEffect(() => {
    if (latitude && longitude) {
      getVillageWeather(latitude, longitude).then((data) => setWeather(data));
    }
  }, [latitude, longitude]);

  const handleBack = () => {
    if (backUrl) router.push(backUrl);
    else router.back();
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-border bg-background/86 px-4 backdrop-blur-md">
      {isSearchMode ? (
        <div className="flex w-full items-center gap-3">
          {showBackButton ? (
            <button onClick={handleBack} className="-ml-1 p-1 text-foreground/70 transition-colors hover:text-secondary">
              <ArrowLeft size={24} />
            </button>
          ) : (
            <MapPin size={20} className="text-secondary" />
          )}

          <div className="group relative flex-1">
            <input
              type="text"
              placeholder={placeholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch?.();
              }}
              className="h-10 w-full rounded-xl border border-border bg-nav-bg pl-10 pr-10 text-sm outline-none transition-all focus:ring-2 focus:ring-secondary/20"
              autoFocus={isSearchMode}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/35 group-focus-within:text-secondary" size={18} />
            {searchValue && (
              <button onClick={() => onClearSearch?.()} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/35 hover:text-foreground">
                <X size={16} />
              </button>
            )}
          </div>

          {rightElement || (
            <button className="p-1 text-foreground/70 transition-colors hover:text-secondary">
              <SlidersHorizontal size={22} />
            </button>
          )}
        </div>
      ) : (
        <>
          <button className="flex items-center gap-2" onClick={() => openBottomSheet("locationSearch")} title="지역 검색 및 설정">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-nav-bg">
              <Image src="/logo.png" alt="내발문자 로고" fill className="object-contain" />
            </div>
            <div className="flex items-center gap-1 font-black text-foreground">
              <MapPin size={18} className={`text-secondary ${isLoading ? "animate-pulse" : ""}`} />
              <span className={`text-base ${isLoading ? "text-foreground/35" : ""}`}>{regionName || "내 동네"}</span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {weather && (
              <div className="flex items-center gap-1 rounded-full bg-nav-bg px-2.5 py-1 text-sm font-black text-foreground/70">
                <span>{weather.icon}</span>
                <span>{weather.temp}</span>
              </div>
            )}
            <Bell size={22} className="cursor-pointer text-foreground/70" />
            
            <button 
              onClick={() => isAuthenticated ? router.push("/album") : openBottomSheet("authPrompt")}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-nav-bg transition-all active:scale-90"
            >
              {isAuthenticated && profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="Profile" fill className="object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center ${isAuthenticated ? 'bg-secondary/10 text-secondary' : 'text-foreground/30'}`}>
                  <span className="text-[13px] font-black">
                    {isAuthenticated ? (profile?.nickname?.charAt(0) || "U") : "L"}
                  </span>
                </div>
              )}
            </button>
          </div>
        </>
      )}
    </header>
  );
}
