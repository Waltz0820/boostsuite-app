/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
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
  try { return fs.readFileSync(path.join(process.cwd(), rel), "utf8"); }
  catch { console.warn(`⚠️  Missing file: ${rel}`); return ""; }
}
function parseReplaceDict(src: string) {
  return src.split(/\r?\n/).map(l=>l.trim()).filter(l=>l && !l.startsWith("#") && l.includes("=>"))
    .map(l=>{const [from,to]=l.split("=>");return {from:(from??"").trim(),to:(to??"").trim()};})
    .filter(r=>r.from && r.to);
}
function parseCsvWords(src: string) {
  return src.split(/[\r\n,]+/).map(s=>s.trim()).filter(Boolean);
}

/* =========================================================================
   Local knowledge
   ====================================================================== */
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
function readJsonSafe<T>(rel: string, fb: T): T {
  try { const t = readText(rel); return t ? JSON.parse(t) as T : fb; } catch { return fb; }
}

type EmotionJSON = { default_emotion?: string; emotions: Array<{ id: string; aliases?: string[]; tones?: string[]; patterns?: string[]; use_for_modes?: string[] }> };
type StyleJSON = {
  styles: Array<{ id: string; voice: string; rhythm: string; lexicon_plus?: string[]; lexicon_minus?: string[]; use_for_modes?: string[] }>;
  media_overrides?: Array<{ media: string; sentence_length: string; emoji?: boolean }>;
};

const LOCAL_CATS = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO  = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE= readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

/* =========================================================================
   Prompts
   ====================================================================== */
const CORE_PROMPT_V2   = readText("prompts/bs_prompt_v2.0.0.txt");
const CORE_PROMPT_V199 = readText("prompts/bs_prompt_v1.9.9.txt");
const CORE_PROMPT      = CORE_PROMPT_V2 || CORE_PROMPT_V199 || "You are Boost Suite copy refiner.";

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
const isFiveFamily  = (m: string) => /^gpt-5($|-)/i.test(m);
const isFourOFamily = (m: string) => /^gpt-4o($|-)/i.test(m);

const DEFAULT_STAGE1_MODEL = process.env.BOOST_STAGE1_MODEL?.trim() || "gpt-5-mini";   // FACT
const DEFAULT_STAGE2_MODEL = process.env.BOOST_STAGE2_MODEL?.trim() || "gpt-4o-mini";  // Humanize

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
  let lastErr: any = null;
  for (let i=0;i<2;i++) {
    try {
      const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", init, timeout);
      const raw = await res.text();
      let json: any = {}; try { json = JSON.parse(raw); } catch {}
      const content = json?.choices?.[0]?.message?.content ?? "";
      if (res.ok && content?.trim()) return { ok: true as const, content };
      lastErr = { status: res.status, body: json?.error ?? raw?.slice?.(0, 600) ?? raw };
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        await new Promise(r=>setTimeout(r, 800*(i+1))); continue;
      }
      break;
    } catch (e:any) {
      lastErr = { status: "fetch_error", body: String(e?.message || e) };
      await new Promise(r=>setTimeout(r, 600*(i+1)));
    }
  }
  return { ok: false as const, error: lastErr };
}

/* =========================================================================
   Supabase
   ====================================================================== */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function sbRead() { return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } }); }
async function sbServer() {
  const ck = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, { cookies: { get: n=>ck.get(n)?.value, set(){}, remove(){} } });
}

/* =========================================================================
   Intent mapping (category → emotion → style → media)
   ====================================================================== */
type CategoryRow = { l1: string; l2: string; mode: string; pitch_keywords: string[] | null };
type EmotionRow = { id: string; aliases: string[] | null; tones: string[] | null; patterns: string[] | null; use_for_modes: string[] | null };
type StyleRow   = { id: string; voice: string; rhythm: string; lexicon_plus: string[] | null; lexicon_minus: string[] | null; use_for_modes: string[] | null };
type MediaOverrideRow = { media: string; sentence_length: string; emoji: boolean };

