import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import Header from "@/components/layout/Header";
import GlobalModalProvider from "@/components/ui/GlobalModalProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "동플 - 동네 생활에 정보를 더하다",
  description: "시니어와 주니어를 위한 맞춤형 동네 생활 커뮤니티",
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

import NaverScript from "@/components/map/NaverScript";

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
          <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto min-h-screen bg-white shadow-sm flex flex-col relative pb-16">
            <Header />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
            <BottomNav />
          </div>
        </GlobalModalProvider>
      </body>
    </html>
  );
}
