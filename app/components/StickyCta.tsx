"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function StickyCta() {
  const [visible, setVisible] = useState(true);

  // スクロール方向で少しだけ出し入れ（上方向スクロールで出す）
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
        <div className="backdrop-blur-md bg-zinc-900/70 border border-white/10 rounded-2xl shadow-lg">
          <div className="p-3 flex items-center gap-3">
            <span className="text-xs text-zinc-300">30秒で“欲しい”に。</span>
            <div className="ml-auto">
              <Link
                href="/tool"
                className="inline-flex items-center rounded-xl bg-white text-zinc-900 text-sm font-semibold px-4 py-2 shadow"
                aria-label="30秒で無料トライアル（30クレジット）"
              >
                無料トライアル（30Cr）
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* 安全にタップできる余白 */}
      <div className="h-2 bg-gradient-to-t from-black/40 to-transparent"></div>
    </div>
  );
}
