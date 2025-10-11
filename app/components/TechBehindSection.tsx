
export function TechBehindSection() {
  return (
    <section className="py-20 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Boost Suite の裏側</h2>
          <p className="mt-3 text-zinc-600 max-w-2xl mx-auto">
            15年のSEO・EC運用の知見をパッケージ化し、商品説明を市場に「刺さる」言葉に再設計します。具体的なロジックは非公開ですが、体験すれば精度の違いが分かります。
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <TechCard
            icon="🧠"
            title="感情比率の自動設計"
            desc="スペック・信頼・感情のバランスをカテゴリごとに最適化。『欲しくなる理由』を言語化します。"
          />
          <TechCard
            icon="🎯"
            title="訴求軸の自動選定"
            desc="痛点・変化・安心・感性──商品×顧客に最も刺さる訴求を自動で選びます。"
          />
          <TechCard
            icon="🛡️"
            title="法令リスクの自動回避"
            desc="薬機法・景表法などのリスク表現を検知し、安全な表現へ自動変換。運用リスクを低減します。"
          />
          <TechCard
            icon="⚡"
            title="実務知見のパッケージ化"
            desc="SEO 15年・EC運用・マーケ経験を実践的ルールに落とし込み、だれでも使える精度に。"
          />
        </div>

        <div className="mt-10 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl p-6 border-2 border-zinc-100">
            <h3 className="font-bold text-lg mb-3">設計思想 — 「言葉の構造」を直す</h3>
            <p className="text-sm text-zinc-700 leading-relaxed">
              Boost Suiteは単なる文体変換ではありません。市場文脈に合わせて「意味の組み替え」を行い、
              同じ商品でもターゲットごとに最適な伝え方を自動で出力します。コアアルゴリズムの詳細は非公開ですが、
              実際に試していただければ、その差は明確です。
            </p>
            <p className="text-xs text-zinc-500 mt-4">
              ※ 具体的な内部パラメータやプロンプト設計は競合優位性保持のため非公開としています。
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/tool"
            className="inline-block px-8 py-3 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition"
            aria-label="Boost Suiteを無料で体験する"
          >
            無料で精度を体験する
          </a>
        </div>
      </div>
    </section>
  );
}

function TechCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm hover:shadow-lg transition">
      <div className="text-3xl mb-4">{icon}</div>
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}
