import Link from "next/link";
import HeroVideo from "./components/hero-video";
import BABoxMonoDark from "./components/BABoxMonoDark";
import StepsDark from "./components/StepsDark";
import CtaBar from "./components/cta-bar";
import RulesDark from "./components/rules-dark";
import FinalCtaDark from "./components/FinalCtaDark";
import PricingDark from "./components/PricingDark";
import FAQDark from "./components/FAQDark";
import SocialProofDark from "./components/SocialProofDark";
import CompareTableDark from "./components/CompareTableDark";
import GradientText from "./components/GradientText";
import WhyAndBehind from "./components/WhyAndBehind";

export const metadata = {
  title: "Boost Suite｜売れない言葉を、売れる言葉に変える",
  description:
    "良い商品が売れないのは“説明文の1行”のせいかも。Boost Suiteは、プロのセールス構成 × 売れ筋データ × SEO最適化を自動化した「商品説明の整流AI」です。",
  openGraph: {
    title: "Boost Suite｜売れる日本語を自動生成",
    description:
      "直訳や硬い文章を、購入意欲を高める自然な表現へ。リスク回避も自動対応。月¥490から。",
    url: "https://boostsuite-app.vercel.app/",
    siteName: "Boost Suite",
    locale: "ja_JP",
    type: "website",
  },
};

export default function Page() {
  return (
    <>
      {/* Hero（動画背景） */}
      <section
        className="
          relative overflow-hidden
          min-h-[72vh] min-h-[72svh]
          pt-16 md:pt-24 pb-16
          text-white
        "
      >
        {/* 背景レイヤー */}
        <div className="absolute inset-0 -z-10">
         <HeroVideo
  src="/agentsuite.mp4"
  poster="/suite.png"
  playbackRate={1}
  loop={true}
  className="
    absolute inset-0 w-full h-full object-cover
    /* 引き：モバイルはやや顔寄り、PCは下(手元)を多めに */
    object-[50%_36%]      /* base: 顔が中心より少し上 */
    sm:object-[50%_42%]   /* タブレット付近でちょい下げる */
    md:object-[50%_58%]   /* ノートPCで手元が入るよう下げる */
    lg:object-[50%_62%]   /* デスクトップはさらに下へ */

    /* ズーム：過剰な拡大をやめて“引き”へ */
    scale-[1.01] md:scale-[1.00]

    /* トーンはそのまま */
    opacity-70 md:opacity-65
    blur-[1px]
    transition-transform duration-[15000ms] ease-linear
  "
/>
          {/* ループ境目ぼかし */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none" />
          {/* 全体トーン補正 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/35 pointer-events-none" />
        </div>

        {/* 見出し */}
        <div className="mx-auto max-w-4xl px-4 text-center">
  {/* 見出し */}
  <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-snug md:leading-tight">
    整えるだけで、<span className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">圧倒的訴求力。</span>
  </h1>

  {/* サブコピー */}
  <p className="mt-6 text-lg md:text-xl text-zinc-200 leading-relaxed">
    Boost Suite は
    <span className="font-semibold text-white">
      {" "}プロのセールス構成 × 売れ筋データ × SEO最適化{" "}
    </span>
    を組み合わせた「商品説明の整流AI」。
  </p>

  {/* 補足 */}
  <p className="mt-4 text-base md:text-lg text-zinc-400">
    不自然な翻訳文を、“買いたくなる日本語”へ。
  </p>

  {/* CTAブロック */}
  <div className="mt-10 flex flex-col items-center gap-3">
    <a
      href="/tool"
      className="inline-flex items-center justify-center rounded-xl
                 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500
                 px-10 py-4 text-base md:text-lg font-semibold text-white
                 shadow-[0_0_25px_rgba(56,189,248,0.35)]
                 hover:shadow-[0_0_35px_rgba(56,189,248,0.45)]
                 transition-all duration-200"
    >
      30秒で「売れる言葉」に
    </a>

    <p className="text-xs text-zinc-400">登録不要／コピペ → ワンタップで整文</p>
    <div className="text-xs text-zinc-500">既存ツール ¥5,000台/月 → Boost ¥490/月〜</div>
  </div>
</div>

      </section>
<div id="hero-end" className="h-px w-full" />
      {/* Before/After */}
<section className="py-20 bg-black text-white relative overflow-hidden">
  <div className="mx-auto max-w-6xl px-4 text-center">
    {/* 見出し */}
    <h2 className="text-3xl md:text-4xl font-bold mb-4">
      <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
        整流の先にある、“伝わる”世界へ。
      </span>
    </h2>
    <p className="text-zinc-400 mb-8 text-base md:text-lg">
      言葉を変えるだけで、売上も、印象も、未来も変わる。
    </p>

    {/* Before/After grid */}
    <div className="grid md:grid-cols-3 gap-8 mb-8 md:mb-10">
      <BABoxMonoDark
        label="モバイルバッテリー"
        before="22000mAh大容量… 充電効率95%… 次世代USB-C…"
        after="充電切れの不安から解放。いつでも動ける自由を。"
        tag="CVR +30%（想定）"
        ribbon="Before/After"
      />
      <BABoxMonoDark
        label="美顔器"
        before="RF機能で肌の弾力を改善… 臨床的に検証…"
        after="鏡を見るたび、自信がひとつ増える。"
        tag="薬機表現を安全置換"
        ribbon="Safe Copy"
      />
      <BABoxMonoDark
        label="ヴィンテージデニム"
        before="復古ブルー…高腰設計…垂れ感…百搭…"
        after="何気ない日常も、あなたのシルエットで語る。"
        tag="自然な日本語設計"
        ribbon="Tone Rewrite"
      />
    </div>
  </div>

  {/* 背景ノイズ（軽い装飾） */}
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_60%)] pointer-events-none" />
</section>

<SocialProofDark />
<WhyAndBehind />
<CompareTableDark />

      {/* How it works */}
     <StepsDark />

      {/* Golden Rules */}
     <RulesDark />

      {/* Final CTA + Pricing */}
          <PricingDark />
          <FAQDark />
     <FinalCtaDark />
     <CtaBar />
    </>
  );
}

