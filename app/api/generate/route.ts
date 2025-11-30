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

const SERVER_TIMEOUT_MS = Math.max(60_000, Math.min(295_000, (maxDuration - 5) * 1000));
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
  const out: Array<{ l1: string; l2: string; mode: string; pitch_keywords: string[] }> = [];
  for (const line of rows.slice(1)) {
    const cols = line.split(",").map((s) => s.trim());
    if (cols.length >= 3) {
      out.push({
        l1: cols[0],
        l2: cols[1],
        mode: cols[2],
        pitch_keywords: cols[3] ? cols[3].split("|").map((s) => s.trim()).filter(Boolean) : [],
      });
    }
  }
  return out;
}
type EmotionJSON = { emotions: Array<{ id: string }> };
type StyleJSON = { styles: Array<{ id: string }> };

const LOCAL_CATS = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

/* =========================================================================
   Prompts
   ========================================================================= */
// v2.0.8 を prompts/bs_prompt_v2.0.8.txt に配置済み想定
const CORE_PROMPT_V208 = readText("prompts/bs_prompt_v2.0.8.txt");
const CORE_PROMPT = CORE_PROMPT_V208 || "You are Boost Suite v2.0.8 copy refiner.";

const YAKKI_FILTERS = ["A", "B", "C", "D"]
  .map((k) => readText(`prompts/filters/BoostSuite_薬機法フィルター${k}.txt`))
  .filter(Boolean)
  .join("\n");

// Explain Layer は 1.0 固定
const EXPLAIN_PROMPT_V1 = readText("prompts/explain/BoostSuite_Explain_v1.0.txt");

/* =========================================================================
   OpenAI helpers
   ========================================================================= */
const isFiveFamily = (m: string) => /^gpt-5($|-)/i.test(m);

const DEFAULT_STAGE1_MODEL = process.env.BOOST_STAGE1_MODEL?.trim() || "gpt-5-mini";
const DEFAULT_STAGE2_MODEL = process.env.BOOST_STAGE2_MODEL?.trim() || "gpt-4o-mini";
const STRONG_HUMANIZE_MODEL = process.env.BOOST_STRONG_HUMANIZE_MODEL?.trim() || "gpt-5";
// 5.1 清書係。例: gpt-5.1 / gpt-5.1-mini などを環境変数で指定
const FINAL_POLISH_MODEL = process.env.BOOST_FINAL_POLISH_MODEL?.trim() || "";
const EXPLAIN_LAYER_MODEL = process.env.BOOST_EXPLAIN_MODEL?.trim() || "gpt-4o-mini";

async function callOpenAI(payload: any, key: string, timeout: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
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
    return { ok: false as const, error: json?.error ?? (raw || res.statusText) };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || String(e) };
  } finally {
    clearTimeout(t);
  }
}

/* =========================================================================
   Supabase
   ========================================================================= */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function sbRead() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
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
    out = out.replace(new RegExp(key, "g"), () => arr[Math.floor(Math.random() * arr.length)]);
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

  if (cat.includes("美容") || cat.includes("beauty") || cat.includes("skincare")) {
    lines.push(
      "CategoryHint: 美容機器",
      "- 専門数値（MHz, nm, 深度）はFAQへ逃がすか削除。温度は体感併記（数値＋体感）。",
      "- 安全・注意は不安を煽らず一般表現で網羅（階層化）。",
      "- 差別化は事実ベース（機能統合、交換ヘッド、運用コスト、アプリ運用）。",
      "- 価格は具体額NG。CTAは非数値で緊急性を伝える。"
    );
  }

  if (cat.includes("食品") || cat.includes("food") || cat.includes("grocery")) {
    lines.push(
      "CategoryHint: 食品",
      "- 認証（例：HACCP/GAP）・産地・品種は優先度高。加工・保存・調理ガイドは構造化。",
      "- アレルギー表記を簡潔に（必要に応じて“商品ページ参照”へ誘導）。",
      "- ネガ表現は一般化してポジ転（例：『交配種ではない』→『系統が安定した風味（断定回避）』）。",
      "- 栄養・効能は断定しない（一般的説明＋個人差・出典参照）。"
    );
  }

  // 年代プリセット（文体・Q&Aの焦点）
  if (opts?.age) {
    lines.push("AgePreset:");
    if (opts.age >= 50)
      lines.push("- 50代：やさしめの語尾、実感・続けやすさを重視。Q&Aに敏感肌配慮を含める。");
    else if (opts.age >= 40)
      lines.push("- 40代：時短・習慣化・週3×15分を強調。Q&Aに継続性の質問を含める。");
    else lines.push("- 30代：予防・毛穴・軽量運用。Q&Aに使用頻度（毎日？週何回？）を含める。");
  }

  // 利用シーンヒント
  if (opts?.scene === "device_15min") {
    lines.push("- Scene: device_15min → 入浴後/就寝前 × 週3回 × 1回15分を自然に織り込む。");
  } else if (opts?.scene === "gift") {
    lines.push("- Scene: gift → 贈答導線（熨斗/包装/賞味期限/保管方法）を短く触れる。");
  }

  // 比較ブロック
  if (opts?.comparison_helper) {
    lines.push("- Comparison: 体験軸（通う手間 vs 在宅・共有）で1段。誇大・最上表現は禁止。");
  }
  if (opts?.diff_comp_price) {
    lines.push("- PricePositioning: 金額や率は出さず、『初期投資のみ・長期運用』など非数値で位置づける。");
  }

  return lines.join("\n");
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

