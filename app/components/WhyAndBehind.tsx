// /app/components/WhyAndBehind.tsx
import GradientText from "./GradientText";

type Item = {
  title: string;
  body: string;
};

const WHY: Item[] = [
  {
    title: "構成が売れる順番",
    body: "商品理解→共感→期待→安心の流れを自動で組み上げます。",
  },
  {
    title: "自然な日本語のリズム",
    body: "日本語の“買いたくなる言い回し”へ再構成。直訳の違和感を排除。",
  },
  {
    title: "カテゴリ別最適化",
    body: "家電・美容・ファッションなど業種ごとの傾向を学習し、最適解を選択。",
  },
];

const BEHIND: Item[] = [
  {
    title: "感情設計ロジック",
    body: "数値化しづらい“感情の揺れ”を言葉に変換し、共感へ導く構造を設計。",
  },
  {
    title: "訴求軸の自動選定",
    body: "痛点・変化・安心・感性の中から、商品×ターゲットに最適な軸を判断。",
  },
  {
    title: "法令リスク自動回避",
    body: "薬機・景表に抵触しそうな表現を検知し、安全な言葉に自動置換。",
  },
];

function MonoCard({ title, body }: Item) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 hover:bg-zinc-900/60 transition">
      <div className="flex gap-3">
        <div className="mt-1 h-5 w-0.5 rounded bg-brand-500" />
        <div>
          <div className="font-semibold text-white">{title}</div>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  );
}

export default function WhyAndBehind() {
  return (
    <section className="py-20 bg-black">
      <div className="mx-auto max-w-6xl px-4">
        {/* 見出し */}
        <GradientText as="h2" className="text-3xl md:text-4xl mb-3">
          なぜ、Boost Suiteで“売れる”のか？
        </GradientText>
        <p className="text-zinc-400 mb-10">
          他のAIと違うのは「言葉の整え方」。私たちは「伝える」よりも「伝わる」を設計します。
        </p>

        {/* WHY */}
        <div className="grid md:grid-cols-3 gap-6">
          {WHY.map((i) => (
            <MonoCard key={i.title} {...i} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-14 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* 裏側 */}
        <GradientText as="h3" className="text-2xl md:text-3xl mb-3">
          Boost Suite の裏側
        </GradientText>
        <p className="text-zinc-400 mb-10">
          各ジャンルのプロ（SEO／EC／セールスライティング）が考える“売れる文脈”をロジック化。
          具体的なアルゴリズムは非公開ですが、無料トライアルで精度を体験できます。
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {BEHIND.map((i) => (
            <MonoCard key={i.title} {...i} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a href="/tool" className="btn btn-primary">無料で精度を体験する</a>
        </div>
      </div>
    </section>
  );
}
