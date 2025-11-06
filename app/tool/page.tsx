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

/* ---------------- Presets ---------------- */

type ToolState = {
  category: string;
  age: string;
  scene: string;
  bulletMode: "default" | "one_idea_one_sentence";
  leadCompact: boolean;
  priceCta: boolean;
  diffFact: boolean;
  numericSensory: boolean;
  complianceStrict: boolean;
  comparisonHelper: boolean;
  annotationMode: boolean;
};

const PRESETS: Array<{ key: string; label: string; hint?: string; s: Partial<ToolState> }> = [
  {
    key: "beauty_40_device",
    label: "美容機器｜40代・週3×15分（推奨）",
    hint: "法規強 × 数値+体感 × 事実差別化",
    s: {
      category: "美容機器",
      age: "40代",
      scene: "週3×15分",
      bulletMode: "default",
      leadCompact: true,
      priceCta: true,
      diffFact: true,
      numericSensory: true,
      complianceStrict: true,
      comparisonHelper: true,
      annotationMode: true,
    },
  },
  {
    key: "beauty_50_slow",
    label: "美容機器｜50代・就寝前ケア",
    hint: "エイジング訴求より・体感強め",
    s: {
      category: "美容機器",
      age: "50代",
      scene: "指定なし",
      bulletMode: "one_idea_one_sentence",
      leadCompact: false,
      priceCta: true,
      diffFact: true,
      numericSensory: true,
      complianceStrict: true,
      comparisonHelper: true,
      annotationMode: true,
    },
  },
  {
    key: "meat_gift",
    label: "食品（精肉）｜ギフト・認証最優先",
    hint: "産地/認証/保存・調理ガイド優先",
    s: {
      category: "食品（精肉）",
      age: "指定なし",
      scene: "ギフト",
      bulletMode: "default",
      leadCompact: true,
      priceCta: false,
      diffFact: true,
      numericSensory: true,
      complianceStrict: true,
      comparisonHelper: true,
      annotationMode: true,
    },
  },
  {
    key: "food_general",
    label: "食品（一般）｜日常使い",
    hint: "添加・アレルギー・保存方法を簡潔に",
    s: {
      category: "食品（一般）",
      age: "指定なし",
      scene: "指定なし",
      bulletMode: "default",
      leadCompact: true,
      priceCta: false,
      diffFact: true,
      numericSensory: true,
      complianceStrict: true,
      comparisonHelper: false,
      annotationMode: true,
    },
  },
  {
    key: "appliance_basic",
    label: "家電｜仕様→“できること”接続",
    hint: "数値は必要十分・比較ヘルパーON",
    s: {
      category: "家電",
      age: "指定なし",
      scene: "指定なし",
      bulletMode: "default",
      leadCompact: true,
      priceCta: true,
      diffFact: true,
      numericSensory: true,
      complianceStrict: true,
      comparisonHelper: true,
      annotationMode: true,
    },
  },
  {
    key: "fashion_min",
    label: "ファッション｜ミニマル訴求",
    hint: "素材・縫製・サイズ運用優先",
    s: {
      category: "ファッション",
      age: "指定なし",
      scene: "指定なし",
      bulletMode: "one_idea_one_sentence",
      leadCompact: true,
      priceCta: false,
      diffFact: true,
      numericSensory: false,
      complianceStrict: true,
      comparisonHelper: false,
      annotationMode: true,
    },
  },
];

/* ---------------- Helpers ---------------- */

function mapAgeToNumber(v: string | null): number | null {
  if (!v) return null;
  if (v.includes("30")) return 30;
  if (v.includes("40")) return 40;
  if (v.includes("50")) return 50;
  return null;
}

function loadLocal<T>(k: string, fb: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch {
    return fb;
  }
}

/* ---------------- Page ---------------- */

