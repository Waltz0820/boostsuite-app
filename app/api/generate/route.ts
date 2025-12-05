/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/* =========================================================================
   Runtime / Timeouts
   ========================================================================= */
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SERVER_TIMEOUT_MS = Math.max(
  60_000,
  Math.min(295_000, (maxDuration - 5) * 1000)
);

// ★ Stage0用タイムアウト（やや短め）
const STAGE0_TIMEOUT_MS = Math.min(SERVER_TIMEOUT_MS, 45_000);
const STAGE1_TIMEOUT_MS = Math.min(SERVER_TIMEOUT_MS, 120_000);
const STAGE2_TIMEOUT_MS = Math.min(SERVER_TIMEOUT_MS, 120_000);
const STAGE3_TIMEOUT_MS = 60_000;

/* =========================================================================
   File Utils
   ========================================================================= */
function readText(rel: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
  } catch {
    console.warn(`⚠️ Missing file: ${rel}`);
    return "";
  }
}
function readJsonSafe<T>(rel: string, fb: T): T {
  try {
    const t = readText(rel);
    return t ? (JSON.parse(t) as T) : fb;
  } catch {
    return fb;
  }
}

/* =========================================================================
   Local Knowledge
   ========================================================================= */
function readCategoryCsv(rel: string) {
  const rows = readText(rel)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: Array<{
    l1: string;
    l2: string;
    mode: string;
    pitch_keywords: string[];
  }> = [];
  for (const line of rows.slice(1)) {
    const cols = line.split(",").map((s) => s.trim());
    if (cols.length >= 3) {
      out.push({
        l1: cols[0],
        l2: cols[1],
        mode: cols[2],
        pitch_keywords: cols[3]
          ? cols[3]
              .split("|")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      });
    }
  }
  return out;
}
type EmotionJSON = { emotions: Array<{ id: string }> };
type StyleJSON = { styles: Array<{ id: string }> };

const LOCAL_CATS = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", {
  emotions: [],
});
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", {
  styles: [],
});

/* =========================================================================
   Prompts
   ========================================================================= */
// v2.0.8 を prompts/bs_prompt_v2.0.8.txt に配置済み想定
const CORE_PROMPT_V208 = readText("prompts/bs_prompt_v2.0.8.txt");
const CORE_PROMPT =
  CORE_PROMPT_V208 || "You are Boost Suite v2.0.8 copy refiner.";

const YAKKI_FILTERS = ["A", "B", "C", "D"]
  .map((k) => readText(`prompts/filters/BoostSuite_薬機法フィルター${k}.txt`))
  .filter(Boolean)
  .join("\n");

// ★ Talkflow 用 few-shot サンプル（SUNLUM）
const TALKFLOW_FEWSHOT = readText(
  "prompts/fewshots/BoostSuite_Talkflow_SUNLUM_v1.txt"
);

// Explain Layer は 1.0 固定
const EXPLAIN_PROMPT_V1 = readText(
  "prompts/explain/BoostSuite_Explain_v1.0.txt"
);

/* =========================================================================
   OpenAI helpers
   ========================================================================= */
const isFiveFamily = (m: string) => /^gpt-5($|-)/i.test(m);

// ★ Stage0用モデル
const DEFAULT_STAGE0_MODEL =
  process.env.BOOST_STAGE0_MODEL?.trim() || "gpt-4o-mini";

const DEFAULT_STAGE1_MODEL =
  process.env.BOOST_STAGE1_MODEL?.trim() || "gpt-5-mini";
const DEFAULT_STAGE2_MODEL =
  process.env.BOOST_STAGE2_MODEL?.trim() || "gpt-4o-mini";
const STRONG_HUMANIZE_MODEL =
  process.env.BOOST_STRONG_HUMANIZE_MODEL?.trim() || "gpt-5.1";
// 5.1 清書係。例: gpt-5.1 などを環境変数で指定
const FINAL_POLISH_MODEL =
  process.env.BOOST_FINAL_POLISH_MODEL?.trim() || "gpt-5.1";
const EXPLAIN_LAYER_MODEL =
  process.env.BOOST_EXPLAIN_MODEL?.trim() || "gpt-4o-mini";

async function callOpenAI(payload: any, key: string, timeout: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const raw = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(raw);
    } catch {}
    const content = json?.choices?.[0]?.message?.content ?? "";
    if (res.ok) return { ok: true as const, content };
    return {
      ok: false as const,
      error: json?.error ?? (raw || res.statusText),
    };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || String(e) };
  } finally {
    clearTimeout(t);
  }
}

/* =========================================================================
   Stage0 Meta & Persona Analyzer
   ========================================================================= */
type Stage0Meta = {
  category?: string | null;
  value_tier?: "mass" | "mid" | "premium" | "luxury" | null;
  info_density?: "additive" | "balanced" | "subtractive" | null;
  scene?: "device_15min" | "gift" | "daily" | null;
  target_age?: number | null;
  persona?: string | null;
  tone_keywords?: string[];
  forbidden_patterns?: string[];
  encouraged_patterns?: string[];
  emotional_highlights?: string[];
  final_cadence?: string | null;
};

const DEFAULT_STAGE0_META: Stage0Meta = {
  category: null,
  value_tier: null,
  info_density: null,
  scene: null,
  target_age: null,
  persona: null,
  tone_keywords: [],
  forbidden_patterns: [],
  encouraged_patterns: [],
  emotional_highlights: [],
  final_cadence: null,
};

