import Link from "next/link";
import HeroVideo from "./components/hero-video";
import FAQ from "./components/FAQ";
import BABoxMonoDark from "./components/BABoxMonoDark";


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
          <h1 className="text-4xl 「」:text-5xl font-bold tracking-tight leading-snug md:leading-tight">
            整えるだけで、<span className="underline decoration-4">圧倒的訴求力</span></h1>

          <p className="mt-6 text-lg md:text-xl text-zinc-200 leading-relaxed">
            Boost Suite は
            <span className="font-semibold text-white">
              {" "}プロのセールス構成 × 売れ筋データ × SEO最適化{" "}
            </span>
            を組み合わせた「商品説明の整流AI」
          </p>

          <p className="mt-4 text-base md:text-lg text-zinc-300">
            不自然な翻訳文を“買いたくなる日本語”に変える。
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href="/tool"
              className="px-8 py-4 rounded-xl bg-white text-zinc-900 text-base md:text-lg font-semibold hover:bg-zinc-100 transition-all shadow-lg"
            >
              30秒で「売れる言葉」に（無料で試す）
            </a>
            <p className="text-xs text-zinc-300">登録不要／コピペ → ワンタップで整文</p>
            <div className="mt-1 text-xs text-zinc-400">
              既存ツール¥5,000台/月 → Boost ¥490/月〜
            </div>
          </div>
        </div>
      </section>

      {/* Before/After */}
<section className="py-24 bg-black text-white relative overflow-hidden">
  <div className="mx-auto max-w-6xl px-4 text-center">
    {/* 見出し */}
    <h2 className="text-3xl md:text-4xl font-bold mb-4">
      <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
        整流の先にある、“伝わる”世界へ。
      </span>
    </h2>
    <p className="text-zinc-400 mb-12 text-base md:text-lg">
      言葉を変えるだけで、売上も、印象も、未来も変わる。
    </p>

    {/* Before/After grid */}
    <div className="grid md:grid-cols-3 gap-8 mb-16">
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

    {/* CTAボタン */}
    <div className="flex flex-col items-center gap-3">
      <a
        href="/tool"
        className="inline-block px-10 py-4 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white text-lg font-semibold shadow-[0_0_20px_rgba(0,150,255,0.25)] hover:shadow-[0_0_25px_rgba(0,180,255,0.35)] transition-all"
      >
        30秒で「売れる言葉」に
      </a>
      <p className="text-xs text-zinc-500 mt-1">
        登録不要／コピペ → ワンタップで整文
      </p>
    </div>
  </div>

  {/* 背景ノイズ（軽い装飾） */}
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_60%)] pointer-events-none" />
</section>
      {/* Why Boost */}
      <section className="py-24 bg-zinc-950 text-white relative overflow-hidden">
  <div className="mx-auto max-w-6xl px-4">
    <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
      <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
        なぜ、Boost Suiteで“売れる”のか？
      </span>
    </h2>
    <p className="text-zinc-400 text-center mb-16">
      他のAIツールにはない「言葉の設計思想」。
    </p>

    <div className="grid md:grid-cols-3 gap-8">
      <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-8 hover:bg-white/10 transition">
        <div className="text-4xl mb-4">🎯</div>
        <h3 className="font-bold mb-2 text-lg">スペック → 安心に翻訳</h3>
        <p className="text-sm text-zinc-300 leading-relaxed">
          “22000mAh”より“充電切れの心配なし”。  
          数字を“買う理由”に変換する設計。
        </p>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-8 hover:bg-white/10 transition">
        <div className="text-4xl mb-4">🛡️</div>
        <h3 className="font-bold mb-2 text-lg">法令リスクを回避</h3>
        <p className="text-sm text-zinc-300 leading-relaxed">
          薬機・景表の危険表現を自動検知＆安全置換。  
          ECアカウントを守る、見えない盾。
        </p>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-8 hover:bg-white/10 transition">
        <div className="text-4xl mb-4">⚡</div>
        <h3 className="font-bold mb-2 text-lg">アフターも整流</h3>
        <p className="text-sm text-zinc-300 leading-relaxed">
          FAQ・レビュー返信・クレーム対応も整流。  
          売って終わりではなく、繋がりを設計。
        </p>
      </div>
    </div>

    <div className="mt-16 text-center">
      <a
        href="/tool"
        className="inline-block px-10 py-4 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white text-lg font-semibold shadow-[0_0_20px_rgba(0,150,255,0.25)] hover:shadow-[0_0_25px_rgba(0,180,255,0.35)] transition-all"
      >
        「売れる言葉」を体験する
      </a>
    </div>
  </div>

  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)] pointer-events-none" />
