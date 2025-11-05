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

/* =========================================================================
   File Utils
   ========================================================================= */
function readText(rel: string): string {
  try { return fs.readFileSync(path.join(process.cwd(), rel), "utf8"); }
  catch { console.warn(`⚠️ Missing file: ${rel}`); return ""; }
}
function readJsonSafe<T>(rel: string, fb: T): T {
  try { const t = readText(rel); return t ? (JSON.parse(t) as T) : fb; } catch { return fb; }
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
type EmotionJSON = { default_emotion?: string; emotions: Array<{ id: string }> };
type StyleJSON = { styles: Array<{ id: string }> };

const LOCAL_CATS  = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO   = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

/* =========================================================================
   Prompts
   ========================================================================= */
const CORE_PROMPT_V205 = readText("prompts/bs_prompt_v2.0.5.txt");
const CORE_PROMPT      = CORE_PROMPT_V205 || "You are Boost Suite v2.0.5 copy refiner.";
const YAKKI_A = readText("prompts/filters/BoostSuite_薬機法フィルターA.txt");
const YAKKI_B = readText("prompts/filters/BoostSuite_薬機法フィルターB.txt");
const YAKKI_C = readText("prompts/filters/BoostSuite_薬機法フィルターC.txt");
const YAKKI_D = readText("prompts/filters/BoostSuite_薬機法フィルターD.txt");

/* =========================================================================
   OpenAI helpers
   ========================================================================= */
const isFiveFamily  = (m: string) => /^gpt-5($|-)/i.test(m);
const DEFAULT_STAGE1_MODEL = (process.env.BOOST_STAGE1_MODEL ?? "").trim() || "gpt-5-mini";
const DEFAULT_STAGE2_MODEL = (process.env.BOOST_STAGE2_MODEL ?? "").trim() || "gpt-4o-mini";
const STRONG_HUMANIZE_MODEL = (process.env.BOOST_STRONG_HUMANIZE_MODEL ?? "").trim() || "gpt-5";

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
  const raw = await res.text();
  let json: any = {}; try { json = JSON.parse(raw); } catch {}
  const content = json?.choices?.[0]?.message?.content ?? "";
  return res.ok ? { ok: true as const, content } : { ok: false as const, error: json?.error ?? (raw || res.statusText) };
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
   Light FactLock（語尾・単位整形＋語彙の微調整）
   ========================================================================= */
function factLock(text: string) {
  if (!text) return text;
  return text
    .replace(/ｍｌ|ＭＬ|㎖/g,"mL")
    .replace(/ｗ|Ｗ/g,"W")
    .replace(/　/g," ")
    .replace(/このアイテム/g,"このディフューザー")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

/* =========================================================================
   POST : Stage1 → Stage2 (Warmflow v2.0.5)
   ========================================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      strongHumanize = false,
      jitter = false, // 将来拡張用
      temperature
    } = body ?? {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
    }

    const sb = await sbServer();
    const { data: userRes } = await sb.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const compact = String(prompt ?? "").slice(0, 16000);

    /* ---------------- Stage1: FACT＋SmartBullet 素体 ---------------- */
    const yakkiBlock = [YAKKI_A, YAKKI_B, YAKKI_C, YAKKI_D].filter(Boolean).join("\n");
    const s1Prompt = [
      "【Stage1｜FACT＋SmartBullet（v2.0.5）】",
      "目的：構造・仕様・法規を整流し、v2.0.5構文の素体を生成。",
      "",
      "■ Safety 参考（必要時のみ配慮）",
      yakkiBlock || "（特記なし）",
      "",
      "— 原文 —",
      compact
    ].join("\n");

    const s1Payload: any = {
      model: DEFAULT_STAGE1_MODEL,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: s1Prompt }
      ],
      stream: false
    };
    // gpt-5 ファミリーは temperature 非対応 → 付けない
    if (!isFiveFamily(DEFAULT_STAGE1_MODEL)) {
      s1Payload.temperature = typeof temperature === "number" ? temperature : 0.25;
      s1Payload.top_p = 0.9;
    } else {
      delete s1Payload.temperature;
      delete s1Payload.top_p;
    }

    const s1 = await callOpenAI(s1Payload, apiKey, STAGE1_TIMEOUT_MS);
    if (!s1.ok) {
      return new Response(JSON.stringify({ error: "stage1_failed", detail: s1.error }), { status: 502 });
    }
    const stage1 = String(s1.content || "");

    /* ---------------- Stage2: Talkflow v2.0.5 “Warmflow Refine” ---------------- */
    const s2Model = strongHumanize ? STRONG_HUMANIZE_MODEL : DEFAULT_STAGE2_MODEL;
    const s2BaseTemp = typeof temperature === "number" ? temperature : 0.36;
    const s2Temp = jitter ? Math.max(0.45, s2BaseTemp) : s2BaseTemp;

    const talkflowPrompt = [
      "【Stage2｜Talkflow v2.0.5 “Warmflow Refine”】",
      "目的：Stage1の構造（見出し／SmartBullet）を保持し、“喋るような温度”と余韻を与える。",
      "",
      "Warmflow Ruleset v1.0：",
      "1. 文頭は感情語で始めず状況を描写する。",
      "2. 『仕様→恩恵→状況/留保』を1文脈で完結。",
      "3. 距離語は『手元／灯り／静かな蒸気』など触覚寄り。",
      "4. 感情修飾語は1文1つまで。詩的過剰は避ける。",
      "5. クロージングは香り/光/時間のいずれかを内包し、言い切りすぎない。",
      "",
      "— Stage1（素体） —",
      stage1
    ].join("\n");

    const s2Payload: any = {
      model: s2Model,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: talkflowPrompt }
      ],
      stream: false
    };
    // gpt-5 系は温度パラメータを外す
    if (!isFiveFamily(s2Model)) {
      s2Payload.temperature = s2Temp;
      s2Payload.top_p = 0.9;
    } else {
      delete s2Payload.temperature;
      delete s2Payload.top_p;
    }

    let s2 = await callOpenAI(s2Payload, apiKey, STAGE2_TIMEOUT_MS);
    if (!s2.ok) {
      // ---- Fallback: 強化 Humanize（gpt-5） ----
      const retryPayload: any = { ...s2Payload, model: STRONG_HUMANIZE_MODEL };
      delete retryPayload.temperature;
      delete retryPayload.top_p;
      const s2b = await callOpenAI(retryPayload, apiKey, Math.min(60_000, STAGE2_TIMEOUT_MS));
      if (!s2b.ok) {
        return new Response(JSON.stringify({ error: "stage2_failed", detail: s2b.error }), { status: 502 });
      }
      const lockedB = factLock(String(s2b.content || ""));
      return new Response(JSON.stringify({
        text: lockedB,
        modelUsed: { stage1: DEFAULT_STAGE1_MODEL, stage2: STRONG_HUMANIZE_MODEL },
        strongHumanize: true,
        userId,
        promptVersion: "v2.0.5"
      }), { status: 200 });
    }

    const finalText = factLock(String(s2.content || ""));
    return new Response(JSON.stringify({
      text: finalText,
      modelUsed: { stage1: DEFAULT_STAGE1_MODEL, stage2: s2Model },
      strongHumanize: !!strongHumanize,
      userId,
      promptVersion: "v2.0.5"
    }), { status: 200 });

  } catch (e: any) {
    console.error("API crashed:", e?.stack || e?.message || e);
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
    return new Response(JSON.stringify({
      ok: true,
      sampleCategory: data?.[0] ?? null,
      localLoaded: { cats: LOCAL_CATS.length, emos: LOCAL_EMO.emotions?.length ?? 0, styles: LOCAL_STYLE.styles?.length ?? 0 },
      promptVersion: "v2.0.5"
    }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e?.message || String(e) }), { status: 500 });
  }
}