async function runStage0Meta(
  compact: string,
  apiKey: string
): Promise<Stage0Meta> {
  if (!compact) return { ...DEFAULT_STAGE0_META };

  const payload: any = {
    model: DEFAULT_STAGE0_MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You are Boost Suite Stage0 Meta & Persona Analyzer.",
          "You read the original product text and output ONLY JSON with fields:",
          "{",
          '  "category": string|null,',
          '  "value_tier": "mass"|"mid"|"premium"|"luxury"|null,',
          '  "info_density": "additive"|"balanced"|"subtractive"|null,',
          '  "scene": "device_15min"|"gift"|"daily"|null,',
          '  "target_age": number|null,',
          '  "persona": string|null,',
          '  "tone_keywords": string[],',
          '  "forbidden_patterns": string[],',
          '  "encouraged_patterns": string[],',
          '  "emotional_highlights": string[],',
          '  "final_cadence": string|null',
          "}",
          "Use short Japanese labels for category (例: \"美容家電\",\"食品\",\"ネイルツール\" など).",
          "Do not add any explanation text. Return JSON only.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          "【入力テキスト】",
          compact,
          "",
          "上記をもとに、説明なしで JSON だけを返してください。",
        ].join("\n"),
      },
    ],
    stream: false,
    temperature: 0.0,
    top_p: 1.0,
  };

  const res = await callOpenAI(payload, apiKey, STAGE0_TIMEOUT_MS);
  if (!res.ok) {
    console.warn("⚠️ Stage0 meta failed:", res.error);
    return { ...DEFAULT_STAGE0_META };
  }

  try {
    const parsed = JSON.parse(String(res.content || "{}"));
    const m: Stage0Meta = {
      category: parsed?.category ?? null,
      value_tier: parsed?.value_tier ?? null,
      info_density: parsed?.info_density ?? null,
      scene: parsed?.scene ?? null,
      target_age:
        typeof parsed?.target_age === "number" ? parsed.target_age : null,
      persona: parsed?.persona ?? null,
      tone_keywords: Array.isArray(parsed?.tone_keywords)
        ? parsed.tone_keywords.map((x: any) => String(x)).filter(Boolean)
        : [],
      forbidden_patterns: Array.isArray(parsed?.forbidden_patterns)
        ? parsed.forbidden_patterns.map((x: any) => String(x)).filter(Boolean)
        : [],
      encouraged_patterns: Array.isArray(parsed?.encouraged_patterns)
        ? parsed.encouraged_patterns.map((x: any) => String(x)).filter(Boolean)
        : [],
      emotional_highlights: Array.isArray(parsed?.emotional_highlights)
        ? parsed.emotional_highlights
            .map((x: any) => String(x))
            .filter(Boolean)
        : [],
      final_cadence: parsed?.final_cadence ?? null,
    };
    return { ...DEFAULT_STAGE0_META, ...m };
  } catch (e) {
    console.warn(
      "⚠️ Stage0 meta JSON parse failed:",
      (e as any)?.message || e,
      "raw:",
      String(res.content || "").slice(0, 200)
    );
    return { ...DEFAULT_STAGE0_META };
  }
}

/* =========================================================================
   Supabase
   ========================================================================= */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function sbRead() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false },
  });
}
async function sbServer() {
  const ck = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: { get: (n) => ck.get(n)?.value, set() {}, remove() {} },
  });
}

/* =========================================================================
   Light FactLock（単位／語調／改行整形＋注意書きバリエーション）
   ========================================================================= */
function softenDisclaimers(text: string) {
  const table: Record<string, string[]> = {
    "※個人差があります。": [
      "※感じ方には個人差があります。",
      "※体感には個人差があります。",
      "※使用条件により印象は異なります。",
      "※ご実感には個人差があります。",
    ],
    "※使用環境により異なる": [
      "※使用環境により異なります",
      "※環境により前後します",
      "※条件により変動します",
    ],
  };
  let out = text;
  for (const [key, arr] of Object.entries(table)) {
    out = out.replace(new RegExp(key, "g"), () => {
      return arr[Math.floor(Math.random() * arr.length)];
    });
  }
  return out;
}

function factLock(text: string) {
  if (!text) return "";
  const t = text
    .replace(/ｍｌ|ＭＬ|㎖/g, "mL")
    .replace(/ｗ|Ｗ/g, "W")
    .replace(/℃/g, "°C")
    .replace(/本製品/g, "このアイテム")
    .replace(/　/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return softenDisclaimers(t);
}

/* ★ 亡霊機能（交換ヘッドなど）を潰すフィルタ */
function stripPhantomFeatures(stage1Text: string, text: string) {
  const stage1HasHead = /ヘッド|head|アタッチメント/i.test(stage1Text);
  if (stage1HasHead) return text;

  // Stage1にヘッド系ワードが一度も出てこないなら、
  // 「交換ヘッド」を含む行は丸ごと削除する（安全側に倒す）
  return text.replace(/^.*交換ヘッド.*$/gm, "");
}

/* ★ Stage2 のタイトルセクションを Stage3 に強制的に戻すロック処理 */
function restoreSectionFromStage2(
  stage2: string,
  stage3: string,
  headerPrefix: string
): string {
  const extractRange = (
    src: string
  ): { lines: string[]; start: number; end: number } | null => {
    const lines = src.split("\n");
    const start = lines.findIndex((l) => l.startsWith(headerPrefix));
    if (start === -1) return null;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^\d+\.\s*【/.test(lines[i])) {
        end = i;
        break;
      }
    }
    return { lines, start, end };
  };

  const s2 = extractRange(stage2);
  const s3 = extractRange(stage3);
  if (!s2 || !s3) return stage3;

  const before = s3.lines.slice(0, s3.start);
  const after = s3.lines.slice(s3.end);
  const replacement = s2.lines.slice(s2.start, s2.end);
  return [...before, ...replacement, ...after].join("\n");
}

/* =========================================================================
   Category Hint（軽量カテゴリ別チューニング）
   ========================================================================= */
