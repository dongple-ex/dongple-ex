import { fetchWithCache } from './client';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export interface FestivalItem {
  contentid: string;
  title: string;
  addr1: string;
  eventstartdate: string;
  eventenddate: string;
  firstimage?: string;
  mapx: string;
  mapy: string;
  tel?: string;
}

/**
 * 당일 기준 유효한 축제 정보 수집 및 원본 저장
 */
export async function collectFestivals() {
  const today = format(new Date(), 'yyyyMMdd');
  const cacheKey = `festivals:${today}`;
  
  // 1. TourAPI에서 행사/축제 정보 조회
  const items = await fetchWithCache<FestivalItem[]>(
    cacheKey,
    '/searchFestival1',
    {
      eventStartDate: today,
      arrange: 'A',
      numOfRows: 50,
      pageNo: 1,
    }
  );

  if (!items || items.length === 0) {
    console.log('수집된 축제 데이터가 없습니다.');
    return [];
  }

  // 2. 원본 데이터(raw_items) 적재
  const { error: rawError } = await supabase
    .from('raw_items')
    .insert([
      {
        source: 'TOURAPI',
        raw_data: { type: 'FESTIVAL', date: today, count: items.length, items },
      }
    ]);

  if (rawError) {
    console.error('원본 데이터 적재 실패:', rawError);
    // 실패하더라도 프로세스는 계속 진행
  }

  // 3. 수집된 아이템 반환 (후속 처리 - Classifier에서 사용)
  return items;
}
