import Script from "next/script";

export default function NaverScript() {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

    if (!clientId) {
        console.warn('⚠️ Naver Map Client ID is missing in .env.local');
        return null;
    }

    const NAVER_SDK_URL = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder,transcoord`;
    
    console.log('Naver Maps SDK URL:', NAVER_SDK_URL);

    return (
        <Script
            src={NAVER_SDK_URL}
            strategy="afterInteractive"
        />
    );
}