async function mapIntentWithDBThenLocal(input: string, media: string) {
  const supabase = sbRead();
  const text = String(input || "");

  const hintMap: Record<string,string[]> = {
    "ガジェット": ["モバイルバッテリー","mAh","充電","Type-C","USB","出力","ポート","PSE","LED","LCD","ワット","A","電源","ケーブル"],
    "ビューティー": ["美顔器","美容液","化粧水","美容","洗顔","毛穴","保湿"],
    "ギフト": ["ギフト","プレゼント","贈り物","名入れ","ラッピング","のし"],
  };
  const scoreWords = (s:string, words:string[]) => words.reduce((acc,w)=>acc+(w && s.includes(w) ? 1:0),0);

  const candidates: Array<{ row: CategoryRow; score: number }> = [];

  const dbCats = await supabase.from("categories").select("l1,l2,mode,pitch_keywords");
  if (!dbCats.error && dbCats.data?.length) {
    for (const c of dbCats.data) {
      const words = (c.pitch_keywords ?? []).concat([c.l1, c.l2]).filter(Boolean) as string[];
      const s1 = scoreWords(text, words);
      const s2 = Object.entries(hintMap).filter(([k])=>k===c.l1).reduce((a,[,ws])=>a+scoreWords(text,ws),0);
      candidates.push({ row:{ l1:c.l1, l2:c.l2, mode:c.mode, pitch_keywords:c.pitch_keywords ?? [] }, score: s1+s2 });
    }
  }

  for (const lc of LOCAL_CATS) {
    const words = (lc.pitch_keywords ?? []).concat([lc.l1, lc.l2]).filter(Boolean);
    const s1 = scoreWords(text, words);
    const s2 = Object.entries(hintMap).filter(([k])=>k===lc.l1).reduce((a,[,ws])=>a+scoreWords(text,ws),0);
    candidates.push({ row:{ l1:lc.l1, l2:lc.l2, mode:lc.mode, pitch_keywords:lc.pitch_keywords ?? [] }, score: s1+s2 });
  }

  candidates.sort((a,b)=>b.score-a.score);
  let cat: CategoryRow | null = (candidates[0]?.score ?? 0) > 0 ? candidates[0].row : null;

  if (!cat) {
    if (!dbCats.error && dbCats.data?.length) {
      const c = dbCats.data[0];
      cat = { l1:c.l1, l2:c.l2, mode:c.mode, pitch_keywords:c.pitch_keywords ?? [] };
    } else if (LOCAL_CATS.length) {
      const lc = LOCAL_CATS[0];
      cat = { l1:lc.l1, l2:lc.l2, mode:lc.mode, pitch_keywords:lc.pitch_keywords ?? [] };
    }
  }

  let emotion: EmotionRow | null = null;
  if (cat) {
    const over = await supabase.from("category_emotion_overrides").select("primary_emotion,fallbacks")
      .eq("category_l1", cat.l1).eq("category_l2", cat.l2).maybeSingle();

    const emoId = over.data?.primary_emotion ?? (LOCAL_EMO.default_emotion || "安心");
    const emoRes = await supabase.from("emotions").select("*").eq("id", emoId).maybeSingle();
    emotion = emoRes.data ?? null;

    if (!emotion) {
      const fb = over.data?.fallbacks?.[0] ?? (LOCAL_EMO.default_emotion || "安心");
      const fbRes = await supabase.from("emotions").select("*").eq("id", fb).maybeSingle();
      emotion = fbRes.data ?? null;
    }
  }
  if (!emotion) {
    const defId = LOCAL_EMO.default_emotion || "安心";
    const hit = LOCAL_EMO.emotions?.find(e=>e.id===defId) ?? LOCAL_EMO.emotions?.[0];
    if (hit) {
      emotion = { id: hit.id, aliases: hit.aliases ?? [], tones: hit.tones ?? [], patterns: hit.patterns ?? [], use_for_modes: hit.use_for_modes ?? [] };
    }
  }

  let style: StyleRow | null = null;
  const toneId = emotion?.tones?.[0] || "やわらかい";
  const sr = await supabase.from("styles").select("*").eq("id", toneId).maybeSingle();
  style = sr.data ?? null;
  if (!style) {
    const def = LOCAL_STYLE.styles?.find(s=>s.id===toneId) ?? LOCAL_STYLE.styles?.[0];
    if (def) {
      style = { id:def.id, voice:def.voice, rhythm:def.rhythm, lexicon_plus:def.lexicon_plus ?? [], lexicon_minus:def.lexicon_minus ?? [], use_for_modes:def.use_for_modes ?? [] };
    }
  }

  let sentence_length = "short"; let emoji = false;
  if (media) {
    const mr: PostgrestSingleResponse<MediaOverrideRow | null> = await supabase.from("media_overrides").select("*").eq("media", media).maybeSingle();
    if (mr.data) { sentence_length = mr.data.sentence_length; emoji = mr.data.emoji; }
    else if (LOCAL_STYLE.media_overrides?.length) {
      const mo = LOCAL_STYLE.media_overrides.find(m=>m.media===media);
      if (mo) { sentence_length = mo.sentence_length; emoji = !!mo.emoji; }
    }
  }

  return { category: cat, emotion, style, media: { id: media, sentence_length, emoji } };
}

