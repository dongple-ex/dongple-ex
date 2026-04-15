# [동플 허브] 외부 API 연동 및 기능 확장 지침서 (TourAPI 4.0)

- **문서 위치**: `C:\dongple_workspace\dongple\FD\dongple_tourapi_integration.md`
- **작성일**: 2026-04-15
- **대상**: 시니어 개발자 및 시스템 설계자

---

## 1. 개요

본 문서는 **동플 허브(Dongple Hub)**의 핵심 가치인 **지역 실시간성**과 **데이터 신뢰성**을 극대화하기 위해  
**한국관광공사 TourAPI 4.0**을 시스템에 통합하는 기술적 지침을 제공한다.

TourAPI는 공식 관광 데이터를 제공하는 **Ground Truth Source**로 활용되며,  
사용자 제보 기반 데이터의 신뢰도 보정 및 기능 확장을 목적으로 한다.

---

## 2. 모듈별 통합 전략

### 2.1 Collector (수집 모듈)

TourAPI 공식 데이터를 실시간 스트림의 기반(Ground Truth)으로 활용한다.

- **주요 대상 API**
  - `searchFestival` (행사 / 축제 정보)

- **수집 파이프라인**
  - **Batch Job**
    - 매일 00:05 시각 기준
    - 당일 유효한 지역 축제 정보 호출
    - **오류 처리**: API 호출 실패 시 최대 3회 재시도(Retry)
    - **배치 모니터링**: 
      - 최종 실패 시 Slack/Discord Webhook을 통해 실시간 알림 발송
      - 알림 포함 데이터: `Error Code`, `Target API`, `Execution Time`, `Stack Trace` (요약)
  - **Raw Data 적재**
    - 테이블: `raw_items`
    - 조건: `source = 'TOURAPI'`
  - **Pre-processing**
    - `eventstartdate`, `eventenddate` 파싱
    - 이벤트 노출 생명주기(TTL) 자동 산정 및 부여

---

### 2.2 Classifier (분류 및 신뢰도 산정)

사용자 제보 데이터와 공식 데이터를 매칭하여 **신뢰도(Trust Score)** 를 보정한다.

- **주요 대상 API**
  - `searchKeyword` (키워드 검색)
  - `locationBasedList` (위치 기반 조회)

- **신뢰도 보정 로직**
  - 사용자가 제보한 장소가 TourAPI의 `contentId`와 매칭될 경우
    - 해당 이벤트의 **Trust Score +0.2 가산**
  - 허위 제보 또는 운영 종료 장소로 공식 데이터와 충돌할 경우
    - 해당 이벤트의 **Trust Score -0.5 감산 또는 비노출 처리**
  - TourAPI에서 제공하는 `firstimage`를 제보 콘텐츠에 결합
    - 사용자 경험(UX) 및 신뢰도 시각적 강화
  - **Geofencing 기반 위치 보정**
    - 사용자 제보 좌표와 TourAPI 공식 좌표가 반경 **50m~100m 이내**일 경우 동일 장소로 간주
    - **정합성 우선순위**: 장소의 공식 명칭 및 좌표는 TourAPI(`Ground Truth`) 데이터를 우선 적용하여 마스터 데이터 상향 평준화

---

### 2.3 Analytics (통계 및 트렌드 분석)

지역 내 유동 흐름 및 관심사 변화를 분석하기 위한 정형 데이터 소스로 활용한다.

- **연동 API**
  - `getAreaBasedList` (지역 기반 관광 정보)

- **분석 모델**
  - **지역 밀집도 분석**
    - 특정 관광지 반경 1km 내
    - 실시간 사용자 제보 빈도 계산
    - 결과 상태값: `혼잡 / 보통 / 여유`
  - **카테고리 트렌드 분석**
    - 동네별 인기 장소 카테고리
      - 맛집 / 문화시설 / 자연 / 체험 등
    - 사용자 행동 데이터와 매칭하여 트렌드 산출

---

## 3. 데이터 모델 확장 설계

| 테이블 | 필드명 | 타입 | 설명 |
|------|------|------|------|
| events_ext | event_id | BIGINT | `events` 테이블과의 연결 키(FK) |
| events_ext | source | VARCHAR | 데이터 출처 (예: `TourAPI`) |
| events_ext | ext_id | VARCHAR | TourAPI 고유 번호 (`contentId`) |
| events_ext | meta | JSONB | 운영시간, 주차 여부, 반려동물 동반 등 상세 메타 |
| places | category_code | VARCHAR | TourAPI 대/중/소 분류 코드 매핑 |