function buildCategoryHint(
  category?: string | null,
  opts?: {
    scene?: null | "device_15min" | "gift";
    age?: null | number;
    comparison_helper?: boolean;
    diff_comp_price?: boolean;
  }
) {
  const cat = (category || "").toLowerCase();
  const lines: string[] = [];

  if (!cat) {
    lines.push(
      "CategoryHint: 一般",
      "- 仕様は“何ができるか”に接続。専門数値は必要時のみ。",
      "- 差別化は事実ベース（設計・運用・体験の差）。",
      "- 価格は非数値CTAで表現可。"
    );
  }

  if (
    cat.includes("美容") ||
    cat.includes("beauty") ||
    cat.includes("skincare")
  ) {
    lines.push(
      "CategoryHint: 美容機器",
      "- 専門数値（MHz, nm, 深度）はFAQへ逃がすか削除。温度は体感併記（数値＋体感）。",
      "- 安全・注意は不安を煽らず一般表現で網羅（階層化）。",
      "- 差別化は“実際の仕様・運用”だけに基づくこと（どの機能を1台にまとめているか、どのような使い方がしやすいかなど）。",
      "- 価格は具体額NG。CTAは非数値で緊急性を伝える。"
    );
  }

  if (cat.includes("食品") || cat.includes("food") || cat.includes("grocery")) {
    lines.push(
      "CategoryHint: 食品",
      "- 認証（例：HACCP/GAP）・産地・品種は優先度高。加工・保存・調理ガイドは構造化。",
      "- アレルギー表記を簡潔に（必要に応じて“商品ページ参照”へ誘導）。",
      "- ネガ表現は一般化してポジ転（例：『交配種ではない』→『系統が安定した風味（断定回避）』）。",
      "- 栄養・効能は断定しない（一般的説明＋個人差・出典参照）。",
      "- 地域スローガンやグレード表現（清浄・特選・プレミアム等）は、タイトルか本文1か所にとどめ、連呼しない。",
      "- ギフト推しは『贈り物に“も”使える』トーンに抑え、まずは家庭で楽しむシーンを主軸にする。"
    );
  }

  // 年代プリセット（文体・Q&Aの焦点）
  if (opts?.age) {
    lines.push("AgePreset:");
    if (opts.age >= 50)
      lines.push(
        "- 50代：やさしめの語尾、実感・続けやすさを重視。Q&Aに敏感肌配慮を含める."
      );
    else if (opts.age >= 40)
      lines.push(
        "- 40代：時短・習慣化・週3×15分を強調。Q&Aに継続性の質問を含める."
      );
    else
      lines.push(
        "- 30代：予防・毛穴・軽量運用。Q&Aに使用頻度（毎日？週何回？）を含める."
      );
  }

  // 利用シーンヒント
  if (opts?.scene === "device_15min") {
    lines.push(
      "- Scene: device_15min → 入浴後/就寝前 × 週3回 × 1回15分を自然に織り込む."
    );
  } else if (opts?.scene === "gift") {
    lines.push(
      "- Scene: gift → 贈答導線（熨斗/包装/賞味期限/保管方法）を短く触れる."
    );
  }

  // 比較ブロック
  if (opts?.comparison_helper) {
    lines.push(
      "- Comparison: 体験軸（通う手間 vs 在宅・共有）で1段。誇大・最上表現は禁止."
    );
  }
  if (opts?.diff_comp_price) {
    lines.push(
      "- PricePositioning: 金額や率は出さず、『初期投資のみ・長期運用』など非数値で位置づける."
    );
  }

  return lines.join("\n");
}

/* =========================================================================
   SEO Keyword Extractor（料理名・商品名の保持）
   ========================================================================= */
function extractSeoKeywords(compact: string): string[] {
  const text = String(compact || "");
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 冒頭〜数行を「商品名ブロック」とみなす
  const firstBlock = lines.slice(0, 5).join(" ");

  const katakana = firstBlock.match(/[ァ-ヴー]{3,}/g) || [];
  const hangul = firstBlock.match(/[가-힣]{2,}/g) || [];
  const latin = firstBlock.match(/[A-Za-z][A-Za-z0-9\-]{3,}/g) || [];

  const merged = [...katakana, ...hangul, ...latin];
  const uniq = Array.from(new Set(merged));
  return uniq;
}

/* =========================================================================
   Stage1 Meta JSON（価値レイヤー）パース
   ========================================================================= */
type Stage1Meta = {
  category?: string | null;
  value_tier?: "mass" | "mid" | "premium" | "luxury" | null;
  info_density?: "additive" | "balanced" | "subtractive" | null;
  scene?: "device_15min" | "gift" | "daily" | null;
  target_age?: number | null;
  bullet_mode?: "default" | "one_idea_one_sentence" | null;
  lead_compact?: boolean;
  price_cta?: boolean;
  diff_fact?: boolean;
  numeric_sensory?: boolean;
  compliance_strict?: boolean;
  comparison_helper?: boolean;
  diff_comp_price?: boolean;
};

const DEFAULT_STAGE1_META: Stage1Meta = {
  category: null,
  value_tier: "mid",
  info_density: "balanced",
  scene: null,
  target_age: null,
  bullet_mode: "default",
  lead_compact: true,
  price_cta: true,
  diff_fact: true,
  numeric_sensory: true,
  compliance_strict: true,
  comparison_helper: false,
  diff_comp_price: false,
};

function parseStage1MetaAndBody(raw: string): {
  meta: Stage1Meta;
  body: string;
} {
  const text = String(raw || "");
  const start = text.indexOf("<<META_JSON>>");
  const end = text.indexOf("<<END_META_JSON>>");

  if (start === -1 || end === -1 || end <= start) {
    // Meta未対応プロンプトのフォールバック
    return { meta: { ...DEFAULT_STAGE1_META }, body: text.trim() };
  }

  const jsonPart = text.slice(start + "<<META_JSON>>".length, end).trim();
  let meta: Stage1Meta = { ...DEFAULT_STAGE1_META };
  try {
    const parsed = JSON.parse(jsonPart);
    meta = { ...meta, ...(parsed || {}) };
  } catch (e) {
    console.warn(
      "⚠️ Stage1 meta JSON parse failed:",
      (e as any)?.message || e
    );
  }

  const body = text.slice(end + "<<END_META_JSON>>".length).trim();
  return { meta, body };
}

type DerivedFlags = {
  category: string | null;
  scene_realism: null | "device_15min" | "gift";
  audience_age: number | null;
  bullet_mode: "default" | "one_idea_one_sentence";
  lead_compact: boolean;
  price_cta: boolean;
  diff_fact: boolean;
  numeric_sensory: boolean;
  compliance_strict: boolean;
  comparison_helper: boolean;
  diff_comp_price: boolean;
  // ★ Stage0 Persona
  persona: string | null;
};

function deriveFlagsFromMeta(
  meta: Stage1Meta,
  req: {
    category: string | null;
    scene_realism: null | "device_15min" | "gift";
    audience_age: number | null;
    bullet_mode: "default" | "one_idea_one_sentence";
    lead_compact: boolean;
    price_cta: boolean;
    diff_fact: boolean;
    numeric_sensory: boolean;
    compliance_strict: boolean;
    comparison_helper: boolean;
    diff_comp_price: boolean;
  },
  // ★ Stage0からの補正
  s0?: Stage0Meta | null
): DerivedFlags {
  const catFromStage0 =
    s0?.category && s0.category !== "その他" ? s0.category : null;
  const catFromMeta =
    meta.category && meta.category !== "その他" ? meta.category : null;

  const sceneFromStage0 =
    s0?.scene === "device_15min" || s0?.scene === "gift" ? s0.scene : null;
  const sceneFromMeta =
    meta.scene === "device_15min" || meta.scene === "gift" ? meta.scene : null;

  const ageFromStage0 =
    typeof s0?.target_age === "number" ? s0.target_age : null;
  const ageFromMeta =
    typeof meta.target_age === "number" ? meta.target_age : null;

  return {
    category: catFromStage0 ?? catFromMeta ?? req.category,
    scene_realism:
      ((sceneFromStage0 as any) ??
        (sceneFromMeta as any) ??
        req.scene_realism) || null,
    audience_age: ageFromStage0 ?? ageFromMeta ?? req.audience_age,
    bullet_mode: (meta.bullet_mode as any) || req.bullet_mode || "default",
    lead_compact:
      typeof meta.lead_compact === "boolean"
        ? meta.lead_compact
        : req.lead_compact,
    price_cta:
      typeof meta.price_cta === "boolean" ? meta.price_cta : req.price_cta,
    diff_fact:
      typeof meta.diff_fact === "boolean" ? meta.diff_fact : req.diff_fact,
    numeric_sensory:
      typeof meta.numeric_sensory === "boolean"
        ? meta.numeric_sensory
        : req.numeric_sensory,
    compliance_strict:
      typeof meta.compliance_strict === "boolean"
        ? meta.compliance_strict
        : req.compliance_strict,
    comparison_helper:
      typeof meta.comparison_helper === "boolean"
        ? meta.comparison_helper
        : req.comparison_helper,
    diff_comp_price:
      typeof meta.diff_comp_price === "boolean"
        ? meta.diff_comp_price
        : req.diff_comp_price,
    // persona は Stage0 専任
    persona: s0?.persona ?? null,
  };
}

