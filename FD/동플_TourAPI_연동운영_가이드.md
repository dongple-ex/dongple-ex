# 동플 TourAPI 연동 운영 가이드

## 목적
- 한국관광공사 OpenAPI를 동플의 공식 관광 데이터 축으로 운영한다.
- 동플 자체 데이터와 공공데이터를 분리해서 관리한다.
- 어떤 화면이 어떤 API를 사용하는지 FD에서 추적 가능하게 유지한다.

## 현재 연동 상태
- 완료
  - `공식 행사/축제`를 TourAPI 기반 서버 라우트로 조회
  - `홈 공식 소식`, `/events`, `/map` 공식 행사 마커가 같은 `fetchOfficialEvents()` 흐름 사용
  - TourAPI 미설정 또는 호출 실패 시 Supabase `events` fallback 유지
- 다음 단계
  - `/map` 주변 관광지용 `locationBasedList1`
  - 장소 상세용 `detailCommon1`, `detailIntro1`, `detailImage1`
  - 키워드 탐색 고도화용 `searchKeyword1`
  - 지역 필터용 `areaCode`, `sigunguCode`

## 화면별 API 매핑
| 화면 | 목적 | 우선 API | 상태 |
| --- | --- | --- | --- |
| 홈 공식 소식 | 행사 요약 노출 | `searchFestival1` | 연동 완료 |
| `/events` | 공식 행사 목록 | `searchFestival1`, `searchKeyword1` | 1차 연동 완료 |
| `/map` | 지도 위 공식 행사 마커 | `searchFestival1` | 연동 완료 |
| `/map` 확장 | 주변 관광지 탐색 | `locationBasedList1` | 예정 |
| 장소 상세 | 기본/소개/이미지 | `detailCommon1`, `detailIntro1`, `detailImage1` | 예정 |
| 앨범/발자취 | 재방문 정보 보강 | `detailCommon1`, `detailImage1` | 예정 |

## 환경변수
- 필수
  - `TOURAPI_KEY` 또는 `TOURAPI_SERVICE_KEY`
- 선택
  - `TOURAPI_BASE_URL`
    - 기본값: `https://apis.data.go.kr/B551011/KorService1`

## 실제 코드 연결 지점
- 서버 라우트
  - [src/app/api/tour/events/route.ts](/C:/my_project/dongple_ex/src/app/api/tour/events/route.ts)
- 클라이언트 서비스
  - [src/services/eventService.ts](/C:/my_project/dongple_ex/src/services/eventService.ts)
- 사용 화면
  - [src/features/events/components/OfficialEventSection.tsx](/C:/my_project/dongple_ex/src/features/events/components/OfficialEventSection.tsx)
  - [src/app/events/page.tsx](/C:/my_project/dongple_ex/src/app/events/page.tsx)
  - [src/app/map/page.tsx](/C:/my_project/dongple_ex/src/app/map/page.tsx)

## 운영 원칙
- 공식 데이터는 TourAPI 우선
- 실패 시 서비스 중단 대신 DB fallback
- 사용자 생성 데이터는 공식 데이터와 섞지 않음
- 공모전 서술 시 `한국관광공사 OpenAPI 필수 활용`이 실제 화면 기능에 직접 연결되도록 유지

## 다음 구현 체크리스트
- [ ] 지도 주변 관광지 카드 구현
- [ ] 장소 상세 API 3종 연결
- [ ] 앨범 저장 장소와 TourAPI 장소 매칭
- [ ] 수원 기본 필터 적용
- [ ] 키워드 검색을 `/events`, `/map`에 공통 적용
