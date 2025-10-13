// /app/components/StepsDark.tsx
import Link from "next/link";
import { ReactNode } from "react";

type Step = {
  k: string;
  title: string;
  description: string;
  detail: string;
  icon: ReactNode;
};

const steps: Step[] = [
  {
    k: "1",
    title: "原文を貼る",
    description: "商品説明・他言語原文・レビューURLなどをそのまま",
    detail: "Amazon / Rakuten / 越境ECのテキストもOK",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" className="opacity-90">
        <path d="M8 4h8a2 2 0 0 1 2 2v9l-4 4H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M14 19v-3a2 2 0 0 1 2-2h3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    k: "2",
    title: "Boostを押す",
    description: "自動判定 → 構成リビルド → 2パターン出力",
    detail: "セーフティ版／オフェンシブ版を同時生成",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" className="opacity-90">
        <path d="M12 3v18M3 12h18" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    k: "3",
    title: "コピーして使う",
    description: "モジュール単位でコピー、PDF/CSV出力も可",
    detail: "有料なら履歴保存・再編集OK",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" className="opacity-90">
        <rect x="4" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 8h8a2 2 0 0 1 2 2v8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
];

export default function StepsDark() {
  return (
    <section className="relative overflow-hidden bg-black py-20 text-white">
      {/* 背景ノイズ＋薄いグロー */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-white/[0.04]" />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* 見出し（青グラデのシアー） */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
              使い方は、貼って押すだけ。
            </span>
          </h2>
          <p className="text-zinc-400 text-[15px] md:text-base">
            30秒で「売れる文章」が完成
          </p>
        </div>

        {/* ステップカード（透明カードで統一） */}
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.k}
              className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/7"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                  {s.icon}
                </div>
                <div className="text-sm font-semibold text-zinc-300">STEP {s.k}</div>
              </div>

              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-zinc-300">{s.description}</p>
              <p className="mt-1 text-xs text-zinc-400">{s.detail}</p>

              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
