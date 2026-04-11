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

/**
 * 네이버 로컬 API를 사용하여 좌표를 주소로 변환 (Reverse Geocoding)
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
    if (typeof window === 'undefined' || !window.naver || !window.naver.maps || !window.naver.maps.Service) {
        return "주소 정보를 불러올 수 없습니다.";
    }

    return new Promise((resolve) => {
        window.naver.maps.Service.reverseGeocode({
            location: new window.naver.maps.LatLng(lat, lng),
        }, (status: any, response: any) => {
            if (status !== window.naver.maps.Service.Status.OK) {
                console.error('Reverse Geocoding 실패:', status);
                resolve("위치 정보를 찾을 수 없음");
                return;
            }

            try {
                // v2 응답 구조에서 주소 텍스트 추출
                const addrV2 = response.v2.address;
                const results = response.v2.results;

                if (addrV2 && (addrV2.roadAddress || addrV2.jibunAddress)) {
                    resolve(addrV2.roadAddress || addrV2.jibunAddress);
                } else if (results && results.length > 0) {
                    const region = results[0].region;
                    const parts = [
                        region.area1?.name,
                        region.area2?.name,
                        region.area3?.name,
                        region.area4?.name
                    ].filter(Boolean);
                    resolve(parts.join(' ') || "검색된 주소 부근");
                } else {
                    resolve("주소 정보 없음");
                }
            } catch (err) {
                console.error('주소 파싱 에러:', err);
                resolve("주소 변환 중 오류 발생");
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
export async function getVillageWeather(region: string): Promise<WeatherData> {
    // TODO: 기상청 단기예보 API 연동
    return {
        temp: "12°",
        condition: "맑음",
        icon: "☀️",
    };
}

/**
 * 네이버 지역 검색 API 연동: 주변 특화 장소 찾기
 */
export async function getNearbyPlaces(lat: number, lng: number, keyword: string): Promise<PlaceData[]> {
    // TODO: Naver Local Search API 연동
    console.log(`Searching for ${keyword} near ${lat}, ${lng}`);

    // 모의 데이터
    return [
        { name: `${keyword} 1호점`, address: "강남구 역삼동 123", distance: "300m", category: keyword },
        { name: `${keyword} 2호점`, address: "강남구 역삼동 456", distance: "500m", category: keyword },
    ];
}
