import { NextRequest, NextResponse } from "next/server";

type TourApiFestivalItem = {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  eventstartdate?: string;
  eventenddate?: string;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
  eventplace?: string;
};

const TOURAPI_PASSTHROUGH_PARAMS = [
  "eventEndDate",
  "areaCode",
  "sigunguCode",
  "lDongRegnCd",
  "lDongSignguCd",
  "lclsSystm1",
  "lclsSystm2",
  "lclsSystm3",
  "contentTypeId",
  "modifiedtime",
];

type TourApiPayload = {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: {
        item?: TourApiFestivalItem | TourApiFestivalItem[];
      };
      totalCount?: number;
    };
  };
};

function toToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function toDisplayDate(value?: string) {
  if (!value || value.length !== 8) return value || "";
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)}`;
}

function toDigits(value?: string) {
  return (value || "").replace(/\D/g, "");
}

function toNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function distanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildDescription(item: TourApiFestivalItem) {
  const parts = [
    item.eventplace ? `행사 장소: ${item.eventplace}` : null,
    item.tel ? `문의: ${item.tel}` : null,
    item.addr1 ? `주소: ${item.addr1}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}

function pickEndpoint(baseUrl: string, keyword?: string | null) {
  const versionSuffix = baseUrl.endsWith("Service2") ? "2" : "1";
  return keyword?.trim()
    ? `searchKeyword${versionSuffix}`
    : `searchFestival${versionSuffix}`;
}

async function fetchTourPayload(
  baseUrl: string,
  endpoint: string,
  serviceKey: string,
  params: URLSearchParams,
) {
  const requestUrl = `${baseUrl}/${endpoint}?serviceKey=${serviceKey}&${params.toString()}`;
  const response = await fetch(requestUrl, { cache: "no-store" });
  const responseText = await response.text();
  console.log(`[TourAPI] ${endpoint} fetch successful: ${responseText.length} bytes`);

  if (!response.ok) {
    console.error("TourAPI request failed:", {
      status: response.status,
      endpoint,
      detail: responseText.slice(0, 300),
    });
    return {
      errorResponse: NextResponse.json(
        { error: "TourAPI request failed.", detail: responseText },
        { status: response.status },
      ),
      payload: null,
    };
  }

  try {
    const payload = JSON.parse(responseText) as TourApiPayload;
    const resultCode = payload?.response?.header?.resultCode;
    if (resultCode && resultCode !== "0000") {
      const resultMsg = payload?.response?.header?.resultMsg || "Unknown TourAPI error";
      console.error("TourAPI result error:", { resultCode, resultMsg });
      return {
        errorResponse: NextResponse.json(
          { error: "TourAPI result error.", detail: resultMsg, resultCode },
          { status: 502 },
        ),
        payload: null,
      };
    }

    return { payload, errorResponse: null };
  } catch {
    console.error("TourAPI returned non-JSON response:", responseText.slice(0, 300));
    return {
      errorResponse: NextResponse.json(
        { error: "TourAPI returned non-JSON response.", detail: responseText },
        { status: 502 },
      ),
      payload: null,
    };
  }
}

function toFestivalItems(payload: TourApiPayload | null) {
  const rawItems = payload?.response?.body?.items?.item;
  return Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
}

function getRegionKeywords(regionName: string | null) {
  if (!regionName) return [];
  const parts = regionName.split(/\s+/).filter(Boolean);
  const candidates = [
    parts.slice(0, 3).join(" "),
    parts.slice(0, 2).join(" "),
    parts[1],
    parts[0],
  ];
  return Array.from(new Set(candidates.filter((value) => value && value.length >= 2)));
}

