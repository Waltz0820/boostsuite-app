"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CtaBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // ヒーロー直下の監視用要素（<div id="hero-end" />）が画面外になったら表示
    const sentinel = document.getElementById("hero-end");

    const enableOnScrollFallback = () => {
      const onScroll = () => setShow(window.scrollY > 120);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    };

    if (!sentinel) {
      return enableOnScrollFallback();
    }

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        setShow(!e.isIntersecting);
      },
      { rootMargin: "0px", threshold: 0 }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={[
        "fixed inset-x-0 bottom-0 z-[60] transition-transform duration-300",
        show ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
      aria-hidden={!show}
    >
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
          <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6 md:py-4">
            <p className="text-sm md:text-base text-zinc-200">
              30秒で「売れる言葉」に。登録不要・今すぐ試せます。
            </p>

            <Link
              href="/tool"
              className="
                inline-flex shrink-0 items-center justify-center
                rounded-xl px-5 py-3 text-sm md:text-base font-semibold
                text-white
                bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500
                shadow-[0_0_22px_rgba(56,189,248,0.28)]
                hover:shadow-[0_0_32px_rgba(56,189,248,0.38)]
                transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70
              "
              aria-label="売れる言葉に"
            >
              売れる言葉に
              <span aria-hidden className="ml-1 translate-x-0 transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
