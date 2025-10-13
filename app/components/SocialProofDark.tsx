// /app/components/SocialProofDark.tsx

type Stat = { label: string; value: string; note?: string };

const stats: Stat[] = [
  { label: "平均短縮時間", value: "−97%", note: "2時間 → 約3分（導入初週中央値）" },
  { label: "初回継続率", value: "92%", note: "翌月継続（トライアル→有料）" },
  { label: "CVR改善", value: "+18%", note: "Before/Afterテストの平均差" },
];

export default function SocialProofDark() {
  return (
    <section className="py-24 bg-black text-white relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 text-center">
        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
            選ばれる理由は、数字で語れる
          </span>
        </h2>
        <p className="text-zinc-400 mb-12 text-[15px] md:text-base">
          導入後すぐに“結果”へ寄与。ミニマル運用で再現性が高い。
        </p>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-[#0f0f12]/70 backdrop-blur p-8 hover:bg-[#0f0f12]/85 transition"
            >
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                {s.value}
              </div>
              <div className="mt-3 text-sm text-zinc-300">{s.label}</div>
              {s.note && <div className="mt-2 text-xs text-zinc-500">{s.note}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Subtle glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_60%)] pointer-events-none" />
    </section>
  );
}
