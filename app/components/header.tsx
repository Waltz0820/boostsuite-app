// app/components/header.tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-black/60 bg-black/80 border-b border-white/10">
      {/* 高さ：mobile 56px / md 60px / lg 68px */}
      <div className="mx-auto max-w-6xl px-4 py-2 md:py-2.5 lg:py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {/* ロゴ：モバイルでも存在感を出す（h-7 → md:h-8 → lg:h-9） */}
          <Image
            src="/logo.png"
            alt="Boost Suite"
            width={220}
            height={44}
            className="h-7 md:h-8 lg:h-9 w-auto"
            priority
          />
          <span className="sr-only">Boost Suite</span>
        </Link>

        {/* PCナビ */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-200">
          <Link href="/tool" className="hover:opacity-80">ツール</Link>
          <Link href="/pricing" className="hover:opacity-80">価格</Link>
          <Link href="/column" className="hover:opacity-80">コラム</Link>
          <a
            href="/tool?from=header"
            className="ml-2 px-3 py-1.5 rounded-md bg-white text-zinc-900 hover:opacity-90 text-sm"
          >
            今すぐ試す
          </a>
        </nav>

        {/* モバイル：ハンバーガー */}
        <button
          aria-label="メニューを開く"
          onClick={() => setOpen(true)}
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-zinc-200 hover:text-white"
        >
          {/* 少し大きめのアイコン感 */}
          <span className="block h-[2px] w-6 bg-zinc-200 relative">
            <span className="absolute -top-2 block h-[2px] w-6 bg-zinc-200" />
            <span className="absolute top-2 block h-[2px] w-6 bg-zinc-200" />
          </span>
        </button>
      </div>

      {/* モバイルドロワー */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-3 top-3 w-[82vw] max-w-[360px] rounded-2xl bg-zinc-900 text-zinc-50 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-sm font-medium">メニュー</span>
              <button
                aria-label="閉じる"
                onClick={() => setOpen(false)}
                className="p-2 text-zinc-300 hover:text-white"
              >
                ✕
              </button>
            </div>
            <nav className="p-2">
              <Link
                href="/tool"
                onClick={() => setOpen(false)}
                className="block px-5 py-3 text-base hover:bg-white/5 rounded-lg"
              >
                ツール
              </Link>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="block px-5 py-3 text-base hover:bg-white/5 rounded-lg"
              >
                価格
              </Link>
              <Link
                href="/column"
                onClick={() => setOpen(false)}
                className="block px-5 py-3 text-base hover:bg-white/5 rounded-lg"
              >
                コラム
              </Link>

              <a
                href="/tool?from=header"
                onClick={() => setOpen(false)}
                className="block m-4 mt-2 text-center px-4 py-3 rounded-lg bg-white text-zinc-900 font-medium hover:opacity-90"
              >
                今すぐ試す
              </a>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
