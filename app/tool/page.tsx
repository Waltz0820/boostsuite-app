// app/tool/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string; ts: number };

const MAX_FREE_CREDITS = 5; // ゲスト上限（あとでENV化可）

export default function ToolPage() {
  const [input, setInput] = useState("");
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
  const [model, setModel] = useState("Boost Suite v0");

  // 保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("bs_msgs", JSON.stringify(msgs));
  }, [msgs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("bs_free_credits", String(credits));
  }, [credits]);

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
    const user: Msg = { role: "user", content: input.trim(), ts: Date.now() };
    setMsgs((m) => [...m, user]);
    setInput("");
    setBusy(true);
    setCredits((c) => Math.max(0, c - 1));

    // まず API に投げる（/api/generate）。失敗したらデモへ。
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: user.content }),
      });

      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as { text?: string };
      const text = data?.text?.trim();
      if (!text) throw new Error("empty");

      await streamAppend(text, (chunk) =>
        setMsgs((m) => {
          const last = m[m.length - 1];
          if (last?.role === "assistant") {
            const head = m.slice(0, -1);
            return [...head, { ...last, content: last.content + chunk }];
          }
          return [...m, { role: "assistant", content: chunk, ts: Date.now() }];
        })
      );
    } catch {
      const demo = demoAnswer(user.content);
      await streamAppend(demo, (chunk) =>
        setMsgs((m) => {
          const last = m[m.length - 1];
          if (last?.role === "assistant") {
            const head = m.slice(0, -1);
            return [...head, { ...last, content: last.content + chunk }];
          }
          return [...m, { role: "assistant", content: chunk, ts: Date.now() }];
        })
      );
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
      <div className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">ツール</span>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-sm text-zinc-300">モデル</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-white/5 text-sm rounded-md px-2 py-1 border border-white/10 outline-none"
            >
              <option>Boost Suite v0</option>
              <option disabled>Boost Suite v1（準備中）</option>
            </select>
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
        {/* Sidebar（履歴） */}
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
                    title="クリックで本文に再投入"
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

        {/* Chat area */}
        <section className="flex flex-col min-h-[70svh]">
          <div
            ref={scRef}
            className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4"
          >
            {msgs.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}
            {busy && <Typing />}
          </div>

          {/* Input */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="商品説明・原文・URLなどを貼り付けてください"
              rows={3}
              className="w-full resize-none bg-transparent outline-none text-sm placeholder:text-zinc-500"
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                ヒント：CN/EN 原文もOK。日本語の“買いたくなる言い回し”に整流します。
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

          {/* Soft Wall */}
          {showWall && (
            <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 backdrop-blur-sm">
              <div className="w-[92%] max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 text-center">
                <h3 className="text-lg font-semibold text-white">無料体験の上限に達しました</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  続きは無料アカウントで解放できます。登録は30秒。
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
                    とりあえず閉じる
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

function Bubble({ role, text }: { role: Msg["role"]; text: string }) {
  const isUser = role === "user";
  return (
    <div
      className={[
        "max-w-[92%] md:max-w-[80%] rounded-2xl px-4 py-3",
        isUser
          ? "ml-auto bg-white text-zinc-950"
          : "mr-auto bg-white/5 border border-white/10 text-zinc-100",
      ].join(" ")}
    >
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{text}</div>
    </div>
  );
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
  return (
    <span
      className={"inline-block h-2 w-2 rounded-full bg-zinc-300 animate-pulse " + className}
    />
  );
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

/* ---------------- helpers ---------------- */

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function seedWelcome(): Msg[] {
  return [
    {
      role: "assistant",
      content:
        "原文を貼って「Boost」を押してください。\n直訳感を抑え、“買いたくなる日本語”へ整流します。",
      ts: Date.now(),
    },
  ];
}

// 擬似ストリーミング
async function streamAppend(
  full: string,
  onChunk: (chunk: string) => void,
  speed = 12 // 1チャンクあたりms
) {
  const tokens = tokenize(full, 8); // 8文字ずつ
  for (const t of tokens) {
    await sleep(speed);
    onChunk(t);
  }
}

function tokenize(s: string, size: number) {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// デモ応答：最小の“整流サンプル”
function demoAnswer(src: string) {
  const base =
    "整流案A（セーフ）\n" +
    "・事実で支え、余韻で締める。\n" +
    "・直訳表現をやわらげ、日本語の購入文脈へ再構成。\n\n" +
    "整流案B（オフェンシブ）\n" +
    "・感情の入口を少し広げ、期待と安心を同時に設計。\n";
  const echo =
    src.length > 0
      ? `\n— 原文の要点\n「${truncate(src.replace(/\s+/g, " "), 60)}」\n`
      : "";
  const close = "\n必要ならカテゴリ最適化（Beauty/Gadget ほか）も適用します。";
  return base + echo + close;
}