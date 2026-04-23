import axios from 'axios';
import Redis from 'ioredis';

// Redis 클라이언트 초기화 (오류 발생 시 null 반환하여 서비스 중단 방지)
const getRedisClient = () => {
  try {
    if (!process.env.REDIS_URL) return null;
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 3 ? null : 1000),
    });
  } catch (err) {
    console.error('Redis 연결 실패:', err);
    return null;
  }
};

export const redis = getRedisClient();

// TourAPI 공통 설정
const tourApiClient = axios.create({
  baseURL: process.env.TOURAPI_BASE_URL || 'https://apis.data.go.kr/B551011/KorService2',
  params: {
    serviceKey: process.env.TOURAPI_KEY,
    MobileApp: 'Dongple',
    MobileOS: 'ETC',
    _type: 'json',
  },
});

/**
 * 캐싱을 적용한 API 호출 (Read-Through 패턴)
 */
export async function fetchWithCache<T>(
  cacheKey: string,
  apiEndpoint: string,
  params: Record<string, string | number | boolean> = {},
  ttlSeconds: number = 86400 // 기본 24시간
): Promise<T | null> {
  // 1. Redis 캐시 확인
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`[Cache Hit] ${cacheKey}`);
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      console.warn('Redis 조회 에러:', err);
    }
  }

  // 2. API 호출
  try {
    console.log(`[API Call] ${apiEndpoint}`);
    const response = await tourApiClient.get(apiEndpoint, { params });
    const data = response.data?.response?.body?.items?.item;
    
    if (!data) return null;

    // 3. Redis 캐시 적재
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(data), 'EX', ttlSeconds);
      } catch (err) {
        console.warn('Redis 저장 에러:', err);
      }
    }

    return data as T;
  } catch (err) {
    console.error(`TourAPI 호출 실패 (${apiEndpoint}):`, err);
    return null;
  }
}

export default tourApiClient;
