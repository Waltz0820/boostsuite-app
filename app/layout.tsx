// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/header";
import Footer from "./components/footer";
import CtaBar from "./components/cta-bar";

export const metadata: Metadata = {
  title: "Boost Suite｜売れない言葉を、もう一度意味から組み直す",
  description:
    "中韓英の原文から“刺さる日本語”へ。薬機/景表フィルター適用、セーフ/攻めの2案、CS Boostでアフターも整流。",
  openGraph: {
    title: "Boost Suite｜売れない言葉を、もう一度意味から組み直す",
    description:
      "中韓英の原文から“刺さる日本語”へ。薬機/景表フィルター適用、セーフ/攻めの2案、CS Boostでアフターも整流。",
    url: "https://boostsuite-app.vercel.app/",
    siteName: "Boost Suite",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Boost Suite" }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen flex flex-col antialiased text-zinc-900 bg-white">
        {/* 固定ヘッダー */}
        <Header />

        {/* メインコンテンツ */}
        <main className="flex-1">{children}</main>

        {/* 共通フッター */}
        <Footer />

        <CtaBar />
      </body>
    </html>
  );
}
