// /app/privacy/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー – Boost Suite",
  description:
    "Boost Suite のプライバシーポリシーです。個人情報の取り扱い方針、利用目的、管理体制について記載しています。",
  openGraph: {
    title: "プライバシーポリシー – Boost Suite",
    description:
      "Boost Suite のプライバシーポリシーです。個人情報の取り扱い方針、利用目的、管理体制について記載しています。",
  },
};

export default function PrivacyPage() {
  return (
    <section className="relative bg-zinc-950 py-20 text-white">
      {/* 背景グラデーション（LPトーン継承） */}
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
              プライバシーポリシー
            </span>
          </h1>
          <p className="mt-3 text-zinc-400">最終更新日：2025-10-11</p>
        </header>

        {/* 本文 */}
        <div className="space-y-8">
          <Section title="1. 基本方針">
            <p>
              Boost Suite（以下「当社」）は、利用者の個人情報を適切に保護し、
              プライバシーを尊重することを社会的責務と認識しています。
              当社は、以下の方針に基づき個人情報を取り扱います。
            </p>
          </Section>

          <Section title="2. 個人情報の定義">
            <p>
              個人情報とは、氏名・メールアドレス・その他特定の個人を識別できる情報を指します。
              他の情報と容易に照合できるものも含みます。
            </p>
          </Section>

          <Section title="3. 収集する情報">
            <ul className="list-disc pl-5 space-y-2">
              <li>登録時に入力いただく氏名、メールアドレス等の情報</li>
              <li>サービス利用時の入力データ・アクセスログ・端末情報</li>
              <li>決済に関する情報（Stripe等の外部決済事業者を通じて処理）</li>
            </ul>
          </Section>

          <Section title="4. 利用目的">
            <ul className="list-disc pl-5 space-y-2">
              <li>サービスの提供および利用履歴管理のため</li>
              <li>サポート対応・問い合わせ対応のため</li>
              <li>新機能・新サービス・キャンペーン等の案内</li>
              <li>利用規約違反行為の確認および対応</li>
              <li>法令・規約に基づく権利行使・義務履行</li>
            </ul>
          </Section>

          <Section title="5. 情報の管理">
            <p>
              当社は、個人情報への不正アクセス・紛失・漏洩・改ざんを防止するため、
              適切なセキュリティ体制を整備します。
            </p>
          </Section>

          <Section title="6. 情報の第三者提供">
            <p>
              当社は、以下の場合を除き、利用者の同意なく第三者に個人情報を提供しません。
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>法令に基づく場合</li>
              <li>人の生命・身体・財産保護のために必要で、本人の同意が困難な場合</li>
              <li>業務委託先に機密保持契約を締結のうえ提供する場合</li>
            </ul>
          </Section>

          <Section title="7. 委託先の管理">
            <p>
              当社は、業務委託先に個人情報を預託する場合、適切な監督を行い、
              契約により安全管理義務を課します。
            </p>
          </Section>

          <Section title="8. クッキー（Cookie）・解析ツール">
            <p>
              当社は、利便性向上およびアクセス解析のためCookieを使用する場合があります。
              また、Google Analyticsなど第三者ツールを利用してアクセスデータを収集することがあります。
            </p>
          </Section>

          <Section title="9. 個人情報の開示・訂正・削除">
            <p>
              利用者本人からの開示・訂正・削除等の要請に対し、合理的な範囲で対応します。
              詳細は<Link href="/contact" className="underline decoration-white/30 hover:text-white">お問い合わせページ</Link>よりご連絡ください。
            </p>
          </Section>

          <Section title="10. プライバシーポリシーの改定">
            <p>
              当社は、必要に応じて本ポリシーを改定します。
              重要な変更がある場合、当社ウェブサイト上で通知します。
            </p>
          </Section>

          <Section title="11. お問い合わせ先">
            <p>
              本ポリシーに関するお問い合わせは、
              <Link href="/contact" className="underline decoration-white/30 hover:text-white">
                お問い合わせページ
              </Link>
              よりお願いいたします。
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

/* ---------- 共通セクション ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
      <div className="mt-3 text-[15px] leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}
