import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalModalProvider from "@/components/ui/GlobalModalProvider";
import KakaoScript from "@/components/map/KakaoScript";
import NavigationWrapper from "@/components/layout/NavigationWrapper";
import ThemeProvider from "@/components/ui/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "내발문자 | 발견하고 기록하는 동네 생활 지도",
  description:
    "동네의 행사, 장소, 현장 상태를 빠르게 확인하고 나중에 다시 가고 싶은 곳을 기록하는 생활 지도 서비스입니다.",
  keywords: ["내발문자", "동네 소식", "현장 상태", "장소 기록", "생활 지도"],
  metadataBase: new URL("https://dongple.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "내발문자",
    description: "발견한 장소와 지금의 현장 상태를 함께 저장하는 동네 생활 지도.",
    url: "https://dongple.vercel.app",
    siteName: "내발문자",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "내발문자 서비스 이미지",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "내발문자",
    description: "동네 소식, 지도, 기록을 한 번에 확인하세요.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <KakaoScript />
        <ThemeProvider>
          <GlobalModalProvider>
            <NavigationWrapper>{children}</NavigationWrapper>
          </GlobalModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
