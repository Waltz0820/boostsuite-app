// app/page.tsx
export const metadata = {
  title: "Boost Suite｜売れない言葉を、もう一度意味から組み直す",
};

// app/page.tsx
export default function Page() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              どんなイケメンでも、一本の鼻毛で台無し。<br />
              あなたの商品も、一文字の違和感で台無し。
            </h1>
            <p className="mt-6 text-zinc-600">
              Boost Suite は、AIが生んだ“通じるけど売れない”文章を
              <span className="font-medium"> 意味から再構築</span>し、
              日本市場で“売れる日本語”へ整流します。
            </p>

            <div className="mt-8 flex flex-col md:flex-row items-start md:items-center gap-4">
              <a
                href="/tool"
                className="px-5 py-3 rounded-md bg-zinc-900 text-white hover:opacity-90"
              >
                無料で試す（10回まで）
              </a>
              <p className="text-xs text-zinc-500">
                登録不要・コピペで即出力。月¥490〜のAI日本語整流ツール。
              </p>
            </div>
          </div>

          <div className="rounded-2xl border p-6">
            <div className="text-sm text-zinc-500">ビジュアルイメージ</div>
            <div className="mt-3 text-zinc-800">
              「完璧なアンドロイド」に一本だけの“ノイズ”。<br />
              Boost Suite は、そのノイズ（違和感）を抜き去ります。
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold">Boostが選ばれる理由</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card
            title="意味の再設計"
            body="直すのは文法ではなく“意味”。ジャンル自動判定 × モード設計で、刺さる構成にリビルド。"
          />
          <Card
            title="リスクを回避"
            body="薬機/景表フィルターで危険表現を自動置換。セーフティ版とオフェンシブ版を同時出力。"
          />
          <Card
            title="CS BoostでLTV向上"
            body="FAQ/レビュー返信/火消しテンプレを自動生成。売った後まで強くなり、解約率を下げる。"
          />
        </div>
      </section>

      {/* Golden Rules */}
      <section className="mx-auto max-w-6xl px-4 py-16 bg-zinc-50 rounded-2xl">
        <h2 className="text-2xl font-semibold mb-6">Boostの黄金律</h2>
        <ul className="space-y-3 text-zinc-700 text-sm">
          <li>・効能を言わない → 安心を語る</li>
          <li>・医療感を出さない → 家庭用の快適さを伝える</li>
          <li>・データではなく、日常との接点を示す</li>
          <li>・レビューを、訴求設計の宝に変える</li>
        </ul>
        <p className="mt-6 text-zinc-600 text-sm">
          Boost Suiteはこの原則をAI構文に組み込み、どんな翻訳文も「日本市場に通じる言葉」へ変換します。
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold">使い方は、貼って押すだけ。</h2>
        <ol className="mt-6 grid md:grid-cols-3 gap-6 text-sm">
          <Step n="1" t="原文を貼る" d="商品説明やレビューURLをコピペ。" />
          <Step n="2" t="Boost" d="ジャンル自動判定→構文最適化→セーフ/攻めの2案出力。" />
          <Step n="3" t="保存/共有" d="モジュール単位でコピー、PDF/CSVもDL。マイページに自動保存（有料）。" />
        </ol>
        <div className="mt-8">
          <a href="/tool" className="px-5 py-3 rounded-md bg-zinc-900 text-white hover:opacity-90">
            今すぐ試す
          </a>
        </div>
      </section>

      {/* Social proof placeholder */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold">Before / After</h2>
        <p className="mt-4 text-zinc-600 text-sm">
          直訳スペック羅列 → 「安心」や「使い心地」に着地させる例を、コラムで公開中。
          <a className="underline ml-2" href="/column">コラムを見る</a>
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-20 border-t">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Boost Suite｜Powered by Grok-4-fast</p>
          <p className="mt-2">
            登録不要で始められる日本語整流AI。競合ツールの10分の1価格で利用可能。
          </p>
        </div>
      </footer>
    </>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="border rounded-2xl p-6">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600">{body}</p>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <li className="border rounded-2xl p-6">
      <div className="text-xs text-zinc-500">STEP {n}</div>
      <div className="mt-1 font-medium">{t}</div>
      <div className="mt-2 text-zinc-600">{d}</div>
    </li>
  );
}
