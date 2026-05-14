import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const tourApiKey = process.env.TOURAPI_KEY || process.env.TOURAPI_SERVICE_KEY;
  const baseUrl = process.env.TOURAPI_BASE_URL || "https://apis.data.go.kr/B551011/KorService2";

  if (!tourApiKey) {
    return NextResponse.json({ error: "TourAPI key is not configured." }, { status: 503 });
  }

  const searchParams = request.nextUrl.searchParams;
  const mapX = searchParams.get("mapX");
  const mapY = searchParams.get("mapY");
  const radius = searchParams.get("radius") || "2000";
  const contentTypeId = searchParams.get("contentTypeId") || "";

  if (!mapX || !mapY) {
    return NextResponse.json({ error: "mapX and mapY are required." }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      MobileApp: "Dongple",
      MobileOS: "ETC",
      _type: "json",
      mapX,
      mapY,
      radius,
      arrange: "A", // 제목순
      pageNo: "1",
      numOfRows: "50",
    });

    if (contentTypeId && contentTypeId !== "all") {
      params.set("contentTypeId", contentTypeId);
    }

    const requestUrl = `${baseUrl}/locationBasedList2?serviceKey=${tourApiKey}&${params.toString()}`;
    const response = await fetch(requestUrl, { cache: "no-store" });
    const responseText = await response.text();

    if (!response.ok) {
        return NextResponse.json({ error: "TourAPI request failed" }, { status: response.status });
    }

    const payload = JSON.parse(responseText);
    const resultCode = payload?.response?.header?.resultCode;
    
    if (resultCode && resultCode !== "0000") {
        return NextResponse.json({ error: "TourAPI result error", detail: payload?.response?.header?.resultMsg }, { status: 502 });
    }

    const rawItems = payload?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized = items.map((item: any) => ({
      id: item.contentid,
      title: item.title,
      category_code: item.contenttypeid,
      description: item.addr1 ? `주소: ${item.addr1}` : "",
      lat: Number(item.mapy || 0),
      lng: Number(item.mapx || 0),
      address: item.addr1 || "",
      thumbnail_url: item.firstimage || item.firstimage2 || "",
      distance: Number(item.dist || 0),
      source: "TOURAPI",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })).filter((item: any) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    return NextResponse.json({ items: normalized, totalCount: payload?.response?.body?.totalCount || normalized.length });
  } catch (err) {
    console.error("Location API error:", err);
    return NextResponse.json({ error: "Failed to fetch location based list" }, { status: 500 });
  }
}