/* =========================================================================
   GET: Health
   ====================================================================== */
export async function GET() {
  try {
    const supabase = sbRead();
    const { data, error } = await supabase.from("categories").select("l1,l2,mode").limit(1);
    if (error) throw error;
    return new Response(JSON.stringify({
      ok: true,
      sampleCategory: data?.[0] ?? null,
      localLoaded: { cats: LOCAL_CATS.length, emos: LOCAL_EMO.emotions?.length ?? 0, styles: LOCAL_STYLE.styles?.length ?? 0 },
      promptVersion: CORE_PROMPT === CORE_PROMPT_V2 ? "v2.0.0" : (CORE_PROMPT === CORE_PROMPT_V199 ? "v1.9.9" : "custom"),
    }), { status: 200 });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, message: e?.message ?? String(e) }), { status: 500 });
  }
}

/* =========================================================================
   Helpers
   ====================================================================== */
function compactInputText(src: string, maxChars = 16000) {
  if (!src) return "";
  let s = src.replace(/\r/g,"");
  s = s.replace(/[ \t]{2,}/g," ");
  s = s.replace(/\n{3,}/g,"\n\n");
  if (s.length > maxChars) s = s.slice(0, maxChars) + "\n…（一部省略）";
  return s;
}

/* =========================================================================
   POST: Dual-Core generation (Stage1 → Stage2)
   ====================================================================== */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt, media = "ad",
      jitter = false, variants = 0,
      stage1Model, stage2Model,
      temperature, stage1Temperature, stage2Temperature,
      allowStage2Fallback = true, allowReturnStage1IfStage2Fail = true,
    } = body ?? {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY is missing");
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
    }

    const sb = await sbServer();
    const { data: userRes } = await sb.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const intent = await mapIntentWithDBThenLocal(String(prompt ?? ""), String(media ?? "ad"));

    const replaceTable = REPLACE_RULES.length ? REPLACE_RULES.map(r=>`- 「${r.from}」=>「${r.to}」`).join("\n") : "（辞書なし）";
    const beautyList  = BEAUTY_WORDS.length ? BEAUTY_WORDS.map(w=>`- ${w}`).join("\n") : "（語彙なし）";
    const yakkiBlock  = YAKKI_ALL || "（薬機フィルター未設定）";
    const controlLine = jitter
      ? `JITTER=${Math.max(1, Math.min(Number(variants) || 3, 5))} を有効化。余韻のみ微変化し、FACTSは共有。`
      : `JITTERは無効化（安定出力）。`;

    const intentBlockLines = [
      "《カテゴリ推論》",
      intent.category ? `- カテゴリ: ${intent.category.l1} > ${intent.category.l2}（mode: ${intent.category.mode}）` : "- カテゴリ: 不明",
      intent.category?.pitch_keywords?.length ? `- 訴求軸: ${intent.category.pitch_keywords.join("、")}` : "- 訴求軸: なし",
      "",
      "《感情推論》",
      intent.emotion ? `- 感情: ${intent.emotion.id}\n- 例フレーズ: ${(intent.emotion.patterns ?? []).slice(0,1).join(" / ") || "（なし）"}` : "- 感情: 不明",
      "",
      "《文体推論》",
      intent.style ? `- トーン: ${intent.style.id}\n- Voice: ${intent.style.voice}\n- Rhythm: ${intent.style.rhythm}` : "- 文体: 不明",
      "",
      "《媒体最適化》",
      `- media: ${media} / sentence_length: ${intent.media.sentence_length} / emoji: ${intent.media.emoji ? "true" : "false"}`,
    ].join("\n");

    const compacted = typeof prompt === "string" ? compactInputText(String(prompt)) : compactInputText(JSON.stringify(prompt));

    /* ------------------------- Stage1 : FACT整流 ------------------------- */
    const s1Model = (typeof stage1Model === "string" && stage1Model.trim()) ? stage1Model.trim() : DEFAULT_STAGE1_MODEL;
    const s1Temp  = typeof stage1Temperature === "number" ? stage1Temperature : (typeof temperature === "number" ? temperature : 0.25);

    const s1UserContent = [
      "【Stage1｜FACT整流・法規配慮（v2）】",
      "目的：事実・仕様・法規の整合を最優先し、過不足ない“素体文”を作る。",
      "禁止：感情語・比喩増幅・断定比較・過剰誇張・機械接続の凡庸句。",
      "",
      "以降の Stage2 で Humanize するため、本文はフラットに保つこと。",
      "",
      intentBlockLines,
      "",
      "《Safety Layer（薬機/景表）》",
      yakkiBlock,
      "",
      "《置き換え辞書（参考）》",
      replaceTable,
      "",
      "《カテゴリ語彙（Beauty）参考》",
      beautyList,
      "",
      "— 原文 —",
      compacted,
      "",
      "出力は Boost Suite v2 のテンプレ全項目を含む“完成形”だが、リード/クロージングは控えめ（後段で温度付与）。",
      "タイトルは事実優先、SNS要約は感情薄めで可読性重視。",
    ].join("\n");

    const s1Payload: any = {
      model: s1Model,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: s1UserContent },
      ],
      stream: false,
    };
    // ★ 5系は温度未指定（以前の安定挙動に戻す）／4o系は温度解放
    if (!isFiveFamily(s1Model)) { s1Payload.temperature = s1Temp; s1Payload.top_p = 0.9; }

    let s1 = await callOpenAI(s1Payload, apiKey, STAGE1_TIMEOUT_MS);

    // フォールバック：4o-mini（低温）→ gpt-5（最終）
    if (!s1.ok) {
      console.warn("Stage1 primary failed:", s1.error);
      const alt1: any = {
        ...s1Payload,
        model: "gpt-4o-mini",
        temperature: Math.min(0.2, s1Temp),
        top_p: 0.85,
      };
      if (isFiveFamily(s1Model)) { /* ensure 4oに温度を付与 */ }
      let s1b = await callOpenAI(alt1, apiKey, Math.min(STAGE1_TIMEOUT_MS, 90_000));
      if (!s1b.ok) {
        console.warn("Stage1 alt(gpt-4o-mini) failed:", s1b.error);
        const alt2: any = {
          ...s1Payload,
          model: "gpt-5",
        };
        delete alt2.temperature; delete alt2.top_p;
        let s1c = await callOpenAI(alt2, apiKey, Math.min(STAGE1_TIMEOUT_MS, 90_000));
        if (!s1c.ok) {
          console.error("Stage1 all attempts failed:", { primary: s1.error, alt1: s1b.error, alt2: s1c.error });
          return new Response(JSON.stringify({ error: "stage1_failed", detail: { primary: s1.error, alt1: s1b.error, alt2: s1c.error } }), { status: 502 });
        }
        s1 = s1c;
      } else {
        s1 = s1b;
      }
    }
    const stage1Text = s1.content as string;

    /* ------------------------- Stage2 : Humanize（合理リード） ------------------------- */
    const s2Model = (typeof stage2Model === "string" && stage2Model.trim()) ? stage2Model.trim() : DEFAULT_STAGE2_MODEL;
    const baseTemp = 0.35;
    const s2Temp = typeof stage2Temperature === "number" ? stage2Temperature : (typeof temperature === "number" ? temperature : (jitter ? 0.5 : baseTemp));

    const s2UserContent = [
      "【Stage2｜Warmflow-Humanize（v2）】",
      "目的：Stage1の FACT を改変せず、リード/クロージングに“人の息遣い”を付与し、AI臭を除去する。",
      "指針：句読点の間合い、体言止めの許容、凡庸句は排除。「〜でも、〜」の機械接続は避ける。",
      "",
      "《リード強化ルール（WP型5行）》",
      "1行目：状況提示（例：いざという時、もし○○なら？）",
      "2行目：本製品が不安を解消する主旨を明言",
      "3–4行目：具体シーンやスペック1〜2点（詩的表現・比喩は禁止）",
      "5行目：安心感で締める（抽象ワード禁止）",
      "",
      "— Stage1 素体 —",
      stage1Text,
      "",
      "出力は Boost Suite v2 のテンプレ全項目を“1回で完成”させること。",
    ].join("\n");

    const s2Payload: any = {
      model: s2Model,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: s2UserContent },
      ],
      stream: false,
    };
    if (!isFiveFamily(s2Model)) { s2Payload.temperature = s2Temp; s2Payload.top_p = 0.9; }

    let s2 = await callOpenAI(s2Payload, apiKey, STAGE2_TIMEOUT_MS);

    if (!s2.ok && allowStage2Fallback) {
      console.warn("Stage2 primary failed:", s2.error);
      const altModel = isFourOFamily(s2Model) ? "gpt-5-mini" : "gpt-4o-mini";
      const altPayload: any = { ...s2Payload, model: altModel };
      if (!isFiveFamily(altModel)) { altPayload.temperature = Math.min(0.3, s2Temp); altPayload.top_p = 0.85; }
      else { delete altPayload.temperature; delete altPayload.top_p; }
      const s2b = await callOpenAI(altPayload, apiKey, Math.min(STAGE2_TIMEOUT_MS, 90_000));
      if (!s2b.ok) {
        console.warn("Stage2 fallback failed:", s2b.error);
        if (allowReturnStage1IfStage2Fail) {
          await sbRead().from("intent_logs").insert({
            media,
            input_text: typeof prompt === "string" ? prompt : JSON.stringify(prompt),
            category_l1: intent.category?.l1 ?? null,
            category_l2: intent.category?.l2 ?? null,
            mode: intent.category?.mode ?? null,
            emotion_id: intent.emotion?.id ?? null,
            style_id: intent.style?.id ?? null,
          });
          return new Response(JSON.stringify({
            text: stage1Text,
            modelUsed: `${s1Model} (Stage1 only)`,
            degraded: true,
            reason: { stage2_primary: s2.error, stage2_fallback: s2b.error },
            intent: {
              category: intent.category,
              emotion: intent.emotion ? { id: intent.emotion.id, sample: intent.emotion.patterns?.[0] ?? null } : null,
              style: intent.style ? { id: intent.style.id, voice: intent.style.voice, rhythm: intent.style.rhythm, sentence_length: intent.media.sentence_length, emoji: intent.media.emoji } : null,
            },
            userId,
          }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "stage2_failed", detail: { primary: s2.error, fallback: s2b.error } }), { status: 502 });
      }
      s2 = s2b;
    }

    const finalText = s2.ok ? s2.content : stage1Text;

    await sbRead().from("intent_logs").insert({
      media,
      input_text: typeof prompt === "string" ? prompt : JSON.stringify(prompt),
      category_l1: intent.category?.l1 ?? null,
      category_l2: intent.category?.l2 ?? null,
      mode: intent.category?.mode ?? null,
      emotion_id: intent.emotion?.id ?? null,
      style_id: intent.style?.id ?? null,
    });

    return new Response(JSON.stringify({
      text: finalText,
      modelUsed: { stage1: s1Model, stage2: (s2.ok ? s2Model : null) },
      intent: {
        category: intent.category,
        emotion: intent.emotion ? { id: intent.emotion.id, sample: intent.emotion.patterns?.[0] ?? null } : null,
        style: intent.style ? { id: intent.style.id, voice: intent.style.voice, rhythm: intent.style.rhythm, sentence_length: intent.media.sentence_length, emoji: intent.media.emoji } : null,
      },
      userId,
    }), { status: 200 });

  } catch (e:any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}
