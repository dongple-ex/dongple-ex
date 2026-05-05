import { NextRequest, NextResponse } from "next/server";

const RE = 6371.00877;
const GRID = 5.0;
const SLAT1 = 30.0;
const SLAT2 = 60.0;
const OLON = 126.0;
const OLAT = 38.0;
const XO = 43;
const YO = 136;
const WEATHER_SERVICE_URL =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";

const FALLBACK_WEATHER = {
  temp: "22°",
  condition: "맑음",
  icon: "☀️",
  source: "fallback",
  isFallback: true,
};

interface WeatherApiItem {
  category: string;
  fcstValue: string;
}

interface WeatherApiResponse {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: {
        item?: WeatherApiItem[] | WeatherApiItem;
      };
    };
  };
}

function convertToGrid(lat: number, lng: number) {
  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

function getBaseTime() {
  const baseDate = new Date(Date.now() - 45 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(baseDate);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    base_date: `${byType.year}${byType.month}${byType.day}`,
    base_time: `${byType.hour}30`,
  };
}

function getWeatherApiKey() {
  return (
    process.env.WEATHER_API_KEY ||
    process.env.DATA_GO_KR_SERVICE_KEY ||
    process.env.TOURAPI_KEY ||
    ""
  );
}

function normalizeServiceKey(key: string) {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function getWeatherState(sky: string, pty: string) {
  if (pty === "1" || pty === "4") {
    return { condition: "비", icon: "🌧️" };
  }
  if (pty === "2" || pty === "3") {
    return { condition: "눈", icon: "🌨️" };
  }
  if (sky === "3") {
    return { condition: "구름많음", icon: "⛅" };
  }
  if (sky === "4") {
    return { condition: "흐림", icon: "☁️" };
  }
  return { condition: "맑음", icon: "☀️" };
}

function toWeatherItems(items: WeatherApiItem[] | WeatherApiItem | undefined) {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

function fallback(status = 200) {
  return NextResponse.json(FALLBACK_WEATHER, { status });
}

export async function GET(request: NextRequest) {
  const latStr = request.nextUrl.searchParams.get("lat");
  const lngStr = request.nextUrl.searchParams.get("lng");
  const apiKey = getWeatherApiKey();

  if (!apiKey || !latStr || !lngStr) {
    return fallback();
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fallback(400);
  }

  const { nx, ny } = convertToGrid(lat, lng);
  const { base_date, base_time } = getBaseTime();
  const url = new URL(WEATHER_SERVICE_URL);
  url.search = new URLSearchParams({
    serviceKey: normalizeServiceKey(apiKey),
    pageNo: "1",
    numOfRows: "20",
    dataType: "JSON",
    base_date,
    base_time,
    nx: String(nx),
    ny: String(ny),
  }).toString();

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });

    if (!res.ok) {
      return fallback();
    }

    const data = (await res.json()) as WeatherApiResponse;
    const resultCode = data.response?.header?.resultCode;
    if (resultCode && resultCode !== "00") {
      return fallback();
    }

    const items = toWeatherItems(data.response?.body?.items?.item);
    let t1h = "22";
    let sky = "1";
    let pty = "0";

    items.forEach((item) => {
      if (item.category === "T1H") t1h = item.fcstValue;
      if (item.category === "SKY") sky = item.fcstValue;
      if (item.category === "PTY") pty = item.fcstValue;
    });

    const { condition, icon } = getWeatherState(sky, pty);

    return NextResponse.json({
      temp: `${t1h}°`,
      condition,
      icon,
      source: "kma",
      isFallback: false,
      baseDate: base_date,
      baseTime: base_time,
    });
  } catch (error) {
    console.error("Weather API Route Error: ", error);
    return fallback();
  }
}
