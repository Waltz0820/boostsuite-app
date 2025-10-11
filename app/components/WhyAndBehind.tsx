// app/components/WhyAndBehind.tsx
"use client";

type Item = { title: string; body: string };

const WHY: Item[] = [
  { title: "構成が売れる順番", body: "商品理解→共感→期待→安心の流れを自動で組み上げます。" },
  { title: "自然な日本語のリズム", body: "日本語の“買いたくなる言い回し”へ再構成。直訳の違和感を排除。" },
  { title: "カテゴリ別最適化", body: "家電・美容・ファッションなど業種ごとの傾向を学習し、最適解を選択。" },
];

const BEHIND: Item[] = [
  { title: "感情設計ロジック", body: "数値化しづらい“感情の揺れ”を言葉に変換し、共感へ導く構造を設計。" },
  { title: "訴求軸の自動選定", body: "痛点・変化・安心・感性の中から、商品×ターゲットに最適な軸を判断。" },
  { title: "法令リスク自動回避", body: "薬機・景表に抵触しそうな表現を検知し、安全な言葉に自動置換。" },
];

function Card({ title, body }: Item) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur p-6 md:p-7 transition hover:bg-zinc-900/70">
      <div className="font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

export default function WhyAndBehind() {
  return (
    <section className="relative overflow-hidden bg-black py-24 text-white">
      <div className="mx-auto max-w-6xl px-4 text-center">
        {/* 見出し（BAと同じグラデ） */}
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
            なぜ、Boost Suiteで“売れる”のか？
          </span>
        </h2>
        <p className="mx-auto mb-12 max-w-3xl text-base text-zinc-400 md:text-lg">
          他のAIと違うのは「言葉の整え方」。私たちは「伝える」よりも「伝わる」を設計します。
        </p>

        {/* WHY */}
        <div className="mb-16 grid gap-8 md:grid-cols-3">
          {WHY.map((i) => (
            <Card key={i.title} {...i} />
          ))}
        </div>

        {/* 小さな区切り線（BAのリズムに合わせて薄く） */}
        <div className="mx-auto mb-16 h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* 裏側 */}
        <h3 className="mb-4 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Boost Suite の裏側
        </h3>
        <p className="mx-auto mb-12 max-w-3xl text-[15px] leading-relaxed text-zinc-400">
          各ジャンルのプロ（SEO／EC／セールスライティング）が考える“売れる文脈”をロジック化。
          具体的なアルゴリズムは非公開ですが、無料トライアルで精度を体験できます。
        </p>

        <div className="grid gap-8 md:grid-cols-3">
          {BEHIND.map((i) => (
            <Card key={i.title} {...i} />
          ))}
        </div>

        {/* CTA（BAと同じボタン設計） */}
        <div className="mt-12 flex flex-col items-center gap-3">
          <a
            href="/tool"
            className="inline-block rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-10 py-4 text-lg font-semibold text-white shadow-[0_0_20px_rgba(0,150,255,0.25)] transition-all hover:shadow-[0_0_25px_rgba(0,180,255,0.35)]"
          >
            無料で精度を体験する
          </a>
        </div>
      </div>

      {/* 背景ノイズ（BAと同トーン） */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_60%)]" />
    </section>
  );
}
