import { create } from 'zustand';
import { getAddressFromCoords, AddressResult } from '@/services/api';

export type LocationSource = "default" | "gps" | "manual";

interface LocationState {
    latitude: number;
    longitude: number;
    address: string;
    regionName: string;
    isLoading: boolean;
    error: string | null;
    hasGpsFix: boolean;
    locationSource: LocationSource;
    gpsLatitude: number | null;
    gpsLongitude: number | null;
    accuracy: number | null;
    receivedAt: string | null;
    setLocation: (
        lat: number,
        lng: number,
        address: string,
        regionName: string,
        options?: { source?: LocationSource; accuracy?: number | null },
    ) => void;
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
    hasGpsFix: false,
    locationSource: "default",
    gpsLatitude: null,
    gpsLongitude: null,
    accuracy: null,
    receivedAt: null,

    setLocation: (lat, lng, address, regionName, options = {}) => {
        // 좌표 유효성 검사 (WGS84 범위 내)
        const isValid = isFinite(lat) && isFinite(lng) && lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
        
        if (!isValid) {
            console.warn(`[LocationStore] Ignored invalid coordinates: lat=${lat}, lng=${lng}`);
            return;
        }

        const source = options.source || "manual";
        const isGps = source === "gps";

        set({ 
            latitude: lat, 
            longitude: lng, 
            address, 
            regionName,
            locationSource: source,
            ...(isGps
                ? {
                    hasGpsFix: true,
                    gpsLatitude: lat,
                    gpsLongitude: lng,
                    accuracy: options.accuracy ?? null,
                    receivedAt: new Date().toISOString(),
                }
                : {}),
        });
    },

    fetchLocation: async () => {
        set({ isLoading: true, error: null });
        
        if (typeof window === 'undefined' || !navigator.geolocation) {
            const msg = "Geolocation is not supported";
            set({ error: msg, isLoading: false });
            throw new Error(msg);
        }

        return new Promise<void>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    try {
                        const result: AddressResult = await getAddressFromCoords(latitude, longitude);
                        set({ 
                            latitude, 
                            longitude, 
                            address: result.fullAddress,
                            regionName: result.regionName,
                            hasGpsFix: true,
                            locationSource: "gps",
                            gpsLatitude: latitude,
                            gpsLongitude: longitude,
                            accuracy: Number.isFinite(accuracy) ? accuracy : null,
                            receivedAt: new Date().toISOString(),
                            isLoading: false 
                        });
                        resolve();
                    } catch {
                        const msg = "Failed to fetch address";
                        set({
                            error: msg,
                            hasGpsFix: false,
                            gpsLatitude: null,
                            gpsLongitude: null,
                            accuracy: null,
                            receivedAt: null,
                            isLoading: false,
                        });
                        reject(new Error(msg));
                    }
                },
                (err) => {
                    let errorMsg = "위치 정보를 가져올 수 없습니다.";
                    if (err.code === 1) errorMsg = "위치 권한이 거부되었습니다.";
                    else if (err.code === 2) errorMsg = "위치를 찾을 수 없습니다.";
                    else if (err.code === 3) errorMsg = "요청 시간이 초과되었습니다.";
                    
                    set({
                        error: errorMsg,
                        hasGpsFix: false,
                        gpsLatitude: null,
                        gpsLongitude: null,
                        accuracy: null,
                        receivedAt: null,
                        isLoading: false,
                    });
                    reject(new Error(errorMsg));
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }
}));
