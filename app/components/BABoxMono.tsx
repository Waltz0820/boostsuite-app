// /app/components/BABoxMono.tsx
type Props = {
  label: string;
  before: string;
  after: string;
  tag?: string;
  ribbon?: string; // 右上リボンに表示したい短いテキスト（例: "Before/After"）
};

export default function BABoxMono({ label, before, after, tag, ribbon }: Props) {
  return (
    <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all will-change-transform hover:-translate-y-0.5 hover:shadow-md">
      {/* Ribbon（任意・フラット配置） */}
      {ribbon && (
        <span className="absolute top-3 right-3 bg-zinc-800 text-white text-[10px] font-semibold tracking-wide px-2 py-1 rounded-md">
          {ribbon}
        </span>
      )}

      {/* ラベル */}
      <div className="mb-3 text-xs font-medium text-zinc-500">{label}</div>

      {/* Before（モノトーン、左罫線＋薄グレー） */}
      <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          <CrossIcon />
          <span>Before</span>
        </div>
        <p className="text-sm leading-relaxed text-zinc-700 line-clamp-2">{before}</p>
      </div>

      {/* After（モノトーン、左罫線濃いめ） */}
      <div className="rounded-lg border border-zinc-300 bg-white p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
          <CheckIcon />
          <span>After</span>
        </div>
        <p className="text-sm leading-relaxed text-zinc-900">{after}</p>
      </div>

      {/* タグ（薄い刻印風） */}
      {tag && (
        <div className="mt-4 text-[11px] text-zinc-500">
          {tag}
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="text-zinc-900">
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