> **Note**  
> `meta(JSONB)` 필드는 향후 장애인 편의시설, 예약 필요 여부 등 확장 필드를 고려해 유연하게 설계한다.

### 3.1 카테고리 매핑 전략
TourAPI의 3단계 분류(`cat1, cat2, cat3`)를 동플 내부 `category_code`로 변환하는 정규화 과정을 거친다.

| TourAPI (cat3) | 동플 (category_code) | 비고 |
|:---|:---|:---|
| `A02010100` (산) | `CAT_NATURE` | 자연/휴양 |
| `A05020100` (한식) | `CAT_FOOD` | 음식점 통합 |
| `A02080100` (전시관) | `CAT_CULTURE` | 문화시설 |

---

## 4. 핵심 특화 기능 구현

### A. 무장애(Barrier-free) 실시간 정보

- **기능 목적**
  - 휠체어·유모차 이용자가 안심하고 이동할 수 있는 지역 정보 제공

- **연동 API**
  - `detailWithTour` (무장애 여행 정보)

- **활용 방식**
  - 제보 리스트 상단
    - ✅ `무장애 인증 장소` 필터링 칩 제공
  - 장소 상세 페이지
    - 장애인 편의시설 여부 명시

---

### B. 반려동물 친화 지역 인증

- **기능 목적**
  - 반려동물과 함께 활동 가능한 지역 내 핫플레이스 공유

- **연동 API**
  - `detailPetTour` (반려동물 동반 정보)

- **활용 방식**
  - 제보 콘텐츠 내
    - 🐶 `반려동물 동반 가능` 아이콘 자동 태깅
  - 지도 및 리스트 필터 조건으로 활용 가능

---

## 5. 구현 시 주의사항 (Developer Notes)

### 캐싱 전략 (Caching)

- TourAPI 응답 지연 최소화를 위해 **Redis 캐싱 적용**
- 대상:
  - 지역 코드
  - 장소 기본 정보
- 캐시 TTL: **24시간**
- **Cache Miss 처리**: 
  - Redis 조회 실패 시 TourAPI 실시간 호출 후 그 결과를 Redis에 적재 (Read-Through 방식 적용)

---

### 트래픽 최적화

- ✅ 클라이언트 직접 호출 **금지**
- Backend Proxy를 통해:
  - API Key 은닉
  - 호출 횟수 제어 및 Rate Limit 적용

---

### 저작권 및 콘텐츠 정책

- 이미지 사용 시:
  - `copyright_type`
  - `originimgurl` 메타 필드 반드시 확인
- UI 상:
  - 출처 문구 노출 필수 (한국관광공사 TourAPI)

### 보안 및 Secret 관리
- **API Key 보호**: `.env` 파일 또는 시스템 환경 변수(`Secret Manager`)를 통해 관리하고 소스 코드 내 하드코딩 절대 금지
- **Key 로테이션**: 보안 침해 방지를 위해 분기별 Key 로테이션 및 Quota 초과 대비 예비 Key(Back-up) 확보

### 이미지 최적화 및 트래픽 절감
- `originimgurl` 직접 링크 지양
- Backend Proxy에서 이미지 리사이징(예: `WebP` 변환) 및 **CDN/S3 캐싱** 후 클라이언트에 제공 권장

---

## 6. 배치 에러 복구 전략 (Recovery Strategy)

사용자가 원활하게 데이터를 이용할 수 있도록 배치 장애 시 다음과 같은 복구 절차를 따른다.

1. **자동 복구**: 네트워크 일시 오류 시 Exponential Backoff 전략 기반 재시도
2. **수동 복구**: 
   - 관리자 대시보드 내 `Batch Force Run` 기능 제공
   - 특정 `contentId` 또는 `areaCode` 단위의 부분 업데이트 지원
3. **Fallback성 데이터**: 
   - TourAPI 연동 실패 시, 기존에 적재된 최신 캐시 데이터를 연장하여 노출(Stale-While-Revalidate)

---

## 부록

- TourAPI 4.0 공식 문서:
  - <https://apis.data.go.kr/B551011/KorService1>