function parseStage1MetaAndBody(raw: string): { meta: Stage1Meta; body: string } {
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
    console.warn("⚠️ Stage1 meta JSON parse failed:", (e as any)?.message || e);
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
  }
): DerivedFlags {
  const catFromMeta = meta.category && meta.category !== "その他" ? meta.category : null;
  const sceneFromMeta =
    meta.scene === "device_15min" || meta.scene === "gift" ? meta.scene : null;
  const ageFromMeta = typeof meta.target_age === "number" ? meta.target_age : null;

  return {
    category: catFromMeta ?? req.category,
    scene_realism: (sceneFromMeta as any) ?? req.scene_realism,
    audience_age: ageFromMeta ?? req.audience_age,
    bullet_mode: (meta.bullet_mode as any) || req.bullet_mode || "default",
    lead_compact:
      typeof meta.lead_compact === "boolean" ? meta.lead_compact : req.lead_compact,
    price_cta: typeof meta.price_cta === "boolean" ? meta.price_cta : req.price_cta,
    diff_fact: typeof meta.diff_fact === "boolean" ? meta.diff_fact : req.diff_fact,
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
  };
}

/* =========================================================================
   Comparison Block（カテゴリ別）
   ========================================================================= */
function buildComparisonHint(cat: string | null): string {
  const c = (cat || "").toLowerCase();

  if (c.includes("美容") || c.includes("beauty") || c.includes("skincare")) {
    return `Comparison Block:
- タイトル：「【他社との違い】」。
- A社：単機能のみ（例：RFのみ）や固定ヘッドなど、使い方が限定されるもの。
- B社：EMSのみ・アプリ非対応など、機能が分散しているもの。
- 本品：複合機能や交換ヘッド、在宅で続けやすい運用など、“事実”で差別化する。
- 価格は非数値の位置づけだけ（diff_comp_price=true の場合のみ軽く触れる）。`;
  }

  if (c.includes("家電") || c.includes("appliance")) {
    return `Comparison Block:
- タイトル：「【他社との違い】」。
- A社：最低限の基本機能のみで、細かな調整やタイマーなどがないモデル。
- B社：類似機能だが消費電力やサイズが大きめで、設置場所を選ぶモデル。
- 本品：日常使いに適したサイズ・消費電力・静音性など、“使いやすさ”を中心に差別化する。
- 価格は非数値の位置づけだけ（diff_comp_price=true の場合のみ軽く触れる）。`;
  }

  return "";
}

