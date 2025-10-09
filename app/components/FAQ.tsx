type QA = { q: string; a: string };

export default function FAQ({ items }: { items: QA[] }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <h3 className="text-xl md:text-2xl font-bold text-center mb-6">よくある質問</h3>
      <ul className="space-y-4">
        {items.map((it, i) => (
          <li
            key={i}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6"
          >
            <p className="font-semibold">{it.q}</p>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{it.a}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