export async function GET(request: NextRequest) {
  const tourApiKey = process.env.TOURAPI_KEY || process.env.TOURAPI_SERVICE_KEY;
  const baseUrl =
    process.env.TOURAPI_BASE_URL || "https://apis.data.go.kr/B551011/KorService2";

  if (!tourApiKey) {
    return NextResponse.json(
      { error: "TourAPI key is not configured." },
      { status: 503 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const eventStartDate = searchParams.get("eventStartDate") || toToday();
  const today = toToday();
  const pageNo = Number(searchParams.get("pageNo") || "1");
  const numOfRows = Number(searchParams.get("numOfRows") || "20");
  const keyword = searchParams.get("keyword");
  const arrange = searchParams.get("arrange") || "A";
  const mapX = toNumber(searchParams.get("mapX"));
  const mapY = toNumber(searchParams.get("mapY"));
  const radius = Number(searchParams.get("radius") || "25000");
  const regionName = searchParams.get("regionName");

  try {
    const endpoint = pickEndpoint(baseUrl, keyword);
    
    const params = new URLSearchParams({
      MobileApp: "Dongple",
      MobileOS: "ETC",
      _type: "json",
      arrange,
      pageNo: `${pageNo}`,
      numOfRows: `${numOfRows}`,
    });

    // searchFestival만 날짜 기반 검색 지원
    if (endpoint.startsWith("searchFestival")) {
      params.set("eventStartDate", eventStartDate);
    }

    TOURAPI_PASSTHROUGH_PARAMS.forEach((key) => {
      const value = searchParams.get(key);
      if (value) {
        // searchFestival은 contentTypeId를 받지 않음
        if (key === "contentTypeId" && endpoint.startsWith("searchFestival")) return;
        params.set(key, value);
      }
    });

    if (keyword?.trim()) {
      params.set("keyword", keyword.trim());
      // 클라이언트에서 contentTypeId를 명시적으로 보낸 경우에만 설정
      // (전체 탭인 경우 모든 타입을 검색할 수 있도록)
      const ctId = searchParams.get("contentTypeId");
      if (ctId && ctId !== 'all') {
        params.set("contentTypeId", ctId);
      }
    }

    const firstResult = await fetchTourPayload(baseUrl, endpoint, tourApiKey, params);
    if (firstResult.errorResponse) return firstResult.errorResponse;

    const payload = firstResult.payload;
    let items = toFestivalItems(payload);

    if (endpoint.startsWith("searchFestival") && mapX !== null && mapY !== null) {
      const totalCount = payload?.response?.body?.totalCount || items.length;
      const maxPages = Math.min(Math.ceil(totalCount / numOfRows), 5);

      for (let nextPage = pageNo + 1; nextPage <= maxPages; nextPage += 1) {
        const pageParams = new URLSearchParams(params);
        pageParams.set("pageNo", `${nextPage}`);
        const pageResult = await fetchTourPayload(baseUrl, endpoint, tourApiKey, pageParams);
        if (pageResult.errorResponse) break;
        items = items.concat(toFestivalItems(pageResult.payload));
      }
    }

    const requestedCategory = searchParams.get("contentTypeId");
    let normalized = items
      .filter((item) => {
        const endDate = toDigits(item.eventenddate || item.eventstartdate);
        if (!endDate || endDate.length !== 8) return true;
        return endDate >= today;
      })
      .map((item: TourApiFestivalItem) => ({
        id: item.contentid || `${item.title}-${item.eventstartdate}`,
        title: item.title || "이름 없는 행사",
        // 데이터 자체의 contentTypeId가 있으면 사용, 없으면 요청한 카테고리 사용
        category_code: item.contenttypeid || (endpoint.startsWith("searchFestival") ? "15" : requestedCategory || "15"),
        description: buildDescription(item),
        lat: Number(item.mapy || 0),
        lng: Number(item.mapx || 0),
        address: item.addr1 || "",
        event_start_date: toDisplayDate(item.eventstartdate),
        event_end_date: toDisplayDate(item.eventenddate),
        thumbnail_url: item.firstimage || item.firstimage2 || "",
        trust_score: 1,
        meta: item,
        source: "TOURAPI",
      }))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    if (mapX !== null && mapY !== null && Number.isFinite(radius)) {
      normalized = normalized
        .map((item) => ({
          ...item,
          distance: distanceInMeters(mapY, mapX, item.lat, item.lng),
        }))
        .filter((item) => item.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    }

    if (
      normalized.length === 0 &&
      endpoint.startsWith("searchFestival") &&
      mapX !== null &&
      mapY !== null &&
      regionName
    ) {
      const keywordEndpoint = pickEndpoint(baseUrl, regionName);
      const keywordResults = await Promise.all(
        getRegionKeywords(regionName).slice(0, 3).map(async (regionKeyword) => {
          const keywordParams = new URLSearchParams({
            MobileApp: "Dongple",
            MobileOS: "ETC",
            _type: "json",
            arrange: "A",
            pageNo: "1",
            numOfRows: "80",
            keyword: `${regionKeyword} 축제`,
            contentTypeId: "15",
          });
          const keywordResult = await fetchTourPayload(baseUrl, keywordEndpoint, tourApiKey, keywordParams);
          return keywordResult.errorResponse ? [] : toFestivalItems(keywordResult.payload);
        }),
      );

      normalized = keywordResults
        .flat()
        .filter((item) => {
          const endDate = toDigits(item.eventenddate || item.eventstartdate);
          if (!endDate || endDate.length !== 8) return true;
          return endDate >= today;
        })
        .map((item: TourApiFestivalItem) => ({
          id: item.contentid || `${item.title}-${item.eventstartdate}`,
          title: item.title || "이름 없는 행사",
          category_code: item.contenttypeid || "15",
          description: buildDescription(item),
          lat: Number(item.mapy || 0),
          lng: Number(item.mapx || 0),
          address: item.addr1 || "",
          event_start_date: toDisplayDate(item.eventstartdate),
          event_end_date: toDisplayDate(item.eventenddate),
          thumbnail_url: item.firstimage || item.firstimage2 || "",
          trust_score: 1,
          meta: item,
          source: "TOURAPI",
        }))
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
        .map((item) => ({
          ...item,
          distance: distanceInMeters(mapY, mapX, item.lat, item.lng),
        }))
        .filter((item) => item.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    }

    return NextResponse.json({
      items: normalized,
      totalCount: payload?.response?.body?.totalCount || normalized.length,
      configured: true,
    });
  } catch (error) {
    console.error("TourAPI events route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch TourAPI events." },
      { status: 500 },
    );
  }
}
