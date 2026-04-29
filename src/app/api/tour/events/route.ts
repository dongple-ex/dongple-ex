import { NextRequest, NextResponse } from "next/server";

type TourApiFestivalItem = {
  contentid?: string;
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
  const pageNo = Number(searchParams.get("pageNo") || "1");
  const numOfRows = Number(searchParams.get("numOfRows") || "20");
  const keyword = searchParams.get("keyword");
  const arrange = searchParams.get("arrange") || "A";

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

    const requestUrl = `${baseUrl}/${endpoint}?serviceKey=${tourApiKey}&${params.toString()}`;
    const response = await fetch(requestUrl, {
      cache: "no-store",
    });
    const responseText = await response.text();
    console.log(`[TourAPI] ${endpoint} fetch successful: ${responseText.length} bytes`);

    if (!response.ok) {
      console.error("TourAPI request failed:", {
        status: response.status,
        endpoint,
        detail: responseText.slice(0, 300),
      });
      return NextResponse.json(
        { error: "TourAPI request failed.", detail: responseText },
        { status: response.status },
      );
    }

    let payload: TourApiPayload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      console.error("TourAPI returned non-JSON response:", responseText.slice(0, 300));
      return NextResponse.json(
        { error: "TourAPI returned non-JSON response.", detail: responseText },
        { status: 502 },
      );
    }

    const resultCode = payload?.response?.header?.resultCode;
    if (resultCode && resultCode !== "0000") {
      const resultMsg = payload?.response?.header?.resultMsg || "Unknown TourAPI error";
      console.error("TourAPI result error:", { resultCode, resultMsg });
      return NextResponse.json(
        { error: "TourAPI result error.", detail: resultMsg, resultCode },
        { status: 502 },
      );
    }

    const rawItems = payload?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    const requestedCategory = searchParams.get("contentTypeId");
    const normalized = items
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
