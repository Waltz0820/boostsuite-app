"use client";

import React, {useRef, useState, useEffect} from "react";

type QA = {
  q: string;
  a: string | React.ReactNode;
};

const qas: QA[] = [
  {
    q: "無料でも制限なく使えますか？",
    a: "無料では基本機能をお試しいただけます（30クレジット）。継続運用やCSV出力・履歴保存などは有料プランでご利用ください。",
  },
  {
    q: "クレジットって何ですか？",
    a: "生成や整流に使う内部ポイントです。目安として「キーワード=1 / 整流=2 / 画像=3」。未使用分は翌月へロールオーバーされます。",
  },
  {
    q: "多言語の原文にも対応しますか？",
    a: "はい。CN / EN / KR など主要言語の“直訳感”を抑え、日本語の購入文脈に整流します（ニュアンス保持を重視）。",
  },
  {
    q: "解約はいつでも可能ですか？",
    a: "はい。ダッシュボードからいつでも解約可能です。契約期間の残り日数ぶんは当月内で利用できます。",
  },
  {
    q: "商用利用できますか？",
    a: "可能です。ECサイト・広告・LP・アプリ内文言など営利目的への利用を想定しています。ガイドラインに沿ってご利用ください。",
  },
  {
    q: "セーフ／攻めの基準は？",
    a: "薬機・景表の観点でリスクを下げる“セーフ”と、訴求を強める“攻め”の2モードを用意。カテゴリと原文の特徴量から自動で推奨モードを提示します。",
  },
];

export default function FAQDark() {
  return (
    <section className="relative bg-zinc-950 py-24 text-white">
      {/* subtle glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent"
        style={{
          maskImage:
            "radial-gradient(60% 60% at 50% 50%, rgba(0,0,0,0.9) 30%, rgba(0,0,0,1) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6">
        <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight">
          よくある質問
        </h2>
        <p className="mt-3 text-center text-zinc-400">
          使う前の疑問を、短く、要点だけ。
        </p>

        <div className="mt-10 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          {qas.map((item, i) => (
            <AccordionItem key={i} index={i} q={item.q} a={item.a} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/faq"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
          >
            さらに詳しいFAQを見る
            <svg width="16" height="16" viewBox="0 0 24 24" className="text-zinc-300">
              <path
                d="M9 18l6-6-6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Sub components ---------- */

function AccordionItem({
  index,
  q,
  a,
}: {
  index: number;
  q: string;
  a: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(0);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (open) {
      const h = bodyRef.current.scrollHeight;
      setHeight(h);
      const id = setTimeout(() => setHeight("auto"), 200); // after transition
      return () => clearTimeout(id);
    } else {
      const h = bodyRef.current.scrollHeight;
      // set current height first then to 0 to animate close
      setHeight(h);
      const id = requestAnimationFrame(() => setHeight(0));
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  return (
    <div className="group">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`faq-panel-${index}`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <span className="text-[15px] md:text-base font-medium text-white">
          {q}
        </span>
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg border ${
            open ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5"
          } transition-colors`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            className={`text-cyan-400 transition-transform duration-200 ${
              open ? "rotate-45" : "rotate-0"
            }`}
          >
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      <div
        id={`faq-panel-${index}`}
        role="region"
        aria-hidden={!open}
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: height === "auto" ? "auto" as const : `${height}px` }}
      >
        <div ref={bodyRef} className="px-6 pb-6 text-sm text-zinc-300">
          {a}
        </div>
      </div>
    </div>
  );
}
