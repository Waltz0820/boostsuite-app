// TechBehindSection.tsx
import Link from "next/link";

type CardProps = {
  icon: string;
  title: string;
  description: string;
};

function TechCard({ icon, title, description }: CardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 hover:bg-zinc-900/60 transition-colors">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{description}</p>
    </div>
  );
}

export default function TechBehindSection() {
  return (
    <section className="py-20 bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Boost Suite の裏側
          </h2>
          <p className="mt-4 text-zinc-400">
            15年のSEO・ECの実戦知見を、独自ロジックとして実装。<br className="hidden md:inline" />
            具体アルゴリズムは非公開ですが、無料トライアルで精度をご体験ください。
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <TechCard
            icon="🧠"
            title="感情比率の自動設計"
            description="スペック・信頼・感情のバランスをカテゴリ別に最適化。『欲しくなる理由』に変換します。"
          />
          <TechCard
            icon="🎯"
            title="訴求軸の自動選定"
            description="痛点・変化・安心・感性。商品とターゲットから最も刺さる訴求軸を判定します。"
          />
          <TechCard
            icon="🛡️"
            title="法令リスクの自動回避"
            description="薬機・景表に抵触しうる表現を検知し、安全な言い回しへ自動置換。アカウントを守ります。"
          />
          <TechCard
            icon="⚡"
            title="運用をスケール"
            description="レビュー要約→不安の先回り、FAQ/返信テンプレ生成など運用面まで最適化。"
          />
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-8">
          <h3 className="font-semibold">設計思想</h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-300">
            <p>
              Boost Suiteは翻訳ではなく、<span className="font-medium text-white">言葉の構造を市場文脈に合わせて再設計</span>します。
            </p>
            <p>
              同じ商品でもターゲット・カテゴリ・季節で最適解は変化。私たちはその変化に合わせて出力を調整します。
            </p>
            <p className="text-zinc-500 text-xs">
              ※ 具体的なアルゴリズムは、競合優位性のため非公開です。
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/tool"
              className="inline-block rounded-xl bg-white text-zinc-900 px-6 py-3 font-semibold hover:bg-zinc-100"
            >
              実際の精度を試す（無料）
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
