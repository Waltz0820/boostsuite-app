export default function FAQ() {
  const faqs = [
    ["無料でも制限なく使えますか？", "初回30クレジットまで完全無料。登録不要・即利用OKです。"],
    ["クレジットって何ですか？", "各生成で消費される単位です（例：Keyword=1 / Writing=2 / Image=3）。繰越OK。"],
    ["多言語の原文にも対応？", "英・中・韓などを自動検知し、自然な日本語に整流します。"],
    ["解約はいつでも？", "はい。1クリックでいつでも停止可能。違約金は一切ありません。"],
    ["商用利用できますか？", "作成テキストは商用利用OKです（法令・規約内でのご利用をお願いします）。"],
    ["セーフ/攻めの基準は？", "薬機・景表配慮の置換ルールを適用した安全版／訴求を強めた攻め版を同時出力します。"],
  ];

  return (
    <section className="py-16 bg-zinc-900 text-white">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          よくある質問
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {faqs.map(([q, a], i) => (
            <details
              key={i}
              className="group rounded-xl border border-zinc-700 bg-zinc-800/60"
            >
              <summary className="cursor-pointer select-none list-none px-4 py-3 md:px-5 md:py-4 font-medium text-zinc-100 flex items-center justify-between">
                <span className="pr-4">{q}</span>
                <span className="ml-auto text-zinc-400 transition-transform group-open:rotate-45">＋</span>
              </summary>
              <div className="px-4 pb-3 md:px-5 md:pb-4 text-sm text-zinc-300 leading-relaxed border-t border-zinc-700/50">
                {a}
              </div>
            </details>
          ))}
        </div>

        <div className="text-center mt-6">
          <a
            href="/docs#faq"
            className="text-xs md:text-sm text-zinc-400 hover:text-white underline underline-offset-4"
          >
            さらに詳しいFAQを見る
          </a>
        </div>
      </div>
    </section>
  );
}
