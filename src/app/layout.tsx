import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalModalProvider from "@/components/ui/GlobalModalProvider";
import KakaoScript from "@/components/map/KakaoScript";
import NavigationWrapper from "@/components/layout/NavigationWrapper";
import ThemeProvider from "@/components/ui/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "내발문자 – 내 발자국이 머문 자리",
  description: "내발문자는 내가 방문한 장소의 기억과 소식을 기록하고 공유하는 공간입니다. 내 발자국이 머문 자리의 모든 순간을 지금 바로 확인하세요!",
  keywords: ["내발문자", "발자취", "기록", "우리동네", "지역커뮤니티", "실시간정보"],
  metadataBase: new URL('https://dongple.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "내발문자 – 내 발자국이 머문 자리",
    description: "내 주변의 핫플레이스, 행사, 사고 소식까지 이웃들이 실시간으로 전해드립니다.",
    url: 'https://dongple.vercel.app',
    siteName: '내발문자 (Dongple)',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: '내발문자 서비스 메인 이미지',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "내발문자 – 내 발자국이 머문 자리",
    description: "내 주변의 실시간 소식을 가장 빠르게 확인하세요.",
    images: ['/logo.png'],
  },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <KakaoScript />
        <ThemeProvider>
        <GlobalModalProvider>
          <NavigationWrapper>
            {children}
          </NavigationWrapper>
        </GlobalModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
