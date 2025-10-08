// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/header";

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
      <body className="antialiased text-zinc-900 bg-white">
        <Header />
        <main>{children}</main>
        <footer className="border-t bg-zinc-50">
          <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-zinc-500">
            <p>© {new Date().getFullYear()} Boost Suite</p>
            <p className="mt-1 text-xs text-zinc-400">
              売れない言葉を、もう一度意味から組み直す。
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
