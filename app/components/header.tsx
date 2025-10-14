// app/components/header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  // メニュー開閉で背面スクロールを止める
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ヘッダーの高さ: sm=56px, md+=64px
  const headerHSm = "h-14"; // 56px
  const headerHMd = "md:h-16"; // 64px

  return (
    <>
      {/* 固定ヘッダー */}
      <header className={`fixed inset-x-0 top-0 z-50 bg-black/95 ${headerHSm} ${headerHMd} border-b border-zinc-800`}>
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
            <Link href="/tool" className="hover:text-white">ツール</Link>
            <Link href="/features" className="hover:text-white">機能</Link>
            <Link href="/philosophy" className="hover:text-white">思想</Link>
            <Link href="/pricing" className="hover:text-white">価格</Link>
            <Link href="/column" className="hover:text-white">コラム</Link>
            <a
              href="/tool?from=header"
              className="ml-2 px-3 py-1.5 rounded-md bg-white text-black font-medium hover:opacity-90"
            >
              今すぐ試す
            </a>
          </nav>

          {/* モバイル：ハンバーガー / 閉じる */}
          <button
            aria-label={open ? "メニューを閉じる" : "メニューを開く"}
            onClick={() => setOpen(v => !v)}
            className="md:hidden p-2 rounded-md text-zinc-200 hover:text-white"
          >
            {open ? (
              // X
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              // Hamburger
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ドロップメニュー */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-black text-white pt-4 top-14 md:top-16 border-t border-zinc-800">
          <nav className="mx-auto max-w-6xl px-6 pb-10 text-lg font-medium space-y-2 overflow-y-auto h-full">
            <Link href="/tool" onClick={() => setOpen(false)} className="block py-2 hover:text-zinc-400">ツール</Link>
            <Link href="/features" onClick={() => setOpen(false)} className="block py-2 hover:text-zinc-400">機能</Link>
            <Link href="/philosophy" onClick={() => setOpen(false)} className="block py-2 hover:text-zinc-400">思想</Link>
            <Link href="/pricing" onClick={() => setOpen(false)} className="block py-2 hover:text-zinc-400">価格</Link>
            <Link href="/column" onClick={() => setOpen(false)} className="block py-2 hover:text-zinc-400">コラム</Link>
            <a
              href="/tool?from=header"
              onClick={() => setOpen(false)}
              className="mt-4 inline-block w-full text-center bg-white text-black px-6 py-3 rounded-lg text-base font-semibold hover:opacity-90"
            >
              今すぐ試す
            </a>
          </nav>
        </div>
      )}

      {/* ヒーローがヘッダー下から始まるように余白を確保 */}
      <div className="h-14 md:h-16" />
    </>
  );
}