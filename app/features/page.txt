// app/features/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Boost Suite｜仕組み（Features）",
  description:
    "理性×感性の最適化、法令リスクの自動回避、セーフ／攻めの二相生成。Boost Engineの“裏側”を、抽象度を保って解説します。",
};

type CardProps = {
  title: string;
  body: string;
  foot?: string;
};

function MonoCard({ title, body, foot }: CardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition hover:bg-white/[0.06]">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{body}</p>
      {foot && <p className="mt-3 text-[11px] text-zinc-500">{foot}</p>}
    </article>
  );
}

export default function FeaturesPage() {
  return (
    <main className="bg-zinc-950 text-white">
      {/* ① Hero */}
      <section className="relative overflow-hidden py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(56,189,248,0.12),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Boost Engine™ の裏側
            </span>
          </h1>
          <p className="mt-4 text-zinc-400 md:text-lg">
            「貼る→押す→使う」の裏で動くのは、理性（意味・構文）と感性（余韻・温度）を
            同期させる共鳴エンジン。ここでは、思想を壊さない範囲で “仕組み” を解説します。
          </p>
        </div>
      </section>

      {/* ② Resonance Engine */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            理性 × 感性 = 共鳴（Resonance Engine）
          </h2>
          <p className="text-zinc-400 mb-8">
            スペックの列挙（理性）だけでも、情緒の過多（感性）だけでも“売れる言葉”にはなりません。
            Boostは両者の釣り合いを取り、<span className="text-zinc-200">意味8割・余韻2割</span>の
            安定出力を保つよう設計されています。
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <MonoCard
              title="Rational Core（理性核）"
              body="意味整合・構文秩序・根拠提示を担当。数値や仕様を“買う理由”へ転写するための下地を整える。"
              foot="例）スペック→解釈→安心材料の順序制御"
            />
            <MonoCard
              title="Emotive Halo（感情光層）"
              body="体験の語彙・余韻・間合いを補完。過剰な誇張を避けつつ、欲求伝達に必要な温度だけを加える。"
              foot="例）比喩は短く、視覚・触覚語を節度配置"
            />
            <MonoCard
              title="Resonance Loop（同期回路）"
              body="導入〜締めまでの一貫性を担保。訴求軸と読後感のズレを減らし、納得→行動の摩擦を低減。"
              foot="例）リード・要点・反証・クロージングの位相合わせ"
            />
          </div>
        </div>
      </section>

      {/* ③ Safety Layer */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Safety Layer（法令リスクの自動回避）
          </h2>
          <p className="text-zinc-400 mb-8">
            表現の過不足はCVRだけでなく、アカウント健全性にも直結します。
            Boostは薬機・景表の観点で危険語を検知し、文脈を壊さない言い換えに誘導します。
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <MonoCard
              title="検知"
              body="禁止／要注意語や暗黙のリスクパターンを抽出。文全体の温度と合わせて強度を推定。"
            />
            <MonoCard
              title="置換"
              body="“効果の断定”を避けつつ、ユーザー利益を損なわない代替フレーズへ置換。"
            />
            <MonoCard
              title="文脈整流"
              body="前後の論理や主張のトーンを再調整。言い換えによる不自然さを最小化。"
            />
          </div>

          <p className="mt-6 text-xs text-zinc-500">
            ※ 具体的なルールは競合優位性のため非公開です。無料トライアルで挙動をご確認いただけます。
          </p>
        </div>
      </section>

      {/* ④ Two-Phase Output */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Two-Phase Output（セーフ／攻めの二相出力）
          </h2>
          <p className="text-zinc-400 mb-8">
            原文の属性・カテゴリ・媒体想定から、出力の“攻守”を自動判断。
            セーフティ版とオフェンシブ版を並行生成し、用途に応じて即比較・採用できます。
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <MonoCard
              title="Safe（守）"
              body="抑制寄り。事実密度を高めつつ、過度な期待を作らない。“長期運用・法令厳格媒体”向け。"
            />
            <MonoCard
              title="Offensive（攻）"
              body="訴求寄り。変化・便益の伝達速度を優先。“短期施策・競合密集面・広告ABテスト”向け。"
            />
          </div>

          <p className="mt-6 text-xs text-zinc-500">
            ※ 選定ロジックは抽象化して公開しています。内部パラメータは非公開です。
          </p>
        </div>
      </section>

      {/* ⑤ Ops / Workflow */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            オペレーション最適化（現場フローに直結）
          </h2>
          <p className="text-zinc-400 mb-8">
            日常運用で“使い倒せる”ことを最優先。貼る→押す→使うに沿って、入出力の摩擦を徹底的に削減しました。
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <MonoCard
              title="入力の自由度"
              body="商品説明・他言語原文・レビューURLなどをそのまま投入可能。カテゴリは自動判定。"
            />
            <MonoCard
              title="出力の粒度"
              body="見出し・要点・本文のモジュール単位でコピー可。用途別テンプレへも即座に流用。"
            />
            <MonoCard
              title="エクスポート"
              body="CSV／PDF出力や履歴保存（有料）。複数商品・多媒体の一括更新に対応。"
            />
          </div>
        </div>
      </section>

      {/* ⑥ Closing */}
      <section className="relative overflow-hidden py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_50%,rgba(56,189,248,0.10),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            思想から、体験へ。
          </h2>
          <p className="mt-3 text-zinc-400 md:text-lg">
            “整えるだけで、圧倒的訴求力”。まずは実際の文脈で確かめてください。
          </p>

          {/* LP方針に合わせてCTAは1つだけ（控えめ） */}
          <div className="mt-10 flex justify-center">
            <Link
              href="/tool"
              aria-label="無料トライアル"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-8 py-4 font-semibold text-white shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_28px_rgba(56,189,248,0.35)] transition"
            >
              無料トライアル
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            ※ 構成・安全置換の具体アルゴリズムは非公開です。
          </p>
        </div>
      </section>
    </main>
  );
}
