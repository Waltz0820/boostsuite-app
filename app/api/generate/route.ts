/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
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

/* =========================================================================
   File Utils
   ========================================================================= */
function readText(rel: string): string {
  try { return fs.readFileSync(path.join(process.cwd(), rel), "utf8"); }
  catch { console.warn(`⚠️ Missing file: ${rel}`); return ""; }
}
function parseReplaceDict(src: string) {
  return src.split(/\r?\n/)
    .map(l=>l.trim())
    .filter(l=>l && !l.startsWith("#") && l.includes("=>"))
    .map(l=>{const [from,to]=l.split("=>");return {from:(from??"").trim(),to:(to??"").trim()};})
    .filter(r=>r.from && r.to);
}
function parseCsvWords(src: string) {
  return src.split(/[\r\n,]+/).map(s=>s.trim()).filter(Boolean);
}
function readJsonSafe<T>(rel: string, fb: T): T {
  try { const t = readText(rel); return t ? JSON.parse(t) as T : fb; } catch { return fb; }
}

/* =========================================================================
   Local Knowledge
   ========================================================================= */
function readCategoryCsv(rel: string) {
  const rows = readText(rel).split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const out: Array<{ l1: string; l2: string; mode: string; pitch_keywords: string[] }> = [];
  for (const line of rows.slice(1)) {
    const cols = line.split(",").map(s=>s.trim());
    if (cols.length >= 3) {
      out.push({
        l1: cols[0], l2: cols[1], mode: cols[2],
        pitch_keywords: cols[3] ? cols[3].split("|").map(s=>s.trim()).filter(Boolean) : [],
      });
    }
  }
  return out;
}

type EmotionJSON = { default_emotion?: string; emotions: Array<{ id: string; aliases?: string[]; tones?: string[]; patterns?: string[]; use_for_modes?: string[] }> };
type StyleJSON = {
  styles: Array<{ id: string; voice: string; rhythm: string; lexicon_plus?: string[]; lexicon_minus?: string[]; use_for_modes?: string[] }> ;
  media_overrides?: Array<{ media: string; sentence_length: string; emoji?: boolean }> ;
};

/* Breath制御（EmotionDrift） */
type DriftRow = { sentence_length?: "short" | "medium" | "long"; emoji?: boolean; temp_offset?: number; includes?: string[] };
type EmotionDrift = {
  version?: string;
  default: DriftRow;
  media?: Record<string, DriftRow>;
  keywords?: DriftRow[];
};

const LOCAL_CATS  = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO   = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });
const EMO_DRIFT   = readJsonSafe<EmotionDrift>("knowledge/EmotionDrift_v1.json", {
  default: { sentence_length: "short", emoji: false, temp_offset: 0 }
});

/* =========================================================================
   Prompts
   ========================================================================= */
const CORE_PROMPT_V203 = readText("prompts/bs_prompt_v2.0.3.txt");
const CORE_PROMPT_V202 = readText("prompts/bs_prompt_v2.0.2.txt");
const CORE_PROMPT      = CORE_PROMPT_V203 || CORE_PROMPT_V202 || "You are Boost Suite copy refiner.";

const YAKKI_A = readText("prompts/filters/BoostSuite_薬機法フィルターA.txt");
const YAKKI_B = readText("prompts/filters/BoostSuite_薬機法フィルターB.txt");
const YAKKI_C = readText("prompts/filters/BoostSuite_薬機法フィルターC.txt");
const YAKKI_D = readText("prompts/filters/BoostSuite_薬機法フィルターD.txt");

const REPLACE_RULES = parseReplaceDict(readText("prompts/filters/Boost_Fashion_置き換え辞書.txt"));
const BEAUTY_WORDS  = parseCsvWords(readText("prompts/filters/美顔器キーワード.csv"));

/* =========================================================================
   OpenAI helpers
   ========================================================================= */
const isFiveFamily  = (m: string) => /^gpt-5($|-)/i.test(m);
const isFourOFamily = (m: string) => /^gpt-4o($|-)/i.test(m);

const DEFAULT_STAGE1_MODEL = process.env.BOOST_STAGE1_MODEL?.trim() || "gpt-5-mini";
const DEFAULT_STAGE2_MODEL = process.env.BOOST_STAGE2_MODEL?.trim() || "gpt-4o-mini";
const STRONG_HUMANIZE_MODEL = process.env.BOOST_STRONG_HUMANIZE_MODEL?.trim() || "gpt-5";

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), ms);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(t); }
}
async function callOpenAI(payload: any, key: string, timeout: number) {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  };
  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", init, timeout);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  return res.ok ? { ok: true as const, content } : { ok: false as const, error: json?.error ?? res.statusText };
}

