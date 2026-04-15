import { supabase } from '@/lib/supabase';
import { FestivalItem } from './collector';

/**
 * 카테고리 매핑 로직
 * TourAPI cat3 -> 동플 category_code
 */
export const CATEGORY_MAP: Record<string, string> = {
  'A02010100': 'CAT_NATURE',  // 산
  'A05020100': 'CAT_FOOD',    // 한식
  'A02080100': 'CAT_CULTURE', // 전시관
  // 필요 시 더 많은 매핑 추가
};

/**
 * Geofencing 기반 위치 매칭 및 신뢰도 산정
 */
export async function classifyAndLinkEvent(item: FestivalItem) {
  const { mapx, mapy, contentid, title } = item;
  const lat = parseFloat(mapy);
  const lng = parseFloat(mapx);

  // 1. 기존 사용자 제보 데이터 중 근접한(50m) 데이터 검색
  // postgis st_distance 등을 활용하는 것이 좋으나, 여기선 단순 좌표 범위로 예시 구현
  const range = 0.0005; // 대략 50m 오차 범위
  const { data: nearbyEvents } = await supabase
    .from('events')
    .select('id, title, trust_score')
    .filter('lat', 'gte', lat - range)
    .filter('lat', 'lte', lat + range)
    .filter('lng', 'gte', lng - range)
    .filter('lng', 'lte', lng + range);

  if (nearbyEvents && nearbyEvents.length > 0) {
    // 2. 매칭된 데이터가 있으면 신뢰도 가산 및 외부 ID 연결
    const matchedEvent = nearbyEvents[0];
    
    // 신뢰도 +0.2 가산 (최대 1.0 제한 필요)
    const newScore = Math.min(1.0, (matchedEvent.trust_score || 0.5) + 0.2);
    
    await supabase
      .from('events')
      .update({ trust_score: newScore })
      .eq('id', matchedEvent.id);

    // 확장 테이블 적재
    await supabase
      .from('events_ext')
      .upsert({
        event_id: matchedEvent.id,
        source: 'TOURAPI',
        ext_id: contentid,
        meta: item
      });

    console.log(`[Link Success] Linked ${title} to existing event ${matchedEvent.id}`);
  } else {
    // 3. 매칭된 데이터가 없으면 신규 공식 이벤트로 등록 (Optional)
    console.log(`[New Resource] Found new official event: ${title}`);
    // 향후 자동 등록 로직 추가 가능
  }
}
