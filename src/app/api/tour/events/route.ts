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

export async function GET(request: NextRequest) {
  const tourApiKey = process.env.TOURAPI_KEY || process.env.TOURAPI_SERVICE_KEY;
  const baseUrl =
    process.env.TOURAPI_BASE_URL || "https://apis.data.go.kr/B551011/KorService1";

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
  const areaCode = searchParams.get("areaCode");
  const keyword = searchParams.get("keyword");

  try {
    const params = new URLSearchParams({
      serviceKey: tourApiKey,
      MobileApp: "Dongple",
      MobileOS: "ETC",
      _type: "json",
      arrange: "A",
      pageNo: `${pageNo}`,
      numOfRows: `${numOfRows}`,
      eventStartDate,
    });

    if (areaCode) {
      params.set("areaCode", areaCode);
    }

    const endpoint = keyword?.trim() ? "searchKeyword1" : "searchFestival1";

    if (keyword?.trim()) {
      params.set("keyword", keyword.trim());
      params.set("contentTypeId", "15");
    }

    const response = await fetch(`${baseUrl}/${endpoint}?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "TourAPI request failed.", detail: errorText },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const rawItems = payload?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    const normalized = items
      .map((item: TourApiFestivalItem) => ({
        id: item.contentid || `${item.title}-${item.eventstartdate}`,
        title: item.title || "이름 없는 행사",
        category_code: "15",
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