/* =========================================================================
   Supabase
   ========================================================================= */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function sbRead() { return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } }); }
async function sbServer() {
  const ck = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, { cookies: { get: n=>ck.get(n)?.value, set(){}, remove(){} } });
}

/* =========================================================================
   FactLock（軽整流）
   ========================================================================= */
function factLock(text: string) {
  if (!text) return text;
  return text
    .replace(/完治|永久に|100%|絶対|治す|劇的|最強|奇跡|保証|完全/g,"※個人差があります")
    .replace(/ｍｌ|ＭＬ|㎖/g,"mL")
    .replace(/ｗ|Ｗ/g,"W")
    .replace(/　/g," ")
    .replace(/[ \t]{2,}/g," ")
    .trim();
}

/* =========================================================================
   Breath Controller（EmotionDrift）: media + keywords → sentence/emoji/temp
   ========================================================================= */
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function planBreath(input: string, media: string) {
  const base: DriftRow = { ...(EMO_DRIFT.default || {}) };
  const md   = (EMO_DRIFT.media && EMO_DRIFT.media[media]) ? EMO_DRIFT.media[media]! : {};
  const low  = String(input || "").toLowerCase();

  let best: DriftRow = { ...base, ...md };
  let hitKey: string[] = [];

  for (const row of (EMO_DRIFT.keywords || [])) {
    const inc = (row.includes || []);
    if (inc.length && inc.some(w => w && low.includes(String(w).toLowerCase()))) {
      best = { ...best, ...row };
      hitKey = inc;
      break; // 最初のマッチを採用（過学習回避）
    }
  }

  // 正常化
  const sentence_length = (["short","medium","long"] as const).includes(best.sentence_length as any)
    ? best.sentence_length as "short"|"medium"|"long"
    : "short";
  const emoji = !!best.emoji;
  const temp_offset = clamp(Number(best.temp_offset || 0), -0.1, 0.1);

  return { sentence_length, emoji, temp_offset, hitKey };
}

