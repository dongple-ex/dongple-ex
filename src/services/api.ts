export interface PlaceData {
    name: string;
    address: string;
    distance: string;
    category: string;
}

export interface AddressResult {
    fullAddress: string;
    regionName: string;
    roadAddress?: string | null;
}

export interface SearchPlaceResult {
    title: string;
    mapx: string;
    mapy: string;
    roadAddress: string;
    address: string;
    category: string;
}

export interface WeatherData {
    temp: string;
    icon: string;
    condition?: string;
    source?: "kma" | "fallback";
    isFallback?: boolean;
}

// Kakao Maps SDK Type helpers (approximate)
type KakaoStatus = "OK" | "ZERO_RESULT" | "ERROR";
type KakaoLatLng = {
    getLat: () => number;
    getLng: () => number;
};

type KakaoMapInstance = {
    getCenter: () => KakaoLatLng;
    setCenter: (latLng: KakaoLatLng) => void;
    setLevel: (level: number) => void;
    relayout: () => void;
    panTo: (latLng: KakaoLatLng) => void;
};

type KakaoAddressResult = {
    address: {
        address_name: string;
        region_1depth_name: string;
        region_2depth_name: string;
        region_3depth_name: string;
    };
    road_address: {
        address_name: string;
    } | null;
};

type KakaoRegionResult = {
    region_type: string;
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
};

interface KakaoPlaceResult {
    place_name: string;
    x: string;
    y: string;
    road_address_name: string;
    address_name: string;
    category_name: string;
}

type KakaoSearchOptions = {
    location?: KakaoLatLng;
    radius?: number;
    sort: string;
};

type KakaoGeocoder = {
    coord2Address: (
        lng: number,
        lat: number,
        callback: (result: KakaoAddressResult[], status: KakaoStatus) => void,
    ) => void;
    coord2RegionCode: (
        lng: number,
        lat: number,
        callback: (result: KakaoRegionResult[], status: KakaoStatus) => void,
    ) => void;
    addressSearch: (
        address: string,
        callback: (result: Array<{ x: string; y: string }>, status: KakaoStatus) => void,
    ) => void;
};

type KakaoPlaces = {
    keywordSearch: (
        query: string,
        callback: (results: KakaoPlaceResult[], status: KakaoStatus) => void,
        options?: KakaoSearchOptions,
    ) => void;
};

type KakaoMapsSdk = {
    load: (callback: () => void) => void;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
    CustomOverlay: new (options: {
        position: KakaoLatLng;
        map: KakaoMapInstance;
        content: HTMLElement;
        xAnchor: number;
        yAnchor: number;
    }) => { 
        setMap: (map: KakaoMapInstance | null) => void;
        getPosition: () => KakaoLatLng;
    };
    event: {
        addListener: (
            target: KakaoMapInstance,
            eventName: string,
            handler: (event?: { latLng: KakaoLatLng }) => void,
        ) => void;
    };
    services: {
        Geocoder: new () => KakaoGeocoder;
        Places: new () => KakaoPlaces;
        SortBy: {
            ACCURACY: string;
            DISTANCE: string;
        };
        Status: {
            OK: KakaoStatus;
            ZERO_RESULT: KakaoStatus;
            ERROR: KakaoStatus;
        };
    };
};

declare global {
    interface Window {
        kakao: {
            maps: KakaoMapsSdk;
        };
    }
}

/**
 * 카카오 지도 서비스 라이브러리가 로드되었는지 확인
 */
function isKakaoServicesReady(): boolean {
    return typeof window !== "undefined" && !!window.kakao?.maps?.services?.Geocoder;
}

/**
 * 카카오 SDK가 로드되었는지 확인하고, autoload=false인 경우 load()를 호출하여 대기합니다.
 */
async function ensureKakaoReady(): Promise<boolean> {
    if (isKakaoServicesReady()) return true;
    if (typeof window === "undefined" || !window.kakao?.maps) return false;

    return new Promise((resolve) => {
        window.kakao.maps.load(() => {
            resolve(isKakaoServicesReady());
        });
    });
}

/**
 * 좌표(WGS84)를 주소로 변환 (Reverse Geocoding)
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<AddressResult> {
    const fallback: AddressResult = { fullAddress: "주소 정보 없음", regionName: "위치 확인 불가" };
    
    // 좌표 유효성 검사 (WGS84 한국 범위 내 인지 확인)
    // 33~39도 사이가 아닌 경우 (예: KTM 좌표 400,000 이상) 무시
    const isValid = isFinite(lat) && isFinite(lng) && lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
    
    if (!isValid) {
        console.warn("[API] Invalid or non-WGS84 coordinates passed to getAddressFromCoords:", lat, lng);
        return fallback;
    }
    
    if (!(await ensureKakaoReady())) {
        return { fullAddress: "서비스 로드 중...", regionName: "위치 확인 중" };
    }

    return new Promise((resolve) => {
        const geocoder = new window.kakao.maps.services.Geocoder();

        // 1. 상세 주소 시도
        geocoder.coord2Address(lng, lat, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                const addr = result[0].address;
                const roadAddr = result[0].road_address;
                
                resolve({
                    fullAddress: roadAddr?.address_name || addr.address_name,
                    regionName: addr.region_1depth_name + " " + addr.region_2depth_name + " " + addr.region_3depth_name,
                    roadAddress: roadAddr?.address_name || null
                });
            } else {
                // 2. 실패 시 행정구역 정보 시도 (coord2RegionCode)
                geocoder.coord2RegionCode(lng, lat, (regResult, regStatus) => {
                    if (regStatus === window.kakao.maps.services.Status.OK && regResult.length > 0) {
                        const bAddress = regResult.find((r) => r.region_type === 'B') || regResult[0];
                        resolve({
                            fullAddress: bAddress.address_name || "주소 정보 없음",
                            regionName: bAddress.region_1depth_name + " " + bAddress.region_2depth_name + " " + bAddress.region_3depth_name,
                            roadAddress: null
                        });
                    } else {
                        resolve(fallback);
                    }
                });
            }
        });
    });
}

/**
 * 상호/장소 키워드로 검색 (POI Search)
 */