/* =========================================================================
   ValueTier / InfoDensity Hint（価値階層レイヤー）
   ========================================================================= */
function buildValueTierHint(meta: Stage1Meta): string {
  const vt = meta.value_tier || "mid";
  const id = meta.info_density || "balanced";

  const lines: string[] = [];
  lines.push("ValueTier & InfoDensity Hints:");

  // 価値帯ごとの書き方
  if (vt === "mass") {
    lines.push(
      "- ValueTier: mass → 「手軽・毎日・コスパ」を素直に伝える。説明はやや具体的でOKだが、押しつけずフラットに。"
    );
  } else if (vt === "mid") {
    lines.push(
      "- ValueTier: mid → 機能と価格のバランスを意識し、「使いやすさ」「続けやすさ」を自然に織り込む。"
    );
  } else if (vt === "premium") {
    lines.push(
      "- ValueTier: premium → 素材・工程・設計など“こだわり”を描く。ただし感情を煽らず、静かな自信として表現する。"
    );
  } else if (vt === "luxury") {
    lines.push(
      "- ValueTier: luxury → 説明しすぎず余白を残す。スペックや数値よりも、体験シーンや世界観を短く象徴的に描く。"
    );
  }

  // 情報密度のツマミ
  if (id === "additive") {
    lines.push(
      "- InfoDensity: additive → 情報はやや多めでよいが、1文に詰め込みすぎない。仕様→恩恵→留保を分けて書く。"
    );
  } else if (id === "balanced") {
    lines.push(
      "- InfoDensity: balanced → 重要な仕様・こだわりだけに絞り、それ以外は余白として残す。重複説明は避ける。"
    );
  } else if (id === "subtractive") {
    lines.push(
      "- InfoDensity: subtractive → 文をそぎ落として短くまとめる。近い意味の言い換えや同じ留保の繰り返しは削る。"
    );
  }

  return lines.join("\n");
}

/* =========================================================================
   Scene Balance（シーンのバランス調整）
   ========================================================================= */
function buildSceneBalanceHint(meta: Stage1Meta, flags: DerivedFlags): string {
  const cat = (meta.category || flags.category || "").toLowerCase();
  const scene = meta.scene || flags.scene_realism;

  // 食品だけを対象にする
  if (!cat) return "";
  if (
    !cat.includes("食品") &&
    !cat.includes("food") &&
    !cat.includes("grocery")
  ) {
    return "";
  }

  const lines: string[] = [];
  lines.push("SceneBalance: 食品カテゴリのシーン設計ルール");
  lines.push(
    "- リード文では『贈り物専用』のような書き方は避け、まずは自宅で楽しむ・家族で囲むシーンを主軸にする。"
  );
  lines.push(
    "- ギフトシーンは、3.4 利用シーンやタイトルの一部で『贈り物にも』程度に添える。"
  );

  if (scene === "gift") {
    lines.push(
      "- scene=gift の場合でも、『自宅用としても満足できる品質』をどこか1行含める。"
    );
  }

  return lines.join("\n");
}

/* =========================================================================
   Comparison Block（カテゴリ別）
   ========================================================================= */
function buildComparisonHint(cat: string | null): string {
  const c = (cat || "").toLowerCase();

  // 美容機器系
  if (c.includes("美容") || c.includes("beauty") || c.includes("skincare")) {
    return `Comparison Block:
- タイトル：「【他社との違い】」。
- A社：単機能のみ（例：RFのみ）など、使い方が限定されるモデル。
- B社：機能が分散していて、持ち替えや使い分けが多くなるモデル。
- 本品：複数の機能を1台にまとめた設計や、自宅で続けやすい運用など、“Stage1内に存在する事実”だけで差別化する。
- 価格は非数値の位置づけだけ（diff_comp_price=true の場合のみ軽く触れる）。`;
  }

  // 家電
  if (c.includes("家電") || c.includes("appliance")) {
    return `Comparison Block:
- タイトル：「【他社との違い】」。
- A社：最低限の基本機能のみで、細かな調整やタイマーなどがないモデル。
- B社：類似機能だが消費電力やサイズが大きめで、設置場所を選ぶモデル。
- 本品：日常使いに適したサイズ・消費電力・静音性など、“使いやすさ”を中心に差別化する。
- 価格は非数値の位置づけだけ（diff_comp_price=true の場合のみ軽く触れる）。`;
  }

  // 食品・ファッションなどは比較ブロックを特に固定しない
  return "";
}

