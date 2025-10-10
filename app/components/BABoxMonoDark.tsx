// /app/components/BABoxMonoDark.tsx
type Props = {
  label: string;
  before: string;
  after: string;
  tag?: string;
  ribbon?: string;
};

export default function BABoxMonoDark({ label, before, after, tag, ribbon }: Props) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(80,150,255,0.15)]">
      {/* Ribbon */}
      {ribbon && (
        <span className="pointer-events-none absolute right-4 top-3 text-[10px] font-semibold tracking-wide text-blue-400/80 uppercase">
          {ribbon}
        </span>
      )}

      {/* Label */}
      <div className="mb-3 text-xs font-medium text-zinc-400">{label}</div>

      {/* Before */}
      <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          <CrossIcon />
          <span>Before</span>
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">{before}</p>
      </div>

      {/* After */}
      <div className="rounded-lg border border-white/20 bg-white/10 p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-300">
          <CheckIcon />
          <span>After</span>
        </div>
        <p className="text-sm leading-relaxed text-white">{after}</p>
      </div>

      {/* Tag */}
      {tag && (
        <div className="mt-4 text-[11px] text-blue-400/70 italic tracking-wide">
          {tag}
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="text-blue-300">
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
    <svg width="14" height="14" viewBox="0 0 24 24" className="text-zinc-400">
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
