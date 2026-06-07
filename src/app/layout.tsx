import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalModalProvider from "@/components/ui/GlobalModalProvider";
import KakaoScript from "@/components/map/KakaoScript";
import NavigationWrapper from "@/components/layout/NavigationWrapper";
import ThemeProvider from "@/components/ui/ThemeProvider";
import InterestPlaceNotificationWatcher from "@/features/notifications/components/InterestPlaceNotificationWatcher";
import NotificationInitializer from "@/features/notifications/components/NotificationInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "동플 | 우리 동네 순간을 기록하자",
  description: "우리 동네 순간을 기록하자. 동네의 행사, 장소, 현장 상황을 공유하는 서비스입니다.",
  keywords: ["동플", "내발문자", "동네 소식", "현장 상태", "장소 기록", "생활 지도"],
  metadataBase: new URL("https://dongple.kr"),
  icons: {
    icon: [{ url: "/logo_s.png", type: "image/png" }],
    shortcut: [{ url: "/logo_s.png", type: "image/png" }],
    apple: [{ url: "/logo_s.png", type: "image/png" }],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "동플",
    description: "우리 동네 순간을 기록하자.",
    url: "https://dongple.kr",
    siteName: "동플",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "동플 서비스 이미지",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "동플",
    description: "우리 동네 순간을 기록하자.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <KakaoScript />
        <ThemeProvider>
          <NotificationInitializer />
          <InterestPlaceNotificationWatcher />
          <GlobalModalProvider>
            <NavigationWrapper>{children}</NavigationWrapper>
          </GlobalModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
