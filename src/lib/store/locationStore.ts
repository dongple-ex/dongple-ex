import { create } from 'zustand';
import { getAddressFromCoords, AddressResult } from '@/services/api';

interface LocationState {
    latitude: number;
    longitude: number;
    address: string;
    regionName: string;
    isLoading: boolean;
    error: string | null;
    setLocation: (lat: number, lng: number, address: string, regionName: string) => void;
    fetchLocation: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
    // 기본값: 수원 정자동 부근
    latitude: 37.2995,
    longitude: 126.9912,
    address: "경기도 수원시 장안구 정자동",
    regionName: "수원시 정자동",
    isLoading: false,
    error: null,

    setLocation: (lat, lng, address, regionName) => {
        // 좌표 유효성 검사 (WGS84 범위 내)
        const isValid = isFinite(lat) && isFinite(lng) && lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
        
        if (!isValid) {
            console.warn(`[LocationStore] Ignored invalid coordinates: lat=${lat}, lng=${lng}`);
            return;
        }

        set({ 
            latitude: lat, 
            longitude: lng, 
            address, 
            regionName 
        });
    },

    fetchLocation: async () => {
        set({ isLoading: true, error: null });
        
        if (typeof window === 'undefined' || !navigator.geolocation) {
            set({ error: "Geolocation is not supported", isLoading: false });
            return;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const result: AddressResult = await getAddressFromCoords(latitude, longitude);
                        set({ 
                            latitude, 
                            longitude, 
                            address: result.fullAddress,
                            regionName: result.regionName,
                            isLoading: false 
                        });
                        resolve();
                    } catch {
                        set({ error: "Failed to fetch address", isLoading: false });
                        resolve();
                    }
                },
                (err) => {
                    let errorMsg = "위치 정보를 가져올 수 없습니다.";
                    if (err.code === 1) errorMsg = "위치 권한이 거부되었습니다.";
                    else if (err.code === 2) errorMsg = "위치를 찾을 수 없습니다.";
                    else if (err.code === 3) errorMsg = "요청 시간이 초과되었습니다.";
                    
                    set({ error: errorMsg, isLoading: false });
                    resolve();
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }
}));