export async function searchPlaces(query: string, options?: { lat?: number; lng?: number; radius?: number }): Promise<SearchPlaceResult[]> {
    if (!(await ensureKakaoReady())) {
        return [];
    }

    return new Promise((resolve) => {
        const places = new window.kakao.maps.services.Places();
        
        const searchOptions: KakaoSearchOptions = {
            sort: window.kakao.maps.services.SortBy.ACCURACY
        };

        if (options?.lat && options?.lng) {
            searchOptions.location = new window.kakao.maps.LatLng(options.lat, options.lng);
            searchOptions.radius = options.radius || 2000; // 기본 2km 반경
            searchOptions.sort = window.kakao.maps.services.SortBy.DISTANCE; // 거리가 가까운 순으로
        }

        places.keywordSearch(query, (results: KakaoPlaceResult[], status: KakaoStatus) => {
            if (status !== window.kakao.maps.services.Status.OK) {
                if (status !== window.kakao.maps.services.Status.ZERO_RESULT) {
                    console.error("POI 검색 실패:", status);
                }
                resolve([]);
                return;
            }

            resolve((results || []).map((item) => ({
                title: item.place_name,
                mapx: item.x,
                mapy: item.y,
                roadAddress: item.road_address_name,
                address: item.address_name,
                category: item.category_name,
            })));
        }, searchOptions);
    });
}

/**
 * 주변 장소(POI) 탐색 - 가장 가까운 하나 반환
 */
export async function getNearestPlace(lat: number, lng: number): Promise<SearchPlaceResult | null> {
    if (!(await ensureKakaoReady())) return null;

    return new Promise((resolve) => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(lng, lat, async (result, status) => {
            if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                // '정자동'처럼 중복된 이름이 많은 경우를 대비해 구 단위까지 포함하여 검색
                const addr = result[0].address;
                const query = `${addr.region_2depth_name} ${addr.region_3depth_name}`;
                
                // 해당 좌표를 기준으로 검색 가중치 부여
                const places = await searchPlaces(query, { lat, lng, radius: 1000 });
                if (places.length > 0) {
                    resolve(places[0]);
                } else {
                    // POI가 없을 경우 주소 정보라도 반환
                    resolve({
                        title: addr.address_name,
                        mapx: String(lng),
                        mapy: String(lat),
                        roadAddress: result[0].road_address?.address_name || "",
                        address: addr.address_name,
                        category: "주소",
                    });
                }
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * 주소로 좌표 변환
 */
export async function getCoordsFromAddress(address: string): Promise<MapPoint | null> {
    if (!(await ensureKakaoReady())) return null;

    return new Promise((resolve) => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                resolve({
                    lat: parseFloat(result[0].y),
                    lng: parseFloat(result[0].x)
                });
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * 동네 날씨 조회 (기상청 API 연동)
 */
export async function getVillageWeather(lat: number, lng: number): Promise<WeatherData> {
    try {
        const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
        if (!res.ok) throw new Error("Weather fetch failed");
        return await res.json();
    } catch (error) {
        console.error("Weather API error", error);
        return {
            temp: "22°",
            icon: "☀️",
            condition: "맑음",
            source: "fallback",
            isFallback: true,
        };
    }
}

/**
 * 카카오 장소 검색 API 연동: 주변 특화 장소 찾기
 */
export async function getNearbyPlaces(lat: number, lng: number, keyword: string): Promise<PlaceData[]> {
    try {
        const address = await getAddressFromCoords(lat, lng);
        const query = `${address.regionName !== "위치 확인 불가" ? address.regionName : ""} ${keyword}`.trim();
        const places = await searchPlaces(query || keyword, { lat, lng });
        
        return places.map((item: SearchPlaceResult) => {
            const cleanName = item.title.replace(/<[^>]*>?/gm, '');
            return {
                name: cleanName,
                address: item.roadAddress || item.address || "",
                distance: "", 
                category: item.category || ""
            };
        });
    } catch (err) {
        console.error('POI 주변 검색 실패:', err);
        return [];
    }
}

type MapPoint = { lat: number; lng: number };
