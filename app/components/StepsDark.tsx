// /app/components/StepsDark.tsx
import Link from "next/link";

type Step = {
  k: string;
  title: string;
  description: string;
  detail: string;
  icon: JSX.Element;
};

const steps: Step[] = [
  {
    k: "1",
    title: "原文を貼る",
    description: "商品説明・他言語原文・レビューURLなどをそのまま",
    detail: "Amazon / Rakuten / 越境ECのテキストもOK",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" className="opacity-90">
        <path d="M8 4h8a2 2 0 0 1 2 2v9l-4 4H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M14 19v-3a2 2 0 0 1 2-2h3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    k: "2",
    title: "Boostを押す",
    description: "自動判定 → 構成リビルド → 2パターン出力",
    detail: "セーフティ版／オフェンシブ版を同時生成",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" className="opacity-90">
        <path d="M12 3v18M3 12h18" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    k: "3",
    title: "コピーして使う",
    description: "モジュール単位でコピー、PDF/CSV出力も可",
    detail: "有料なら履歴保存・再編集OK",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" className="opacity-90">
        <rect x="4" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 8h8a2 2 0 0 1 2 2v8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
];

export default function StepsDark() {
  return (
    <section className="relative overflow-hidden bg-zinc-950 py-20 text-zinc-100">
      {/* faint stars / gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-white/[0.03]" />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">使い方は、貼って押すだけ。</h2>
          <p className="mt-3 text-zinc-300">30秒で「売れる文章」が完成</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.k}
              className="
                group relative rounded-2xl border border-white/10 bg-white/[0.02]
                p-6 backdrop-blur-sm transition
                hover:border-white/20 hover:bg-white/[0.04]
              "
            >
              {/* subtle glow edge */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-white/0 group-hover:ring-1 group-hover:ring-white/10 transition" />
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5">
                  {s.icon}
                </div>
                <div className="text-sm font-semibold text-zinc-300">STEP {s.k}</div>
              </div>

              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-zinc-300">{s.description}</p>
              <p className="mt-1 text-xs text-zinc-400">{s.detail}</p>

              {/* underline accent */}
              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/tool"
            className="
              inline-flex items-center justify-center rounded-xl
              bg-white text-zinc-900 px-8 py-4 text-base md:text-lg font-semibold
              hover:bg-zinc-100 transition shadow-lg
            "
          >
            今すぐ無料で試す
          </Link>
        </div>
      </div>
    </section>
  );
}
