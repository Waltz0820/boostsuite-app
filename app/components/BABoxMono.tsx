// /app/components/BABoxMono.tsx
type Props = {
  label: string;
  before: string;
  after: string;
  tag?: string;
  ribbon?: string; // 右上の小バッジ表示用（任意）
};

export default function BABoxMono({ label, before, after, tag, ribbon }: Props) {
  const titleId = `babox-${slugify(label)}-title`;

  return (
    <section
      role="group"
      aria-labelledby={titleId}
      className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* 右上バッジ（フラット） */}
      {ribbon && (
        <span className="absolute right-4 top-4 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-700">
          {ribbon}
        </span>
      )}

      {/* ラベル */}
      <div id={titleId} className="mb-4 text-xs font-semibold tracking-wide text-zinc-600">
        {label}
      </div>

      {/* Before */}
      <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
          <CrossIcon className="text-zinc-600" />
          <span>Before</span>
        </div>
        <p className="text-[15px] leading-relaxed text-zinc-800 line-clamp-2">{before}</p>
      </div>

      {/* 区切り */}
      <div className="my-4 h-px bg-zinc-200" />

      {/* After */}
      <div className="rounded-lg border border-zinc-300 bg-white p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-800">
          <CheckIcon className="text-zinc-900" />
          <span>After</span>
        </div>
        <p className="text-[15px] leading-relaxed text-zinc-900">{after}</p>
      </div>

      {/* タグ */}
      {tag && <div className="mt-4 text-[12px] text-zinc-600">{tag}</div>}
    </section>
  );
}

/* ------- Icons (mono) ------- */
function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M18 6L6 18M6 6l12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* 小ユーティリティ */
function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}
