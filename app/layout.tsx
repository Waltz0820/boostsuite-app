// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

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
        <header className="border-b">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              {/* public/logo.png を置けば表示されます */}
              <Image src="/logo.png" alt="Boost Suite" width={140} height={28} priority />
              <span className="sr-only">Boost Suite</span>
              {/* public/logo.png を /public に配置（例：幅160px・高さ32px） */}
<Image
  src="/logo.png"
  alt="Boost Suite ロゴ"
  width={160}
  height={32}
  className="h-8 w-auto"
  priority
/>
<span className="sr-only">Boost Suite</span>
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/tool" className="hover:opacity-70">ツール</Link>
              <Link href="/pricing" className="hover:opacity-70">価格</Link>
              <Link href="/column" className="hover:opacity-70">コラム</Link>
              <a
                href="/tool?from=header"
                className="px-3 py-1.5 rounded-md bg-zinc-900 text-white hover:opacity-90"
              >
                今すぐ試す
              </a>
            </nav>
          </div>
        </header>
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
