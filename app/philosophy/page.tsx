// /app/philosophy/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Philosophy – Boost Suite",
  description: "Boost Suite のブランド思想「Conducted by Imperfection」公式ページ。",
};

export default function PhilosophyPage() {
  return (
    <section className="relative bg-zinc-950 text-white">
      {/* 背景 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-radial from-blue-500/10 via-transparent to-transparent"
        style={{
          maskImage:
            "radial-gradient(70% 70% at 50% 50%, rgba(0,0,0,0.9) 30%, rgba(0,0,0,1) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
        {/* Hero */}
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          Boost Suite —{" "}
          <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
            Conducted by Imperfection.
          </span>
        </h1>
        <p className="mt-4 text-zinc-400">
          不完全に指揮される、完璧な知性。
        </p>
      </div>

      {/* Concept */}
      <div className="relative mx-auto max-w-3xl px-4 pb-20 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold">
          AIの完璧を、人間の不完全が指揮する。
        </h2>
        <p className="mt-4 text-zinc-400 leading-relaxed">
          Boost Suiteは、AIの精密な知性に人間の意図と余白を掛け合わせることで“売れる言葉”を生む創造の指揮台。
          「AI × HUMAN」の境界に存在し、そこから生まれる摩擦と温度が真の説得力を生み出す。
        </p>
      </div>

      {/* Three Layers */}
      <div className="mx-auto max-w-6xl px-6 pb-24 grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Rational Layer（理性層）",
            text: "意味・構文・文法の正確さ。AIの知性が担う領域。",
          },
          {
            title: "Emotive Layer（感性層）",
            text: "意図・余韻・温度。人間の情が響く領域。",
          },
          {
            title: "Resonance Field（共鳴層）",
            text: "理性と感性が交わる境界。Boost構文が生まれる場所。",
          },
        ].map((l, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-sm hover:bg-white/[0.06] transition"
          >
            <h3 className="font-semibold text-white">{l.title}</h3>
            <p className="mt-2 text-sm text-zinc-400">{l.text}</p>
          </div>
        ))}
      </div>

      {/* Quote */}
      <div className="mx-auto max-w-3xl px-4 pb-20 text-center">
        <blockquote className="text-2xl md:text-3xl font-semibold italic text-blue-300">
          “完璧を壊せるのは、不完全だけ。”
        </blockquote>
      </div>

      {/* Narrative */}
      <div className="mx-auto max-w-3xl px-4 pb-20 text-center text-zinc-400 leading-relaxed">
        <p>
          完璧を追いかけるAIたちが増え続ける中で、私たちはあえて“指揮する側”を選んだ。
          それは、正しさではなく、温度のために。
        </p>
        <p className="mt-4">
          Boost Suite は、人間のためらいと、AIの精度が出会う場所。
          一音のズレすら、デザインの一部になる世界を目指している。
        </p>
      </div>

      {/* Tagline Variants */}
      <div className="mx-auto max-w-3xl px-4 pb-20 text-center space-y-3 text-zinc-500 text-sm">
        <p>Where Logic Meets Emotion.</p>
        <p>Perfect isn’t the goal. Resonance is.</p>
      </div>

      {/* Mini CTA */}
      <div className="mx-auto max-w-3xl px-4 pb-24 text-center">
        <a
          href="/tool"
          className="inline-block rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white px-8 py-4 font-semibold hover:scale-[1.02] transition"
        >
          思想から、体験へ。
        </a>
      </div>
    </section>
  );
}
