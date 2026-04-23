# 동플 TourAPI 연동 운영 가이드

## 목적
- 한국관광공사 OpenAPI를 동플의 공식 관광 데이터 축으로 운영한다.
- 동플 자체 데이터와 공공데이터를 분리해서 관리한다.
- 어떤 화면이 어떤 API를 사용하는지 FD에서 추적 가능하게 유지한다.
- TourAPI 행사 정보는 `행사 일정 앱`을 만들기 위한 것이 아니라, 행사 현장의 현재 상태 공유를 만들기 위한 진입점으로 사용한다.
- 핵심 구조는 `공공데이터 = 뼈대`, `동플 = 실시간 뇌`다.

## 행사 데이터 결합 원칙
TourAPI가 제공하는 행사 데이터의 역할은 다음과 같다.

- 이름
- 위치
- 시간
- 설명
- 이미지/메타

동플이 붙이는 실시간 데이터의 역할은 다음과 같다.

- 지금 붐빔
- 대기 상황
- 분위기
- 최근 공유 시각
- 현장 코멘트

따라서 화면 표현은 `벚꽃축제 진행 중`에서 끝나면 안 된다. `벚꽃축제 - 지금 붐빔(5분 전), 줄 길어요, 사람 많음`처럼 행사 현재 상태를 판단할 수 있어야 한다.

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
| 홈 오늘 행사 | `지금 핫한 곳` 진입점 | `searchFestival1` | 연동 완료 |
| `/events` | 행사 후보 목록과 검색 | `searchFestival1`, `searchKeyword1` | 1차 연동 완료 |
| `/map` | 지도 위 강조 행사 마커와 현재 상태 공유 진입 | `searchFestival1` | 연동 완료 |
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
- 행사 정보 자체를 주인공으로 만들지 않는다.
- 행사 일정, 주소, 이미지, 설명은 현장 상태 공유를 붙이기 위한 기본 메타로 사용한다.
- 화면 문구는 `행사 정보 보기`보다 `지금 행사장 상태 보기`, `현재 붐빔 확인`, `현장 상황 공유`에 가깝게 둔다.
- 행사 레이어는 초기 트래픽을 만들고, 카페/식당/공원 같은 일반 장소 레이어는 평소 사용 빈도를 만든다.
- 행사 핀은 색상으로 혼잡도를 보여주고 `몇 분 전` 업데이트를 함께 표시한다.
- 리포트는 가능하면 `event_id` 기준으로 연결해 행사별 현재 상태를 계산한다.
- `events`는 기본 뼈대이고, 행사별 리포트/상태 요약이 실제 사용자 가치를 만든다.

## 기술 구현 순서
1. 행사 API 연동
   - 일정 가져오기
   - 위치 매핑
2. DB 저장
   - `events` 테이블에 행사 메타 저장
3. 지도 표시
   - 행사 핀 표시
   - 혼잡도 색상과 최근 업데이트 표시
4. 리포트 연결
   - `event_id` 기준으로 상황 공유 연결
   - 최근 리포트 기반 행사 상태 요약 계산

## 다음 구현 체크리스트
- [ ] 홈에 `지금 핫한 곳` 섹션 구현
- [ ] 지도 필터를 `전체 / 행사 / 카페 / 식당 / 공원` 중심으로 재정렬
- [ ] 행사 마커에 현재 상태 뱃지 연결
- [ ] 행사 마커에 `몇 분 전` 업데이트 표시
- [ ] `event_id` 기준 상황 공유 연결
- [ ] 행사 상태 요약(`지금 매우 붐빔`, 추천 시간 등) 설계
- [ ] 행사 상세를 일정 정보보다 현장 상태 카드 중심으로 재구성
- [ ] 지도 주변 관광지 카드 구현
- [ ] 장소 상세 API 3종 연결
- [ ] 앨범 저장 장소와 TourAPI 장소 매칭
- [ ] 수원 기본 필터 적용
- [ ] 키워드 검색을 `/events`, `/map`에 공통 적용
