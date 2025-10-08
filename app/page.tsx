// app/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Boost Suite｜売れない言葉を、売れる言葉に変える",
  description:
    "商品は良いのに説明文で損していませんか？Boost Suiteは、30秒で自然な日本語に整流し、購入意欲を高めます。",
  metadataBase: new URL("https://boostsuite-app.vercel.app"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Boost Suite｜売れる日本語を自動生成",
    description:
      "直訳や硬い文章を、自然で刺さる表現へ。リスク配慮の置換も自動。月¥490から始める整流ツール。",
    url: "https://boostsuite-app.vercel.app/",
    siteName: "Boost Suite",
    locale: "ja_JP",
    type: "website",
    images: ["/og.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Boost Suite｜売れる日本語を自動生成",
    description: "30秒で“欲しい”に届く日本語へ。月¥490〜。",
    images: ["/og.jpg"],
  },
};

export default function Page() {
  return (
    <>
      {/* Hero - 痛点訴求 */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-24 bg-gradient-to-b from-zinc-900 to-zinc-800 text-white">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            良い商品が、<span className="underline decoration-4">売れない</span>理由
            <br />
            <span className="text-zinc-400">説明文の1行が全てを変える</span>
          </h1>
          <p className="mt-8 text-xl md:text-2xl text-zinc-200">
            硬い文章や不自然な表現で、<br />
            <span className="font-bold text-white">お客が去る</span>前に変えよう。
          </p>
          <p className="mt-6 text-lg text-zinc-300 max-w-2xl mx-auto">
            Boost Suiteが、30秒で「欲しい！」と思わせる日本語に整流。
          </p>
          <div className="mt-12 flex flex-col items-center gap-4">
            <Link
              href="/tool"
              aria-label="Boost Suiteを無料で試す（10回）"
              className="px-10 py-5 rounded-xl bg-white text-zinc-900 text-xl font-semibold hover:bg-zinc-100 transition-all shadow-lg"
            >
              30秒で無料試す（10回）
            </Link>
            <p className="text-sm text-zinc-400">登録不要・コピペ即出力</p>
            <div className="mt-4 text-xs text-zinc-400">
              競合$39/月（¥5,850）vs Boost ¥490/月〜
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
            <ExampleCard
              label="モバイルバッテリー"
              before="❌ Before: 22000mAh大容量..."
              after="✅ After: 充電切れの心配、なし"
              badge="CVR +30%（想定）"
            />
            <ExampleCard
              label="美顔器"
              before="❌ Before: RF機能で肌を改善..."
              after="✅ After: 毎日のスキンケアを楽しく"
              badge="法令に配慮した表現へ"
            />
            <ExampleCard
              label="ヴィンテージデニム"
              before="❌ Before: 復古ブルーのストレート..."
              after="✅ After: ラフな日も自分らしく"
              badge="自然な表現"
            />
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/tool"
              className="px-10 py-5 rounded-xl bg-zinc-900 text-white text-lg hover:bg-zinc-800"
            >
              今すぐ整える
            </Link>
          </div>
        </div>
      </section>

      {/* なぜBoostで売れるのか */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            なぜ、Boost Suiteで売れる？
          </h2>
        <div className="grid md:grid-cols-3 gap-8">
            <ValueCard
              icon="🎯"
              title="安心を売る"
              body="「容量」より「安心」を。数字の羅列を、未来の安心に変換。"
            />
            <ValueCard
              icon="🛡️"
              title="リスクを回避"
              body="薬機・景表配慮の置換ルールで、危険な言い回しをセーフに。"
            />
            <ValueCard
              icon="⚡"
              title="サポートも時短"
              body="FAQやレビュー返信まで自動生成。売った後も強い運用に。"
            />
          </div>
          <div className="mt-12 text-center">
            <p className="text-sm text-zinc-500">
              他にはない自動適応力で、全カテゴリ対応（美容／家電／ファッション…）。
            </p>
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              使い方は、貼って押すだけ。
            </h2>
            <p className="text-zinc-600">30秒で「売れる文章」が完成</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="原文を貼る"
              description="商品説明やレビューをコピペ。"
              detail="Amazonや中国ECサイトからそのままOK。"
            />
            <StepCard
              step="2"
              title="Boostを押す"
              description="ジャンル自動判定で2パターン出力。"
              detail="セーフティ版と攻め版を同時生成。"
            />
            <StepCard
              step="3"
              title="コピーして使う"
              description="モジュール単位でコピー可能。"
              detail="有料ならPDF/CSV DLや履歴保存もOK。"
            />
          </div>
          <div className="mt-16 text-center">
            <div className="inline-block bg-white rounded-2xl p-8 shadow-sm border">
              <div className="text-sm text-zinc-500 mb-2">平均作業時間</div>
              <div className="text-5xl font-bold text-zinc-900">30秒</div>
              <div className="text-sm text-zinc-600 mt-2">
                手動なら2時間かかる作業が、30秒で完了。
              </div>
            </div>
            <div className="mt-12">
              <Link
                href="/tool"
                className="inline-block px-10 py-5 rounded-xl bg-zinc-900 text-white text-lg font-semibold hover:bg-zinc-800"
              >
                今すぐ無料で試す
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 黄金律 */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="bg-zinc-900 text-white rounded-3xl p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Boostの黄金律
            </h2>
            <div className="space-y-6">
              <RuleItem rule="事実8割、余韻2割" detail="具体的だけど、想像の余地を残す。" />
              <RuleItem rule="効能を言わず安心を" detail="「改善」より「自分をケアする時間」。" />
              <RuleItem rule="不安を先回り" detail="レビューから不安を抽出し、強みに変える。" />
              <RuleItem rule="意味の再設計" detail="文法直しではなく、市場に合う文脈へ。" />
            </div>
            <div className="mt-10 pt-10 border-t border-zinc-700 text-center">
              <p className="text-zinc-400 text-sm leading-relaxed">
                Boost SuiteはこれらをAI構文に組み込み、どんな文章も自然で売れる形に。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 最終CTA ＋ 価格 */}
      <section className="py-24 bg-gradient-to-b from-white to-zinc-50">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-8">
            「売れない言葉」のまま、<br />
            <span className="text-zinc-500">放置していませんか？</span>
          </h2>
          <div className="max-w-2xl mx-auto space-y-6 mb-12">
            <p className="text-xl text-zinc-700">商品は良い。価格も適正。写真も完璧。</p>
            <p className="text-xl text-zinc-700">
              でも、説明文が<span className="font-bold text-zinc-900">硬い・不自然</span>だと、お客は離れます。
            </p>
            <p className="text-lg text-zinc-600 mt-8">1行の違和感が、購入を遠ざける。</p>
          </div>
          <div className="space-y-6">
            <Link
              href="/tool"
              className="inline-block px-12 py-6 rounded-xl bg-zinc-900 text-white text-xl font-bold hover:bg-zinc-800 shadow-xl hover:shadow-2xl"
            >
              30秒で、売れる言葉に変える
            </Link>
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-zinc-500">無料で10回まで。登録不要。今すぐ試せます。</p>
              <div className="flex gap-4 text-xs text-zinc-400">
                <span>✓ クレカ不要</span>
                <span>✓ メール不要</span>
                <span>✓ 30秒で完了</span>
              </div>
            </div>
          </div>

          {/* 価格 */}
          <div className="mt-16 pt-16 border-t">
            <p className="text-sm text-zinc-500 mb-6">料金プラン</p>
            <div className="flex flex-wrap justify-center gap-6">
              <PriceTag plan="Starter" price="¥490" detail="月100生成" />
              <PriceTag plan="Standard" price="¥1,480" detail="月300生成" popular />
              <PriceTag plan="Pro" price="¥2,980" detail="月1000生成" />
            </div>
            <p className="text-xs text-zinc-400 mt-6">
              競合ツール（$39/月 = ¥5,850）の1/4〜1/12の価格
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <FooterCol
              title="Boost Suite"
              desc="売れない言葉を、もう一度意味から組み直す。"
            />
            <FooterLinks
              title="プロダクト"
              items={[
                ["/tool", "ツールを試す"],
                ["/pricing", "料金プラン"],
                ["/column", "活用事例"],
              ]}
            />
            <FooterLinks
              title="リソース"
              items={[
                ["/docs", "ドキュメント"],
                ["/api", "API"],
                ["/blog", "ブログ"],
              ]}
            />
            <FooterLinks
              title="会社情報"
              items={[
                ["/about", "運営会社"],
                ["/terms", "利用規約"],
                ["/privacy", "プライバシー"],
              ]}
            />
          </div>
        </div>
      </footer>
    </>
  );
}

/* ---------- Components ---------- */

function ExampleCard({
  label,
  before,
  after,
  badge,
}: {
  label: string;
  before: string;
  after: string;
  badge: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-zinc-100 hover:border-green-500 transition">
      <div className="text-xs text-zinc-500 mb-2">{label}</div>
      <div className="bg-red-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-zinc-700">{before}</p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <p className="text-sm text-zinc-900 font-medium">{after}</p>
      </div>
      <div className="mt-4 text-xs text-green-600">{badge}</div>
    </div>
  );
}

function ValueCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-white border-2 border-zinc-100 rounded-2xl p-8 hover:border-zinc-900 transition-all hover:shadow-lg">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{body}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  detail,
}: {
  step: string;
  title: string;
  description: string;
  detail: string;
}) {
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
  return (
    <div
      className={`px-6 py-4 rounded-xl border-2 ${
        popular ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="text-xs mb-1 opacity-70">{plan}</div>
      <div className="text-xl font-bold">{price}</div>
      <div className={`text-xs ${popular ? "text-zinc-200" : "text-zinc-500"}`}>{detail}</div>
    </div>
  );
}

function FooterCol({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <div className="font-bold text-lg mb-4">{title}</div>
      <p className="text-sm text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function FooterLinks({
  title,
  items,
}: {
  title: string;
  items: [href: string, label: string][];
}) {
  return (
    <div>
      <div className="text-sm font-semibold mb-4">{title}</div>
      <ul className="space-y-2 text-sm text-zinc-600">
        {items.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-zinc-900">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
