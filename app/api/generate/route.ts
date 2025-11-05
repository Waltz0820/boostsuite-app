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
type EmotionJSON = { default_emotion?: string; emotions: Array<{ id: string }> };
type StyleJSON = { styles: Array<{ id: string }> };

const LOCAL_CATS  = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO   = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

/* =========================================================================
   Prompts
   ========================================================================= */
const CORE_PROMPT_V206 = readText("prompts/bs_prompt_v2.0.6.txt");
const CORE_PROMPT_V205 = readText("prompts/bs_prompt_v2.0.5.txt");
const CORE_PROMPT      = CORE_PROMPT_V206 || CORE_PROMPT_V205 || "You are Boost Suite v2 copy refiner.";

const YAKKI_A = readText("prompts/filters/BoostSuite_薬機法フィルターA.txt");
const YAKKI_B = readText("prompts/filters/BoostSuite_薬機法フィルターB.txt");
const YAKKI_C = readText("prompts/filters/BoostSuite_薬機法フィルターC.txt");
const YAKKI_D = readText("prompts/filters/BoostSuite_薬機法フィルターD.txt");

/* =========================================================================
   OpenAI helpers
   ========================================================================= */
const isFiveFamily  = (m: string) => /^gpt-5($|-)/i.test(m);
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
   Light FactLock（語尾・単位整形＋語彙微整流）
   ========================================================================= */
