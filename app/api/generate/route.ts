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
  try { return fs.readFileSync(path.join(process.cwd(), rel), "utf8"); }
  catch { console.warn(`⚠️ Missing file: ${rel}`); return ""; }
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
type EmotionJSON = { emotions: Array<{ id: string }> };
type StyleJSON   = { styles: Array<{ id: string }> };

const LOCAL_CATS  = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO   = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

/* =========================================================================
   Prompts
   ========================================================================= */
const CORE_PROMPT_V207 = readText("prompts/bs_prompt_v2.0.7.txt");
const CORE_PROMPT      = CORE_PROMPT_V207 || "You are Boost Suite v2.0.7 copy refiner.";

const YAKKI_FILTERS = ["A","B","C","D"]
  .map(k => readText(`prompts/filters/BoostSuite_薬機法フィルター${k}.txt`))
  .filter(Boolean)
  .join("\n");

// Explain Layer は 1.0 固定
const EXPLAIN_PROMPT_V1 = readText("prompts/explain/BoostSuite_Explain_v1.0.txt");

/* =========================================================================
   OpenAI helpers
   ========================================================================= */
const isFiveFamily  = (m: string) => /^gpt-5($|-)/i.test(m);

const DEFAULT_STAGE1_MODEL  = process.env.BOOST_STAGE1_MODEL?.trim() || "gpt-5-mini";
const DEFAULT_STAGE2_MODEL  = process.env.BOOST_STAGE2_MODEL?.trim() || "gpt-4o-mini";
const STRONG_HUMANIZE_MODEL = process.env.BOOST_STRONG_HUMANIZE_MODEL?.trim() || "gpt-5";
const EXPLAIN_LAYER_MODEL   = process.env.BOOST_EXPLAIN_MODEL?.trim() || "gpt-4o-mini";

async function callOpenAI(payload: any, key: string, timeout: number) {
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeout);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const raw = await res.text();
    let json: any = {}; try { json = JSON.parse(raw); } catch {}
    const content = json?.choices?.[0]?.message?.content ?? "";
    if (res.ok) return { ok:true as const, content };
    return { ok:false as const, error: json?.error ?? (raw || res.statusText) };
  } catch(e:any) {
    return { ok:false as const, error: e?.message || String(e) };
  } finally {
    clearTimeout(t);
  }
}

/* =========================================================================
   Supabase
   ========================================================================= */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function sbRead() { return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } }); }
async function sbServer() {
  const ck = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, { cookies: { get:n=>ck.get(n)?.value, set(){}, remove(){} } });
}

/* =========================================================================
   Light FactLock（単位／語調／改行整形）
   ========================================================================= */
