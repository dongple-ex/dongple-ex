import Script from "next/script";

export default function KakaoScript() {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

    if (!appKey) {
        console.warn("Kakao Map app key is missing in .env.local");
        return null;
    }

    const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;

    return <Script src={KAKAO_SDK_URL} strategy="afterInteractive" />;
}
