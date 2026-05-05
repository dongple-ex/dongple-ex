import { NextRequest, NextResponse } from "next/server";

type TourApiPlaceItem = {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
  dist?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  areacode?: string;
  sigungucode?: string;
  createdtime?: string;
  modifiedtime?: string;
  eventstartdate?: string;
  eventenddate?: string;
  zipcode?: string;
};

function toDisplayDate(value?: string) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

export async function GET(request: NextRequest) {
  const tourApiKey = process.env.TOURAPI_KEY || process.env.TOURAPI_SERVICE_KEY;
  const baseUrl = process.env.TOURAPI_BASE_URL || "https://apis.data.go.kr/B551011/KorService2";

  if (!tourApiKey) {
    return NextResponse.json({ error: "TourAPI key is not configured." }, { status: 503 });
  }

  const searchParams = request.nextUrl.searchParams;
  const contentTypeId = searchParams.get("contentTypeId");
  const radius = searchParams.get("radius") || "3000"; // 기본 3km 반경
  // 기준점: 수원시 정자동 부근
  const mapX = searchParams.get("mapX") || "126.992";
  const mapY = searchParams.get("mapY") || "37.295";
  const pageNo = searchParams.get("pageNo") || "1";
  const numOfRows = searchParams.get("numOfRows") || "10";

  try {
    const params = new URLSearchParams({
      MobileApp: "Dongple",
      MobileOS: "ETC",
      _type: "json",
      mapX,
      mapY,
      radius,
      pageNo,
      numOfRows,
      arrange: "Q", // Q: 이미지 있는 것 우선 (보통 추천/최신)
    });

    if (contentTypeId) {
      params.set("contentTypeId", contentTypeId);
    }

    const requestUrl = `${baseUrl}/locationBasedList2?serviceKey=${tourApiKey}&${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(requestUrl, { cache: "no-store", signal: controller.signal })
      .finally(() => clearTimeout(timeoutId));
    const responseText = await response.text();

    if (!response.ok) {
      console.error("TourAPI places request failed:", response.status, responseText.slice(0, 300));
      return NextResponse.json({ error: "TourAPI request failed" }, { status: response.status });
    }

    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON response" }, { status: 502 });
    }

    const resultCode = payload?.response?.header?.resultCode;
    if (resultCode && resultCode !== "0000") {
      return NextResponse.json({ error: "TourAPI Error", resultCode }, { status: 502 });
    }

    const rawItems = payload?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    const apiInfo = {
      provider: "TOURAPI",
      endpoint: "locationBasedList2",
      baseUrl,
      params: Object.fromEntries(params.entries()),
      resultCode,
      totalCount: payload?.response?.body?.totalCount || items.length,
    };

    // NewsCard가 사용하는 Post 형식으로 변환 (MockPost 형태)
    const normalized = items.map((item: TourApiPlaceItem, idx) => ({
      id: `tour-place-${item.contentid || idx}`,
      title: item.title || "이름 없는 장소",
      content: [
        item.addr1 ? `📍 ${item.addr1}` : null,
        item.tel ? `📞 ${item.tel}` : null,
        item.dist ? `🚶 거리: 약 ${Math.round(Number(item.dist))}m` : null,
      ].filter(Boolean).join("\n") || "상세 정보가 없습니다.",
      category: contentTypeId || "기타",
      post_type: 'post', // 'rss'나 'post' 모두 가능
      image_url: item.firstimage || item.firstimage2 || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80", // fallback image
      created_at: new Date().toISOString(), // Mock 데이터처럼 현재 시간 사용
      event_start_date: toDisplayDate(item.eventstartdate),
      event_end_date: toDisplayDate(item.eventenddate),
      likes_count: Math.floor(Math.random() * 20), // 가짜 좋아요 수
      comments_count: Math.floor(Math.random() * 5),
      score: 0.8,
      user_id: null,
      public_id: null,
      is_anonymous: false,
      source: "TOURAPI",
      meta: item,
      api_info: apiInfo,
      address: item.addr1 || "",
      latitude: item.mapy ? Number(item.mapy) : null,
      longitude: item.mapx ? Number(item.mapx) : null,
    })).filter(item => {
      // WGS84 한국 범위 내 인지 확인 (KTM 좌표 등 제외)
      const lat = item.latitude;
      const lng = item.longitude;
      return lat !== null && lng !== null && lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
    });

    return NextResponse.json({
      items: normalized,
      totalCount: payload?.response?.body?.totalCount || normalized.length,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("TourAPI places request timed out");
      return NextResponse.json(
        {
          items: [],
          totalCount: 0,
          error: "TourAPI places request timed out.",
        },
        { status: 200 },
      );
    }

    console.error("TourAPI places route error:", error);
    return NextResponse.json({ error: "Failed to fetch TourAPI places." }, { status: 500 });
  }
}
