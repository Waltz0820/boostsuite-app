"use client";

import React from "react";
import Link from "next/link";

type Currency = "USD" | "JPY";

type Plan = {
  name: string;
  priceUSD: number;         // $5 / $15 / $30
  period: string;           // "/mo"
  description: string;
  credits: number;          // 100 / 350 / 900
  features: string[];
  highlight?: boolean;
};

const fxDefault = 150; // 1 USD = 150 JPY（必要に応じて差し替え）

const plans: Plan[] = [
  {
    name: "Lite",
    priceUSD: 5,
    period: "/mo",
    description: "まずは整流クオリティを体験したい方向け。",
    credits: 100,
    features: [
      "1ユーザー",
      "生成保存上限：100件/月",
      "sales版（v1.9.7）基本テンプレート",
      "薬機法・景表法フィルター（標準）",
      "多言語→日本語の整流入力対応",
      "OCR：クレジット消費（バナー文字抽出・置換）",
      "生成キュー：通常",
    ],
  },
  {
    name: "Standard",
    priceUSD: 15,
    period: "/mo",
    description: "最も人気。日常運用〜EC実装まで広く対応。",
    credits: 350,
    features: [
      "最大3ユーザー",
      "生成保存上限：1,000件/月",
      "sales版（v1.9.7）＋ Objections / A/B提案",
      "薬機法・景表法フィルター（拡張）",
      "ファッション/家電/ビューティー/ガジェット全対応",
      "CSV一括生成：300行/月",
      "OCR：クレジット消費（画像一括処理可）",
      "Keepaフック（A/B脚注への自動差し込み）",
      "生成キュー：優先（約2x）",
      "メール/チャットCS：24h以内目安",
    ],
    highlight: true,
  },
  {
    name: "Pro",
    priceUSD: 30,
    period: "/mo",
    description: "代理運用・多店舗・チームでの量産に。",
    credits: 900,
    features: [
      "最大10ユーザー（共有ワークスペース）",
      "生成保存上限：無制限",
      "カスタムプロンプト / テンプレ配布",
      "CSV一括生成：1,000行/月",
      "OCR：クレジット消費（大量バッチ想定）",
      "Keepa連携（拡張）・API/外部連携",
      "生成キュー：最優先（約4x）",
      "優先CS（専用チャネル・即応目安）",
      "監査ログ / チーム権限",
    ],
  },
];

function formatPrice(currency: Currency, usd: number, fx: number) {
  if (currency === "USD") return `$${usd}`;
  const jpy = Math.round(usd * fx);
  return `¥${jpy.toLocaleString()}`;
}

export default function PricingDark({
  initialCurrency = "USD",
  fxRate = fxDefault,
}: {
  initialCurrency?: Currency;
  fxRate?: number; // 例: 150。SSRで為替反映するならここを差替
}) {
  const [currency, setCurrency] = React.useState<Currency>(initialCurrency);

  return (
    <section className="py-20 bg-black text-white relative overflow-hidden">
      {/* 背景のグロー */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.08),transparent_60%)] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 text-center">
        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
            Pricing
          </span>
        </h2>
        <p className="text-zinc-400 mb-6 text-[15px] md:text-base">
          プランはいつでも変更・解約可能。全プラン無料で始められます。
        </p>

        {/* 通貨トグル */}
        <div className="mb-10 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrency("USD")}
            className={`rounded-full px-4 py-1 text-sm border ${
              currency === "USD"
                ? "border-sky-400 text-white"
                : "border-white/10 text-zinc-400 hover:text-white"
            }`}
            aria-pressed={currency === "USD"}
          >
            USD（$）
          </button>
          <button
            onClick={() => setCurrency("JPY")}
            className={`rounded-full px-4 py-1 text-sm border ${
              currency === "JPY"
                ? "border-sky-400 text-white"
                : "border-white/10 text-zinc-400 hover:text-white"
            }`}
            aria-pressed={currency === "JPY"}
          >
            JPY（¥）
          </button>
        </div>

        {/* プランカード */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => {
            const priceText = formatPrice(currency, plan.priceUSD, fxRate);
            return (
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

                  <div className="mt-6 flex items-end justify-center gap-2">
                    <span
                      className={`text-4xl font-bold ${
                        plan.highlight ? "text-zinc-950" : "text-white"
                      }`}
                    >
                      {priceText}
                    </span>
                    <span
                      className={`text-sm pb-1 ${
                        plan.highlight ? "text-zinc-700" : "text-zinc-400"
                      }`}
                    >
                      /月
                    </span>
                  </div>

                  {/* クレジット表示 */}
                  <div className="mt-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 border ${
                        plan.highlight
                          ? "border-sky-500 text-sky-700"
                          : "border-sky-400/50 text-sky-300"
                      }`}
                      title="毎月付与される生成クレジット数（フル構文=5クレジット目安）"
                    >
                      {plan.credits.toLocaleString()} クレジット / 月
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
                          aria-hidden="true"
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
                    {/* 補足（単価目安） */}
                    <li
                      className={`pt-2 border-t mt-4 text-xs ${
                        plan.highlight ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      フル構文：5クレジット消費目安 ／ OCR：クレジット消費（レートは設定に準拠）
                    </li>
                  </ul>
                </div>

                {/* CTAボタン */}
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
            );
          })}
        </div>

        {/* 備考 */}
        <div className="mt-8 space-y-1 text-xs text-zinc-500">
          <p>※ 価格はUSD基準。JPYは概算（為替により変動）。</p>
          <p>※ クレジットは毎月リセット。上限超過時は追加購入またはプラン変更をご検討ください。</p>
          <p>※ CSV・API・Keepaはプランにより利用範囲が異なります。</p>
          <p>※ 機能は今後予告なく改良・変更となる場合があります。</p>
        </div>
      </div>
    </section>
  );
}