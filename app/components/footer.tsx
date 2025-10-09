// app/components/footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* 4カラム */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Column 1 */}
          <div>
            <div className="font-bold text-lg mb-4">Boost Suite</div>
            <p className="text-sm text-zinc-600 leading-relaxed">
              売れない言葉を、<br />
              もう一度意味から組み直す。
            </p>
          </div>

          {/* Column 2 */}
          <div>
            <div className="text-sm font-semibold mb-4">プロダクト</div>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li>
                <Link href="/tool" className="hover:text-zinc-900">
                  ツールを試す
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-zinc-900">
                  料金プラン
                </Link>
              </li>
              <li>
                <Link href="/column" className="hover:text-zinc-900">
                  活用事例
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <div className="text-sm font-semibold mb-4">リソース</div>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li>
                <Link href="/docs" className="hover:text-zinc-900">
                  ドキュメント
                </Link>
              </li>
              <li>
                <Link href="/api" className="hover:text-zinc-900">
                  API
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-zinc-900">
                  ブログ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <div className="text-sm font-semibold mb-4">会社情報</div>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li>
                <Link href="/about" className="hover:text-zinc-900">
                  運営会社
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-zinc-900">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-zinc-900">
                  プライバシー
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 下部コピーライト */}
        <div className="pt-8 border-t text-center text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Boost Suite</p>
          <p className="mt-2 text-xs text-zinc-400">
            登録不要で始められる日本語整流ツール。競合の10分の1価格でECを加速。
          </p>
        </div>
      </div>
    </footer>
  );
}
