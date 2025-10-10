export default function BABox({
  label,
  before,
  after,
  tag,
}: {
  label: string;
  before: string;
  after: string;
  tag: string;
}) {
  return (
    <div className="group bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm hover:border-zinc-400/70 hover:shadow-md transition">
      {/* ラベル */}
      <div className="text-xs font-medium text-zinc-500 mb-3 tracking-wide">
        {label}
      </div>

      {/* Before（赤文字だけで注意感） */}
      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-100">
        <p className="px-4 py-3 text-[15px] leading-relaxed text-zinc-800">
          <span className="mr-2 font-semibold text-red-600">❌ Before</span>
          <span className="align-middle">{before}</span>
        </p>
      </div>

      {/* After（白〜薄グレー、緑は差し色） */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50">
        <p className="px-4 py-3 text-[15px] leading-relaxed text-zinc-900">
          <span className="mr-2 font-semibold text-emerald-700">✅ After</span>
          <span className="align-middle">{after}</span>
        </p>
      </div>

      {/* タグ（静かなデータ感） */}
      <div className="mt-4 text-xs text-zinc-500 italic">
        {tag}
      </div>
    </div>
  );
}
