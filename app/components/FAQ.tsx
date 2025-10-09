{/* --- FAQ Section --- */}
<section className="py-16 bg-zinc-900 text-white">
  <div className="mx-auto max-w-5xl px-4">
    <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-white">
      よくある質問
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      <details className="group rounded-xl border border-zinc-700 bg-zinc-800/60">
        <summary className="cursor-pointer px-4 py-3 font-medium text-zinc-100 flex justify-between items-center">
          <span>無料でも制限なく使えますか？</span>
          <span className="ml-2 text-zinc-400 transition-transform group-open:rotate-45">＋</span>
        </summary>
        <div className="px-4 pb-3 text-sm text-zinc-300 border-t border-zinc-700/50">
          初回30クレジットまで完全無料。登録不要・即利用OKです。
        </div>
      </details>

      {/* 以下、他の質問も同じ構造で */}
    </div>

    <div className="text-center mt-6">
      <a
        href="/docs#faq"
        className="text-xs md:text-sm text-zinc-400 hover:text-white underline underline-offset-4"
      >
        さらに詳しいFAQを見る
      </a>
    </div>
  </div>
</section>
