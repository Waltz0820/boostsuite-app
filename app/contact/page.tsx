// /app/contact/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ – Boost Suite",
  description: "Boost Suite に関するお問い合わせページです。現在フォーム準備中です。",
};

export default function ContactPage() {
  return (
    <section className="relative bg-zinc-950 py-20 text-white">
      {/* 背景グラデーション */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent"
        style={{
          maskImage:
            "radial-gradient(60% 60% at 50% 50%, rgba(0,0,0,0.9) 30%, rgba(0,0,0,1) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4">
        {/* ヘッダ */}
        <header className="mb-10 text-center">
          <p className="text-xs md:text-sm tracking-widest text-zinc-400 uppercase">
            Contact
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              お問い合わせ
            </span>
          </h1>
          <p className="mt-3 text-zinc-400">
            現在フォーム準備中です。サポート窓口はまもなく公開予定です。
          </p>
        </header>

        {/* お問い合わせフォーム（デザイン完成形） */}
        <form
          className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-lg backdrop-blur-sm"
          onSubmit={(e) => e.preventDefault()}
        >
          <FormField label="お名前" id="name" placeholder="山田 太郎" />
          <FormField
            label="メールアドレス"
            id="email"
            type="email"
            placeholder="example@domain.com"
          />
          <FormField
            label="お問い合わせ内容"
            id="message"
            textarea
            placeholder="Boost Suite に関するご質問・ご要望などをご記入ください。"
          />

          {/* 送信ボタン（非アクティブ） */}
          <button
            type="submit"
            disabled
            className="w-full rounded-xl bg-zinc-800 text-zinc-500 cursor-not-allowed px-6 py-3 font-semibold transition"
          >
            現在送信は利用できません
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          ※ フォーム送信機能はまもなく有効化されます。
        </p>
      </div>
    </section>
  );
}

/* ---------- 小さめの共通フォームフィールド ---------- */
function FormField({
  label,
  id,
  type = "text",
  placeholder,
  textarea = false,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-zinc-300 mb-2"
      >
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          placeholder={placeholder}
          rows={5}
          disabled
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
        />
      ) : (
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          disabled
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
        />
      )}
    </div>
  );
}