/* =========================================================================
   POST : Stage0（Meta & Persona） 
        → Stage1（FACT＋SmartBullet）
        → Stage2（Talkflow）
        → Stage3（Final Polish / 5.1 清書）
        → Explain Layer（任意）
   ========================================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      strongHumanize = false,
      jitter = false,
      annotation_mode = false,

      // ▼ v2.0.8 Addenda フラグ（リクエスト側ヒント）
      lead_compact = false,
      bullet_mode = "default" as "default" | "one_idea_one_sentence",
      price_cta = false,
      scene_realism = null as null | "device_15min" | "gift",
      diff_fact = true,
      numeric_sensory = true,
      compliance_strict = true,
      comparison_helper = false,
      diff_comp_price = false,
      audience_age = null as null | number,

      // 軽量カテゴリヒント
      category = null as null | string,
    } = body ?? {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), {
        status: 500,
      });
    }

    const sb = await sbServer();
    const { data: userRes } = await sb.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const compact = String(prompt ?? "")
      .replace(/\r/g, "")
      .slice(0, 16000);

    // ★ SEOキーワード抽出（例：サムギョプサル）
    const seoKeywords = extractSeoKeywords(compact);

    /* ---------------- Stage0: Meta & Persona Analyzer ---------------- */
    const stage0Meta = await runStage0Meta(compact, apiKey);

    /* ---------------- Stage1: FACT＋SmartBullet ---------------- */
    const s1SeoBlock =
      seoKeywords.length > 0
        ? [
            "【SEOキーワードヒント】",
            "原文の商品名・料理名・ブランド名として含まれている以下のカタカナ／英字／ハングル表現は、タイトルや本文のいずれかに必ず残してください。",
            "必要であれば一般的な日本語訳（三枚肉など）を括弧書きで併記しても構いませんが、これらの表現だけを別の語に完全に置き換えたり削除しないでください。",
            seoKeywords.map((k) => `- ${k}`).join("\n"),
          ].join("\n")
        : "";

    const s1UserLines: string[] = [
      "【Stage1｜FACT＋SmartBullet v2.2】",
      "目的：事実・仕様・法規整合＋売れる構文素体生成。",
      "",
      YAKKI_FILTERS,
    ];
    if (s1SeoBlock) {
      s1UserLines.push("", s1SeoBlock);
    }
    s1UserLines.push("", "— 原文 —", compact);

    const s1Payload: any = {
      model: DEFAULT_STAGE1_MODEL,
      messages: [
        { role: "system", content: CORE_PROMPT },
        {
          role: "user",
          content: s1UserLines.join("\n"),
        },
      ],
      stream: false,
    };
    if (!isFiveFamily(DEFAULT_STAGE1_MODEL)) {
      s1Payload.temperature = 0.22;
      s1Payload.top_p = 0.9;
    }

    const s1 = await callOpenAI(s1Payload, apiKey, STAGE1_TIMEOUT_MS);
    if (!s1.ok) {
      return new Response(
        JSON.stringify({ error: "stage1_failed", detail: s1.error }),
        {
          status: 502,
        }
      );
    }

    const stage1Raw = String(s1.content || "");
    const { meta: stage1Meta, body: stage1 } = parseStage1MetaAndBody(stage1Raw);

    /* ---------------- Stage2 flags: UIヒント × Meta × Stage0 をマージ ---------------- */
    const mergedFlags = deriveFlagsFromMeta(
      stage1Meta,
      {
        category,
        scene_realism,
        audience_age,
        bullet_mode,
        lead_compact,
        price_cta,
        diff_fact,
        numeric_sensory,
        compliance_strict,
        comparison_helper,
        diff_comp_price,
      },
      stage0Meta
    );

    /* ---------------- Stage2: Talkflow “Perfect Warmflow” + Addenda ---------------- */
    const s2ModelBase = strongHumanize
      ? STRONG_HUMANIZE_MODEL
      : DEFAULT_STAGE2_MODEL;

    const addendaFlags = [
      "Addenda Flags:",
      `- lead_compact=${mergedFlags.lead_compact ? "true" : "false"}`,
      `- bullet_mode=${mergedFlags.bullet_mode}`,
      `- price_cta=${mergedFlags.price_cta ? "true" : "false"}`,
      `- scene_realism=${mergedFlags.scene_realism ?? "none"}`,
      `- diff_fact=${mergedFlags.diff_fact ? "true" : "false"}`,
      `- numeric_sensory=${mergedFlags.numeric_sensory ? "true" : "false"}`,
      `- compliance_strict=${mergedFlags.compliance_strict ? "true" : "false"}`,
      `- comparison_helper=${
        mergedFlags.comparison_helper ? "true" : "false"
      }`,
      `- diff_comp_price=${mergedFlags.diff_comp_price ? "true" : "false"}`,
      `- audience_age=${mergedFlags.audience_age ?? "none"}`,
      `- persona=${mergedFlags.persona ?? "none"}`,
    ].join("\n");

    const categoryHint = buildCategoryHint(mergedFlags.category, {
      scene: mergedFlags.scene_realism,
      age: mergedFlags.audience_age,
      comparison_helper: mergedFlags.comparison_helper,
      diff_comp_price: mergedFlags.diff_comp_price,
    });

    const ageQAHint =
      "Age Q&A Rules:\n" +
      "- age=30 → 頻度・予防（毎日? 週何回?）のQ&Aを1つ含める。\n" +
      "- age=40 → 継続しやすさ・時短（週3×15分）のQ&Aを1つ含める。\n" +
      "- age=50 → 刺激感配慮・敏感肌向けTipsのQ&Aを1つ含める。";

    const compHint =
      mergedFlags.comparison_helper || mergedFlags.diff_comp_price
        ? buildComparisonHint(mergedFlags.category)
        : "";

    const valueTierHint = buildValueTierHint(stage1Meta);
    const sceneBalanceHint = buildSceneBalanceHint(stage1Meta, mergedFlags);

    // ★ Talkflow few-shot（SUNLUM）の参考ブロック
    const fewshotBlock = TALKFLOW_FEWSHOT
      ? [
          "【参考サンプル｜Talkflow 完成イメージ】",
          "以下は、同じテンプレートで理想的に仕上がっている出力例です。",
          "商品カテゴリや内容は異なってよいので、構造・リズム・余白の取り方・Q&Aの粒度を参考にしてください。",
          "ただし、ここに書かれている数値・容量・認証名・ブランド名などの事実は絶対にコピーせず、",
          "今回の Stage1 内に存在する事実だけを使って書いてください。",
          "",
          TALKFLOW_FEWSHOT,
          "",
        ].join("\n")
      : "";

    // ★ Persona 情報を文字列化
    const personaLines: string[] = [];
    if (stage0Meta?.persona) {
      personaLines.push(`- persona=${stage0Meta.persona}`);
    }
    if (stage0Meta?.tone_keywords?.length) {
      personaLines.push(
        `- tone_keywords=${stage0Meta.tone_keywords.join(", ")}`
      );
    }
    if (stage0Meta?.forbidden_patterns?.length) {
      personaLines.push(
        `- forbidden_patterns=${stage0Meta.forbidden_patterns.join(" / ")}`
      );
    }
    if (stage0Meta?.encouraged_patterns?.length) {
      personaLines.push(
        `- encouraged_patterns=${stage0Meta.encouraged_patterns.join(
          " / "
        )}`
      );
    }
    if (stage0Meta?.emotional_highlights?.length) {
      personaLines.push(
        `- emotional_highlights=${stage0Meta.emotional_highlights.join(
          " / "
        )}`
      );
    }
    const personaBlock = personaLines.length
      ? ["Persona Layer (Stage0):", ...personaLines].join("\n")
      : "";

    const seoKeywordLines =
      seoKeywords.length > 0
        ? [
            "SEO Keyword Rules:",
            " - 以下のカタカナ／英字／ハングルの固有名詞は、そのままの表記で必ずどこかに含めてください。",
            " - 必要であれば『サムギョプサル（三枚肉）』のように日本語訳を併記しても構いませんが、カタカナ表記を削除したり、別の語に言い換えないでください。",
            seoKeywords.map((k) => `   - ${k}`).join("\n"),
          ].join("\n")
        : "";

    const s2UserContent = [
      "【Stage2｜Talkflow v2.0.8 “Perfect Warmflow” + v2.0.8 Addenda】",
      "目的：Stage1構造を保持しつつ、句読点・温度・未来導線・余白を最適化。",
      "",
      "Hard Rules:",
      "0. Stage1 に存在しない新しい数値（g, mL, kcal, %, °C, 日数・回数など）や認証名を作らない。",
      "   - 容量・サイズ・栄養成分などのスペックは、必ず Stage1 内にすでに出ているものだけを使う。",
      "   - Stage1 に栄養成分の行が 1 行もない場合、Stage2 で新たに『100gあたり〜』『1食あたり〜』などの栄養行を追加しない。",
      "0-b. Stage1 内に一度も登場していない「機能名・構造名・付属品名」",
      "     （例：交換ヘッド／専用ヘッド／専用ジェル／専用スタンド／防水◯m など）を、",
      "     SmartBullet や【他社との違い】セクションに新たに書き足してはいけません。",
      "     そうした要素が必要な場合は、人間が後から追記する前提とし、AI側では生やさないでください。",
      "1. SmartBullet の項目数と大まかな意味内容は変えない（まとめるのは可／意味の追加は不可）。",
      "",
      "Warmflow Rules:",
      "2. SmartBulletは5点構成を保持（1〜4機能、5情緒）。",
      "3. リードはWarmflow構文、クロージングは未来導線を必ず含む。",
      "",
      "Native Rules (最優先):",
      " - まず『自然な日本語として読めるか』を最優先する。訴求や情報量よりも、ネイティブが違和感なく読めるリズムを優先する。",
      " - 原文にある情報でも、日本語として不自然になるなら削ってよい（特に過剰な安全性アピールやギフト連呼）。",
      " - ギフト訴求や心理テクニックは、原文や商品特性から自然に求められる場合だけ軽く添える。",
      " - 『お得』『今だけ』などの煽り表現は、新たに付け足さない。読みやすさと信頼感を損ねる表現は避ける。",
      "",
      "Persona & Style Rules:",
      " - Stage0 で推定された persona / tone_keywords / forbidden_patterns / encouraged_patterns / emotional_highlights があれば、それに沿って語り口を決める。",
      " - forbidden_patterns に挙がっている表現は避け、意味が必要な場合はニュアンスを弱めた言い換えにする。",
      " - encouraged_patterns は、過度にならない範囲でリード・Bullet・クロージングに散らす。",
      " - emotional_highlights は、直訳ではなく『どこに熱量を載せるか』のヒントとして扱う。",
      personaBlock ? `\n${personaBlock}\n` : "",
      seoKeywordLines ? `\n${seoKeywordLines}\n` : "",
      "",
      addendaFlags,
      categoryHint ? `\n${categoryHint}\n` : "",
      valueTierHint ? `\n${valueTierHint}\n` : "",
      sceneBalanceHint ? `\n${sceneBalanceHint}\n` : "",
      ageQAHint,
      compHint,
      fewshotBlock ? `\n${fewshotBlock}\n` : "",
      "— Stage1 —",
      stage1,
    ].join("\n");

    const s2Payload: any = {
      model: s2ModelBase,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: s2UserContent },
      ],
      stream: false,
    };
    if (!isFiveFamily(s2Payload.model)) {
      s2Payload.temperature = jitter ? 0.4 : 0.33;
      s2Payload.top_p = 0.9;
    }

    let s2 = await callOpenAI(s2Payload, apiKey, STAGE2_TIMEOUT_MS);
    if (!s2.ok) {
      const retry: any = { ...s2Payload, model: STRONG_HUMANIZE_MODEL };
      if (isFiveFamily(STRONG_HUMANIZE_MODEL)) {
        delete retry.temperature;
        delete retry.top_p;
      }
      const s2b = await callOpenAI(retry, apiKey, STAGE2_TIMEOUT_MS);
      if (!s2b.ok) {
        return new Response(
          JSON.stringify({ error: "stage2_failed", detail: s2b.error }),
          {
            status: 502,
          }
        );
      }
      s2 = s2b;
    }

    const stage2Text = String(s2.content || "");
    let stage3Text = stage2Text;
    let finalPolishModelUsed: string | null = null;

    /* ---------------- Stage3: Final Polish（5.1 清書係｜Native First） ---------------- */
    if (FINAL_POLISH_MODEL) {
      const c = (
        mergedFlags.category ||
        stage1Meta.category ||
        ""
      ).toLowerCase();
      const isFood =
        c.includes("食品") ||
        c.includes("精肉") ||
        c.includes("food") ||
        c.includes("grocery");

      const polishSystem = [
        "You are Boost Suite Native Copywriter / Final Polish (清書係).",
        "Your primary goal is to turn the Stage2 output into completely natural, modern Japanese,",
        "as if written by a professional native copywriter in their 20–40s.",
        "Secondarily, you smooth rhythm and remove awkward or redundant phrasing.",
        "You MUST keep the structure markers, headings, section numbers, and overall template.",
        "You MUST NOT change any concrete facts (numbers, quantities, durations, certifications, model names),",
        "and you MUST NOT invent new facts.",
      ].join(" ");

      const polishUser = [
        "【Stage3｜Native First Final Polish v2.0.8】",
        "目的：Stage2の内容を保ったまま、日本語として“するっと読める”状態に整えるネイティブコピーライター兼清書係。",
        "",
        "最優先方針：",
        "0. 読み手が引っかからない自然な日本語を最優先する。訴求の強さよりも、読みやすさと信頼感を優先する。",
        "",
        "絶対ルール：",
        "1. 見出し番号やラベル（1.【タイトル※バランス】 など）は一切削除・変更しない。",
        "2. セクション順序やQ&Aの数を変えない（3つなら3つのまま）。",
        "3. 数値・分量・日数・温度・認証名などの事実は変更しない。新しい事実を書き足さない。",
        "",
        "ネイティブ化ルール：",
        "4. 直訳調・機械翻訳調・マニュアル調で、情報が詰め込まれて息苦しく感じる文は、意味を変えずに簡潔で自然な言い回しに置き換える。",
        "   - 1文に含める内容は「伝えたいこと1つ＋必要な補足1つ」までを目安にする。",
        "   - 『〜し、〜し、さらに〜し』のように要素が3つ以上連なる場合は、重要度の低い要素から削るか文を分ける。",
        "   - 似た意味の形容詞や表現が並ぶ場合は、購入判断に効く1〜2語に絞る。",
        "5. ユーザーの購入フローに照らして、心理的に不要な説明や、読んでも判断が変わらない情報は、思い切って削ってよい。",
        "   - 『それを読んで、買う・買わないの迷いが減るか？』を基準に残すかどうかを判断する。",
        "   - 読み手が“売り込み感”を強く感じるような煽り表現やテンプレ営業トークも、同じ基準でやわらげるか削除してよい。",
        "",
        "ギフト・安全性訴求の扱い：",
        "6. Meta上でギフト専用シーンが指定されていない場合（scene が gift ではない場合）、",
        "   『贈り物に最適』『ギフトにぴったり』といった表現は、テキスト全体で1〜2回までに抑える。",
        "   余分な箇所では、家庭用の表現（例：『人数やシーンに合わせて使いやすいボリュームです』）に書き換えてよい。",
        "7. 同じ条件（scene ≠ gift）では、『熨斗』『のし』『包装』『ラッピング』といった語は原則として削除する。",
        "   熨斗対応などの詳細が本当に必要な場合は、人間が追記する前提とし、AI側では触れなくてよい。",
        "8. 利用シーン（3.4）は、自宅での食卓・おうち焼肉・日常使いを“主役”とし、",
        "   ギフトは『シーンによっては贈り物としても使える』程度の一文にとどめる。ギフト専用の長い説明は削除してよい。",
        "9. 安全性・安心感の表現は、必要最低限の事実ベース（認証・検査体制など）のみ残し、",
        "   同じ趣旨の繰り返しや、読み手に不要な不安を与える表現は削ってよい。",
        "",
        "【食品カテゴリ向けの追加ルール（isFoodCategory=true の場合に特に重視）】",
        "10. SmartBullet内に『※個人差があります』『※感じ方には差があります』など短い免責だけが付いている場合、",
        "    それらは削除してよい。食品カテゴリでは、個体差や感じ方の免責は「3.5 注意事項」でまとめて触れる。",
        "    すでに3.5に『風味や食感は個体差や調理条件により変わる』等の一文がある場合、Bullet側の「※〜」は不要として削除する。",
        "11. Q&Aに『どのくらいの頻度で食べるのが良いですか？』『週◯回が理想ですか？』といった摂取頻度の推奨が含まれている場合、",
        "    質問文と回答文を、『どんなシーンに向いていますか？』『保存方法や賞味期限は？』など、",
        "    摂取頻度を推奨しないテーマに“差し替えて”よい。Q&Aの個数だけは変えないこと。",
        "12. 栄養成分（例：オメガ3、ビタミンB1など）に触れている文は、『健康に良い』『栄養バランスが良い』といった結論づけを避け、",
        "    『味わい』『食べやすさ』『日々の献立に取り入れやすい』など、“風味や使いやすさ”の印象レベルに着地させてよい。",
        "13. 3.5 注意事項は、食品らしい基本事項にとどめる。",
        "    - 加熱・解凍方法・保存方法・アレルギー確認・風味の個体差などに絞る。",
        "    - 『医薬品ではありません』『妊娠中や通院中の方は医師に相談』といった医療寄りの文言は、新たに追加しない。",
        "    - すでにそうした医療寄りの文言が含まれている場合は、食品として自然な注意書き（加熱・保存・アレルゲン確認など）に置き換えてよい。",
        "",
        "編集スタイル：",
        "14. 原則として、新しい文を一から書き足すことは避ける。既存の文を整理して短くする・2文を1文にまとめるなど、",
        "    「削る」「整える」方向を優先する。どうしても必要な場合のみ、既存内容の言い換えレベルで1文程度なら追加してよい。",
        "15. SNS要約には、保存方法や注意事項（『※〜にご注意ください』など）は含めない。",
        "    scene ≠ gift の場合は、『贈り物にも』といったギフト訴求を入れず、“おうちでどう楽しめるか”にフォーカスしてよい。",
        "16. A/Bテスト提案でも、scene ≠ gift の場合は、ギフトをメインテーマにした軸（『贈り物にも最適』など）は1軸までに抑えるか、",
        "    産地・味わい・調理の手軽さなど、家庭利用を主役にした軸へ置き換えてよい。",
        "",
        "特徴の優先順位づけ：",
        "17. Bullet や本文で列挙されている特徴は、購入フローにおける重要度で3段階に分けて考える。",
        "    - A：この商品を選ぶ決め手になる特徴（産地・工程・使い勝手など）。",
        "    - B：不安や疑問を減らす補足情報（保存方法・使い方・認証など）。",
        "    - C：あってもなくても購入判断が変わらない豆知識や細かな数値。",
        "18. Aランク：本文やBulletの前半に残す。必要なら言い回しだけ整える。",
        "    Bランク：必要なものだけを短く残し、重複している説明は削るか1行にまとめる。",
        "    Cランク：文章を重くするだけの場合は、思い切って削除してよい。",
        "",
        "SEOキーワード（商品名・料理名）の扱い：",
        "19. 原文やStage1/Stage2時点で登場しているカタカナ／ハングルの商品名・料理名など、SEOキーワードとして指定された語（例：サムギョプサル、チェジュなど）は、その表記のまま残してください。",
        "    - これらの語を漢字の一般名称（『三枚肉』など）だけに置き換えてしまうことは禁止です。",
        "    - 日本語訳を補いたい場合は、『サムギョプサル（三枚肉）』のように併記してください。",
        "    - SEOキーワード配列の先頭にある語（もしあれば）は、ハングルを含む商品名フレーズである可能性が高いため、Stage2に書かれているとおりの『文字・順序・空白』を変えず、そのまま1つのかたまりとして扱ってください（そのフレーズの前後だけを書き換えてよい）。",
        "20. 上記SEOキーワードがStage2出力内にすでに含まれている場合は、その出現箇所を維持しつつ文脈だけ整えてください。新たに削除したり、別表現に置き換えないでください。",
        "21. 『〜を使ったセット』『成分が明確な〜』『高品質な豚肉です』のような、説明書きっぽく不自然なフレーズは、意味を変えない範囲で日常的な日本語に積極的に書き換えてよい。",
        "22. Q&A の回答文も、会話として不自然な言い回し（例：『約◯分おき』など）があれば、『◯分ほど』『◯分くらい』のように自然な表現へ置き換える。",
        "",
        "参考情報：",
        `Stage0 Meta JSON: ${JSON.stringify(stage0Meta)}`,
        `Stage1 Meta JSON: ${JSON.stringify(stage1Meta)}`,
        `Addenda Flags: ${JSON.stringify(mergedFlags)}`,
        `isFoodCategory: ${isFood ? "true" : "false"}`,
        `SEO Keywords: ${seoKeywords.length ? seoKeywords.join(", ") : "none"}`,
        "",
        "— Stage2 出力 —",
        stage2Text,
      ].join("\n");

      const s3Payload: any = {
        model: FINAL_POLISH_MODEL,
        messages: [
          { role: "system", content: polishSystem },
          { role: "user", content: polishUser },
        ],
        stream: false,
      };
      if (!isFiveFamily(FINAL_POLISH_MODEL)) {
        s3Payload.temperature = 0.1;
        s3Payload.top_p = 0.9;
      }

      const s3 = await callOpenAI(s3Payload, apiKey, STAGE3_TIMEOUT_MS);
      if (s3.ok) {
        const polished = String(s3.content || "").trim();
        if (polished) {
          stage3Text = polished;
          finalPolishModelUsed = FINAL_POLISH_MODEL;

          // ★ タイトル2セクションは Stage2 で生成されたものをそのまま採用（ハングルロック）
          stage3Text = restoreSectionFromStage2(
            stage2Text,
            stage3Text,
            "1.【タイトル"
          );
          stage3Text = restoreSectionFromStage2(
            stage2Text,
            stage3Text,
            "2.【タイトル"
          );
        }
      } else {
        console.warn("⚠️ FinalPolish failed:", s3.error);
      }
    }

    // ★ Stage1に存在しないヘッド系機能の亡霊を削ってから FactLock
    const cleanedText = stripPhantomFeatures(stage1, stage3Text);
    const finalText = factLock(cleanedText);

    /* ---------------- Explain Layer（Stage4的立ち位置／解説AI） ---------------- */
    let annotations: Array<{
      section: string;
      text: string;
      type: string;
      importance: "low" | "medium" | "high";
      quote?: string;
      before?: string;
      after?: string;
      tip?: string;
    }> = [];

    if (annotation_mode && EXPLAIN_PROMPT_V1) {
      const explainContent = EXPLAIN_PROMPT_V1.replace(
        "{{STAGE2_TEXT}}",
        finalText
      );
      const s4Payload: any = {
        model: EXPLAIN_LAYER_MODEL,
        messages: [
          {
            role: "system",
            content:
              'You are Boost Suite Explain Layer. Output strictly in JSON with top-level {"annotations": [...]}.',
          },
          { role: "user", content: explainContent },
        ],
        stream: false,
      };
      if (!isFiveFamily(EXPLAIN_LAYER_MODEL)) {
        s4Payload.temperature = 0.0;
        s4Payload.top_p = 1.0;
      }

      const s4 = await callOpenAI(s4Payload, apiKey, STAGE3_TIMEOUT_MS);
      if (s4.ok) {
        try {
          const parsed = JSON.parse(String(s4.content || "{}"));
          const arr = Array.isArray(parsed?.annotations)
            ? parsed.annotations
            : [];
          annotations = arr
            .filter((x: any) => x && typeof x === "object")
            .map((x: any) => ({
              section: String(x.section || ""),
              text: String(x.text || ""),
              type: String(x.type || "Structure"),
              importance:
                x.importance === "high" || x.importance === "medium"
                  ? x.importance
                  : "low",
              quote: x.quote ? String(x.quote) : undefined,
              before: x.before ? String(x.before) : undefined,
              after: x.after ? String(x.after) : undefined,
              tip: x.tip ? String(x.tip) : undefined,
            }))
            .slice(0, 12);
        } catch {
          console.warn(
            "⚠️ Explain JSON parse failed:",
            s4.content?.slice(0, 200)
          );
        }
      }
    }

    /* ---------------- Response ---------------- */
    return new Response(
      JSON.stringify({
        text: finalText,
        annotations,
        modelUsed: {
          stage1: DEFAULT_STAGE1_MODEL,
          stage2: strongHumanize ? STRONG_HUMANIZE_MODEL : DEFAULT_STAGE2_MODEL,
          // Explain 用を維持
          stage3: annotation_mode ? EXPLAIN_LAYER_MODEL : null,
          // 5.1 清書係の実績は別フィールドで返す
          finalPolish: finalPolishModelUsed,
        },
        strongHumanize: !!strongHumanize,
        jitter: !!jitter,
        annotation_mode: !!annotation_mode,

        flags: {
          lead_compact: mergedFlags.lead_compact,
          bullet_mode: mergedFlags.bullet_mode,
          price_cta: mergedFlags.price_cta,
          scene_realism: mergedFlags.scene_realism,
          diff_fact: mergedFlags.diff_fact,
          numeric_sensory: mergedFlags.numeric_sensory,
          compliance_strict: mergedFlags.compliance_strict,
          comparison_helper: mergedFlags.comparison_helper,
          diff_comp_price: mergedFlags.diff_comp_price,
          audience_age: mergedFlags.audience_age,
          category: mergedFlags.category,
          persona: mergedFlags.persona,
          seo_keywords: seoKeywords,
        },

        stage0Meta,
        stage1Meta,
        promptVersion: "v2.0.8",
        userId,
      }),
      { status: 200 }
    );
  } catch (e: any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
    });
  }
}

/* =========================================================================
   GET : Health Check
   ========================================================================= */
export async function GET() {
  try {
    const supabase = sbRead();
    const { data } = await supabase
      .from("categories")
      .select("l1,l2,mode")
      .limit(1);
    return new Response(
      JSON.stringify({
        ok: true,
        sampleCategory: data?.[0] ?? null,
        localLoaded: {
          cats: LOCAL_CATS.length,
          emos: LOCAL_EMO.emotions?.length ?? 0,
          styles: LOCAL_STYLE.styles?.length ?? 0,
        },
        promptVersion: "v2.0.8",
      }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, message: e?.message || String(e) }),
      { status: 500 }
    );
  }
}
