// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/header";
import Footer from "./components/footer";
import CtaBar from "./components/cta-bar";

// ▼ 追加：SSRでログイン判定
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const metadata: Metadata = {
  title: "Boost Suite｜売れない言葉を、もう一度意味から組み直す",
  description:
    "中韓英の原文から“刺さる日本語”へ。薬機/景表フィルター適用、セーフ/攻めの2案、CS Boostでアフターも整流。",
  openGraph: {
    title: "Boost Suite｜売れない言葉を、もう一度意味から組み直す",
    description:
      "中韓英の原文から“刺さる日本語”へ。薬機/景表法フィルター適用、セーフ/攻めの2案、CS Boostでアフターも整流。",
    url: "https://boostsuite-app.vercel.app/",
    siteName: "Boost Suite",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Boost Suite" }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // --- SSRでSupabase認証を確認 ---
  const ck = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => ck.get(name)?.value,
        set() {},
        remove() {},
      },
    }
  );
  const { data: userRes } = await supabase.auth.getUser();
  const loggedIn = !!userRes?.user;

  return (
    <html lang="ja">
      <body className="min-h-screen flex flex-col antialiased bg-[#0b0b0f] text-zinc-100 selection:bg-blue-500/30">
        {/* 固定ヘッダー */}
        <Header />

        {/* メインコンテンツ */}
        <main className="flex-1">{children}</main>

        {/* 共通フッター */}
        <Footer />

        {/* 追従CTA：ログイン済みは非表示。/toolはクライアント側で非表示 */}
        <CtaBar loggedIn={loggedIn} />
      </body>
    </html>
  );
}
