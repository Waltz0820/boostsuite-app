import Link from "next/link";
import HeroVideo from "./components/hero-video";
import FAQ from "./components/FAQ";

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
            src="/hero-bg.mp4"
            poster="/hero-bg.png"
            playbackRate={0.6}
            className="
              absolute inset-0 w-full h-full
              object-cover
              object-[50%_35%]
              scale-[1.08]
              opacity-60 md:opacity-55
              blur-[1px]
              transition-transform duration-[15000ms] ease-linear
            "
          />
          {/* ループ境目ぼかし */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none" />
          {/* 全体トーン補正 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/45 pointer-events-none" />
        </div>

        {/* 見出し */}
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-snug md:leading-tight">
            良い商品が、<span className="underline decoration-4">売れない</span>理由
            <br />
            <span className="text-zinc-300">説明文の1行が、すべてを変える。</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-zinc-200 leading-relaxed">
            Boost Suite は
            <span className="font-semibold text-white">
              {" "}プロのセールス構成 × 売れ筋データ × SEO最適化{" "}
            </span>
            を自動化する「商品説明の整流AI」
          </p>

          <p className="mt-4 text-base md:text-lg text-zinc-300">
            硬い・不自然・AI特有の文章を、30秒で「欲しい」に。
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href="/tool"
              className="px-8 py-4 rounded-xl bg-white text-zinc-900 text-base md:text-lg font-semibold hover:bg-zinc-100 transition-all shadow-lg"
            >
              30秒で“売れる”文章に（無料で試す）
            </a>
            <p className="text-xs text-zinc-300">登録不要／コピペ → ワンタップで整文</p>
            <div className="mt-1 text-xs text-zinc-400">
              既存ツール¥5,000台/月 → Boost ¥490/月〜
            </div>
          </div>
        </div>
      </section>

      {/* Before/After */}
      <section className="py-20 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            1行変えるだけで、<span className="text-zinc-600">売上が変わる</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <BABox
              label="モバイルバッテリー"
              before="22000mAh大容量… 充電効率95%… 次世代USB-C…"
              after="充電切れの心配、ありません。外でも旅先でも、この1台で自由に動ける。"
              tag="CVR +30%（想定）"
            />
            <BABox
              label="美顔器"
              before="RF機能で肌の弾力を改善… 臨床的に検証…"
              after="鏡を見るのが、少し楽しみになる。自宅で心地よく続けられるケアに。"
              tag="薬機表現を安全置換"
            />
            <BABox
              label="ヴィンテージデニム"
              before="復古ブルー…高腰設計…垂れ感…百搭…"
              after="今日はこれさえあれば。ラフな日も、背筋を伸ばしたい日も。"
              tag="自然な日本語設計"
            />
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/tool"
              className="px-10 py-4 rounded-xl bg-zinc-900 text-white text-lg hover:bg-zinc-800"
            >
              自分の商品で試す
            </Link>
          </div>
        </div>
      </section>

      {/* Why Boost */}
      <section className="py-20 bg-zinc-900 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">なぜ、Boost Suiteで売れる？</h2>
            <p className="text-zinc-400">他のAI文章生成とは、設計思想が違います。</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ValueCard
              icon="🎯"
              title="スペック→安心に翻訳"
              body="“22000mAh”より“充電切れの心配なし”。数字の羅列を、買う理由に転換。"
            />
            <ValueCard
              icon="🛡️"
              title="法令リスクを回避"
              body="薬機/景表の危険表現を自動検知＆安全置換。ECアカウントを守る。"
            />
            <ValueCard
              icon="⚡"
              title="アフターも整流"
              body="FAQ/レビュー返信/クレーム火消しまで自動生成。LTVを底上げ。"
            />
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <DiffCard
              title="導入ハードルを、限りなくゼロに"
              items={[
                "既存ツールの約1/5〜1/10の価格帯",
                "登録不要・即日利用OK",
                "誰でも30秒で“売れる日本語”を生成",
              ]}
              highlight="ツール導入で迷わず、成果に集中できる設計。"
            />
            <DiffCard
              title="脳死運用OKの自動適応"
              items={[
                "ジャンル自動判定（美容/家電/ファッション…）",
                "モード自動選定（セーフ/攻め、痛点/変化/感性）",
                "レビュー要約→不安の先回り提案",
              ]}
              highlight="貼る→押す→使う、だけ。"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">使い方は、貼って押すだけ。</h2>
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
            「売れない言葉」のまま、<br />
            <span className="text-zinc-500">放置していませんか？</span>
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
            30秒で、売れる言葉に変える
          </Link>

<FAQ
  items={[
    { q: "途中解約はいつでも？", a: "いつでも解約OK。以降の請求は発生しません。" },
    { q: "クレカ必須？", a: "無料トライアルは不要。契約時のみ入力いただきます。" },
    { q: "クレジットの有効期限は？", a: "ロールオーバーOK。翌月以降も繰り越して使えます。" },
    { q: "CSV一括は何件まで？", a: "Proは1回あたり1,000件を目安。順次拡張予定です。" },
  ]}
/>

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
    </>
  );
}

/* ---------- Components ---------- */

function BABox({ label, before, after, tag }: { label: string; before: string; after: string; tag: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-zinc-100 hover:border-green-500 transition">
      <div className="text-xs text-zinc-500 mb-2">{label}</div>
      <div className="bg-red-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-zinc-700">
          <span className="font-semibold text-red-600 mr-2">❌ Before</span>
          {before}
        </p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <p className="text-sm text-zinc-900 font-medium">
          <span className="font-semibold text-green-600 mr-2">✅ After</span>
          {after}
        </p>
      </div>
      <div className="mt-4 text-xs text-green-600">{tag}</div>
    </div>
  );
}

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
