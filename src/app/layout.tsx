import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalModalProvider from "@/components/ui/GlobalModalProvider";
import NaverScript from "@/components/map/NaverScript";
import NavigationWrapper from "@/components/layout/NavigationWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "동플",
  description: "지금 이순근, 우리동네에 무슨 일이? 우리 동네의 순간을 기록하세요.",
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
