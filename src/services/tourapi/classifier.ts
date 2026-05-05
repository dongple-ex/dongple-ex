import { supabase } from '@/lib/supabase';
import { FestivalItem } from './collector';

/**
 * 카테고리 매핑 로직
 * TourAPI cat3 -> 동플 category_code (15: 축제, 14: 문화시설, 28: 레포츠 등)
 */
export const CATEGORY_MAP: Record<string, string> = {
  'A02010100': '15', // 산 -> 축제(임시) 또는 자연
  'A02010700': '15', // 근린공원
  'A02010800': '15', // 유원지
  'A05020100': '14', // 한식 -> 문화시설/식도락
  'A02080100': '14', // 전시관
  'A02080300': '14', // 박물관
  'A02070100': '15', // 일반축제 -> 축제(15)
  'A02070200': '15', // 문화관광축제
};

/**
 * Geofencing 기반 위치 매칭 및 신뢰도 산정 / 신규 등록
 */
export async function classifyAndLinkEvent(item: FestivalItem) {
  const { mapx, mapy, contentid, title, addr1, eventstartdate, eventenddate, firstimage } = item;
  const lat = parseFloat(mapy);
  const lng = parseFloat(mapx);

  // WGS84 범위 체크 (한국 위경도)
  const isValid = !isNaN(lat) && !isNaN(lng) && lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;

  if (!isValid) {
    console.warn(`[Classifier] Ignored invalid or non-WGS84 coordinates for ${title}: lat=${lat}, lng=${lng}`);
    return;
  }

  // 1. 기존 데이터 중 근접한(100m) 데이터 검색
  const range = 0.001; // 약 100m 오차 범위 내 중복 제거
  const { data: nearbyEvents } = await supabase
    .from('events')
    .select('id, title, trust_score')
    .filter('lat', 'gte', lat - range)
    .filter('lat', 'lte', lat + range)
    .filter('lng', 'gte', lng - range)
    .filter('lng', 'lte', lng + range)
    .limit(1);

  let targetEventId: number;

  if (nearbyEvents && nearbyEvents.length > 0) {
    // 2. 매칭된 데이터가 있으면 신뢰도 가산
    const matchedEvent = nearbyEvents[0];
    targetEventId = Number(matchedEvent.id);
    
    const newScore = Math.min(1.0, (matchedEvent.trust_score || 0.5) + 0.2);
    await supabase
      .from('events')
      .update({ trust_score: newScore })
      .eq('id', matchedEvent.id);

    console.log(`[Link Success] Linked ${title} to existing event ${matchedEvent.id}`);
  } else {

    // 3. 매칭된 데이터가 없으면 신규 공식 이벤트로 등록 (신뢰도 0.9)
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert([{
        title: title,
        address: addr1,
        lat: lat,
        lng: lng,
        trust_score: 0.9,
        thumbnail_url: firstimage,
        event_start_date: eventstartdate,
        event_end_date: eventenddate,
        category_code: '15', // 기본 15(축제)
      }])
      .select('id')
      .single();

    if (insertError || !newEvent) {
      console.error('[New Resource Error] Failed to create event:', insertError);
      return;
    }

    targetEventId = Number(newEvent.id);
    console.log(`[New Resource] Created new official event: ${title} (${targetEventId})`);

  }

  // 4. 확장 테이블(events_ext) 업데이트 (상세 메타데이터 보관)
  await supabase
    .from('events_ext')
    .upsert({
      event_id: targetEventId,
      source: 'TOURAPI',
      ext_id: contentid,
      meta: item,
      updated_at: new Date().toISOString()
    });
}