function factLock(text: string) {
  if (!text) return text;
  return text
    .replace(/ｍｌ|ＭＬ|㎖/g,"mL")
    .replace(/ｗ|Ｗ/g,"W")
    .replace(/℃/g,"°C")
    .replace(/　/g," ")
    .replace(/本製品/g, "このアイテム")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

/* =========================================================================
   POST : Stage1（FACT＋SmartBullet v2.1） → Stage2（Warmflow v2.0.6）
   ========================================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      stage1Model,
      stage2Model,
      temperature,
      stage1Temperature,
      stage2Temperature,
      strongHumanize = false,
      jitter = false
    } = body ?? {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
    }

    const sb = await sbServer();
    const { data: userRes } = await sb.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const compact = String(prompt ?? "").replace(/\r/g,"").slice(0, 16000);

    /* ---------------- Stage1: FACT＋SmartBullet v2.1 素体生成 ---------------- */
    const s1Model = (typeof stage1Model === "string" && stage1Model.trim()) ? stage1Model.trim() : DEFAULT_STAGE1_MODEL;
    const s1Temp  = typeof stage1Temperature === "number" ? stage1Temperature : (typeof temperature === "number" ? temperature : 0.22);

    const yakkiBlock = [YAKKI_A, YAKKI_B, YAKKI_C, YAKKI_D].filter(Boolean).join("\n");

    const s1Prompt = [
      "【Stage1｜FACT整流＋SmartBullet v2.1 素体（v2.0.6）】",
      "目的：事実・仕様・法規の整合を優先し、“売れる構文”の素体を完成させる。",
      "",
      "■ SmartBullet v2.1 規範（5点固定／全角52〜90字／最上級・断定禁止）",
      "・**順序：1〜4＝機能（仕様→恩恵→留保）／5＝情緒（質感/上質感/デザイン/ギフト適性）**",
      "・留保は自然に差す（例：※使用環境により異なる／※設定条件による）。",
      "",
      "■ タイトル規範（SmartSEO）",
      "・主要カテゴリ・指名語を先頭固定、特徴2〜3語＋関連語1〜2語を自然挿入。",
      "・バランス32〜64全角／SEO50〜80全角。数値は半角＋単位。",
      "",
      "■ Safety（参照）",
      yakkiBlock || "（特記なし）",
      "",
      "— 原文 —",
      compact,
      "",
      "— 出力テンプレート —",
      "1.【タイトル※バランス】",
      "{{title_balanced}}",
      "",
      "2.【タイトル※SEO】",
      "{{title_seo}}",
      "",
      "3.【sales版】（Tone＝Natural＋Warm）",
      "3.1 リード（lead_mode=WP+ / 6行：状況→即効→機能→体験→データ→余韻）",
      "{{lead}}",
      "",
      "3.2 主な特長・機能（SmartBullet準拠：**1〜4機能／5情緒**）",
      "{{bullet_1}}",
      "{{bullet_2}}",
      "{{bullet_3}}",
      "{{bullet_4}}",
      "{{bullet_5}}",
      "",
      "3.3 他社との差別化（1段落）",
      "{{diff}}",
      "",
      "3.4 利用シーン（1段落・自分用前提）",
      "{{scenes}}",
      "",
      "3.5 注意事項（1段落：法規/免責/数値の留保）",
      "{{notice}}",
      "",
      "3.6 クロージング（close_mode=A〜Dのいずれか）",
      "{{closing}}",
      "",
      "4.【Objections｜先回りQ&A】（Q→A 3〜5件／各1行）",
      "Q. {{q1}}",
      "A. {{a1}}",
      "Q. {{q2}}",
      "A. {{a2}}",
      "Q. {{q3}}",
      "A. {{a3}}",
      "",
      "5.【SNS要約（200字・絵文字2〜4個／**動詞スタート**）】",
      "{{sns}}",
      "",
      "6.【A/Bテスト提案（指標・仮説付き）】（タイトル軸/訴求軸/画像軸/CTA軸）",
      "〔タイトル軸〕 A：{{ab_title_a}} / B：{{ab_title_b}}｜KPI：CTR｜仮説：{{hyp_title}}",
      "〔訴求軸〕 A：{{ab_pitch_a}} / B：{{ab_pitch_b}}｜KPI：CVR｜仮説：{{hyp_pitch}}",
      "〔画像軸〕 A：{{ab_img_a}} / B：{{ab_img_b}}｜KPI：滞在時間｜仮説：{{hyp_img}}",
      "〔CTA軸〕 A：{{ab_cta_a}} / B：{{ab_cta_b}}｜KPI：カート率｜仮説：{{hyp_cta}}",
    ].join("\n");

    const s1Payload: any = {
      model: s1Model,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: s1Prompt }
      ],
      stream: false
    };
    if (!isFiveFamily(s1Model)) {
      s1Payload.temperature = typeof s1Temp === "number" ? s1Temp : 0.22;
      s1Payload.top_p = 0.9;
    }

    const s1 = await callOpenAI(s1Payload, apiKey, STAGE1_TIMEOUT_MS);
    if (!s1.ok) {
      return new Response(JSON.stringify({ error: "stage1_failed", detail: s1.error }), { status: 502 });
    }
    const stage1 = String(s1.content || "");

    /* ---------------- Stage2: Talkflow v2.0.6 “Warmflow Refine+” ---------------- */
    const s2ModelBase =
      (typeof stage2Model === "string" && stage2Model.trim())
        ? stage2Model.trim()
        : (strongHumanize ? STRONG_HUMANIZE_MODEL : DEFAULT_STAGE2_MODEL);

    const s2Temp = typeof stage2Temperature === "number"
      ? stage2Temperature
      : (jitter ? Math.max(0.45, Number(temperature) || 0.34) : Number(temperature) || 0.34);

    const talkflowPrompt = [
      "【Stage2｜Talkflow v2.0.6 “Warmflow Refine+”】",
      "目的：Stage1の“SmartBullet構造”とテンプレ見出しを維持し、喋るような自然さ・触覚・未来導線を付与。",
      "",
      "固定原則：",
      "- 箇条書き（SmartBullet=5点）構造は維持。削除・平文化しない。",
      "- **Bullet順序は 1〜4＝機能／5＝情緒** を保持。",
      "- セクション見出し（1〜6）は必ず残す。不要な改行・空行は作らない。",
      "- 事実（容量・仕様・数値・注意）は改変しない。免責は自然に残す。",
      "- “ギフト前提”の誘導や販売者語（当店/弊社）は避ける。距離語「本製品」は使用しない。",
      "- タイトル（バランス/SEO）の文言は変更しない（句読点や語順も維持）。",
      "",
      "表現ガイド：",
      "- リード：動的/触覚語を入れる（立ち上がる蒸気／やわらかな灯り／しっとり など）。",
      "- クロージング：**所有後の未来／習慣化**を1文必須で入れる。",
      "- SNS要約：**動詞スタート**で書き出す（〜で整えよう／〜を始めよう）。",
      "",
      "— Stage1（素体：整流対象） —",
      stage1,
      "",
      "— 出力フォーマット（見出し固定／本文は自然文）—",
      "1.【タイトル※バランス】（Stage1のまま）",
      "2.【タイトル※SEO】（Stage1のまま）",
      "3.【sales版】（Tone＝Natural＋Warm）",
      "3.1 リード（6文前後／没入重視／改行しない）",
      "3.2 主な特長・機能（SmartBullet：**1〜4機能／5情緒**）",
      "3.3 他社との差別化（1段落）",
      "3.4 利用シーン（1段落／自分用前提）",
      "3.5 注意事項（1段落／法規準拠）",
      "3.6 クロージング（1段落／所有後の未来を含める）",
      "4.【Objections｜先回りQ&A】（Q→A 3〜5件／各1行）",
      "5.【SNS要約（200字・絵文字2〜4個／動詞スタート）】（最後に1行CTA）",
      "6.【A/Bテスト提案（指標・仮説付き）】（タイトル軸/訴求軸/画像軸/CTA軸）",
    ].join("\n");

    const s2Payload: any = {
      model: s2ModelBase,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: talkflowPrompt }
      ],
      stream: false
    };
    if (!isFiveFamily(s2ModelBase)) {
      s2Payload.temperature = s2Temp;
      s2Payload.top_p = 0.9;
    }

    const s2 = await callOpenAI(s2Payload, apiKey, STAGE2_TIMEOUT_MS);
    if (!s2.ok) {
      // fallback to stronger humanize model (e.g., GPT-5) once
      if (!strongHumanize && s2ModelBase !== STRONG_HUMANIZE_MODEL) {
        const retryPayload: any = { ...s2Payload, model: STRONG_HUMANIZE_MODEL };
        if (isFiveFamily(STRONG_HUMANIZE_MODEL)) { delete retryPayload.temperature; delete retryPayload.top_p; }
        const s2b = await callOpenAI(retryPayload, apiKey, Math.min(60_000, STAGE2_TIMEOUT_MS));
        if (!s2b.ok) {
          return new Response(JSON.stringify({ error: "stage2_failed", detail: s2.error || s2b.error }), { status: 502 });
        }
        const lockedB = factLock(String(s2b.content || ""));
        return new Response(JSON.stringify({
          text: lockedB,
          modelUsed: { stage1: s1Model, stage2: STRONG_HUMANIZE_MODEL },
          strongHumanize: true,
          jitter: !!jitter,
          userId,
          promptVersion: "v2.0.6"
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "stage2_failed", detail: s2.error }), { status: 502 });
    }

    const finalText = factLock(String(s2.content || ""));
    return new Response(JSON.stringify({
      text: finalText,
      modelUsed: { stage1: s1Model, stage2: s2ModelBase },
      jitter: !!jitter,
      strongHumanize: !!strongHumanize,
      userId,
      promptVersion: "v2.0.6"
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
      ok:true,
      sampleCategory:data?.[0]??null,
      localLoaded:{cats:LOCAL_CATS.length,emos:LOCAL_EMO.emotions?.length??0,styles:LOCAL_STYLE.styles?.length??0},
      promptVersion:
        CORE_PROMPT === CORE_PROMPT_V206 ? "v2.0.6" :
        (CORE_PROMPT === CORE_PROMPT_V205 ? "v2.0.5" : "custom")
    }),{status:200});
  } catch(e:any) {
    return new Response(JSON.stringify({ok:false,message:e?.message||String(e)}),{status:500});
  }
}
