// app/column/page.tsx
import Link from "next/link";
import { columns } from "@/lib/columns-data";

export default function ColumnList() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-semibold">コラム</h1>
      <p className="mt-2 text-zinc-600">
        Before/After事例、薬機回避の黄金律、A/B結果などを短文で。
      </p>
      <ul className="mt-8 grid md:grid-cols-2 gap-6">
        {columns.map((p) => (
          <li key={p.slug} className="border rounded-2xl p-6">
            <div className="text-xs text-zinc-500">{p.date}</div>
            <Link href={`/column/${p.slug}`} className="mt-1 block text-lg font-medium hover:underline">
              {p.title}
            </Link>
            <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{p.excerpt}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