</section>
      {/* How it works */}
      <section className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4"><span className="block text-zinc-500 mb-1 tracking-wide">使い方は、貼って押すだけ。</span></h2>
            <p className="text-zinc-600">30秒で「売れる文章」が完成</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="原文を貼る"
              description="商品説明・中国語/韓国語の原文・レビューURLなど"
              detail="Amazon/Rakuten/越境ECのテキストもOK"
            />
            <StepCard
              step="2"
              title="Boostを押す"
              description="自動判定→構成リビルド→2パターン出力"
              detail="セーフティ版／オフェンシブ版を同時生成"
            />
            <StepCard
              step="3"
              title="コピーして使う"
              description="モジュール単位でコピー、PDF/CSV出力も可"
              detail="有料なら履歴保存・再編集OK"
            />
          </div>

          <div className="mt-16 text-center">
            <div className="inline-block bg-white rounded-2xl p-8 shadow-sm border">
              <div className="text-sm text-zinc-500 mb-2">平均作業時間</div>
              <div className="text-5xl font-bold text-zinc-900">30秒</div>
              <div className="text-sm text-zinc-600 mt-2">手動リライト2時間 → 30秒に短縮</div>
            </div>

            <div className="mt-10">
              <Link
                href="/tool"
                className="inline-block px-10 py-4 rounded-xl bg-zinc-900 text-white text-lg font-semibold hover:bg-zinc-800"
              >
                今すぐ無料で試す
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Golden Rules */}
      <section className="py-20 bg-zinc-900 text-white">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Boostの黄金律</h2>
          <div className="space-y-6">
            <RuleItem rule="事実8割、余韻2割" detail="具体的に、でも想像の余地は残す。" />
            <RuleItem rule="効能ではなく、安心を語る" detail="“改善”より“自分を丁寧に扱う時間”。" />
            <RuleItem rule="買わない理由を先回りして潰す" detail="レビューから不安を抽出→構成に反映。" />
            <RuleItem rule="構文修正ではなく、意味の再設計" detail="文法ではなく、市場文脈を変換する。" />
          </div>
        </div>
      </section>

      {/* Final CTA + Pricing */}
      <section className="py-24 bg-gradient-to-b from-white to-zinc-50">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-8">
            <span className="text-zinc-500">「売れない言葉」のまま、</span><br />
            <span className="text-zinc-600">放置していませんか？</span>
          </h2>

          <div className="max-w-2xl mx-auto space-y-6 mb-12">
            <p className="text-xl text-zinc-700">商品は良い。価格も適正。写真も十分。</p>
            <p className="text-xl text-zinc-700">
              でも説明文が<span className="font-bold text-zinc-900">硬い／不自然／AI臭い</span>だけで、お客は離れます。
            </p>
            <p className="text-lg text-zinc-600 mt-6">1行の違和感が、購入ボタンを遠ざける。</p>
          </div>

          <Link
            href="/tool"
            className="inline-block px-12 py-6 rounded-xl bg-zinc-900 text-white text-xl font-bold hover:bg-zinc-800 shadow-xl hover:shadow-2xl"
          >
            30秒で「売れる言葉」に
          </Link>

          {/* Pricing */}
          <div className="mt-16 pt-16 border-t">
            <p className="text-sm text-zinc-500 mb-6">料金プラン</p>

            <div className="flex flex-wrap justify-center gap-6">
              <PriceTag plan="Starter" price="¥490" detail="100クレジット（¥4.9/Cr）" />
              <PriceTag plan="Standard" price="¥1,480" detail="300クレジット（¥4.9/Cr）" popular />
              <PriceTag plan="Pro" price="¥2,980" detail="800クレジット（¥3.7/Cr）" />
              <PriceTag plan="Enterprise" price="応相談" detail="無制限（¥3.0〜/Cr）" />
            </div>

            <div className="mt-10 text-xs text-zinc-400 text-center space-y-2">
              <p>🧮 クレジット消費例：Keyword=1 / Writing=2 / Image=3</p>
              <p>📌 Starterなら約100生成、Proなら400〜800生成相当。</p>
              <p>💳 追加チャージ：100クレジット＝¥490（ロールオーバーOK）</p>
              <p>🎁 無料トライアル：初回30クレジット（15〜30生成分）</p>
            </div>
          </div>
        </div>
      </section>
     <FAQ />
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
