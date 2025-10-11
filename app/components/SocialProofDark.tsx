// /app/components/SocialProofDark.tsx

type Stat = { label: string; value: string; note?: string };

const stats: Stat[] = [
  { label: "平均短縮時間", value: "−97%", note: "2時間 → 約3分（導入初週中央値）" },
  { label: "初回継続率", value: "92%", note: "翌月継続（トライアル→有料）" },
  { label: "CVR改善", value: "+18%", note: "Before/Afterテストの平均差" },
];

export default function SocialProofDark() {
  return (
    <section className="py-20 bg-black text-white">
      <div className="mx-auto max-w-6xl px-4">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">選ばれる理由は、数字で語れる</h2>
          <p className="mt-3 text-zinc-400">
            導入後すぐに“結果”へ寄与。ミニマル運用で再現性が高い。
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
            >
              <div className="text-4xl md:text-5xl font-bold tracking-tight">{s.value}</div>
              <div className="mt-2 text-sm text-zinc-300">{s.label}</div>
              {s.note && <div className="mt-2 text-xs text-zinc-500">{s.note}</div>}
            </div>
          ))}
        </div>

        {/* 軽めCTA */}
        <div className="mt-12 text-center">
          <a
            href="/tool"
            className="inline-flex items-center gap-2 rounded-lg bg-white text-zinc-900 font-semibold px-6 py-3 hover:bg-zinc-100 transition"
          >
            無料で精度を体験する
          </a>
        </div>
      </div>
    </section>
  );
}
