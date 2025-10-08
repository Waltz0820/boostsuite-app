"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/70">
      <div className="mx-auto max-w-6xl px-4 py-1.5 md:py-2.5 flex items-center justify-between">
        {/* ロゴ */}
        <Link href="/" className="flex items-center gap-3">
         <Image
  src="/logo.png"
  alt="Boost Suite ロゴ"
  width={400}
  height={80}
  className="h-10 md:h-11 w-auto"
  priority
/>
          <span className="sr-only">Boost Suite</span>
        </Link>

        {/* PCナビ */}
        <nav className="hidden md:flex items-center gap-5 text-[13px] text-zinc-200">
          <Link href="/tool" className="hover:opacity-80 py-1">
            ツール
          </Link>
          <Link href="/pricing" className="hover:opacity-80 py-1">
            価格
          </Link>
          <Link href="/column" className="hover:opacity-80 py-1">
            コラム
          </Link>
          <a
            href="/tool?from=header"
            className="ml-1 rounded-md bg-white text-zinc-900 px-3 py-1.5 hover:opacity-90"
          >
            今すぐ試す
          </a>
        </nav>

        {/* モバイルメニュー */}
        <div className="md:hidden relative">
          <button
            aria-label="メニューを開く"
            className="p-2 rounded-md hover:bg-white/5 text-zinc-200"
            onClick={() => setOpen(!open)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
              {open ? (
                <path d="M6.4 4.9 4.9 6.4 10.5 12l-5.6 5.6 1.5 1.5L12 13.5l5.6 5.6 1.5-1.5L13.5 12l5.6-5.6-1.5-1.5L12 10.5 6.4 4.9z" />
              ) : (
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
              )}
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-zinc-800 bg-black/95 shadow-lg">
              <div className="p-1 text-sm text-zinc-200">
                <Link
                  href="/tool"
                  className="block px-3 py-2 rounded hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  ツール
                </Link>
                <Link
                  href="/pricing"
                  className="block px-3 py-2 rounded hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  価格
                </Link>
                <Link
                  href="/column"
                  className="block px-3 py-2 rounded hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  コラム
                </Link>
                <a
                  href="/tool?from=header"
                  className="mt-1 block px-3 py-2 rounded bg-white text-zinc-900 text-center hover:opacity-90"
                  onClick={() => setOpen(false)}
                >
                  今すぐ試す
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
