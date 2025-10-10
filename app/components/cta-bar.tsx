"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CtaBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // ヒーロー直下の監視用要素を監視して、画面外に出たら表示
    const sentinel = document.getElementById("hero-end");
    if (!sentinel) {
      // センチネル無い場合は少しスクロールしたら表示
      const onScroll = () => setShow(window.scrollY > 120);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        // hero-end が見えている間は非表示／見えなくなったら表示
        setShow(!e.isIntersecting);
      },
      { rootMargin: "0px 0px 0px 0px", threshold: 0 }
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
          <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
            <p className="text-sm md:text-base text-zinc-200">
              30秒で「売れる言葉」に。登録不要・今すぐ試せます。
            </p>
            <Link
              href="/tool"
              className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm md:text-base font-semibold text-zinc-900 hover:bg-zinc-100 transition"
            >
              無料で試す
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
