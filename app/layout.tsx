// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boost Suite | 売れない言葉を、もう一度意味から組み直す",
  description:
    "日本市場に最適化された“売れる日本語”を自動構築。EC説明文・LP・CSまで一気通貫で整流。",
  // public/favicon.ico がある前提（app/favicon.ico でも可）
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased text-zinc-900 bg-white">
        <header className="border-b">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <div className="font-semibold">Boost Suite</div>
            <nav className="flex gap-6 text-sm">
              <Link href="/tool" className="hover:opacity-70">
                ツール
              </Link>
              <Link href="/pricing" className="hover:opacity-70">
                価格
              </Link>
              <Link href="/column" className="hover:opacity-70">
                コラム
              </Link>
              <a
                href="https://boostsuite-app.vercel.app/"
                className="px-3 py-1.5 rounded-md bg-zinc-900 text-white hover:opacity-90"
              >
                今すぐ試す
              </a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-20 border-t">
          <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-zinc-500">
            © {new Date().getFullYear()} Boost Suite
          </div>
        </footer>
      </body>
    </html>
  );
}
