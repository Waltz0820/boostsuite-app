"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function StickyCta() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 12) return;
      setVisible(y < lastY || y < 80);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-[60] transition-transform duration-200 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-6xl px-4 pb-5">
        <div className="backdrop-blur-md bg-zinc-900/70 border border-white/10 rounded-2xl shadow-lg flex items-center justify-between px-5 py-3">
          <span className="text-xs text-zinc-300 whitespace-nowrap">
            30秒で<span className="font-semibold text-white">「売れる言葉」に</span>
          </span>
          <Link
            href="/tool"
            className="ml-3 inline-flex items-center rounded-xl bg-white text-zinc-900 text-sm font-semibold px-4 py-2 shadow active:scale-[0.97] transition-transform"
            aria-label="無料で試す"
          >
            無料で試す
          </Link>
        </div>
      </div>
    </div>
  );
}
