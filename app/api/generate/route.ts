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

const LOCAL_CATS  = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO   = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

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

const DEFAULT_STAGE1_MODEL = process.env.BOOST_STAGE1_MODEL?.trim() || "gpt-5-mini";   // FACT
const DEFAULT_STAGE2_MODEL = process.env.BOOST_STAGE2_MODEL?.trim() || "gpt-4o-mini";  // Talkflow
const STRONG_HUMANIZE_MODEL = process.env.BOOST_STRONG_HUMANIZE_MODEL?.trim() || "gpt-5"; // fallback

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
  let json: any = {};
  try { json = JSON.parse(raw); } catch {}

  const content = json?.choices?.[0]?.message?.content ?? "";
  const errorDetail = json?.error ?? raw ?? res.statusText;

  if (res.ok) {
    return { ok: true as const, content };
  } else {
    return { ok: false as const, error: errorDetail };
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
   POST : Stage1 FACT → Stage2 Talkflow
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

    /* ---------------- Stage1: FACT（temperature送信しない） ---------------- */
    const s1Prompt = [
      "【Stage1｜FACT整流】",
      "目的：構造・仕様・法規の整合を最優先し、温度を抑えた脚本文を生成。",
      "",
      "— 原文 —",
      compact
    ].join("\n");

    const s1Payload: any = {
      model: DEFAULT_STAGE1_MODEL,
      messages:[{role:"system",content:CORE_PROMPT},{role:"user",content:s1Prompt}],
      stream: false
    };
    if (!isFiveFamily(DEFAULT_STAGE1_MODEL)) {
      s1Payload.temperature = 0.25;
      s1Payload.top_p = 0.9;
    }

    const s1 = await callOpenAI(s1Payload, apiKey, STAGE1_TIMEOUT_MS);
    if (!s1.ok) return new Response(JSON.stringify({error:"stage1_failed",detail:s1.error}),{status:502});
    const stage1 = s1.content;

    /* ---------------- Stage2: Talkflow v2.2.0 “Breath Layer” ---------------- */
    const {
      stage2Model,
      temperature = 0.34,
      stage2Temperature,
      strongHumanize = false,
      jitter = false,
      variants = 0,
    } = body ?? {};

    const s2Model =
      (typeof stage2Model === "string" && stage2Model.trim())
        ? stage2Model.trim()
        : (strongHumanize ? STRONG_HUMANIZE_MODEL : DEFAULT_STAGE2_MODEL);

    const s2Temp = typeof stage2Temperature === "number"
      ? stage2Temperature
      : (jitter ? Math.max(0.45, Number(temperature) || 0.34) : Number(temperature) || 0.34);

    const talkflowPrompt = [
      "【Stage2｜Talkflow v2.2.0 “Breath Layer”】",
      "目的：Stage1のFACTを改変せず、“喋るように”没入感を与える。句読点と呼吸のリズムで読み続けられる流れを作る。",
      "",
      "固定原則：",
      "- ライティングではなく会話の間合い。音読を前提に、過剰な改行や箇条書きは使わない（必要最小限のセクションヘッダのみ）。",
      "- セクション見出し以外は1〜3文単位の“まとまり”で構成。『、』の連打は禁止。句点は呼吸のために適度に入れる。",
      "- 事実（型番/容量/仕様/注意）は改変しない。誇張・断定を避け、留保（※使用環境により異なる等）を自然に添える。",
      "- “ギフト前提”の誘導はしない。原文や文脈にある場合のみ軽く触れる。販売者語（当店/弊社等）は自然に避ける。",
      "- タイトル（バランス/SEO）は**変更しない**。句読点や語順も維持。",
      "",
      "表現ガイド：",
      "- 余計な接続詞や説明臭は削ぎ落とし、目線は『今、手に取った人』に固定する。",
      "- 具体語をひとつ差し込む（例：手元灯／静かな蒸気／机の隅）ことで、情景を1カット描く。比喩の乱用はしない。",
      "- 目線の移動：『何ができる→どう楽か→どんな時にちょうどいいか』の順で軽く運ぶ。",
      "",
      "出力仕様：Boost Suite v2 テンプレの“番号見出し”のみ固定、本文は自然文（箇条書き最小限）。",
      "— Stage1（素体） —",
      stage1,
      "",
      "— 出力フォーマット（見出しは必ず守る。本文は自然文）—",
      "1.【タイトル※バランス】（Stage1のまま）",
      "2.【タイトル※SEO】（Stage1のまま）",
      "3.【sales版】（Tone＝Natural＋Warm）",
      "3.1 リード（6文前後／改行はしない／没入重視）",
      "3.2 主な特長・機能（自然文。箇条書きは最小限、必要なら2〜4項まで）",
      "3.3 他社との差別化（自然文で1段落）",
      "3.4 利用シーン（自然文で1段落。ギフト前提にしない）",
      "3.5 注意事項（事実のみ。1段落。必要に応じて短文を『。』で繋ぐ）",
      "3.6 クロージング（1段落／言い切りすぎない、軽い余韻）",
      "4.【Objections｜先回りQ&A】（Q→A を3〜5個。各1行ずつ。簡潔に。）",
      "5.【SNS要約（200字・絵文字2〜4個）】（1段落。最後に1行CTA）",
      "6.【A/Bテスト提案（指標・仮説付き）】（タイトル軸/訴求軸/画像軸の3枠。各1行ずつ）",
      "",
      "注意：",
      "- セクション見出し以外に“不要な空行”“過剰な改行”を作らない。",
      "- 『、』を連打して読みづらくしない。",
      "- 出力全体を“話し言葉寄りの自然さ”で仕上げる。",
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
        const retryPayload = { ...s2Payload, model: STRONG_HUMANIZE_MODEL, top_p: undefined };
        const s2b = await callOpenAI(retryPayload, apiKey, Math.min(60_000, STAGE2_TIMEOUT_MS));
        if (!s2b.ok) {
          return new Response(JSON.stringify({ error: "stage2_failed", detail: s2 }), { status: 502 });
        }
        const locked = factLock(String(s2b.content || ""));
        return new Response(JSON.stringify({
          text: locked,
          modelUsed: { stage1: DEFAULT_STAGE1_MODEL, stage2: STRONG_HUMANIZE_MODEL },
          strongHumanize: true,
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
      userId
    }), { status: 200 });

  } catch (e:any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}

/* =========================================================================
   GET : Health (最小)
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
        CORE_PROMPT === CORE_PROMPT_V203 ? "v2.0.3"
      : CORE_PROMPT === CORE_PROMPT_V202 ? "v2.0.2"
      : "custom",
    }), { status: 200 });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, message: e?.message ?? String(e) }), { status: 500 });
  }
}
