"use client";

import { useMemo } from "react";

type Props = {
  kicker?: string;
  heading?: string;
  sub?: string;
};

export default function FinalCtaDark({
  kicker = "もう、“売れない言葉”で悩まない。",
  heading = "今すぐ、売れる言葉に整える",
  sub = "登録不要。コピペ → ワンタップで整文。まずは無料で。",
}: Props) {
  const glow = useMemo(
    () =>
      [
        "from-sky-500/30 via-cyan-400/20 to-blue-500/20",
        "from-indigo-500/30 via-blue-400/20 to-cyan-500/20",
        "from-cyan-500/30 via-teal-400/20 to-sky-500/20",
      ][Math.floor(Math.random() * 3)],
    []
  );

  return (
    <section className="relative overflow-hidden bg-zinc-950 py-20 text-white">
      {/* 背景：薄い放射グラデ＋ノイズ */}
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

        <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
          {heading}
        </h2>

        {sub && (
          <p className="mx-auto mt-5 max-w-2xl text-zinc-400 md:text-lg leading-relaxed">
            {sub}
          </p>
        )}

        {/* 安心訴求（静かなクロージング） */}
        <div className="mt-8 text-xs text-zinc-500">
          無料で始められます・いつでも解約可能
        </div>
      </div>
    </section>
  );
}
