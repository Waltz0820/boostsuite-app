"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const pathname = usePathname();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`transition hover:opacity-80 ${
          active ? "text-white font-semibold" : "text-zinc-300"
        }`}
      >
        {children}
      </Link>
    );
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/90 sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" aria-label="Boost Suite" className="flex items-center gap-3 shrink-0">
          <Image
            src="/logo.png"
            alt="Boost Suite ロゴ"
            width={240}
            height={48}
            className="w-[220px] md:w-[240px] h-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6 text-sm items-center">
          <NavLink href="/tool">ツール</NavLink>
          <NavLink href="/pricing">価格</NavLink>
          <NavLink href="/column">コラム</NavLink>
          <Link
            href="/tool?from=header"
            className="px-3 py-1.5 rounded-md bg-white text-zinc-900 hover:bg-zinc-100 font-medium"
          >
            今すぐ試す
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="メニューを開閉"
          aria-expanded={open}
          aria-controls={drawerId}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-zinc-800 text-zinc-300"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
            {open ? (
              <path d="M6.4 4.9 4.9 6.4 10.5 12l-5.6 5.6 1.5 1.5L12 13.5l5.6 5.6 1.5-1.5L13.5 12l5.6-5.6-1.5-1.5L12 10.5 6.4 4.9z" />
            ) : (
              <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id={drawerId}
        className={`md:hidden bg-zinc-900 border-t border-zinc-800 transition-[max-height] duration-300 overflow-hidden ${
          open ? "max-h-64" : "max-h-0"
        }`}
      >
        <nav className="px-4 py-3 flex flex-col gap-3 text-sm" role="dialog" aria-modal="true">
          <NavLink href="/tool">ツール</NavLink>
          <NavLink href="/pricing">価格</NavLink>
          <NavLink href="/column">コラム</NavLink>
          <Link
            href="/tool?from=header"
            className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-md bg-white text-zinc-900 font-medium hover:bg-zinc-100"
          >
            今すぐ試す
          </Link>
        </nav>
      </div>
    </header>
  );
}