/* =========================================================================
   POST : Stage1 → Stage2（Dual-Core Warmflow System + Breath）
   ========================================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, media = "ad" } = body ?? {};
    const apiKey = process.env.OPENAI_API_KEY!;
    const sb = await sbServer();
    const { data: userRes } = await sb.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const compact = String(prompt ?? "").slice(0, 16000);

    /* ---------------- Stage1: FACT ---------------- */
    const s1Prompt = [
      "【Stage1｜FACT整流】",
      "目的：構造・仕様・法規の整合を最優先し、温度を抑えた脚本文を生成。",
      "",
      "— 原文 —",
      compact
    ].join("\n");

    const s1Payload = {
      model: DEFAULT_STAGE1_MODEL,
      messages:[{role:"system",content:CORE_PROMPT},{role:"user",content:s1Prompt}],
      temperature:0.25
    };
    const s1 = await callOpenAI(s1Payload, apiKey, STAGE1_TIMEOUT_MS);
    if (!s1.ok) return new Response(JSON.stringify({error:"stage1_failed",detail:s1.error}),{status:502});
    const stage1 = s1.content;

    /* ---------------- Breath Planning ---------------- */
    const {
      stage2Model,
      temperature = 0.34,
      stage2Temperature,
      strongHumanize = false,
      jitter = false,
      variants = 0,
    } = body ?? {};

    const drift = planBreath(compact, String(media || "ad"));

    const s2Model =
      (typeof stage2Model === "string" && stage2Model.trim())
        ? stage2Model.trim()
        : (strongHumanize ? STRONG_HUMANIZE_MODEL : DEFAULT_STAGE2_MODEL);

    // 温度：指定優先 → ドリフトのオフセット反映 → クランプ
    const baseTemp = typeof stage2Temperature === "number"
      ? stage2Temperature
      : (jitter ? Math.max(0.45, Number(temperature) || 0.34) : Number(temperature) || 0.34);

    const s2Temp = clamp(baseTemp + drift.temp_offset, 0.25, 0.60);

    // Breath 指示を明示（句読点／改行／絵文字／文長）
    const sentenceGuide =
      drift.sentence_length === "short"  ? "文長は短め。1〜2文単位でテンポよく。" :
      drift.sentence_length === "medium" ? "文長は中庸。2〜3文で一塊、読みのリズムを保つ。" :
                                           "文長はやや長め。ただし『、』は連打しない。適度に分割する。";

    const emojiGuide = drift.emoji
      ? "絵文字は自然に2〜4個まで（SNS要約のみ）。本文では乱用しない。"
      : "絵文字は使用しない（SNS要約にも原則不要）。";

    const linebreakGuide = "不要な空行や箇条書きは避け、セクション見出し以外は改行を最小化。";

    /* ---------------- Stage2: Warmflow-Humanize ---------------- */
    const talkflowPrompt = [
      "【Stage2｜Warmflow-Humanize（v2.0.3 Dual-Core + Breath）】",
      "目的：Stage1のFACTを改変せず、“温度・SEO・構文”を統合整流する。句読点とリズムで“売れる自然文”を形成。",
      "",
      "Breath制御：",
      `- sentence_length: ${drift.sentence_length}（${sentenceGuide}）`,
      `- emoji: ${drift.emoji ? "true" : "false"}（${emojiGuide}）`,
      `- media: ${String(media)} / temp_offset: ${drift.temp_offset.toFixed(2)} / hits: ${drift.hitKey.join(",") || "none"}`,
      `- 体裁: ${linebreakGuide}`,
      "",
      "構文：Boost Suite Prompt v2.0.3（Dual-Core Warmflow System）を参照。",
      "",
      "— Stage1 素体 —",
      stage1,
      "",
      "出力は Boost Suite テンプレ全項目を一度で完成。Silent出力。",
      "AI/生成表現は禁止。"
    ].join("\n");

    const s2Payload: any = {
      model: s2Model,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: talkflowPrompt }
      ],
      stream: false,
      temperature: s2Temp,
      top_p: isFiveFamily(s2Model) ? undefined : 0.9
    };

    const s2 = await callOpenAI(s2Payload, apiKey, STAGE2_TIMEOUT_MS);
    if (!s2.ok) {
      if (!strongHumanize && s2Model !== STRONG_HUMANIZE_MODEL) {
        const retryPayload = { ...s2Payload, model: STRONG_HUMANIZE_MODEL };
        const s2b = await callOpenAI(retryPayload, apiKey, Math.min(60_000, STAGE2_TIMEOUT_MS));
        if (!s2b.ok) return new Response(JSON.stringify({ error: "stage2_failed", detail: s2 }), { status: 502 });
        const locked = factLock(String(s2b.content || ""));
        return new Response(JSON.stringify({
          text: locked,
          modelUsed: { stage1: DEFAULT_STAGE1_MODEL, stage2: STRONG_HUMANIZE_MODEL },
          strongHumanize: true,
          breath_debug: { media, drift, baseTemp, s2Temp },
          userId
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "stage2_failed", detail: s2 }), { status: 502 });
    }

    const finalText = factLock(String(s2.content || ""));

    return new Response(JSON.stringify({
      text: finalText,
      modelUsed: { stage1: DEFAULT_STAGE1_MODEL, stage2: s2Model },
      jitter: !!jitter,
      strongHumanize: !!strongHumanize,
      breath_debug: { media, drift, baseTemp, s2Temp },
      userId
    }), { status: 200 });

  } catch (e:any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}

/* =========================================================================
   GET : Health
   ========================================================================= */
export async function GET() {
  try {
    const supabase = sbRead();
    const { data, error } = await supabase.from("categories").select("l1,l2,mode").limit(1);
    if (error) throw error;
    return new Response(JSON.stringify({
      ok: true,
      sampleCategory: data?.[0] ?? null,
      localLoaded: { cats: LOCAL_CATS.length, emos: LOCAL_EMO.emotions?.length ?? 0, styles: LOCAL_STYLE.styles?.length ?? 0 },
      promptVersion:
        CORE_PROMPT === CORE_PROMPT_V203 ? "v2.0.3" :
        CORE_PROMPT === CORE_PROMPT_V202 ? "v2.0.2" : "custom",
      emotionDrift: { version: EMO_DRIFT.version || "v1", default: EMO_DRIFT.default || null }
    }), { status: 200 });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, message: e?.message ?? String(e) }), { status: 500 });
  }
}