/* ---------- Components ---------- */

function ValueCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-zinc-800 rounded-2xl p-8 hover:bg-zinc-700 transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{body}</p>
    </div>
  );
}

function DiffCard({ title, items, highlight }: { title: string; items: string[]; highlight: string }) {
  return (
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6">
      <h3 className="font-bold mb-4">{title}</h3>
      <ul className="space-y-2 mb-4">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="pt-4 border-t border-zinc-700">
        <p className="text-xs text-zinc-400">{highlight}</p>
      </div>
    </div>
  );
}

function StepCard({ step, title, description, detail }: { step: string; title: string; description: string; detail: string }) {
  return (
    <div className="bg-white border-2 border-zinc-100 rounded-2xl p-8 hover:border-zinc-900 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xl">
          {step}
        </div>
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      <p className="text-zinc-700 mb-3">{description}</p>
      <p className="text-sm text-zinc-500 leading-relaxed">{detail}</p>
    </div>
  );
}

function RuleItem({ rule, detail }: { rule: string; detail: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-2 h-2 rounded-full bg-white mt-2 flex-shrink-0" />
      <div>
        <div className="font-semibold mb-1">{rule}</div>
        <div className="text-sm text-zinc-400">{detail}</div>
      </div>
    </div>
  );
}

function PriceTag({
  plan,
  price,
  detail,
  popular,
}: {
  plan: string;
  price: string;
  detail: string;
  popular?: boolean;
}) {
  const base = "px-6 py-4 rounded-xl border-2 transition text-left min-w-[180px]";
  const style = popular ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white";
  return (
    <div className={`${base} ${style}`}>
      <div className="text-xs mb-1 opacity-70">{plan}</div>
      <div className="text-xl font-bold">{price}</div>
      <div className={popular ? "text-xs text-zinc-200" : "text-xs text-zinc-500"}>{detail}</div>
      {popular && <div className="mt-2 inline-block text-[10px] bg-white/10 px-2 py-1 rounded">一番人気</div>}
    </div>
  );
}
