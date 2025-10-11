// /app/components/CompareTableDark.tsx

type Row = {
  feature: string;
  ours: string | boolean;
  others: string | boolean;
  note?: string;
};

const rows: Row[] = [
  { feature: "価格（スターター）", ours: "¥490/月", others: "¥5,000台〜/月" },
  { feature: "運用難易度", ours: "貼る→押す→使う", others: "学習コスト高" },
  { feature: "訴求設計（自動）", ours: true, others: "テンプレ中心" },
  { feature: "法令リスク回避", ours: "置換ルール内蔵", others: "手動監修" },
  { feature: "SEO最適化", ours: "売れ筋反映/メタ生成", others: "別ツール連携" },
  { feature: "一括運用", ours: "CSV/履歴/出力", others: "制限あり" },
];

export default function CompareTableDark() {
  return (
    <section className="py-20 bg-black text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">比較すれば、導入理由は明確</h2>
          <p className="mt-3 text-zinc-400">“高機能すぎる”より“使い倒せる”。成果に直結する最短導線。</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/10">
                <th className="px-4 py-4 text-zinc-400 font-normal">機能</th>
                <th className="px-4 py-4 font-semibold">Boost Suite</th>
                <th className="px-4 py-4 text-zinc-300 font-normal">既存ツール</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.feature} className={i % 2 ? "bg-white/0" : "bg-white/[0.03]"}>
                  <td className="px-4 py-4 text-zinc-300">{r.feature}</td>
                  <td className="px-4 py-4">
                    {typeof r.ours === "boolean" ? (
                      r.ours ? (
                        <span className="inline-block rounded bg-emerald-400/15 text-emerald-300 px-2 py-1 text-xs">
                          対応
                        </span>
                      ) : (
                        <span className="inline-block rounded bg-zinc-700/50 text-zinc-300 px-2 py-1 text-xs">
                          非対応
                        </span>
                      )
                    ) : (
                      <span className="text-white">{r.ours}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-zinc-300">
                    {typeof r.others === "boolean" ? (
                      r.others ? (
                        <span className="inline-block rounded bg-emerald-400/10 text-emerald-300 px-2 py-1 text-xs">
                          対応
                        </span>
                      ) : (
                        <span className="inline-block rounded bg-zinc-700/50 text-zinc-300 px-2 py-1 text-xs">
                          非対応
                        </span>
                      )
                    ) : (
                      r.others
                    )}
                    {r.note && <span className="ml-2 text-xs text-zinc-500">{r.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 注記 */}
        <p className="mt-4 text-xs text-zinc-500 text-center">
          ※ 表示は代表的な傾向の比較です。各社プラン・オプションにより異なる場合があります。
        </p>
      </div>
    </section>
  );
}
