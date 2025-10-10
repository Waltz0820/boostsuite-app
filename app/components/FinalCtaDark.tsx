"use client";

import Link from "next/link";
import { useMemo } from "react";

type Props = {
  kicker?: string;          // 小さめの前置き
  heading?: string;         // 見出し
  sub?: string;             // 補足テキスト（任意）
  ctaText?: string;         // ボタン文言
  ctaHref?: string;         // 遷移先
};

export default function FinalCtaDark({
  kicker = "もう、“売れない言葉”で悩まない。",
  heading = "今すぐ、売れる言葉に整える",
  sub = "登録不要。コピペ → ワンタップで整文。まずは無料で。",
  ctaText = "売れる言葉に",
  ctaHref = "/tool",
}: Props) {
  // 軽いランダムなグロー（再描画のたびに色温度が少しだけ変わる）
  const glow = useMemo(
    () => [
      "from-sky-500/30 via-cyan-400/20 to-blue-500/20",
      "from-indigo-500/30 via-blue-400/20 to-cyan-500/20",
      "from-cyan-500/30 via-teal-400/20 to-sky-500/20",
    ][Math.floor(Math.random() * 3)],
    []
  );

  return (
    <section className="relative overflow-hidden bg-zinc-950 py-24">
      {/* 背景：ごく薄い放射グラデ＋ノイズ */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-radial ${glow}`}
        style={{
          maskImage:
            "radial-gradient(60% 60% at 50% 50%, rgba(0,0,0,0.9) 30%, rgba(0,0,0,1) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 40 40'%3E%3Cpath fill='%23ffffff' fill-opacity='0.6' d='M0 0h1v1H0z'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <p className="text-xs md:text-sm tracking-widest text-zinc-400 uppercase">
          {kicker}
        </p>

        <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight text-white">
          {heading}
        </h2>

        {sub && (
          <p className="mx-auto mt-5 max-w-2xl text-zinc-400 md:text-lg">
            {sub}
          </p>
        )}

        <div className="mt-10 flex justify-center">
          <Link
            href={ctaHref}
            aria-label={ctaText}
            className="
              group inline-flex items-center gap-2
              rounded-xl px-8 py-4
              bg-white text-zinc-950 font-semibold
              shadow-[0_8px_30px_rgba(0,0,0,0.35)]
              ring-1 ring-white/60 hover:ring-white
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
            "
          >
            {ctaText}
            <span
              aria-hidden
              className="translate-x-0 transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </div>

        {/* ちいさな安心材料（任意） */}
        <div className="mt-4 text-xs text-zinc-500">
          無料で始められます・いつでも解約可能
        </div>
      </div>
    </section>
  );
}
