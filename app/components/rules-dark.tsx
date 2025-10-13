"use client";

import React from "react";

type Rule = {
  title: string;
  detail: string;
  icon?: React.ReactNode;
};

const rules: Rule[] = [
  {
    title: "事実8割、余韻2割",
    detail: "具体で信頼をつくり、想像の余白で欲求を高める。",
    icon: <DotIcon />,
  },
  {
    title: "効能より、安心を語る",
    detail: "“改善”より“自分を丁寧に扱う時間”。解像度を上げて伝える。",
    icon: <ShieldIcon />,
  },
  {
    title: "買わない理由を先回りで潰す",
    detail: "レビュー/FAQから不安を抽出→構成に反映して回避。",
    icon: <CheckIcon />,
  },
  {
    title: "構文修正ではなく、意味の再設計",
    detail: "文法より“文脈”。市場と言葉のズレを整流する。",
    icon: <SparkIcon />,
  },
];

export default function RulesDark() {
  return (
    <section className="relative py-24 bg-black text-white overflow-hidden">
      {/* 背景ノイズ */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_60%)]" />

      <div className="relative mx-auto max-w-5xl px-4">
        {/* 見出し */}
        <h2 className="text-center text-3xl md:text-4xl font-bold mb-12">
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
            Boostの黄金律
          </span>
        </h2>

        {/* ルールリスト */}
        <div className="grid md:grid-cols-2 gap-6">
          {rules.map((r, i) => (
            <article
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm
                         transition hover:border-white/20 hover:bg-white/7"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center
                                rounded-xl bg-white/10 text-white">
                  {r.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{r.title}</h3>
                  <p className="mt-1 text-sm text-zinc-300">{r.detail}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- icons (線画・モノトーン統一) ---- */
function DotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" fill="currentColor" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="fill-none">
      <path
        d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-3z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="fill-none">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="fill-none">
      <path
        d="M12 2v6M12 16v6M4 12h6M14 12h6M6 6l4 4M14 14l4 4M6 18l4-4M14 10l4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
