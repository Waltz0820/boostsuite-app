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
    <section className="bg-zinc-950 text-white py-20">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center text-2xl md:text-3xl font-bold tracking-tight">
          Boostの黄金律
        </h2>

        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {rules.map((r, i) => (
            <article
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur
                         transition-all hover:bg-white/10"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center
                                rounded-xl bg-white/10 text-white">
                  {r.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="mt-1 text-sm text-zinc-300">{r.detail}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* サブCTA（暗面に白ボタンでコントラスト） */}
        <div className="mt-12 text-center">
          <a
            href="/tool"
            className="inline-block rounded-xl bg-white px-8 py-4 text-zinc-900 font-semibold
                       hover:bg-zinc-100 transition"
          >
            30秒で「売れる言葉」に
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---- icons (線画・モノトーン) ---- */
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
      <path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="fill-none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="fill-none">
      <path d="M12 2v6M12 16v6M4 12h6M14 12h6M6 6l4 4M14 14l4 4M6 18l4-4M14 10l4-4"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
