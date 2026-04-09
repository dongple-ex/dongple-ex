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
 * 네이버 로컬 API를 사용하여 좌표를 주소로 변환
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
    // TODO: 실제 Naver Reverse Geocoding API 호출 로직 (Client ID/Secret 필요)
    // 현재는 테스트를 위해 모킹된 값을 반환합니다.
    console.log(`Fetching address for: ${lat}, ${lng}`);
    return "역삼1동";
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
