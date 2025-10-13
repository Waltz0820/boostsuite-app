"use client";

import React from "react";
import Link from "next/link";

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    name: "Lite",
    price: "¥490",
    period: "/月",
    description: "まずは整流を体験したい方向け。",
    features: ["1アカウント", "CSV 5行/月", "軽度整流のみ対応"],
  },
  {
    name: "Standard",
    price: "¥1,480",
    period: "/月",
    description: "最も人気。日常運用〜ECまで幅広く対応。",
    features: [
      "3アカウント",
      "CSV 30行/月",
      "Beauty / Gadget 構文対応",
      "薬機法・景表法フィルター搭載",
    ],
    highlight: true,
  },
  {
    name: "Pro",
    price: "¥2,980",
    period: "/月",
    description: "チーム利用や多店舗運用に最適。",
    features: [
      "10アカウントまで",
      "CSV 100行/月",
      "全カテゴリ対応",
      "API接続・外部連携可",
    ],
  },
];

export default function PricingDark() {
  return (
    <section className="py-20 bg-black text-white relative overflow-hidden">
      {/* 背景の軽いグロー */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.08),transparent_60%)] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 text-center">
        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
            利用プラン
          </span>
        </h2>
        <p className="text-zinc-400 mb-8 text-[15px] md:text-base">
          プランはいつでも変更・解約可能。全プラン無料で始められます。
        </p>

        {/* プランカード */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl border ${
                plan.highlight
                  ? "border-sky-400 bg-white text-zinc-950 shadow-[0_0_40px_rgba(56,189,248,0.25)]"
                  : "border-white/10 bg-[#0f0f12]/70 backdrop-blur text-white"
              } p-8 flex flex-col items-center justify-between transition-transform duration-300 hover:scale-[1.02]`}
            >
              <div className="w-full">
                <h3
                  className={`text-lg font-semibold ${
                    plan.highlight ? "text-zinc-950" : "text-white"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`mt-2 text-sm ${
                    plan.highlight ? "text-zinc-700" : "text-zinc-400"
                  }`}
                >
                  {plan.description}
                </p>

                <div className="mt-6">
                  <span
                    className={`text-4xl font-bold ${
                      plan.highlight ? "text-zinc-950" : "text-white"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.highlight ? "text-zinc-700" : "text-zinc-400"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>

                <ul className="mt-6 space-y-2 text-sm text-left">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className={`flex items-center gap-2 ${
                        plan.highlight ? "text-zinc-800" : "text-zinc-300"
                      }`}
                    >
                      <svg
                        className={`h-4 w-4 ${
                          plan.highlight ? "text-sky-600" : "text-sky-400"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTAボタン（プラン内のみ） */}
              <Link
                href="/tool"
                className={`mt-10 inline-block w-full rounded-xl px-6 py-3 font-semibold transition
                  ${
                    plan.highlight
                      ? "bg-zinc-950 text-white hover:bg-zinc-900"
                      : "bg-white text-zinc-950 hover:bg-zinc-200"
                  }`}
              >
                {plan.highlight ? "無料で試す" : "選択"}
              </Link>
            </div>
          ))}
        </div>

        {/* 備考 */}
        <p className="mt-8 text-xs text-zinc-500">
          ※ 価格はすべて税込み。各プランの上限を超える利用は自動で次プランに切替。
        </p>
      </div>
    </section>
  );
}
