"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ---------------- Types ---------------- */

type Msg = {
  role: "user" | "assistant";
  content: string;
  ts: number;
  annotations?: Annotation[];
};

type Annotation = {
  section: string;
  text: string;
  type: string;
  importance: "low" | "medium" | "high";
  quote?: string;
  before?: string;
  after?: string;
  tip?: string;
};

type AnnWithIdx = Annotation & { _idx: number };

/* ---------------- Consts ---------------- */

const MAX_FREE_CREDITS = 5;
const MAX_INPUT_CHARS = 4000;

/* ---------------- Page ---------------- */

export default function ToolPage() {
  const [input, setInput] = useState("");
  const [media, setMedia] = useState<"ad" | "social" | "lp">("ad");
  const [model, setModel] = useState("Boost Suite v0");
  const [annotationMode, setAnnotationMode] = useState(true);

  const [msgs, setMsgs] = useState<Msg[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("bs_msgs");
      return raw ? (JSON.parse(raw) as Msg[]) : seedWelcome();
    } catch {
      return seedWelcome();
    }
  });
  const [busy, setBusy] = useState(false);
  const [credits, setCredits] = useState<number>(() => {
    if (typeof window === "undefined") return MAX_FREE_CREDITS;
    const raw = localStorage.getItem("bs_free_credits");
    return raw ? Number(raw) : MAX_FREE_CREDITS;
  });
  const [showWall, setShowWall] = useState(false);

  // 保存
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bs_msgs", JSON.stringify(msgs));
      localStorage.setItem("bs_free_credits", String(credits));
    }
  }, [msgs, credits]);

  // スクロール末尾
  const scRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scRef.current?.scrollTo({ top: scRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const canSend = input.trim().length > 0 && !busy && credits > 0;

  const handleSend = async () => {
    if (!canSend) {
      if (credits <= 0) setShowWall(true);
      return;
    }

    const raw = input.trim();
    const prompt = raw.length > MAX_INPUT_CHARS ? raw.slice(0, MAX_INPUT_CHARS) : raw;
    const user: Msg = { role: "user", content: prompt, ts: Date.now() };
    setMsgs((m) => [...m, user]);
    setInput("");
    setBusy(true);
    setCredits((c) => Math.max(0, c - 1));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, media, annotation_mode: annotationMode }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || res.statusText);
      const data = JSON.parse(text);

      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: String(data?.text ?? "(応答なし)"),
          ts: Date.now(),
          annotations: data?.annotations ?? [],
        },
      ]);
    } catch (e: any) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: `⚠️ エラー: ${e?.message || e}`, ts: Date.now() },
      ]);
      console.error("generate failed:", e);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    setMsgs(seedWelcome());
    setCredits(MAX_FREE_CREDITS);
    setShowWall(false);
  };

  const remainingBadge = useMemo(() => {
    const pct = Math.round((credits / MAX_FREE_CREDITS) * 100);
    return `${pct}%`;
  }, [credits]);

  return (
    <main className="min-h-[100svh] bg-black text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-zinc-400">ツール</span>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-zinc-300">モデル</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-white/5 text-sm rounded-md px-2 py-1 border border-white/10 outline-none"
            >
              <option>Boost Suite v0</option>
              <option disabled>Boost Suite v1（準備中）</option>
            </select>
            <span className="h-4 w-px bg-white/10 ml-3" />
            <span className="text-zinc-300">媒体</span>
            <select
              value={media}
              onChange={(e) => setMedia(e.target.value as any)}
              className="bg-white/5 text-sm rounded-md px-2 py-1 border border-white/10 outline-none"
            >
              <option value="ad">ad（広告）</option>
              <option value="social">social（SNS）</option>
              <option value="lp">lp（LP/詳細）</option>
            </select>
            <label className="ml-3 flex items-center gap-1 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={annotationMode}
                onChange={(e) => setAnnotationMode(e.target.checked)}
              />
              解説ON
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">無料体験 残り</span>
            <span className="rounded-md bg-white/5 border border-white/10 px-2 py-[2px] text-xs">
              {credits}/{MAX_FREE_CREDITS}（{remainingBadge}）
            </span>
            <button
              onClick={handleClear}
              className="ml-2 text-xs text-zinc-400 hover:text-zinc-200 underline decoration-white/20"
            >
              リセット
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl grid md:grid-cols-[280px_1fr] gap-6 px-4 py-6">
        {/* Sidebar */}
        <aside className="hidden md:block">
          <div className="rounded-2xl border border-white/10 bg-white/5">
            <div className="px-4 py-3 border-b border-white/10 text-sm text-zinc-300">履歴</div>
            <div className="max-h-[50vh] overflow-auto p-3 space-y-2">
              {msgs
                .filter((m) => m.role === "user")
                .slice(-20)
                .reverse()
                .map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(m.content)}
                    className="w-full text-left rounded-lg px-3 py-2 bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
                  >
                    {truncate(m.content, 64)}
                  </button>
                ))}
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            ※ 現在は端末ローカルに保存（ログイン後はサーバー保存）
          </div>
        </aside>

        {/* Main */}
        <section className="flex flex-col min-h-[calc(100svh-160px)]">
          <div
            ref={scRef}
            className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4"
          >
            {msgs.map((m, i) => (
              <Bubble key={i} msg={m} />
            ))}
            {busy && <Typing />}
          </div>

          {/* Input */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="商品説明・原文・URLなどを貼り付けてください"
              rows={3}
              className="w-full resize-none bg-transparent outline-none text-sm placeholder:text-zinc-500 leading-relaxed"
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                CN/EN原文もOK。Boost Suiteが自然な日本語へ整流＋【解説】を返します。
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInput("")}
                  className="text-xs text-zinc-400 hover:text-zinc-200 underline decoration-white/20"
                >
                  クリア
                </button>
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                    canSend
                      ? "bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 text-white hover:opacity-90"
                      : "bg-white/10 text-zinc-500 cursor-not-allowed",
                  ].join(" ")}
                  aria-label="送信"
                >
                  {busy ? "生成中…" : "Boost"}
                  {!busy && <ArrowRight />}
                </button>
              </div>
            </div>
          </div>

          {/* Wall */}
          {showWall && (
            <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 backdrop-blur-sm">
              <div className="w-[92%] max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 text-center">
                <h3 className="text-lg font-semibold text-white">無料体験の上限に達しました</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  続きは無料アカウント登録で解放できます。
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    href="/pricing"
                    className="rounded-xl bg-white text-zinc-900 px-4 py-2 font-semibold hover:bg-zinc-100 transition"
                  >
                    プランを見る
                  </Link>
                  <button
                    onClick={() => setShowWall(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline decoration-white/20"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---------------- sub components ---------------- */

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const hasAnnotations = !!msg.annotations?.length;
  const [showExplain, setShowExplain] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // 連番を付与
  const indexed: AnnWithIdx[] = withIndex(msg.annotations || []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      alert("コピーしました！");
    } catch {
      alert("コピーに失敗しました");
    }
  };

  return (
    <div
      className={[
        "relative w-fit max-w-full break-words rounded-2xl px-4 py-3",
        isUser
          ? "ml-auto bg-white text-zinc-950"
          : "mr-auto bg-white/5 border border-white/10 text-zinc-100",
      ].join(" ")}
    >
      {/* 本文：注釈マーカー同期 */}
      {isUser ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed pr-6">{msg.content}</div>
      ) : (
        renderWithMarkers(msg.content, indexed, hoverIdx, setHoverIdx)
      )}

      {!isUser && (
        <>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 text-zinc-400 hover:text-white transition"
            aria-label="コピー"
          >
            📋
          </button>

          {hasAnnotations && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setShowExplain((v) => !v)}
                className="relative inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[12px] border border-white/10 text-zinc-200"
                aria-expanded={showExplain}
                aria-controls="annotations-panel"
              >
                解説
                {/* 右上件数バッジ */}
                <span className="absolute -top-1 -right-1 rounded bg-white/20 border border-white/20 px-1 text-[10px] leading-4">
                  {msg.annotations?.length}
                </span>
              </button>

              {/* JSON保存 */}
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(msg.annotations, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "annotations.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-[12px] text-zinc-300 hover:text-zinc-100 underline decoration-white/20"
              >
                JSON保存
              </button>
            </div>
          )}

          {showExplain && hasAnnotations && (
            <div id="annotations-panel">
              <AnnotationsPanel
                items={indexed}
                hoverIdx={hoverIdx}
                setHoverIdx={setHoverIdx}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Annotations ---------------- */

/** type → 小さな表示名（日本語） */
function typeLabel(t: string): string {
  const k = (t || "").toLowerCase();
  if (k === "warmflow") return "余韻";
  if (k === "factlock") return "事実整形";
  if (k === "seo") return "SEO";
  if (k === "emotion") return "感情";
  if (k === "futureflow") return "未来導線";
  if (k === "structure") return "構造";
  if (k === "humanize") return "人肌感";
  return t || "構造";
}

function AnnotationsPanel({
  items,
  hoverIdx,
  setHoverIdx,
}: {
  items: (AnnWithIdx)[];
  hoverIdx: number | null;
  setHoverIdx: (n: number | null) => void;
}) {
  if (!items?.length) return null;

  const [filter, setFilter] = useState<string | null>(null);
  const types = Array.from(new Set(items.map((a) => typeLabel(a.type))));
  const filtered = filter ? items.filter((a) => typeLabel(a.type) === filter) : items;

  // section グループ
  const groups: Record<string, typeof filtered> = {};
  for (const it of filtered) {
    const k = it.section || "misc";
    (groups[k] ||= []).push(it);
  }

  const badge = (t: string) => (
    <span className="ml-2 inline-flex items-center rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] border border-white/10">
      {t}
    </span>
  );

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
      {/* タイプ絞り込み */}
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          className={`text-[11px] rounded-md px-2 py-1 border ${
            !filter ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10"
          }`}
          onClick={() => setFilter(null)}
        >
          全て
        </button>
        {types.map((t) => (
          <button
            key={t}
            className={`text-[11px] rounded-md px-2 py-1 border ${
              filter === t ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10"
            }`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {Object.entries(groups).map(([sec, arr]) => (
        <div key={sec} className="mb-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-400">{sec}</div>
          <ul className="space-y-2">
            {arr.map((a, i) => (
              <li
                key={`${sec}-${i}-${a._idx}`}
                className={[
                  "rounded-lg border border-white/10 bg-black/20 p-2 transition",
                  hoverIdx === a._idx ? "ring-1 ring-cyan-400/60" : "",
                ].join(" ")}
                onMouseEnter={() => setHoverIdx(a._idx)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-zinc-100 leading-relaxed">
                    {/* 連番バッジ（本文マーカーと同期） */}
                    {a._idx && (
                      <span className="mr-1 text-[10px] rounded bg-white/10 border border-white/10 px-1 align-middle">
                        [{a._idx}]
                      </span>
                    )}
                    {a.text}
                  </div>
                  <button
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 underline decoration-white/20 shrink-0"
                    onClick={() => navigator.clipboard?.writeText(a.text)}
                    aria-label="注釈をコピー"
                  >
                    コピー
                  </button>
                </div>
                <div className="mt-1 text-[11px] text-zinc-400 flex items-center">
                  <span className="ml-0 inline-flex items-center rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] border border-white/10">
                    {typeLabel(a.type)}
                  </span>
                  {badge(a.importance)}
                </div>
                {a.quote && (
                  <div className="mt-1 text-[11px] text-zinc-500 line-clamp-1">“{a.quote}”</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Markers (本文 [n]) ---------------- */

/** 注釈配列に連番を付ける */
function withIndex<T extends Annotation>(items: T[] = []): (T & { _idx: number })[] {
  return items.map((a, i) => ({ ...a, _idx: i + 1 }));
}

/**
 * 本文中に [n] マーカーを挿入。
 * - quote がある注釈は「最初の一致箇所」の直後に [n]
 * - quote が無い注釈は末尾にまとめて [n]
 * - マーカー hover / 注釈 hover で相互ハイライト
 */
function renderWithMarkers(
  text: string,
  anns: AnnWithIdx[],
  hoverIdx: number | null,
  setHoverIdx: (n: number | null) => void
) {
  let html = escapeHtml(text);

  for (const a of anns) {
    if (!a.quote) continue;
    const quoted = escapeRegExp(a.quote);
    const re = new RegExp(quoted);
    html = html.replace(re, (m) => {
      const marked = markerSup(a._idx, hoverIdx);
      return `${m}${marked}`;
    });
  }

  // quoteの無い注釈は本文末尾にまとめて
  const noQuote = anns.filter((a) => !a.quote);
  if (noQuote.length) {
    const tail = noQuote.map((a) => markerSup(a._idx, hoverIdx, true)).join("");
    html += tail;
  }

  return (
    <div
      className="whitespace-pre-wrap text-sm leading-relaxed pr-6"
      dangerouslySetInnerHTML={{ __html: html }}
      onMouseOver={(e) => {
        const target = (e.target as HTMLElement).closest("[data-ann]") as HTMLElement | null;
        if (target) setHoverIdx(Number(target.dataset.ann || "0") || null);
      }}
      onMouseOut={() => setHoverIdx(null)}
    />
  );
}

function markerSup(idx: number, hoverIdx: number | null, ml = false) {
  const hl = hoverIdx === idx ? "outline outline-1 outline-cyan-400/70" : "";
  const mlc = ml ? " ml-1" : "";
  return `<sup data-ann="${idx}" class="mx-0.5${mlc} cursor-pointer text-xs align-super rounded px-[2px] bg-white/10 border border-white/10 ${hl}">[${idx}]</sup>`;
}

/* ---------------- Utils ---------------- */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Typing() {
  return (
    <div className="mr-auto rounded-2xl px-4 py-3 bg-white/5 border border-white/10">
      <div className="flex items-center gap-1">
        <Dot />
        <Dot className="animation-delay-150" />
        <Dot className="animation-delay-300" />
      </div>
      <style jsx>{`
        .animation-delay-150 {
          animation-delay: 0.15s;
        }
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
      `}</style>
    </div>
  );
}

function Dot({ className = "" }: { className?: string }) {
  return <span className={"inline-block h-2 w-2 rounded-full bg-zinc-300 animate-pulse " + className} />;
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-90">
      <path
        d="M5 12h14M13 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function seedWelcome(): Msg[] {
  return [
    {
      role: "assistant",
      content:
        "原文を貼って「Boost」を押してください。\n【解説】ONで、整流後に“どこがどう良くなったか”を注釈表示します。",
      ts: Date.now(),
    },
  ];
}
