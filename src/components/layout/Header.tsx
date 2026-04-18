"use client";

import { useEffect, useState } from "react";
import { MapPin, Search, Bell, ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import { useLocationStore } from "@/lib/store/locationStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    placeholder = "동네 소식 검색...",
    onClearSearch
}: HeaderProps) {
    const { regionName, latitude, longitude, fetchLocation, isLoading } = useLocationStore();
    const router = useRouter();
    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        if (!isSearchMode && !regionName) {
            fetchLocation();
        }
    }, [fetchLocation, isSearchMode, regionName]);

    useEffect(() => {
        if (latitude && longitude) {
            getVillageWeather(latitude, longitude).then(data => setWeather(data));
        }
    }, [latitude, longitude]);

    const handleBack = () => {
        if (backUrl) {
            router.push(backUrl);
        } else {
            router.back();
        }
    };

    return (
        <header className="sticky top-0 w-full max-w-inherit bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-14 flex items-center justify-between z-50">
            {isSearchMode ? (
                <div className="flex items-center w-full space-x-3">
                    {showBackButton && (
                        <button
                            onClick={handleBack}
                            className="p-1 -ml-1 text-gray-700 hover:text-[#2E7D32] transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                    ) || (
                            <MapPin size={20} className="text-[#2E7D32]" />
                        )}

                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={searchValue}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onSearch?.();
                                }
                            }}
                            className="w-full h-10 pl-10 pr-10 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#2E7D32]/20 outline-none transition-all"
                            autoFocus={isSearchMode}
                        />
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E7D32] transition-colors"
                            size={18}
                        />
                        {searchValue && (
                            <button
                                onClick={() => onClearSearch?.()}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {rightElement || (
                        <button className="p-1 text-gray-700 hover:text-[#2E7D32] transition-colors">
                            <SlidersHorizontal size={22} />
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div
                        className="flex items-center space-x-1 font-bold text-lg text-[#3E2723] cursor-pointer hover:opacity-70 transition-opacity"
                        onClick={() => fetchLocation()}
                        title="위치 새로고침"
                    >
                        <MapPin
                            size={20}
                            className={`text-[#2E7D32] ${isLoading ? 'animate-pulse' : ''}`}
                        />
                        <span className={isLoading ? "text-gray-400" : ""}>
                            {regionName}
                        </span>
                    </div>
                    <div className="flex items-center space-x-4">
                        {weather && (
                            <div className="flex items-center space-x-1 text-sm font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full cursor-pointer hover:bg-gray-200 transition-colors">
                                <span>{weather.icon}</span>
                                <span>{weather.temp}</span>
                            </div>
                        )}
                        <Search size={22} className="text-gray-700 cursor-pointer" />
                        <Bell size={22} className="text-gray-700 cursor-pointer" />
                    </div>
                </>
            )}
        </header>
    );
}
