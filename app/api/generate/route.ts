/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/* =========================================================================
   Runtime / Timeouts
   ====================================================================== */
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
const SERVER_TIMEOUT_MS = Math.max(60_000, Math.min(295_000, (maxDuration - 5) * 1000));
const STAGE1_TIMEOUT_MS = Math.min(SERVER_TIMEOUT_MS, 120_000);
const STAGE2_TIMEOUT_MS = Math.min(SERVER_TIMEOUT_MS, 120_000);

/* =========================================================================
   File utils
   ====================================================================== */
function readText(rel: string): string {
  try {
    const p = path.join(process.cwd(), rel);
    return fs.readFileSync(p, "utf8");
  } catch {
    console.warn(`⚠️ Missing file: ${rel}`);
    return "";
  }
}
function parseReplaceDict(src: string) {
  return src
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("=>"))
    .map((l) => {
      const [from, to] = l.split("=>");
      return { from: (from ?? "").trim(), to: (to ?? "").trim() };
    })
    .filter((r) => r.from && r.to);
}
function parseCsvWords(src: string) {
  return src.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
}

/* =========================================================================
   Local knowledge
   ====================================================================== */
function readCategoryCsv(rel: string) {
  const t = readText(rel);
  const rows = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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
function readJsonSafe<T>(rel: string, fb: T): T {
  try {
    const t = readText(rel);
    return t ? (JSON.parse(t) as T) : fb;
  } catch {
    return fb;
  }
}

type EmotionJSON = { emotions: Array<{ id: string; tones?: string[]; patterns?: string[] }> };
type StyleJSON = { styles: Array<{ id: string; voice: string; rhythm: string }>; media_overrides?: Array<{ media: string; sentence_length: string; emoji?: boolean }> };

const LOCAL_CATS = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

/* =========================================================================
   Prompts
   ====================================================================== */
const CORE_PROMPT = readText("prompts/bs_prompt_v2.0.0.txt") || readText("prompts/bs_prompt_v1.9.9.txt") || "You are Boost Suite copy refiner.";
const YAKKI_ALL = [
  readText("prompts/filters/BoostSuite_薬機法フィルターA.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターB.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターC.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターD.txt"),
].filter(Boolean).join("\n");
const REPLACE_RULES = parseReplaceDict(readText("prompts/filters/Boost_Fashion_置き換え辞書.txt"));
const BEAUTY_WORDS = parseCsvWords(readText("prompts/filters/美顔器キーワード.csv"));

/* =========================================================================
   OpenAI helpers
   ====================================================================== */
const isFiveFamily = (m: string) => /^gpt-5($|-)/i.test(m);
const isFourOFamily = (m: string) => /^gpt-4o($|-)/i.test(m);
const DEFAULT_STAGE1_MODEL = process.env.BOOST_STAGE1_MODEL?.trim() || "gpt-5-mini";
const DEFAULT_STAGE2_MODEL = process.env.BOOST_STAGE2_MODEL?.trim() || "gpt-4o-mini";

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}
async function callOpenAI(payload: any, key: string, timeout: number) {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  };
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", init, timeout);
      const raw = await res.text();
      let json: any = {};
      try { json = JSON.parse(raw); } catch {}
      const c = json?.choices?.[0]?.message?.content ?? "";
      if (res.ok && c.trim()) return { ok: true, content: c };
      if (res.status === 429 || res.status >= 500) await new Promise(r => setTimeout(r, 800 * (i + 1)));
    } catch { await new Promise(r => setTimeout(r, 600 * (i + 1))); }
  }
  return { ok: false };
}

/* =========================================================================
   Supabase
   ====================================================================== */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sbRead = () => createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
async function sbServer() {
  const ck = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: { get: n => ck.get(n)?.value, set() {}, remove() {} },
  });
}

/* =========================================================================
   POST: Dual-stage
   ====================================================================== */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, media = "ad" } = body ?? {};
    const apiKey = process.env.OPENAI_API_KEY!;
    const sb = await sbServer();
    const { data: u } = await sb.auth.getUser();
    const userId = u?.user?.id ?? null;
    const compacted = String(prompt || "").slice(0, 16000);

    /* ------------------------- Stage1 : FACT整流 ------------------------- */
    const s1Model = DEFAULT_STAGE1_MODEL;
    const s1Payload = {
      model: s1Model,
      messages: [
        { role: "system", content: CORE_PROMPT },
        {
          role: "user",
          content: [
            "【Stage1｜FACT整流】",
            "目的：事実・仕様・法規整合を最優先し、平文で整える。",
            "禁止：感情語・比喩・抽象余韻。",
            YAKKI_ALL,
            REPLACE_RULES.map(r => `- ${r.from}→${r.to}`).join("\n"),
            BEAUTY_WORDS.map(w => `- ${w}`).join("\n"),
            "",
            compacted,
          ].join("\n"),
        },
      ],
      stream: false,
      temperature: 0.25,
      top_p: 0.9,
    };
    const s1 = await callOpenAI(s1Payload, apiKey, STAGE1_TIMEOUT_MS);
    if (!s1.ok) throw new Error("Stage1 failed");
    const stage1Text = s1.content!;

    /* ------------------------- Stage2 : Humanize合理リード ------------------------- */
    const s2Model = DEFAULT_STAGE2_MODEL;
    const s2Payload = {
      model: s2Model,
      messages: [
        { role: "system", content: CORE_PROMPT },
        {
          role: "user",
          content: [
            "【Stage2｜Humanize合理リード強化】",
            "目的：Stage1のFACTを保持しつつ、自然な流れの販売文に整える。",
            "",
            "《リード強化ルール》",
            "・情緒ではなく共感と合理の橋渡しを狙う。",
            "・書き出しは「いざという時」「もし〜なら」など状況提示から始める。",
            "・2行目で製品がその不安を解消することを明確に述べる。",
            "・3〜4行目で具体的なシーン・スペックを入れ、最後は安心感で締める。",
            "・詩的・抽象的・比喩的表現は禁止（例：静かな頼もしさ 等）。",
            "・リードは“納得で始まり、期待で終わる”WP型5行構成で書く。",
            "",
            "《出力形式》Boost Suite v2 完全構文（全項目出力）",
            "",
            "— Stage1 素体 —",
            stage1Text,
          ].join("\n"),
        },
      ],
      stream: false,
      temperature: 0.4,
      top_p: 0.92,
    };
    const s2 = await callOpenAI(s2Payload, apiKey, STAGE2_TIMEOUT_MS);
    const text = s2.ok ? s2.content : stage1Text;

    await sbRead().from("intent_logs").insert({
      media,
      input_text: prompt,
      user_id: userId,
    });

    return new Response(JSON.stringify({
      text,
      modelUsed: { stage1: s1Model, stage2: s2Model },
      userId,
    }), { status: 200 });
  } catch (e: any) {
    console.error("API crashed", e);
    return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500 });
  }
}
