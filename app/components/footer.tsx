// /app/components/footer.tsx
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-zinc-300 border-t border-white/10">
      {/* 上段 */}
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="text-lg font-semibold text-white">Boost Suite</div>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              売れない言葉を、もう一度意味から組み直す。
              <br />
              プロのセールス構成 × 売れ筋データ × SEOを“自動で”整流。
            </p>
            <p className="mt-6 text-xs text-zinc-500">© {year} Boost Suite</p>
          </div>

          {/* Product */}
          <FooterCol
            title="プロダクト"
            items={[
              { href: "/tool", label: "ツールを試す" },
              { href: "/pricing", label: "料金プラン" },
              { href: "/column", label: "活用事例" },
            ]}
          />

          {/* Guides（元「リソース」を差し替え） */}
          <FooterCol
            title="ガイド"
            items={[
              { href: "/philosophy", label: "思想" },
              { href: "/features", label: "機能" },
              { href: "/contact", label: "お問い合わせ" },
            ]}
          />

          {/* Company */}
          <FooterCol
            title="会社情報"
            items={[
              { href: "/about", label: "運営会社" },
              { href: "/terms", label: "利用規約" },
              { href: "/privacy", label: "プライバシー" },
            ]}
          />
        </div>
      </div>

      {/* 下段（セキュリティ等）は削除 */}
    </footer>
  );
}

/* ---- sub component ---- */
function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string }[];
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-white mb-4">{title}</div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="text-sm text-zinc-400 hover:text-white/90"
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}