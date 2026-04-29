/**
 * 동네 위치 기반 외부 데이터 연동 서비스
 */

export interface LocationData {
    lat: number;
    lng: number;
    addressName?: string;
    regionName?: string; // 예: 역삼동
}

export interface WeatherData {
    temp: string;
    condition: string;
    icon: string;
}

export interface PlaceData {
    name: string;
    address: string;
    distance: string;
    category: string;
}

export interface AddressResult {
    fullAddress: string;
    regionName: string; // 예: 수원시 정자동
}

export interface SearchPlaceResult {
    title: string;
    mapx: string;
    mapy: string;
    roadAddress?: string;
    address?: string;
    category?: string;
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao: any;
    }
}

type KakaoStatus = "OK" | "ZERO_RESULT" | "ERROR";

interface KakaoAddressResult {
    address?: {
        address_name?: string;
        region_1depth_name?: string;
        region_2depth_name?: string;
        region_3depth_name?: string;
    };
    road_address?: {
        address_name?: string;
    };
}

interface KakaoRegionResult {
    region_type?: string;
    address_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
}

interface KakaoPlaceResult {
    place_name: string;
    x: string;
    y: string;
    road_address_name?: string;
    address_name?: string;
    category_name?: string;
}

const isKakaoServicesReady = () =>
    typeof window !== "undefined" && Boolean(window.kakao?.maps?.services);

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
export async function getAddressFromCoords(lat: number, lng: number): Promise<AddressResult> {
    const fallback: AddressResult = { fullAddress: "주소 정보 없음", regionName: "위치 확인 불가" };
    
    if (!(await ensureKakaoReady())) {
        return { fullAddress: "서비스 로드 중...", regionName: "위치 확인 중" };
    }

    return new Promise((resolve) => {
        const geocoder = new window.kakao.maps.services.Geocoder();

        geocoder.coord2Address(lng, lat, (addressResults: KakaoAddressResult[], addressStatus: KakaoStatus) => {
            if (addressStatus !== window.kakao.maps.services.Status.OK) {
                console.error("Reverse Geocoding 실패:", addressStatus);
                resolve(fallback);
                return;
            }

            try {
                const addressResult = addressResults?.[0];
                const fullAddress =
                    addressResult?.road_address?.address_name ||
                    addressResult?.address?.address_name ||
                    "주소 정보 없음";

                geocoder.coord2RegionCode(lng, lat, (regionResults: KakaoRegionResult[], regionStatus: KakaoStatus) => {
                    let regionName = "알 수 없는 지역";

                    if (regionStatus === window.kakao.maps.services.Status.OK && regionResults?.length > 0) {
                        const region =
                            regionResults.find((item) => item.region_type === "H") ||
                            regionResults[0];
                        regionName = `${region.region_2depth_name || ""} ${region.region_3depth_name || ""}`.trim()
                            || region.address_name
                            || regionName;
                    }

                    resolve({ fullAddress, regionName });
                });
            } catch (err) {
                console.error("주소 파싱 에러:", err);
                resolve(fallback);
            }
        });
    });
}

/**
 * 상호/장소 키워드로 검색 (POI Search)
 * 카카오 장소 검색 services API 호출
 */
export async function searchPlaces(query: string): Promise<SearchPlaceResult[]> {
    if (!(await ensureKakaoReady())) {
        return [];
    }

    return new Promise((resolve) => {
        const places = new window.kakao.maps.services.Places();

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
        });
    });
}

/**
 * 좌표 기준 가장 가까운 상호/장소 정보 가져오기 (POI Reverse Search)
 */
