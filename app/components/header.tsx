"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-black text-white backdrop-blur supports-[backdrop-filter]:bg-black/80">
      <div className="mx-auto max-w-6xl px-4 py-2 md:py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Boost Suite"
            width={180}
            height={36}
            priority
            sizes="(max-width: 767px) 150px, 180px"
            className="block w-[150px] md:w-[180px] h-auto select-none"
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
        <div className="fixed inset-0 z-[100] bg-black text-white">
          <div className="flex flex-col h-full">
            {/* Header row for drawer */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <Image
                src="/logo.png"
                alt="Boost Suite"
                width={160}
                height={32}
                className="w-[150px] h-auto"
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

            {/* menu body */}
            <nav className="flex flex-col gap-4 px-6 py-8 text-lg font-medium">
              <Link href="/tool" onClick={() => setOpen(false)} className="hover:text-zinc-400">ツール</Link>
              <Link href="/pricing" onClick={() => setOpen(false)} className="hover:text-zinc-400">価格</Link>
              <Link href="/column" onClick={() => setOpen(false)} className="hover:text-zinc-400">コラム</Link>
              <a
                href="/tool?from=header"
                onClick={() => setOpen(false)}
                className="mt-6 inline-block bg-white text-black px-6 py-3 rounded-lg text-center text-base font-semibold hover:opacity-90 transition"
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
