import { NextRequest, NextResponse } from 'next/server';

const RE = 6371.00877; 
const GRID = 5.0; 
const SLAT1 = 30.0; 
const SLAT2 = 60.0; 
const OLON = 126.0; 
const OLAT = 38.0; 
const XO = 43; 
const YO = 136; 

function convertToGrid(lat: number, lng: number) {
    const DEGRAD = Math.PI / 180.0;
    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;

    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);
    
    let ra = Math.tan(Math.PI * 0.25 + (lat) * DEGRAD * 0.5);
    ra = re * sf / Math.pow(ra, sn);
    let theta = lng * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;
    
    return {
        nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
        ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)
    };
}

// YYYYMMDD, HHMM 형식 날짜 생성
function getBaseTime() {
    const d = new Date();
    // 초단기예보는 45분 이후 발표됨 (따라서 현재 시간 - 1시간 처리가 안전할 수 있으나 간단히 구현)
    d.setMinutes(d.getMinutes() - 45); 
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    
    return {
        base_date: `${year}${month}${day}`,
        base_time: `${hours}30`
    };
}

export async function GET(request: NextRequest) {
    const latStr = request.nextUrl.searchParams.get("lat");
    const lngStr = request.nextUrl.searchParams.get("lng");
    
    const API_KEY = process.env.WEATHER_API_KEY;
    const fallback = { temp: "22°", condition: "맑음", icon: "☀️" };

    if (!API_KEY || !latStr || !lngStr) {
        return NextResponse.json(fallback);
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json(fallback, { status: 400 });
    }

    const { nx, ny } = convertToGrid(lat, lng);
    const { base_date, base_time } = getBaseTime();
    
    try {
        const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?serviceKey=${API_KEY}&pageNo=1&numOfRows=20&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;
        const res = await fetch(url);
        
        if (!res.ok) {
            return NextResponse.json(fallback);
        }

        const data = await res.json();
        const items = data.response?.body?.items?.item || [];

        // 온도(T1H), 하늘상태(SKY), 강수형태(PTY)
        let t1h = "22", sky = "1", pty = "0";

        items.forEach((it: any) => {
            if (it.category === 'T1H') t1h = it.fcstValue;
            if (it.category === 'SKY') sky = it.fcstValue;
            if (it.category === 'PTY') pty = it.fcstValue;
        });

        // 상태 판별
        let condition = "맑음";
        let icon = "☀️";

        if (pty === "1" || pty === "4") {
            condition = "비";
            icon = "🌧️";
        } else if (pty === "2" || pty === "3") {
            condition = "눈";
            icon = "🌨️";
        } else if (sky === "3") {
            condition = "구름많음";
            icon = "⛅";
        } else if (sky === "4") {
            condition = "흐림";
            icon = "☁️";
        }

        return NextResponse.json({
            temp: `${t1h}°`,
            condition,
            icon
        });

    } catch (e) {
        console.error("Weather API Route Error: ", e);
        return NextResponse.json(fallback);
    }
}
