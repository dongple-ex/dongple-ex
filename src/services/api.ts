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

/**
 * 네이버 로컬 API를 사용하여 좌표를 주소로 변환 (Reverse Geocoding)
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<AddressResult> {
    const fallback: AddressResult = { fullAddress: "주소 정보 없음", regionName: "위치 확인 불가" };
    
    if (typeof window === 'undefined' || !window.naver || !window.naver.maps || !window.naver.maps.Service) {
        return { fullAddress: "서비스 로드 중...", regionName: "위치 확인 중" };
    }

    return new Promise((resolve) => {
        window.naver.maps.Service.reverseGeocode({
            location: new window.naver.maps.LatLng(lat, lng),
        }, (status: any, response: any) => {
            if (status !== window.naver.maps.Service.Status.OK) {
                console.error('Reverse Geocoding 실패:', status);
                resolve(fallback);
                return;
            }

            try {
                const addrV2 = response.v2.address;
                const results = response.v2.results;
                let fullAddress = "";
                let regionName = "";

                if (addrV2 && (addrV2.roadAddress || addrV2.jibunAddress)) {
                    fullAddress = addrV2.roadAddress || addrV2.jibunAddress;
                }

                if (results && results.length > 0) {
                    const region = results[0].region;
                    // 수원시 정자동 포맷 생성 (area2의 '시' 부분 + area3)
                    const city = region.area2?.name?.split(' ')[0] || ""; // '수원시'
                    const dong = region.area3?.name || ""; // '정자동'
                    regionName = `${city} ${dong}`.trim();
                    
                    if (!fullAddress) {
                        const parts = [
                            region.area1?.name,
                            region.area2?.name,
                            region.area3?.name,
                            region.area4?.name
                        ].filter(Boolean);
                        fullAddress = parts.join(' ');
                    }
                }

                resolve({
                    fullAddress: fullAddress || "주소 정보 없음",
                    regionName: regionName || "알 수 없는 지역"
                });
            } catch (err) {
                console.error('주소 파싱 에러:', err);
                resolve(fallback);
            }
        });
    });
}

/**
 * 상호/장소 키워드로 검색 (POI Search)
 * /api/search 프록시를 통해 네이버 지역 검색 API 호출
 */
export async function searchPlaces(query: string): Promise<any[]> {
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search API failed');
        const data = await response.json();
        return data.items || [];
    } catch (err) {
        console.error('POI 검색 실패:', err);
        return [];
    }
}

/**
 * 주소를 좌표로 변환 (Geocoding) - 검색 기능용
 */
export async function getCoordsFromAddress(address: string): Promise<{ lat: number, lng: number } | null> {
    if (typeof window === 'undefined' || !window.naver || !window.naver.maps || !window.naver.maps.Service) {
        return null;
    }

    return new Promise((resolve) => {
        window.naver.maps.Service.geocode({
            query: address
        }, (status: any, response: any) => {
            if (status !== window.naver.maps.Service.Status.OK) {
                console.error('Geocoding 실패:', status);
                resolve(null);
                return;
            }

            try {
                const addresses = response.v2.addresses;
                if (addresses && addresses.length > 0) {
                    const item = addresses[0];
                    resolve({
                        lat: parseFloat(item.y),
                        lng: parseFloat(item.x)
                    });
                } else {
                    resolve(null);
                }
            } catch (err) {
                console.error('좌표 변환 에러:', err);
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
    } catch(e) {
        console.error("Weather API error", e);
        return {
            temp: "12°",
            condition: "맑음",
            icon: "☀️",
        };
    }
}

/**
 * 네이버 지역 검색 API 연동: 주변 특화 장소 찾기
 */
export async function getNearbyPlaces(lat: number, lng: number, keyword: string): Promise<PlaceData[]> {
    try {
        const address = await getAddressFromCoords(lat, lng);
        const query = `${address.regionName !== "위치 확인 불가" ? address.regionName : ""} ${keyword}`.trim();
        const response = await fetch(`/api/search?query=${encodeURIComponent(query || keyword)}`);
        
        if (!response.ok) throw new Error('Search API failed');
        const data = await response.json();
        
        return (data.items || []).map((item: any) => {
            const cleanName = item.title.replace(/<[^>]*>?/gm, '');
            return {
                name: cleanName,
                address: item.roadAddress || item.address,
                distance: "", 
                category: item.category
            };
        });
    } catch (err) {
        console.error('POI 주변 검색 실패:', err);
        return [];
    }
}
