// app/components/header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // メニュー開閉で背面スクロールを止める
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // セッション取得 & 変化監視
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google", // 必要なら github 等に変更可
      options: { redirectTo: window.location.origin },
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  // ヘッダーの高さ: sm=56px, md+=64px
  const headerHSm = "h-14"; // 56px
  const headerHMd = "md:h-16"; // 64px

  return (
    <>
      {/* 固定ヘッダー */}
      <header
        className={`fixed inset-x-0 top-0 z-50 bg-black/95 ${headerHSm} ${headerHMd} border-b border-zinc-800`}
      >
        <div className="mx-auto max-w-6xl h-full px-4 flex items-center justify-between">
          {/* ロゴ（バー内のみ） */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/logo.png"
              alt="Boost Suite"
              width={176}
              height={36}
              className="w-[156px] md:w-[176px] h-auto"
              priority
            />
            <span className="sr-only">Boost Suite</span>
          </Link>

          {/* PCナビ */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-200">
            <Link href="/tool" className="hover:text-white">
              ツール
            </Link>
            <Link href="/features" className="hover:text-white">
              機能
            </Link>
            <Link href="/philosophy" className="hover:text-white">
              思想
            </Link>
            <Link href="/pricing" className="hover:text-white">
              価格
            </Link>
            <Link href="/column" className="hover:text-white">
              コラム
            </Link>

            {/* 右側：ログイン状態 */}
            <div className="ml-2 flex items-center gap-3">
              {loading ? (
                <span className="text-zinc-400 text-xs">…</span>
              ) : user ? (
                <>
                  <span className="text-xs text-zinc-400 hidden lg:inline">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-md bg-zinc-800 text-white hover:bg-zinc-700"
                  >
                    ログアウト
                  </button>
                  <a
                    href="/tool?from=header"
                    className="px-3 py-1.5 rounded-md bg-white text-black font-medium hover:opacity-90"
                  >
                    今すぐ試す
                  </a>
                </>
              ) : (
                <>
                  <button
                    onClick={handleLogin}
                    className="px-3 py-1.5 rounded-md bg-white text-black font-medium hover:opacity-90"
                  >
                    ログイン
                  </button>
                  <a
                    href="/tool?from=header"
                    className="px-3 py-1.5 rounded-md bg-zinc-100 text-black font-medium hover:opacity-90"
                  >
                    今すぐ試す
                  </a>
                </>
              )}
            </div>
          </nav>

          {/* モバイル：ハンバーガー / 閉じる */}
          <button
            aria-label={open ? "メニューを閉じる" : "メニューを開く"}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 rounded-md text-zinc-200 hover:text-white"
          >
            {open ? (
              // X
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              // Hamburger
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ドロップメニュー（モバイル） */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-black text-white pt-4 top-14 md:top-16 border-t border-zinc-800">
          <nav className="mx-auto max-w-6xl px-6 pb-10 text-lg font-medium space-y-2 overflow-y-auto h-full">
            <Link
              href="/tool"
              onClick={() => setOpen(false)}
              className="block py-2 hover:text-zinc-400"
            >
              ツール
            </Link>
            <Link
              href="/features"
              onClick={() => setOpen(false)}
              className="block py-2 hover:text-zinc-400"
            >
              機能
            </Link>
            <Link
              href="/philosophy"
              onClick={() => setOpen(false)}
              className="block py-2 hover:text-zinc-400"
            >
              思想
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="block py-2 hover:text-zinc-400"
            >
              価格
            </Link>
            <Link
              href="/column"
              onClick={() => setOpen(false)}
              className="block py-2 hover:text-zinc-400"
            >
              コラム
            </Link>

            {/* モバイル：ログイン状態 */}
            <div className="pt-3 border-t border-zinc-800 mt-3">
              {user ? (
                <>
                  <p className="text-sm text-zinc-400 mb-2">{user.email}</p>
                  <a
                    href="/tool?from=header"
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-block w-full text-center bg-white text-black px-6 py-3 rounded-lg text-base font-semibold hover:opacity-90"
                  >
                    今すぐ試す
                  </a>
                  <button
                    onClick={() => {
                      setOpen(false);
                      handleLogout();
                    }}
                    className="mt-3 inline-block w-full text-center bg-zinc-800 px-6 py-3 rounded-lg text-base font-semibold hover:bg-zinc-700"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/tool?from=header"
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-block w-full text-center bg-white text-black px-6 py-3 rounded-lg text-base font-semibold hover:opacity-90"
                  >
                    今すぐ試す
                  </a>
                  <button
                    onClick={() => {
                      setOpen(false);
                      handleLogin();
                    }}
                    className="mt-3 inline-block w-full text-center bg-zinc-100 text-black px-6 py-3 rounded-lg text-base font-semibold hover:opacity-90"
                  >
                    ログイン
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* ヒーローがヘッダー下から始まるように余白を確保 */}
      <div className="h-14 md:h-16" />
    </>
  );
}
