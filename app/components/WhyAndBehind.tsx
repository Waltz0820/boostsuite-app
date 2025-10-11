// app/components/WhyAndBehind.tsx
export default function WhyAndBehind() {
  const WHY = [
    { title: "構成が売れる順番", body: "商品理解→共感→期待→安心の流れを自動で組み上げます。" },
    { title: "自然な日本語のリズム", body: "日本語の“買いたくなる言い回し”へ再構成。直訳の違和感を排除。" },
    { title: "カテゴリ別最適化", body: "家電・美容・ファッションなど業種ごとの傾向を学習し、最適解を選択。" },
  ];
  const BEHIND = [
    { title: "感情設計ロジック", body: "数値化しづらい“感情の揺れ”を言葉に変換し、共感へ導く構造を設計。" },
    { title: "訴求軸の自動選定", body: "痛点・変化・安心・感性の中から、商品×ターゲットに最適な軸を判断。" },
    { title: "法令リスク自動回避", body: "薬機・景表に抵触しそうな表現を検知し、安全な言葉に自動置換。" },
  ];

  const MonoCard = (i: {title:string; body:string}) => (
    <div className="card">
      <div className="card-title">{i.title}</div>
      <p className="card-desc">{i.body}</p>
    </div>
  );

  return (
    <section className="section">
      <div className="container">
        <h2 className="h2 mb-3">なぜ、Boost Suiteで“売れる”のか？</h2>
        <p className="lead mb-10">
          他のAIと違うのは「言葉の整え方」。私たちは「伝える」よりも「伝わる」を設計します。
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {WHY.map((i) => <MonoCard key={i.title} {...i} />)}
        </div>

        <div className="my-14 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <h3 className="h3 mb-3">Boost Suite の裏側</h3>
        <p className="lead mb-10">
          各ジャンルのプロ（SEO／EC／セールスライティング）が考える“売れる文脈”をロジック化。
          具体的なアルゴリズムは非公開ですが、無料トライアルで精度を体験できます。
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {BEHIND.map((i) => <MonoCard key={i.title} {...i} />)}
        </div>

        <div className="text-center mt-12">
          <a href="/tool" className="btn btn-primary">無料で精度を体験する</a>
        </div>
      </div>
    </section>
  );
}
