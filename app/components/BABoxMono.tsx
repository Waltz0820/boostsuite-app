// /app/components/BABoxMono.tsx  (v2: 整理版)
type Props = {
  label: string;
  before: string;
  after: string;
  tag?: string;
  ribbon?: string; // ← 表示は左上のPillに統一
};

export default function BABoxMono({ label, before, after, tag, ribbon }: Props) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
      {/* ヘッダー行：ラベル + Pill */}
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-xs font-medium text-zinc-500">{label}</h3>
        {ribbon && (
          <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
            {ribbon}
          </span>
        )}
      </div>

      {/* BEFORE */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-zinc-600">
          <CrossIcon />
          <span className="uppercase">Before</span>
        </div>
        <p className="text-[15px] leading-relaxed text-zinc-700">
          {before}
        </p>
      </div>

      {/* 区切り線（弱め） */}
      <div className="my-4 h-px bg-zinc-100" />

      {/* AFTER */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-zinc-700">
          <CheckIcon />
          <span className="uppercase">After</span>
        </div>
        <p className="text-[15px] leading-relaxed text-zinc-900">
          {after}
        </p>
      </div>

      {/* タグ（ノート感） */}
      {tag && (
        <p className="mt-3 text-[11px] text-zinc-500">
          {tag}
        </p>
      )}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="text-zinc-800">
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
function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="text-zinc-500">
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
