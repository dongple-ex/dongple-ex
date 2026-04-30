import { NextRequest, NextResponse } from "next/server";

type TourItem = Record<string, unknown>;

type TourPayload = {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: {
        item?: TourItem | TourItem[];
      };
      totalCount?: number;
    };
  };
};

function toItems(payload: TourPayload) {
  const rawItems = payload?.response?.body?.items?.item;
  return Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stripHtml(value: unknown) {
  return text(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstNonEmpty(...values: unknown[]) {
  return values.map(text).find(Boolean) || "";
}

function formatDate(value: unknown) {
  const raw = text(value).replace(/\D/g, "");
  if (raw.length !== 8) return text(value);
  return `${raw.slice(0, 4)}.${raw.slice(4, 6)}.${raw.slice(6, 8)}`;
}

function compactSummary(value: unknown) {
  const clean = stripHtml(value).replace(/\s+/g, " ");
  if (!clean) return "";

  const sentences = clean
    .split(/(?<=[.!?。])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const summary = (sentences.length > 1 ? sentences.slice(0, 2).join(" ") : clean).trim();

  if (summary.length <= 170) return summary;
  return `${summary.slice(0, 170).replace(/\s+\S*$/, "")}...`;
}

function row(key: string, label: string, value: string) {
  return { key, label, value };
}

function buildHighlights(common: TourItem, intro: TourItem, contentTypeId: string) {
  const period = [formatDate(intro.eventstartdate), formatDate(intro.eventenddate)].filter(Boolean).join(" ~ ");
  const address = firstNonEmpty(common.addr1, common.addr2);

  const commonRows = [
    row("place", "장소", firstNonEmpty(intro.eventplace, address)),
    row("contact", "문의", firstNonEmpty(intro.sponsor1tel, intro.infocenter, common.tel)),
  ];

  const byType: Record<string, Array<{ key: string; label: string; value: string }>> = {
    "12": [
      row("time", "이용 시간", firstNonEmpty(intro.usetime, intro.usetimeculture)),
      row("rest", "쉬는 날", firstNonEmpty(intro.restdate, intro.restdateculture)),
      row("parking", "주차", firstNonEmpty(intro.parking, intro.parkingculture)),
      row("experience", "체험 안내", firstNonEmpty(intro.expguide, intro.expagerange)),
    ],
    "14": [
      row("time", "이용 시간", firstNonEmpty(intro.usetimeculture, intro.usetime)),
      row("fee", "요금", firstNonEmpty(intro.usefee, intro.usetimefestival)),
      row("rest", "쉬는 날", firstNonEmpty(intro.restdateculture, intro.restdate)),
      row("parking", "주차", firstNonEmpty(intro.parkingculture, intro.parking)),
    ],
    "15": [
      row("period", "기간", period),
      row("place", "장소", firstNonEmpty(intro.eventplace, address)),
      row("time", "시간", firstNonEmpty(intro.playtime, intro.usetimefestival, intro.usetime)),
      row("fee", "요금", firstNonEmpty(intro.usetimefestival, intro.usefee, intro.discountinfofestival)),
      row("parking", "주차", firstNonEmpty(intro.parking, intro.parkingfestival)),
      row("contact", "문의", firstNonEmpty(intro.sponsor1tel, intro.infocenter, common.tel)),
      row("age", "이용 연령", firstNonEmpty(intro.agelimit, intro.expagerange)),
      row("duration", "소요 시간", firstNonEmpty(intro.spendtimefestival, intro.spendtime)),
    ],
    "28": [
      row("time", "이용 시간", firstNonEmpty(intro.usetimeleports, intro.usetime)),
      row("fee", "요금", firstNonEmpty(intro.usefeeleports, intro.usefee)),
      row("rest", "쉬는 날", firstNonEmpty(intro.restdateleports, intro.restdate)),
      row("parking", "주차", firstNonEmpty(intro.parkingleports, intro.parking)),
    ],
    "38": [
      row("time", "영업 시간", firstNonEmpty(intro.opentime, intro.usetime)),
      row("rest", "쉬는 날", firstNonEmpty(intro.restdateshopping, intro.restdate)),
      row("items", "판매 품목", firstNonEmpty(intro.saleitem, intro.saleitemcost)),
      row("parking", "주차", firstNonEmpty(intro.parkingshopping, intro.parking)),
    ],
    "39": [
      row("menu", "대표 메뉴", firstNonEmpty(intro.firstmenu, intro.treatmenu)),
      row("time", "영업 시간", firstNonEmpty(intro.opentimefood, intro.opentime)),
      row("rest", "쉬는 날", firstNonEmpty(intro.restdatefood, intro.restdate)),
      row("parking", "주차", firstNonEmpty(intro.parkingfood, intro.parking)),
    ],
  };

  const rows = byType[contentTypeId] || [
    row("period", "기간", period),
    row("time", "시간", firstNonEmpty(intro.playtime, intro.usetime, intro.usetimefestival)),
    row("fee", "요금", firstNonEmpty(intro.usetimefestival, intro.usefee, intro.discountinfofestival)),
    row("parking", "주차", firstNonEmpty(intro.parking, intro.parkingculture, intro.parkingfood)),
    ...commonRows,
  ];

  return rows
    .concat(commonRows)
    .filter((item, index, source) => item.value && source.findIndex((rowItem) => rowItem.key === item.key) === index);
}

function buildFallbackSummary(common: TourItem, intro: TourItem, contentTypeId: string) {
  const title = firstNonEmpty(common.title);
  const place = firstNonEmpty(intro.eventplace, common.addr1);
  const period = [formatDate(intro.eventstartdate), formatDate(intro.eventenddate)].filter(Boolean).join(" ~ ");
  const menu = firstNonEmpty(intro.firstmenu, intro.treatmenu);
  const time = firstNonEmpty(intro.playtime, intro.usetimefestival, intro.usetime, intro.opentimefood, intro.opentime);

  if (contentTypeId === "15") {
    return [
      title ? `${title}은 공식 축제 정보로 확인된 행사입니다.` : "공식 축제 정보로 확인된 행사입니다.",
      period ? `일정은 ${period}입니다.` : "",
      place ? `장소는 ${place}입니다.` : "",
    ].filter(Boolean).join(" ");
  }

  if (contentTypeId === "39") {
    return [
      title ? `${title}은 주변 음식점 정보입니다.` : "주변 음식점 정보입니다.",
      menu ? `대표 메뉴는 ${menu}입니다.` : "",
      time ? `운영 시간은 ${time}입니다.` : "",
      place ? `위치는 ${place}입니다.` : "",
    ].filter(Boolean).join(" ");
  }

  return [
    title ? `${title}의 공식 기본 정보입니다.` : "공식 기본 정보입니다.",
    place ? `위치는 ${place}입니다.` : "",
    time ? `이용 시간은 ${time}입니다.` : "",
  ].filter(Boolean).join(" ");
}

async function fetchTourEndpoint(baseUrl: string, serviceKey: string, endpoint: string, params: URLSearchParams) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  const requestUrl = `${baseUrl}/${endpoint}?serviceKey=${serviceKey}&${params.toString()}`;
  const response = await fetch(requestUrl, { cache: "no-store", signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`${endpoint} request failed: ${response.status}`);
  }

  const payload = JSON.parse(responseText) as TourPayload;
  const resultCode = payload?.response?.header?.resultCode;
  if (resultCode && resultCode !== "0000") {
    const resultMsg = payload?.response?.header?.resultMsg || "Unknown TourAPI error";
    throw new Error(`${endpoint} result error: ${resultMsg}`);
  }

  return toItems(payload);
}

export async function GET(request: NextRequest) {
  const serviceKey = process.env.TOURAPI_KEY || process.env.TOURAPI_SERVICE_KEY;
  const baseUrl = process.env.TOURAPI_BASE_URL || "https://apis.data.go.kr/B551011/KorService2";

  if (!serviceKey) {
    return NextResponse.json({ error: "TourAPI key is not configured." }, { status: 503 });
  }

  const searchParams = request.nextUrl.searchParams;
  const contentId = searchParams.get("contentId");
  const contentTypeId = searchParams.get("contentTypeId") || "";

  if (!contentId) {
    return NextResponse.json({ error: "contentId is required." }, { status: 400 });
  }

  const commonParams = new URLSearchParams({
    MobileApp: "Dongple",
    MobileOS: "ETC",
    _type: "json",
    contentId,
    defaultYN: "Y",
    firstImageYN: "Y",
    areacodeYN: "Y",
    catcodeYN: "Y",
    addrinfoYN: "Y",
    mapinfoYN: "Y",
    overviewYN: "Y",
  });

  const typedParams = new URLSearchParams({
    MobileApp: "Dongple",
    MobileOS: "ETC",
    _type: "json",
    contentId,
    contentTypeId,
  });

  const imageParams = new URLSearchParams({
    MobileApp: "Dongple",
    MobileOS: "ETC",
    _type: "json",
    contentId,
    imageYN: "Y",
    subImageYN: "Y",
    numOfRows: "10",
    pageNo: "1",
  });

  try {
    const [commonItems, introItems, infoItems, imageItems] = await Promise.all([
      fetchTourEndpoint(baseUrl, serviceKey, "detailCommon2", commonParams).catch(() => []),
      contentTypeId ? fetchTourEndpoint(baseUrl, serviceKey, "detailIntro2", typedParams).catch(() => []) : Promise.resolve([]),
      contentTypeId ? fetchTourEndpoint(baseUrl, serviceKey, "detailInfo2", typedParams).catch(() => []) : Promise.resolve([]),
      fetchTourEndpoint(baseUrl, serviceKey, "detailImage2", imageParams).catch(() => []),
    ]);

    const common = commonItems[0] || {};
    const intro = introItems[0] || {};
    const info = infoItems
      .map((item) => ({
        name: firstNonEmpty(item.infoname, item.serialnum),
        text: stripHtml(item.infotext),
      }))
      .filter((item) => item.name || item.text);
    const images = imageItems
      .map((item) => firstNonEmpty(item.originimgurl, item.smallimageurl))
      .filter(Boolean);

    const summary = compactSummary(common.overview) || buildFallbackSummary(common, intro, contentTypeId);

    return NextResponse.json({
      title: firstNonEmpty(common.title),
      summary,
      overview: stripHtml(common.overview),
      highlights: buildHighlights(common, intro, contentTypeId),
      info,
      images,
      common,
      intro,
      source: "TOURAPI",
    });
  } catch (error) {
    console.error("TourAPI detail route error:", error);
    return NextResponse.json({ error: "Failed to fetch TourAPI detail." }, { status: 500 });
  }
}
