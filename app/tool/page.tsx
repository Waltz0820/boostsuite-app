"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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
};

const MAX_FREE_CREDITS = 5;
const MAX_INPUT_CHARS = 4000;

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
              赤ペン先生ON
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
                CN/EN原文もOK。Boost Suiteが自然な日本語へ整流＋注釈します。
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
      <div className="whitespace-pre-wrap text-sm leading-relaxed pr-6">{msg.content}</div>

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
            <details className="mt-3 bg-black/20 rounded-lg border border-white/10 p-3">
              <summary className="cursor-pointer text-sm text-zinc-300">
                💬 整流注釈を見る（{msg.annotations?.length}）
              </summary>
              <div className="mt-2 space-y-1 text-xs text-zinc-400">
                {msg.annotations?.map((a, i) => (
                  <div key={i}>
                    <span
                      className={`inline-block px-1.5 py-[1px] mr-2 rounded text-[10px] ${
                        a.importance === "high"
                          ? "bg-rose-500/40 text-rose-100"
                          : a.importance === "medium"
                          ? "bg-amber-500/30 text-amber-100"
                          : "bg-white/10 text-zinc-300"
                      }`}
                    >
                      {a.type}
                    </span>
                    {a.text}
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
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
  return <span className={"inline-block h-2 w-2 rounded-full bg-zinc-300 animate-pulse " + className} />;
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-90">
      <path d="M5 12h14M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
      content: "原文を貼って「Boost」を押してください。\n赤ペン先生ONで、整流後に“どこがどう良くなったか”も注釈表示します。",
      ts: Date.now(),
    },
  ];
}