/* =========================================================================
   POST : Stage1（FACT＋SmartBullet）
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

      // ▼ v2.0.7a Addenda フラグ（リクエスト側ヒント）
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

    /* ---------------- Stage1: FACT＋SmartBullet ---------------- */
    const s1Payload: any = {
      model: DEFAULT_STAGE1_MODEL,
      messages: [
        { role: "system", content: CORE_PROMPT },
        {
          role: "user",
          content: [
            "【Stage1｜FACT＋SmartBullet v2.2】",
            "目的：事実・仕様・法規整合＋売れる構文素体生成。",
            "",
            YAKKI_FILTERS,
            "",
            "— 原文 —",
            compact,
          ].join("\n"),
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
      return new Response(JSON.stringify({ error: "stage1_failed", detail: s1.error }), {
        status: 502,
      });
    }

    const stage1Raw = String(s1.content || "");
    const { meta: stage1Meta, body: stage1 } = parseStage1MetaAndBody(stage1Raw);

    /* ---------------- Stage2 flags: UIヒント × Meta をマージ ---------------- */
    const mergedFlags = deriveFlagsFromMeta(stage1Meta, {
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
    });

    /* ---------------- Stage2: Talkflow “Perfect Warmflow” + Addenda ---------------- */
    const s2ModelBase = strongHumanize ? STRONG_HUMANIZE_MODEL : DEFAULT_STAGE2_MODEL;

    const addendaFlags = [
      "Addenda Flags:",
      `- lead_compact=${mergedFlags.lead_compact ? "true" : "false"}`,
      `- bullet_mode=${mergedFlags.bullet_mode}`,
      `- price_cta=${mergedFlags.price_cta ? "true" : "false"}`,
      `- scene_realism=${mergedFlags.scene_realism ?? "none"}`,
      `- diff_fact=${mergedFlags.diff_fact ? "true" : "false"}`,
      `- numeric_sensory=${mergedFlags.numeric_sensory ? "true" : "false"}`,
      `- compliance_strict=${mergedFlags.compliance_strict ? "true" : "false"}`,
      `- comparison_helper=${mergedFlags.comparison_helper ? "true" : "false"}`,
      `- diff_comp_price=${mergedFlags.diff_comp_price ? "true" : "false"}`,
      `- audience_age=${mergedFlags.audience_age ?? "none"}`,
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

    const s2UserContent = [
      "【Stage2｜Talkflow v2.0.7 “Perfect Warmflow” + v2.0.7a Addenda】",
      "目的：Stage1構造を保持しつつ、句読点・温度・未来導線・余白を最適化。",
      "",
      "Warmflow Rules:",
      "1. SmartBulletは5点構成を保持（1〜4機能、5情緒）。",
      "2. リードはWarmflow構文、クロージングは未来導線を必ず含む。",
      "",
      addendaFlags,
      categoryHint ? `\n${categoryHint}\n` : "",
      ageQAHint,
      compHint,
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
        return new Response(JSON.stringify({ error: "stage2_failed", detail: s2b.error }), {
          status: 502,
        });
      }
      s2 = s2b;
    }

    const stage2Text = String(s2.content || "");
    let stage3Text = stage2Text;
    let finalPolishModelUsed: string | null = null;

    /* ---------------- Stage3: Final Polish（5.1 清書係） ---------------- */
    if (FINAL_POLISH_MODEL) {
      const c = (mergedFlags.category || stage1Meta.category || "").toLowerCase();
      const isFood =
        c.includes("食品") ||
        c.includes("精肉") ||
        c.includes("food") ||
        c.includes("grocery");

      const polishSystem =
        "You are Boost Suite Final Polish (清書係). " +
        "You receive Stage2 output written in Japanese for an e-commerce product. " +
        "Your job is ONLY to smooth wording, remove awkward or redundant phrases, " +
        "and slightly adjust rhythm. You MUST NOT change structure markers, headings, " +
        "section numbers, or overall template. You MUST NOT change any concrete facts " +
        "(numbers, quantities, durations, certifications, model names) and MUST NOT invent new facts.";

      const polishUser = [
        "【Stage3｜Final Polish v2.0.8】",
        "目的：Stage2の出力の“違和感”だけを削り、読み心地を整える清書係。",
        "",
        "絶対ルール：",
        "1. 見出し番号やラベル（1.【タイトル※バランス】 など）は一切削除・変更しない。",
        "2. セクション順序やQ&Aの数を変えない（3つなら3つのまま）。",
        "3. 数値・分量・日数・温度・認証名などの事実は変更しない。新しい事実を書き足さない。",
        "4. 同じ語の過剰な反復（例：「焼きセット」「週3回」など）は、日本語として自然な範囲で言い換えたり、省略して緩和する。",
        "5. カテゴリにそぐわない表現は静かに中和する。",
        "   - 食品カテゴリでは、「どのくらいの頻度で食べるのが理想ですか？」のような摂取頻度の推奨は避け、頻度に言及するなら『お好みのタイミングで楽しめます』程度にとどめる。",
        "   - 医療・美容効果や健康効果の断定は書かない。",
        "6. リードとクロージングは少しだけ冗長さを削り、“静かな余韻”を残す方向へ整える。",
        "",
        "参考情報：",
        `Stage1 Meta JSON: ${JSON.stringify(stage1Meta)}`,
        `Addenda Flags: ${JSON.stringify(mergedFlags)}`,
        `isFoodCategory: ${isFood ? "true" : "false"}`,
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
        }
      } else {
        console.warn("⚠️ FinalPolish failed:", s3.error);
      }
    }

    const finalText = factLock(stage3Text);

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
      const explainContent = EXPLAIN_PROMPT_V1.replace("{{STAGE2_TEXT}}", finalText);
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
          const arr = Array.isArray(parsed?.annotations) ? parsed.annotations : [];
          annotations = arr
            .filter((x: any) => x && typeof x === "object")
            .map((x: any) => ({
              section: String(x.section || ""),
              text: String(x.text || ""),
              type: String(x.type || "Structure"),
              importance:
                x.importance === "high" || x.importance === "medium" ? x.importance : "low",
              quote: x.quote ? String(x.quote) : undefined,
              before: x.before ? String(x.before) : undefined,
              after: x.after ? String(x.after) : undefined,
              tip: x.tip ? String(x.tip) : undefined,
            }))
            .slice(0, 12);
        } catch {
          console.warn("⚠️ Explain JSON parse failed:", s4.content?.slice(0, 200));
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
          stage2: s2Payload.model,
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
        },

        stage1Meta,
        promptVersion: "v2.0.8",
        userId,
      }),
      { status: 200 }
    );
  } catch (e: any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}

/* =========================================================================
   GET : Health Check
   ========================================================================= */
export async function GET() {
  try {
    const supabase = sbRead();
    const { data } = await supabase.from("categories").select("l1,l2,mode").limit(1);
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
