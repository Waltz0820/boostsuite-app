// /app/terms/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約 – Boost Suite",
  description:
    "Boost Suite のご利用にあたって適用される利用規約です。サービスの提供条件、禁止事項、免責事項などをご確認ください。",
  openGraph: {
    title: "利用規約 – Boost Suite",
    description:
      "Boost Suite のご利用にあたって適用される利用規約です。サービスの提供条件、禁止事項、免責事項などをご確認ください。",
  },
};

export default function TermsPage() {
  return (
    <section className="relative bg-zinc-950 py-20 text-white">
      {/* ごく薄い放射グラデ（LPトーン継承） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent"
        style={{
          maskImage:
            "radial-gradient(60% 60% at 50% 50%, rgba(0,0,0,0.9) 30%, rgba(0,0,0,1) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-4">
        {/* ヘッダ */}
        <header className="mb-10">
          <p className="text-xs md:text-sm tracking-widest text-zinc-400 uppercase">
            Legal
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              利用規約
            </span>
          </h1>
          <p className="mt-3 text-zinc-400">最終更新日：2025-10-11</p>
        </header>

        {/* 目次 */}
        <nav className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <ul className="grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
            <li><a className="hover:text-white" href="#scope">1. 適用範囲</a></li>
            <li><a className="hover:text-white" href="#account">2. アカウント</a></li>
            <li><a className="hover:text-white" href="#fees">3. 料金・支払</a></li>
            <li><a className="hover:text-white" href="#usage">4. 禁止事項</a></li>
            <li><a className="hover:text-white" href="#ip">5. 知的財産</a></li>
            <li><a className="hover:text-white" href="#privacy">6. 個人情報</a></li>
            <li><a className="hover:text-white" href="#warranty">7. 免責事項</a></li>
            <li><a className="hover:text-white" href="#suspension">8. 変更・停止</a></li>
            <li><a className="hover:text-white" href="#termination">9. 契約期間・解約</a></li>
            <li><a className="hover:text-white" href="#governing-law">10. 準拠法・裁判管轄</a></li>
            <li><a className="hover:text-white" href="#contact">11. お問い合わせ</a></li>
          </ul>
        </nav>

        {/* 本文 */}
        <div className="space-y-8">
          <Section id="scope" title="1. 適用範囲">
            <p>
              本規約は、Boost Suite（以下「本サービス」）の提供条件および当社と利用者の権利義務関係を定めるものです。利用者は、本規約に同意のうえ本サービスをご利用ください。
            </p>
          </Section>

          <Section id="account" title="2. アカウント">
            <ul className="list-disc pl-5 space-y-2">
              <li>登録情報は真実かつ最新の内容を保持してください。</li>
              <li>アカウントの管理不備に起因する損害について、当社は責任を負いません。</li>
              <li>第三者への譲渡・貸与は禁止します。</li>
            </ul>
          </Section>

          <Section id="fees" title="3. 料金・支払">
            <ul className="list-disc pl-5 space-y-2">
              <li>料金は表示価格（消費税込）です。プラン変更は次回請求分から適用されます。</li>
              <li>クレジット決済に失敗した場合、機能を一時停止することがあります。</li>
              <li>有料部分利用開始後の返金は行いません（法令に定めがある場合を除く）。</li>
            </ul>
          </Section>

          <Section id="usage" title="4. 禁止事項">
            <ul className="list-disc pl-5 space-y-2">
              <li>法令・公序良俗に反する行為、第三者の権利を侵害する行為。</li>
              <li>不正アクセス、自動化された過度のリクエスト、リバースエンジニアリング。</li>
              <li>本サービスの信用を毀損する行為、運営を妨げる行為。</li>
            </ul>
          </Section>

          <Section id="ip" title="5. 知的財産">
            <p>
              本サービスおよび関連コンテンツに関する知的財産権は当社またはライセンサーに帰属します。利用者は、許諾範囲内でのみ本サービスを利用できます。
            </p>
          </Section>

          <Section id="privacy" title="6. 個人情報">
            <p>
              個人情報の取り扱いは<Link className="underline decoration-white/30 hover:text-white" href="/privacy">プライバシーポリシー</Link>に従います。
            </p>
          </Section>

          <Section id="warranty" title="7. 免責事項">
            <ul className="list-disc pl-5 space-y-2">
              <li>本サービスは現状有姿で提供され、特定目的適合性等の黙示の保証を行いません。</li>
              <li>利用者間または第三者との紛争について、当社は責任を負いません。</li>
              <li>当社の故意または重過失による場合を除き、損害賠償責任は月額利用料金の総額を上限とします。</li>
            </ul>
          </Section>

          <Section id="suspension" title="8. 変更・停止">
            <p>
              当社は、事前通知のうえ本サービスの内容変更・提供停止を行うことがあります（緊急時はこの限りではありません）。
            </p>
          </Section>

          <Section id="termination" title="9. 契約期間・解約">
            <ul className="list-disc pl-5 space-y-2">
              <li>解約はダッシュボードからいつでも可能です。解約月末日まで利用できます。</li>
              <li>規約違反が判明した場合、当社はアカウント停止・解除を行うことがあります。</li>
            </ul>
          </Section>

          <Section id="governing-law" title="10. 準拠法・裁判管轄">
            <p>
              本規約は日本法に準拠します。本サービスに関して紛争が生じた場合、当社所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </Section>

          <Section id="contact" title="11. お問い合わせ">
            <p>
              本規約に関するお問い合わせは、<Link href="/contact" className="underline decoration-white/30 hover:text-white">お問い合わせページ</Link>よりご連絡ください。
            </p>
          </Section>

          <div className="pt-6 border-t border-white/10 text-xs text-zinc-500">
            © {new Date().getFullYear()} Boost Suite
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 小さめの共通セクション ---------- */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
      <div className="mt-3 text-[15px] leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}