function factLock(text: string) {
  if (!text) return "";
  return text
    .replace(/ｍｌ|ＭＬ|㎖/g,"mL")
    .replace(/ｗ|Ｗ/g,"W")
    .replace(/℃/g,"°C")
    .replace(/本製品/g,"このアイテム")
    .replace(/　/g," ")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

/* =========================================================================
   POST : Stage1（FACT＋SmartBullet）
        → Stage2（Talkflow）
        → Stage3（Explain Layer／解説AI・任意）
   ========================================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      strongHumanize = false,
      jitter = false,
      annotation_mode = false
    } = body ?? {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
    }

    const sb = await sbServer();
    const { data: userRes } = await sb.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const compact = String(prompt ?? "").replace(/\r/g,"").slice(0, 16000);

    /* ---------------- Stage1: FACT＋SmartBullet ---------------- */
    const s1Payload:any = {
      model: DEFAULT_STAGE1_MODEL,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: [
          "【Stage1｜FACT＋SmartBullet v2.2】",
          "目的：事実・仕様・法規整合＋売れる構文素体生成。",
          "",
          YAKKI_FILTERS,
          "",
          "— 原文 —",
          compact
        ].join("\n") }
      ],
      stream: false
    };
    if (!isFiveFamily(DEFAULT_STAGE1_MODEL)) {
      s1Payload.temperature = 0.22;
      s1Payload.top_p = 0.9;
    }

    const s1 = await callOpenAI(s1Payload, apiKey, STAGE1_TIMEOUT_MS);
    if (!s1.ok) return new Response(JSON.stringify({ error: "stage1_failed", detail: s1.error }), { status: 502 });
    const stage1 = String(s1.content || "");

    /* ---------------- Stage2: Talkflow “Perfect Warmflow” ---------------- */
    const s2ModelBase = strongHumanize ? STRONG_HUMANIZE_MODEL : DEFAULT_STAGE2_MODEL;
    const s2Payload:any = {
      model: s2ModelBase,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: [
          "【Stage2｜Talkflow v2.0.7 “Perfect Warmflow”】",
          "目的：Stage1構造を保持しつつ、句読点・温度・未来導線・余白を最適化。",
          "",
          "Warmflow Rules:",
          "1. SmartBulletは5点構成を保持（1〜4機能、5情緒）。",
          "2. リードはWarmflow構文、クロージングは未来導線を必ず含む。",
          "",
          "— Stage1 —",
          stage1
        ].join("\n") }
      ],
      stream: false
    };
    if (!isFiveFamily(s2Payload.model)) {
      s2Payload.temperature = jitter ? 0.4 : 0.33;
      s2Payload.top_p = 0.9;
    }

    let s2 = await callOpenAI(s2Payload, apiKey, STAGE2_TIMEOUT_MS);
    if (!s2.ok) {
      const retry:any = { ...s2Payload, model: STRONG_HUMANIZE_MODEL };
      if (isFiveFamily(STRONG_HUMANIZE_MODEL)) {
        delete retry.temperature;
        delete retry.top_p;
      }
      const s2b = await callOpenAI(retry, apiKey, STAGE2_TIMEOUT_MS);
      if (!s2b.ok) return new Response(JSON.stringify({ error: "stage2_failed", detail: s2b.error }), { status: 502 });
      s2 = s2b;
    }

    const finalText = factLock(String(s2.content || ""));

    /* ---------------- Stage3: Explain Layer（解説AI） ---------------- */
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
      const s3Payload: any = {
        model: EXPLAIN_LAYER_MODEL,
        messages: [
          { role: "system", content: "You are Boost Suite Explain Layer. Output strictly in JSON with top-level {\"annotations\": [...]}." },
          { role: "user", content: explainContent }
        ],
        stream: false
      };
      // gpt-5系以外のみ温度指定
      if (!isFiveFamily(EXPLAIN_LAYER_MODEL)) {
        s3Payload.temperature = 0.0;
        s3Payload.top_p = 1.0;
      }

      const s3 = await callOpenAI(s3Payload, apiKey, STAGE3_TIMEOUT_MS);
      if (s3.ok) {
        try {
          const parsed = JSON.parse(String(s3.content || "{}"));
          const arr = Array.isArray(parsed?.annotations) ? parsed.annotations : [];
          annotations = arr
            .filter((x:any) => x && typeof x === "object")
            .map((x:any) => ({
              section: String(x.section || ""),
              text: String(x.text || ""),
              type: String(x.type || "Structure"),
              importance: (x.importance === "high" || x.importance === "medium") ? x.importance : "low",
              quote: x.quote ? String(x.quote) : undefined,
              before: x.before ? String(x.before) : undefined,
              after: x.after ? String(x.after) : undefined,
              tip: x.tip ? String(x.tip) : undefined,
            }))
            .slice(0, 12);
        } catch {
          console.warn("⚠️ Explain JSON parse failed:", s3.content?.slice(0, 200));
        }
      }
    }

    /* ---------------- Response ---------------- */
    return new Response(JSON.stringify({
      text: finalText,
      annotations,
      modelUsed: {
        stage1: DEFAULT_STAGE1_MODEL,
        stage2: s2Payload.model,
        stage3: annotation_mode ? EXPLAIN_LAYER_MODEL : null
      },
      strongHumanize: !!strongHumanize,
      jitter: !!jitter,
      annotation_mode: !!annotation_mode,
      promptVersion: "v2.0.7",
      userId
    }), { status: 200 });

  } catch (e:any) {
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
    return new Response(JSON.stringify({
      ok: true,
      sampleCategory: data?.[0] ?? null,
      localLoaded: {
        cats: LOCAL_CATS.length,
        emos: LOCAL_EMO.emotions?.length ?? 0,
        styles: LOCAL_STYLE.styles?.length ?? 0
      },
      promptVersion: "v2.0.7"
    }), { status: 200 });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, message: e?.message || String(e) }), { status: 500 });
  }
}
