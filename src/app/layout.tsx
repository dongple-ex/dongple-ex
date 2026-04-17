import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalModalProvider from "@/components/ui/GlobalModalProvider";
import NaverScript from "@/components/map/NaverScript";
import NavigationWrapper from "@/components/layout/NavigationWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "동플 – 우리 동네 실시간 순간을 기록하고 공유하는 곳",
  description: "동플은 우리 동네의 오늘, 매 순간의 소식을 실시간으로 기록하고 공유하는 지역 밀착형 플랫폼입니다. 만석공원 벚꽃 축제부터 동네 카페 소식까지 지금 바로 확인하세요!",
  keywords: ["동플", "우리동네", "지역커뮤니티", "실시간정보", "동네지도", "동네소식"],
  metadataBase: new URL('https://dongple.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "동플 – 동네의 모든 순간, 바로!",
    description: "내 주변의 핫플레이스, 행사, 사고 소식까지 이웃들이 실시간으로 전해드립니다.",
    url: 'https://dongple.vercel.app',
    siteName: '동플 (Dongple)',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '동플 서비스 메인 이미지',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "동플 – 동네의 모든 순간, 바로!",
    description: "내 주변의 실시간 소식을 가장 빠르게 확인하세요.",
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50`}>
        <NaverScript />
        <GlobalModalProvider>
          <NavigationWrapper>
            {children}
          </NavigationWrapper>
        </GlobalModalProvider>
      </body>
    </html>
  );
}
