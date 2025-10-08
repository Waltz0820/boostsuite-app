// app/components/header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  // メニュー開閉時にスクロール固定
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-black/85 backdrop-blur supports-[backdrop-filter]:bg-black/65">
      <div className="mx-auto max-w-6xl px-4 py-2 md:py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
  <Image
    src="/logo.png"
    alt="Boost Suite"
    width={180}           // SSR時もクライアント後も同じ寸法で固定
    height={36}
    priority
    sizes="(max-width: 767px) 170px, 200px"
    className="block w-[170px] md:w-[200px] h-auto"  // 高さは自動、幅だけ管理
  />
  <span className="sr-only">Boost Suite</span>
</Link>

        {/* desktop nav */}
        <nav className="hidden md:flex gap-7 text-sm text-zinc-300">
          <Link className="hover:text-white transition" href="/tool">ツール</Link>
          <Link className="hover:text-white transition" href="/pricing">価格</Link>
          <Link className="hover:text-white transition" href="/column">コラム</Link>
          <a
            href="/tool?from=header"
            className="px-3 py-1.5 rounded-md bg-white text-black font-medium hover:opacity-90 transition"
          >
            今すぐ試す
          </a>
        </nav>

        {/* mobile hamburger */}
        <button
          className="md:hidden inline-flex items-center justify-center w-10 h-10 -mr-2 rounded-md text-zinc-300 hover:text-white focus:outline-none"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <span className="sr-only">メニュー</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-zinc-900 border-l border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <Image
                src="/logo.png"
                alt="Boost Suite"
                width={200}
                height={40}
                className="h-[26px] w-auto shrink-0"
                priority
              />
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-md text-zinc-300 hover:text-white"
                aria-label="Close menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              <Link className="px-3 py-2 rounded-md hover:bg-zinc-800 text-zinc-200" href="/tool" onClick={() => setOpen(false)}>ツール</Link>
              <Link className="px-3 py-2 rounded-md hover:bg-zinc-800 text-zinc-200" href="/pricing" onClick={() => setOpen(false)}>価格</Link>
              <Link className="px-3 py-2 rounded-md hover:bg-zinc-800 text-zinc-200" href="/column" onClick={() => setOpen(false)}>コラム</Link>
              <a
                href="/tool?from=header"
                className="mt-2 px-3 py-2 rounded-md bg-white text-black font-medium text-center"
                onClick={() => setOpen(false)}
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
