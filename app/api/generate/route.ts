/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SERVER_TIMEOUT_MS = 295_000;
const STAGE1_TIMEOUT_MS = 120_000;
const STAGE2_TIMEOUT_MS = 120_000;

/* ------------------------------------------------------------------ */
/* Utility Functions */
/* ------------------------------------------------------------------ */
function readText(rel: string): string {
  try { return fs.readFileSync(path.join(process.cwd(), rel), "utf8"); }
  catch { return ""; }
}
function readJsonSafe<T>(rel: string, fb: T): T {
  try { const t = readText(rel); return t ? JSON.parse(t) as T : fb; } catch { return fb; }
}

/* ------------------------------------------------------------------ */
/* Local Knowledge */
/* ------------------------------------------------------------------ */
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
type StyleJSON = { styles: Array<{ id: string }> };

const LOCAL_CATS  = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO   = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

/* ------------------------------------------------------------------ */
/* Prompts */
/* ------------------------------------------------------------------ */
const CORE_PROMPT_V207 = readText("prompts/bs_prompt_v2.0.7.txt");
const CORE_PROMPT      = CORE_PROMPT_V207 || "You are Boost Suite v2.0.7 copy refiner.";

const YAKKI_FILTERS = ["A","B","C","D"]
  .map(k => readText(`prompts/filters/BoostSuite_薬機法フィルター${k}.txt`))
  .filter(Boolean)
  .join("\n");

/* ------------------------------------------------------------------ */
/* OpenAI helpers */
/* ------------------------------------------------------------------ */
const isFiveFamily  = (m: string) => /^gpt-5($|-)/i.test(m);
const DEFAULT_STAGE1_MODEL = process.env.BOOST_STAGE1_MODEL?.trim() || "gpt-5-mini";
const DEFAULT_STAGE2_MODEL = process.env.BOOST_STAGE2_MODEL?.trim() || "gpt-4o-mini";
const STRONG_MODEL = process.env.BOOST_STRONG_HUMANIZE_MODEL?.trim() || "gpt-5";

async function callOpenAI(payload: any, key: string, timeout: number) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeout);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${key}` },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const raw = await res.text();
    const json = JSON.parse(raw || "{}");
    const content = json?.choices?.[0]?.message?.content ?? "";
    return res.ok ? { ok:true, content } : { ok:false, error:json?.error ?? res.statusText };
  } catch(e:any) {
    return { ok:false, error:e?.message || String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Supabase */
/* ------------------------------------------------------------------ */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function sbRead() { return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } }); }
async function sbServer() {
  const ck = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, { cookies: { get:n=>ck.get(n)?.value,set(){},remove(){} } });
}

/* ------------------------------------------------------------------ */
/* Text normalization */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* POST Handler */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, strongHumanize=false, jitter=false } = body ?? {};
    const apiKey = process.env.OPENAI_API_KEY!;
    const sb = await sbServer();
    const { data:userRes } = await sb.auth.getUser();
    const userId = userRes?.user?.id ?? null;
    const compact = String(prompt ?? "").slice(0,16000);

    /* ---------- Stage1 ---------- */
    const s1Payload:any = {
      model: DEFAULT_STAGE1_MODEL,
      messages:[
        {role:"system",content:CORE_PROMPT},
        {role:"user",content:[
          "【Stage1｜FACT＋SmartBullet v2.2】",
          "目的：事実・仕様・法規整合＋売れる構文素体生成。",
          "",
          YAKKI_FILTERS,
          "",
          "— 原文 —",
          compact
        ].join("\n")}
      ],
      stream:false
    };
    if(!isFiveFamily(DEFAULT_STAGE1_MODEL)){
      s1Payload.temperature=0.22;
      s1Payload.top_p=0.9;
    }
    const s1 = await callOpenAI(s1Payload, apiKey, STAGE1_TIMEOUT_MS);
    if(!s1.ok) return new Response(JSON.stringify({error:"stage1_failed",detail:s1.error}),{status:502});
    const stage1 = s1.content;

    /* ---------- Stage2 ---------- */
    const s2Payload:any = {
      model: strongHumanize?STRONG_MODEL:DEFAULT_STAGE2_MODEL,
      messages:[
        {role:"system",content:CORE_PROMPT},
        {role:"user",content:[
          "【Stage2｜Talkflow v2.0.7 “Perfect Warmflow”】",
          "目的：Stage1構造を保持しつつ、句読点・温度・未来導線・余白を最適化。",
          "",
          "Warmflow Rules:",
          "1. SmartBullet 1〜5の順序を保持（1〜4機能、5情緒）。",
          "2. 句読点は1文に「、」2回まで許容。",
          "3. リードには動的語を1つ以上入れる（立ち上がる／包み込む／灯る 等）。",
          "4. クロージングは所有後の未来や習慣化を必ず含める。",
          "5. 見出し構成は変更しない。余計な改行や削除を禁止。",
          "",
          "— Stage1（素体） —",
          stage1
        ].join("\n")}
      ],
      stream:false
    };
    if(!isFiveFamily(s2Payload.model)){
      s2Payload.temperature = jitter ? 0.4 : 0.33;
      s2Payload.top_p = 0.9;
    }

    const s2 = await callOpenAI(s2Payload, apiKey, STAGE2_TIMEOUT_MS);
    if(!s2.ok){
      // fallback once with strong model
      const retry:any = { ...s2Payload, model: STRONG_MODEL };
      if(isFiveFamily(STRONG_MODEL)){ delete retry.temperature; delete retry.top_p; }
      const s2b = await callOpenAI(retry, apiKey, STAGE2_TIMEOUT_MS);
      if(!s2b.ok){
        return new Response(JSON.stringify({error:"stage2_failed",detail:s2.error || s2b.error}),{status:502});
      }
      const finalB = factLock(s2b.content);
      return new Response(JSON.stringify({
        text: finalB,
        modelUsed:{stage1:DEFAULT_STAGE1_MODEL,stage2:STRONG_MODEL},
        strongHumanize:true,
        jitter,
        userId,
        promptVersion:"v2.0.7"
      }),{status:200});
    }

    const finalText = factLock(s2.content);
    return new Response(JSON.stringify({
      text: finalText,
      modelUsed:{stage1:DEFAULT_STAGE1_MODEL,stage2:s2Payload.model},
      strongHumanize,
      jitter,
      userId,
      promptVersion:"v2.0.7"
    }),{status:200});

  } catch(e:any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({error:String(e?.message || e)}),{status:500});
  }
}

/* ------------------------------------------------------------------ */
/* GET : Health Check */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const supabase = sbRead();
    const { data } = await supabase.from("categories").select("l1,l2,mode").limit(1);
    return new Response(JSON.stringify({
      ok:true,
      sampleCategory:data?.[0]??null,
      localLoaded:{
        cats:LOCAL_CATS.length,
        emos:LOCAL_EMO.emotions?.length??0,
        styles:LOCAL_STYLE.styles?.length??0
      },
      promptVersion:"v2.0.7"
    }),{status:200});
  } catch(e:any) {
    return new Response(JSON.stringify({ok:false,message:e?.message||String(e)}),{status:500});
  }
}
