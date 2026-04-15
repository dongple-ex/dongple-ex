/**
 * TourAPI 4.0 일간 데이터 동기화 배치 스크립트
 * 실행: npx ts-node -r dotenv/config scripts/sync-tourapi.ts
 */
import { collectFestivals } from '../src/services/tourapi/collector';
import { classifyAndLinkEvent } from '../src/services/tourapi/classifier';
import { sendSlackNotification } from '../src/services/tourapi/notifier';

async function main() {
  console.log('--- TourAPI Sync Start ---');
  
  try {
    // 1. 축제 정보 수집
    const items = await collectFestivals();
    
    if (items.length > 0) {
      // 2. 각 아이템에 대해 분류 및 링크 시도
      for (const item of items) {
        await classifyAndLinkEvent(item);
      }
      
      console.log(`성공적으로 ${items.length}개의 데이터를 처리했습니다.`);
      await sendSlackNotification(`Batch Success: ${items.length} items synced.`);
    }

  } catch (err: any) {
    console.error('Batch Execution Error:', err);
    await sendSlackNotification('Batch Failed', { error: err.message });
    process.exit(1);
  }

  console.log('--- TourAPI Sync Completed ---');
}

main();
