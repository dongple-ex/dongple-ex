import Script from "next/script";

const NAVER_SDK_URL = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`;

export default function NaverScript() {
    return (
        <Script
            src={NAVER_SDK_URL}
            strategy="beforeInteractive"
        />
    );
}