export default function ToolPage() {
  const [input, setInput] = useState("");
  const [presetKey, setPresetKey] = useState<string>(() => {
    if (typeof window === "undefined") return PRESETS[0].key;
    return localStorage.getItem("bs_preset_key") || PRESETS[0].key;
  });

  // フラグ・選択群（ローカル保存）
  const [category, setCategory] = useState<string>(() => loadLocal("bs_category", "指定なし"));
  const [age, setAge] = useState<string>(() => loadLocal("bs_age", "指定なし"));
  const [scene, setScene] = useState<string>(() => loadLocal("bs_scene", "指定なし"));
  const [bulletMode, setBulletMode] = useState<"default" | "one_idea_one_sentence">(
    () => loadLocal("bs_bulletMode", "default")
  );

  const [leadCompact, setLeadCompact] = useState<boolean>(() => loadLocal("bs_leadCompact", true));
  const [priceCta, setPriceCta] = useState<boolean>(() => loadLocal("bs_priceCta", true));
  const [diffFact, setDiffFact] = useState<boolean>(() => loadLocal("bs_diffFact", true));
  const [numericSensory, setNumericSensory] = useState<boolean>(() => loadLocal("bs_numericSensory", true));
  const [complianceStrict, setComplianceStrict] = useState<boolean>(() => loadLocal("bs_complianceStrict", true));
  const [comparisonHelper, setComparisonHelper] = useState<boolean>(() => loadLocal("bs_comparisonHelper", true));
  const [annotationMode, setAnnotationMode] = useState<boolean>(() => loadLocal("bs_annotationMode", true));

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

  // 状態保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("bs_msgs", JSON.stringify(msgs));
    localStorage.setItem("bs_free_credits", String(credits));
    localStorage.setItem("bs_preset_key", presetKey);

    localStorage.setItem("bs_category", JSON.stringify(category));
    localStorage.setItem("bs_age", JSON.stringify(age));
    localStorage.setItem("bs_scene", JSON.stringify(scene));
    localStorage.setItem("bs_bulletMode", JSON.stringify(bulletMode));
    localStorage.setItem("bs_leadCompact", JSON.stringify(leadCompact));
    localStorage.setItem("bs_priceCta", JSON.stringify(priceCta));
    localStorage.setItem("bs_diffFact", JSON.stringify(diffFact));
    localStorage.setItem("bs_numericSensory", JSON.stringify(numericSensory));
    localStorage.setItem("bs_complianceStrict", JSON.stringify(complianceStrict));
    localStorage.setItem("bs_comparisonHelper", JSON.stringify(comparisonHelper));
    localStorage.setItem("bs_annotationMode", JSON.stringify(annotationMode));
  }, [
    msgs,
    credits,
    presetKey,
    category,
    age,
    scene,
    bulletMode,
    leadCompact,
    priceCta,
    diffFact,
    numericSensory,
    complianceStrict,
    comparisonHelper,
    annotationMode,
  ]);

  // スクロール末尾
  const scRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scRef.current?.scrollTo({ top: scRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const canSend = input.trim().length > 0 && !busy && credits > 0;

  const applyPreset = (key: string) => {
    const p = PRESETS.find((x) => x.key === key);
    if (!p) return;
    setPresetKey(key);
    if (p.s.category !== undefined) setCategory(p.s.category!);
    if (p.s.age !== undefined) setAge(p.s.age!);
    if (p.s.scene !== undefined) setScene(p.s.scene!);
    if (p.s.bulletMode !== undefined) setBulletMode(p.s.bulletMode!);
    if (p.s.leadCompact !== undefined) setLeadCompact(p.s.leadCompact!);
    if (p.s.priceCta !== undefined) setPriceCta(p.s.priceCta!);
    if (p.s.diffFact !== undefined) setDiffFact(p.s.diffFact!);
    if (p.s.numericSensory !== undefined) setNumericSensory(p.s.numericSensory!);
    if (p.s.complianceStrict !== undefined) setComplianceStrict(p.s.complianceStrict!);
    if (p.s.comparisonHelper !== undefined) setComparisonHelper(p.s.comparisonHelper!);
    if (p.s.annotationMode !== undefined) setAnnotationMode(p.s.annotationMode!);
  };

  useEffect(() => {
    // 初回ロード時に一度だけプリセット適用（保存があればそれ優先）
    if (typeof window === "undefined") return;
    const already = sessionStorage.getItem("bs_preset_applied");
    if (already) return;
    applyPreset(presetKey);
    sessionStorage.setItem("bs_preset_applied", "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const body = {
      prompt,
      annotation_mode: annotationMode,
      lead_compact: leadCompact,
      bullet_mode: bulletMode,
      price_cta: priceCta,
      scene_realism: scene === "週3×15分" ? "device_15min" : null,
      diff_fact: diffFact,
      numeric_sensory: numericSensory,
      compliance_strict: complianceStrict,
      comparison_helper: comparisonHelper,
      audience_age: mapAgeToNumber(age),
      category: category === "指定なし" ? null : category,
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
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
      {/* PCドロップダウン白飛び対策 */}
      <style jsx global>{`
        select {
          color: #e5e5e5;
          background-color: rgba(255, 255, 255, 0.06);
        }
        select:focus {
          outline: none;
        }
        option {
          color: #e5e5e5 !important;
          background-color: #0b0b0f !important;
        }
      `}</style>

      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        {/* 1段目：プリセット帯 */}
        <div className="mx-auto max-w-6xl px-4 py-2">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-zinc-300 shrink-0">プリセット</span>
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <div className="flex gap-2 min-w-max">
                {PRESETS.map((p) => {
                  const active = p.key === presetKey;
                  return (
                    <button
                      key={p.key}
                      onClick={() => applyPreset(p.key)}
                      className={[
                        "rounded-lg px-3 py-1.5 border transition whitespace-nowrap",
                        active
                          ? "bg-white/15 border-white/20 text-zinc-50"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10",
                      ].join(" ")}
                      title={p.hint || ""}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <select
              value={presetKey}
              onChange={(e) => applyPreset(e.target.value)}
              className="bg-white/5 text-sm rounded-md px-2 py-1 border border-white/10 outline-none shrink-0"
              aria-label="プリセット選択"
            >
              {PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2段目：カテゴリ/年代/シーン/バレット */}
        <div className="mx-auto max-w-6xl px-4 py-2 flex items-center gap-3 flex-wrap text-sm">
          <span className="text-zinc-300">ツール</span>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-zinc-400">Boost Suite v2</span>

          <span className="h-4 w-px bg-white/10 ml-3" />
          <span className="text-zinc-300">カテゴリ</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white/5 text-sm rounded-md px-2 py-1 border border-white/10 outline-none"
          >
            <option>指定なし</option>
            <option>美容機器</option>
            <option>食品（精肉）</option>
            <option>食品（一般）</option>
            <option>家電</option>
            <option>インテリア</option>
            <option>ファッション</option>
          </select>

          <span className="h-4 w-px bg-white/10 ml-3" />
          <span className="text-zinc-300">年代</span>
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="bg-white/5 text-sm rounded-md px-2 py-1 border border-white/10 outline-none"
          >
            <option>指定なし</option>
            <option>30代</option>
            <option>40代</option>
            <option>50代</option>
          </select>

          <span className="h-4 w-px bg-white/10 ml-3" />
          <span className="text-zinc-300">シーン</span>
          <select
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            className="bg-white/5 text-sm rounded-md px-2 py-1 border border-white/10 outline-none"
          >
            <option>指定なし</option>
            <option>週3×15分</option>
            <option>ギフト</option>
          </select>

          <span className="h-4 w-px bg-white/10 ml-3" />
          <span className="text-zinc-300">バレット</span>
          <select
            value={bulletMode}
            onChange={(e) => setBulletMode(e.target.value as any)}
            className="bg-white/5 text-sm rounded-md px-2 py-1 border border-white/10 outline-none"
          >
            <option value="default">SmartBullet 標準</option>
            <option value="one_idea_one_sentence">1機能=1文</option>
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

        {/* 3段目：フラグ群 */}
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <Flag label="リード簡潔" value={leadCompact} onChange={setLeadCompact} />
              <Flag label="Price CTA" value={priceCta} onChange={setPriceCta} />
              <Flag label="事実差別化" value={diffFact} onChange={setDiffFact} />
              <Flag label="数値＋体感" value={numericSensory} onChange={setNumericSensory} />
              <Flag label="コンプ強" value={complianceStrict} onChange={setComplianceStrict} />
              <Flag label="比較ヘルパー" value={comparisonHelper} onChange={setComparisonHelper} />
            </div>
          </div>
        </div>

        {/* 4段目：右サマリー＋残数 */}
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-end gap-2">
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
          <div className="mt-3 text-xs text-zinc-500">※ 現在は端末ローカルに保存（ログイン後はサーバー保存）</div>
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
                <p className="mt-2 text-sm text-zinc-400">続きは無料アカウント登録で解放できます。</p>
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

/* ---------------- Small components ---------------- */

function Flag({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 border border-white/10 text-xs text-zinc-300">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const hasAnnotations = !!msg.annotations?.length;
  const [showExplain, setShowExplain] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const indexed: AnnWithIdx[] = withIndex(msg.annotations || []);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      alert("コピーしました！");
    } catch {
      alert("コピーに失敗しました");
    }
  };

  const jumpToMarker = (idx: number) => {
    const root = bubbleRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-ann="${idx}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    setHoverIdx(idx);
    setTimeout(() => setHoverIdx(null), 1000);
  };

  return (
    <div
      ref={bubbleRef}
      className={[
        "relative w-fit max-w-full break-words rounded-2xl px-4 py-3",
        isUser ? "ml-auto bg-white text-zinc-950" : "mr-auto bg-white/5 border border-white/10 text-zinc-100",
      ].join(" ")}
    >
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
                <span className="absolute -top-1 -right-1 rounded bg-white/20 border border-white/20 px-1 text-[10px] leading-4">
                  {msg.annotations?.length}
                </span>
              </button>

              <button
                onClick={() =>
                  downloadBlob("annotations.json", JSON.stringify(msg.annotations, null, 2), "application/json")
                }
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
                onJump={jumpToMarker}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Annotations ---------------- */

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
  onJump,
}: {
  items: AnnWithIdx[];
  hoverIdx: number | null;
  setHoverIdx: (n: number | null) => void;
  onJump: (idx: number) => void;
}) {
  if (!items?.length) return null;

  type UIState = {
    filter: string | null;
    search: string;
    pinned: number[];
    collapsedSections: string[];
    expandAll: boolean;
  };
  const STORE = "bs_ann_ui";
  const loadState = (): UIState => {
    try {
      const raw = localStorage.getItem(STORE);
      return raw
        ? JSON.parse(raw)
        : { filter: null, search: "", pinned: [], collapsedSections: [], expandAll: true };
    } catch {
      return { filter: null, search: "", pinned: [], collapsedSections: [], expandAll: true };
    }
  };

  const [ui, setUi] = useState<UIState>(loadState);
  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify(ui));
  }, [ui]);

  const types = useMemo(() => Array.from(new Set(items.map((a) => typeLabel(a.type)))), [items]);

  const filtered = useMemo(() => {
    let arr = items.slice();
    if (ui.filter) arr = arr.filter((a) => typeLabel(a.type) === ui.filter);
    if (ui.search.trim()) {
      const q = ui.search.trim().toLowerCase();
      arr = arr.filter(
        (a) =>
          a.text.toLowerCase().includes(q) ||
          (a.quote || "").toLowerCase().includes(q) ||
          (a.section || "").toLowerCase().includes(q)
      );
    }
    const pins = new Set(ui.pinned);
    arr.sort((x, y) => {
      const px = pins.has(x._idx) ? -1 : 0;
      const py = pins.has(y._idx) ? -1 : 0;
      if (px !== py) return px - py;
      return x._idx - y._idx;
    });
    return arr;
  }, [items, ui.filter, ui.search, ui.pinned]);

  const groups = useMemo(() => {
    const g: Record<string, AnnWithIdx[]> = {};
    for (const it of filtered) {
      const k = it.section || "misc";
      (g[k] ||= []).push(it);
    }
    return g;
  }, [filtered]);

  const secList = Object.keys(groups);

  const badge = (t: string) => (
    <span className="ml-2 inline-flex items-center rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] border border-white/10">
      {t}
    </span>
  );

  const togglePin = (idx: number) => {
    setUi((s) => {
      const set = new Set(s.pinned);
      if (set.has(idx)) set.delete(idx);
      else set.add(idx);
      return { ...s, pinned: Array.from(set) };
    });
  };

  const toggleSection = (sec: string) => {
    setUi((s) => {
      const set = new Set(s.collapsedSections);
      if (set.has(sec)) set.delete(sec);
      else set.add(sec);
      return { ...s, collapsedSections: Array.from(set) };
    });
  };

  const setAllExpand = (open: boolean) => {
    setUi((s) => ({
      ...s,
      expandAll: open,
      collapsedSections: open ? [] : secList.slice(),
    }));
  };

  const copyAll = async () => {
    try {
      const text = filtered.map((a) => `[${a._idx}] ${a.text}`).join("\n");
      await navigator.clipboard.writeText(text);
      alert("注釈をまとめてコピーしました");
    } catch {
      alert("コピーに失敗しました");
    }
  };

  const exportMarkdown = () => {
    const lines: string[] = ["# 解説（Annotations）\n"];
    for (const sec of secList) {
      const arr = groups[sec];
      if (!arr?.length) continue;
      lines.push(`## ${sec}`);
      for (const a of arr) {
        lines.push(`- [${a._idx}] ${a.text}  _(${typeLabel(a.type)} / ${a.importance})_`);
        if (a.quote) lines.push(`  > “${a.quote}”`);
      }
      lines.push("");
    }
    downloadBlob("annotations.md", lines.join("\n"), "text/markdown");
  };

  const exportCSV = () => {
    const header = ["idx", "section", "type", "importance", "text", "quote"];
    const rows = filtered.map((a) => [
      a._idx,
      csvSafe(a.section),
      csvSafe(typeLabel(a.type)),
      csvSafe(a.importance),
      csvSafe(a.text),
      csvSafe(a.quote || ""),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadBlob("annotations.csv", csv, "text/csv;charset=utf-8;");
  };

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
      {/* 操作列 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* タイプ絞り込み */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            className={`text-[11px] rounded-md px-2 py-1 border ${
              !ui.filter ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10"
            }`}
            onClick={() => setUi((s) => ({ ...s, filter: null }))}
          >
            全て
          </button>
          {types.map((t) => (
            <button
              key={t}
              className={`text-[11px] rounded-md px-2 py-1 border ${
                ui.filter === t ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10"
              }`}
              onClick={() => setUi((s) => ({ ...s, filter: t }))}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 検索 */}
        <input
          value={ui.search}
          onChange={(e) => setUi((s) => ({ ...s, search: e.target.value }))}
          placeholder="検索（text / quote / section）"
          className="ml-2 min-w-[180px] flex-1 rounded-md bg-black/30 px-2 py-1 text-xs border border-white/10 outline-none placeholder:text-zinc-500"
        />

        {/* 一括操作 */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setAllExpand(true)} className="text-[11px] text-zinc-300 hover:text-white underline decoration-white/20">
            全展開
          </button>
          <button onClick={() => setAllExpand(false)} className="text-[11px] text-zinc-300 hover:text-white underline decoration-white/20">
            全閉じ
          </button>
          <span className="mx-1 h-4 w-px bg-white/10" />
          <button onClick={copyAll} className="text-[11px] text-zinc-300 hover:text-white underline decoration-white/20">
            まとめてコピー
          </button>
          <button
            onClick={() => downloadBlob("annotations.json", JSON.stringify(items, null, 2), "application/json")}
            className="text-[11px] text-zinc-300 hover:text-white underline decoration-white/20"
          >
            JSON
          </button>
          <button onClick={exportMarkdown} className="text-[11px] text-zinc-300 hover:text-white underline decoration-white/20">
            MD
          </button>
          <button onClick={exportCSV} className="text-[11px] text-zinc-300 hover:text-white underline decoration-white/20">
            CSV
          </button>
        </div>
      </div>

      {/* セクションごと */}
      {Object.entries(groups).map(([sec, arr]) => {
        const collapsed = ui.expandAll ? ui.collapsedSections.includes(sec) : !ui.collapsedSections.includes(sec);
        return (
          <div key={sec} className="mb-3">
            <button
              onClick={() => toggleSection(sec)}
              className="w-full flex items-center justify-between rounded-md bg-black/20 px-2 py-1 border border-white/10 text-left"
            >
              <div className="text-xs uppercase tracking-wide text-zinc-400">
                {sec}
                <span className="ml-2 text-[10px] text-zinc-500">({arr.length})</span>
              </div>
              <span className="text-[10px] text-zinc-400">{collapsed ? "＋" : "－"}</span>
            </button>

            {!collapsed && (
              <ul className="mt-2 space-y-2">
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
                        {a._idx && (
                          <button
                            onClick={() => onJump(a._idx)}
                            className="mr-1 text-[10px] rounded bg-white/10 border border-white/10 px-1 align-middle hover:bg-white/20"
                            title="本文の該当位置へ移動"
                          >
                            [{a._idx}]
                          </button>
                        )}
                        {a.text}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          className="text-[10px] text-zinc-400 hover:text-zinc-200 underline decoration-white/20"
                          onClick={() => navigator.clipboard?.writeText(a.text)}
                          aria-label="注釈をコピー"
                        >
                          コピー
                        </button>
                        <button
                          className={`text-[10px] underline decoration-white/20 ${
                            (loadLocal<number[]>("__dummy", []) as any) // no-op
                          } ${/* keep class merging deterministic */ ""} ${
                            /* pin visual handled in parent */ ""}`}
                          onClick={() => {}}
                          title=""
                          aria-hidden
                          style={{ display: "none" }}
                        />
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-400 flex items-center">
                      <span className="ml-0 inline-flex items-center rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] border border-white/10">
                        {typeLabel(a.type)}
                      </span>
                      <span className="ml-2 inline-flex items-center rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] border border-white/10">
                        {a.importance}
                      </span>
                    </div>
                    {a.quote && <div className="mt-1 text-[11px] text-zinc-500 line-clamp-1">“{a.quote}”</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Markers (本文 [n]) ---------------- */

function withIndex<T extends Annotation>(items: T[] = []): (T & { _idx: number })[] {
  return items.map((a, i) => ({ ...a, _idx: i + 1 }));
}

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
    html = html.replace(re, (m) => `${m}${markerSup(a._idx, hoverIdx)}`);
  }
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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function downloadBlob(filename: string, data: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function csvSafe(s: string | undefined | null): string {
  const v = (s ?? "").replace(/"/g, '""');
  return `"${v}"`;
}

/* ---------------- UI bits ---------------- */

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
      <path d="M5 12h14M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
        "原文を貼って「Boost」を押してください。\n上のプリセットを押すだけで“カテゴリ/年齢/シーン/法規”などが自動最適化されます。解説ONで、どこが良くなったかも注釈表示。",
      ts: Date.now(),
    },
  ];
}