export async function getNearestPlace(lat: number, lng: number): Promise<SearchPlaceResult | null> {
    if (!(await ensureKakaoReady())) return null;

    const ps = new window.kakao.maps.services.Places();
    const location = new window.kakao.maps.LatLng(lat, lng);
    
    // 탐색할 카카오 장소 카테고리 목록
    const categories = ['FD6', 'CE7', 'CS2', 'CT1', 'AT4', 'PO3', 'PK6', 'MT1'];
    
    const searchCategory = (category: string): Promise<SearchPlaceResult | null> => {
        return new Promise((resolve) => {
            ps.categorySearch(category, (results: KakaoPlaceResult[], status: KakaoStatus) => {
                if (status === window.kakao.maps.services.Status.OK && results.length > 0) {
                    console.log(`[getNearestPlace] Category ${category} found:`, results[0].place_name);
                    resolve({
                        title: results[0].place_name,
                        mapx: results[0].x,
                        mapy: results[0].y,
                        roadAddress: results[0].road_address_name,
                        address: results[0].address_name,
                        category: results[0].category_name,
                    });
                } else {
                    resolve(null);
                }
            }, { location, radius: 100, sort: window.kakao.maps.services.SortBy.DISTANCE });
        });
    };

    try {
        console.log(`[getNearestPlace] Starting search at ${lat}, ${lng}`);
        // 1단계: 카테고리 기반 검색 (정확도 높음)
        const catResults = await Promise.all(categories.map(cat => searchCategory(cat)));
        const validResults = catResults.filter((r): r is SearchPlaceResult => r !== null);
        
        if (validResults.length > 0) {
            const nearest = validResults.reduce((prev, curr) => {
                const distPrev = Math.pow(parseFloat(prev.mapy) - lat, 2) + Math.pow(parseFloat(prev.mapx) - lng, 2);
                const distCurr = Math.pow(parseFloat(curr.mapy) - lat, 2) + Math.pow(parseFloat(curr.mapx) - lng, 2);
                return distCurr < distPrev ? curr : prev;
            });
            console.log(`[getNearestPlace] Final Nearest:`, nearest.title);
            return nearest;
        }

        // 2단계: 키워드 기반 범용 검색 (카테고리에 없는 경우)
        return new Promise((resolve) => {
            ps.keywordSearch('가게', (results: KakaoPlaceResult[], status: KakaoStatus) => {
                if (status === window.kakao.maps.services.Status.OK && results.length > 0) {
                    const item = results[0];
                    console.log(`[getNearestPlace] Keyword search found:`, item.place_name);
                    resolve({
                        title: item.place_name,
                        mapx: item.x,
                        mapy: item.y,
                        roadAddress: item.road_address_name,
                        address: item.address_name,
                        category: item.category_name,
                    });
                } else {
                    console.log(`[getNearestPlace] No POI found around ${lat}, ${lng}`);
                    resolve(null);
                }
            }, { location, radius: 100, sort: window.kakao.maps.services.SortBy.DISTANCE });
        });
    } catch (err) {
        console.error("POI 탐색 중 오류:", err);
        return null;
    }
}


/**
 * 주소를 좌표로 변환 (Geocoding) - 검색 기능용
 */
export async function getCoordsFromAddress(address: string): Promise<{ lat: number, lng: number } | null> {
    if (!(await ensureKakaoReady())) {
        return null;
    }

    return new Promise((resolve) => {
        const geocoder = new window.kakao.maps.services.Geocoder();

        geocoder.addressSearch(address, (results: Array<{ x: string; y: string }>, status: KakaoStatus) => {
            if (status !== window.kakao.maps.services.Status.OK) {
                console.error("Geocoding 실패:", status);
                resolve(null);
                return;
            }

            try {
                if (results && results.length > 0) {
                    const item = results[0];
                    resolve({
                        lat: parseFloat(item.y),
                        lng: parseFloat(item.x)
                    });
                } else {
                    resolve(null);
                }
            } catch (err) {
                console.error("좌표 변환 에러:", err);
                resolve(null);
            }
        });
    });
}

/**
 * 공공 데이터 API 연동: 날씨 정보 가져오기
 */
export async function getVillageWeather(lat: number, lng: number): Promise<WeatherData> {
    try {
        const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
        if (!res.ok) throw new Error("Weather fetch failed");
        return await res.json();
    } catch (error) {
        console.error("Weather API error", error);
        return {
            temp: "12°",
            condition: "맑음",
            icon: "☀️",
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
        const places = await searchPlaces(query || keyword);
        
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
