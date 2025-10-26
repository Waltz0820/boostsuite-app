/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

/* ========== ファイルIO ========== */
function readText(rel: string): string {
  try { return fs.readFileSync(path.join(process.cwd(), rel), "utf8"); }
  catch { console.warn(`⚠️ Missing file: ${rel}`); return ""; }
}
function readJsonSafe<T>(rel: string, def: T): T {
  const s = readText(rel).trim();
  if (!s) return def;
  try { return JSON.parse(s) as T; } catch { console.warn(`⚠️ JSON parse failed: ${rel}`); return def; }
}
function parseCsvRows(src: string): string[][] {
  return src.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>l.split(",").map(c=>c.trim()));
}
function parseReplaceDict(src: string){return src.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith("#")&&l.includes("=>")).map(l=>{const[a,b]=l.split("=>");return{from:(a??"").trim(),to:(b??"").trim()};});}
function parseCsvWords(src: string){return src.split(/[\r\n,]+/).map(s=>s.trim()).filter(Boolean);}

/* ========== ローカル知識: 起動時1回 ========== */
type EmotionJSON = {
  default_emotion?: string;
  emotions: Array<{ id: string; aliases?: string[]; tones?: string[]; patterns?: string[]; use_for_modes?: string[] }>;
  category_overrides?: Array<{ category: string; primary_emotion: string; fallbacks?: string[] }>;
};
type StyleJSON = {
  defaults?: { voice?: string; sentence_length?: string; emoji?: boolean };
  styles: Array<{ id: string; voice: string; rhythm: string; lexicon_plus?: string[]; lexicon_minus?: string[]; use_for_modes?: string[] }>;
  media_overrides?: Array<{ media: string; sentence_length: string; emoji?: boolean }>;
};

const LOCAL_CATS_RAW = readText("knowledge/CategoryTree_v5.0.csv");
const LOCAL_CATS = (() => {
  // 期待列: l1,l2,mode,pitch_keywords(;区切り)
  const rows = parseCsvRows(LOCAL_CATS_RAW);
  // header 判定（1行目に l1 が含まれる場合は除去）
  const body = rows[0]?.[0]?.includes("l1") ? rows.slice(1) : rows;
  return body.map(r => ({
    l1: r[0] ?? "",
    l2: r[1] ?? "",
    mode: r[2] ?? "",
    pitch_keywords: (r[3] ?? "").split(/[;、]/).map(s=>s.trim()).filter(Boolean)
  })).filter(r=>r.l1 && r.l2);
})();

const LOCAL_EMO = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

/* ========== プロンプト素材（ローカル） ========== */
const CORE_PROMPT = readText("prompts/bs_prompt_v1.9.7.txt");
const YAKKI_ALL = [
  readText("prompts/filters/BoostSuite_薬機法フィルターA.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターB.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターC.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターD.txt"),
].filter(Boolean).join("\n");
const REPLACE_RULES = parseReplaceDict(readText("prompts/filters/Boost_Fashion_置き換え辞書.txt"));
const BEAUTY_WORDS = parseCsvWords(readText("prompts/filters/美顔器キーワード.csv"));

/* ========== OpenAI util ========== */
const isFiveFamily = (m:string)=>/^gpt-5($|-)/i.test(m);

/* ========== Supabase ========== */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function sbRead(){ return createClient(SUPABASE_URL, SUPABASE_ANON, { auth:{ persistSession:false } }); }
async function sbServer(){
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: { get: (k)=>jar.get(k)?.value, set(){}, remove(){} },
  });
}

/* ========== 型 ========== */
type CategoryRow = { l1:string; l2:string; mode:string; pitch_keywords: string[] | null; };
type EmotionRow  = { id:string; aliases?:string[]|null; tones?:string[]|null; patterns?:string[]|null; use_for_modes?:string[]|null; };
type StyleRow    = { id:string; voice:string; rhythm:string; lexicon_plus?:string[]|null; lexicon_minus?:string[]|null; use_for_modes?:string[]|null; };
type MediaOverrideRow = { media:string; sentence_length:string; emoji:boolean };

type IntentPack = {
  category: CategoryRow|null;
  emotion: EmotionRow|null;
  style: StyleRow|null;
  media: { id:string; sentence_length:string; emoji:boolean };
  source: "db"|"local";
};

/* ========== 推論（DB優先 → ローカルfallback） ========== */
async function mapIntentWithSources(input: string, media: string): Promise<IntentPack> {
  // --- DBトライ
  try {
    const pack = await mapIntentFromDB(input, media);
    if (pack.category && pack.emotion && pack.style) return { ...pack, source:"db" };
  } catch (e) {
    console.warn("DB inference failed, fallback to local:", e);
  }
  // --- ローカルfallback
  const pack = mapIntentFromLocal(input, media);
  return { ...pack, source:"local" };
}

async function mapIntentFromDB(input: string, media: string): Promise<Omit<IntentPack,"source">> {
  const supabase = sbRead();
  // 1) category
  let cat: CategoryRow | null = null;
  const kw = [{q:"%ギフト%",f:"l1"},{q:"%入浴剤%",f:"l2"}];
  for (const k of kw) {
    const r: PostgrestSingleResponse<CategoryRow[]> = await supabase
      .from("categories").select("l1,l2,mode,pitch_keywords").ilike(k.f as any, k.q).limit(1);
    if (!r.error && r.data?.length) { cat = r.data[0]; break; }
  }
  if (!cat) {
    const r = await supabase.from("categories").select("l1,l2,mode,pitch_keywords").limit(1);
    cat = r.data?.[0] ?? null;
  }

  // 2) emotion
  let emotion: EmotionRow | null = null;
  if (cat) {
    const over = await supabase
      .from("category_emotion_overrides")
      .select("primary_emotion,fallbacks")
      .eq("category_l1", cat.l1).eq("category_l2", cat.l2).maybeSingle();

    const id = over.data?.primary_emotion ?? "安心";
    let er = await supabase.from("emotions").select("*").eq("id", id).maybeSingle();
    emotion = er.data ?? null;
    if (!emotion) {
      const fb = over.data?.fallbacks?.[0] ?? "安心";
      er = await supabase.from("emotions").select("*").eq("id", fb).maybeSingle();
      emotion = er.data ?? null;
    }
  }
  if (!emotion) {
    const er = await supabase.from("emotions").select("*").eq("id","安心").maybeSingle();
    emotion = er.data ?? null;
  }

  // 3) style
  let style: StyleRow | null = null;
  const tone = emotion?.tones?.[0];
  if (tone) style = (await supabase.from("styles").select("*").eq("id", tone).maybeSingle()).data ?? null;
  if (!style) style = (await supabase.from("styles").select("*").eq("id","やわらかい").maybeSingle()).data ?? null;

  // 4) media override
  const mr = media ? (await supabase.from("media_overrides").select("*").eq("media", media).maybeSingle()).data : null;

  return {
    category: cat,
    emotion,
    style,
    media: { id: media, sentence_length: mr?.sentence_length ?? "short", emoji: mr?.emoji ?? false },
  };
}

function mapIntentFromLocal(input: string, media: string): Omit<IntentPack,"source"> {
  // 1) category: 超簡易キーワード
  let cat = LOCAL_CATS.find(c => c.l1.includes("ギフト")) 
         || LOCAL_CATS.find(c => c.l2.includes("入浴剤"))
         || LOCAL_CATS[0] || null;

  // 2) emotion: category_overrides → emotions
  let emotion: EmotionRow | null = null;
  if (cat && LOCAL_EMO.category_overrides?.length) {
    const path = `${cat.l1}/${cat.l2}`;
    const ov = LOCAL_EMO.category_overrides.find(o => o.category === path);
    const id = ov?.primary_emotion ?? (LOCAL_EMO.default_emotion ?? "安心");
    emotion = (LOCAL_EMO.emotions.find(e => e.id === id) ??
               (ov?.fallbacks?.map(f=>LOCAL_EMO.emotions.find(e=>e.id===f)).find(Boolean) as any) ??
               LOCAL_EMO.emotions.find(e => e.id === "安心")) as EmotionRow | null;
  } else {
    emotion = (LOCAL_EMO.emotions.find(e => e.id === (LOCAL_EMO.default_emotion ?? "安心")) ??
               LOCAL_EMO.emotions[0]) as EmotionRow | null;
  }

  // 3) style: emotion.tones[0] に一致 or デフォルト
  const tone = emotion?.tones?.[0] ?? "やわらかい";
  const style = (LOCAL_STYLE.styles.find(s => s.id === tone) ??
                 LOCAL_STYLE.styles.find(s => s.id === "やわらかい") ??
                 LOCAL_STYLE.styles[0]) as StyleRow | null;

  // 4) media override
  const mo = LOCAL_STYLE.media_overrides?.find(m => m.media === media);
  return {
    category: cat as CategoryRow | null,
    emotion: emotion,
    style: style,
    media: { id: media, sentence_length: mo?.sentence_length ?? (LOCAL_STYLE.defaults?.sentence_length ?? "short"), emoji: mo?.emoji ?? (LOCAL_STYLE.defaults?.emoji ?? false) },
  };
}

/* ========== ヘルスチェック ========== */
export async function GET() {
  try {
    const sb = sbRead();
    const { data } = await sb.from("categories").select("l1,l2,mode").limit(1);
    return new Response(JSON.stringify({
      ok: true,
      sampleCategory: data?.[0] ?? LOCAL_CATS[0] ?? null,
      localLoaded: { cats: LOCAL_CATS.length, emos: LOCAL_EMO.emotions?.length ?? 0, styles: LOCAL_STYLE.styles?.length ?? 0 },
    }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({
      ok: true,
      from: "local",
      sampleCategory: LOCAL_CATS[0] ?? null,
    }), { status: 200 });
  }
}

/* ========== 生成API（省略部は従来どおり） ========== */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, jitter=false, variants=0, model: reqModel, temperature: reqTemp, media="ad" } = body ?? {};
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error:"OPENAI_API_KEY not set" }), { status:500 });

    const sb = await sbServer();
    const { data: userRes } = await sb.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    // ★ ここでハイブリッド推論を使用
    const intent = await mapIntentWithSources(String(prompt ?? ""), String(media ?? "ad"));

    const replaceTable = REPLACE_RULES.length ? REPLACE_RULES.map(r=>`- 「${r.from}」=>「${r.to}」`).join("\n") : "（辞書なし）";
    const beautyList   = BEAUTY_WORDS.length ? BEAUTY_WORDS.map(w=>`- ${w}`).join("\n") : "（語彙なし）";
    const yakkiBlock   = YAKKI_ALL || "（薬機フィルター未設定）";
    const controlLine  = jitter ? `JITTER=${Math.max(1, Math.min(Number(variants)||3, 5))} を有効化。` : `JITTERは無効化。`;

    const system = CORE_PROMPT || "You are Boost Suite copy refiner.";
    const userContent = [
      "以下の原文を Boost 構文 v1.9.7 で“段階整流”してください。",
      controlLine, "",
      "《推論メタ》",
      `- source: ${intent.source}`,
      "《カテゴリ推論》",
      intent.category ? `- ${intent.category.l1} > ${intent.category.l2} (mode: ${intent.category.mode})` : "- 不明",
      intent.category?.pitch_keywords?.length ? `- 訴求軸: ${intent.category.pitch_keywords.join("、")}` : "- 訴求軸: なし",
      "",
      "《感情推論》",
      intent.emotion ? `- 感情: ${intent.emotion.id}\n- 例フレーズ: ${(intent.emotion.patterns ?? [])[0] ?? "（なし）"}` : "- 感情: 不明",
      "",
      "《文体推論》",
      intent.style ? `- トーン: ${intent.style.id}\n- Voice: ${intent.style.voice}\n- Rhythm: ${intent.style.rhythm}` : "- 文体: 不明",
      "",
      "《媒体最適化》",
      `- media: ${media} / sentence_length: ${intent.media.sentence_length} / emoji: ${intent.media.emoji}`,
      "",
      "《Safety Layer》", yakkiBlock, "",
      "《置き換え辞書》", replaceTable, "",
      "《カテゴリ語彙（Beauty）》", beautyList, "",
      "— 原文 —", typeof prompt === "string" ? String(prompt) : JSON.stringify(prompt),
    ].join("\n");

    const model = typeof reqModel === "string" && reqModel.trim() ? reqModel.trim() : "gpt-5";
    const baseTemp = 0.35;
    const temp = typeof reqTemp === "number" ? reqTemp : jitter ? 0.45 : baseTemp;

    const payload: any = { model, messages: [{ role:"system", content:system }, { role:"user", content:userContent }], stream:false };
    if (!isFiveFamily(model)) { payload.temperature = temp; payload.top_p = 0.9; }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: await r.text() }), { status:500 });
    const j = await r.json();
    const text: string = j?.choices?.[0]?.message?.content ?? "";

    // 保存（DB default auth.uid() 任せ）
    await sb.from("intent_logs").insert({
      media, input_text: typeof prompt === "string" ? prompt : JSON.stringify(prompt),
      category_l1: intent.category?.l1 ?? null, category_l2: intent.category?.l2 ?? null, mode: intent.category?.mode ?? null,
      emotion_id: intent.emotion?.id ?? null, style_id: intent.style?.id ?? null,
    });

    return new Response(JSON.stringify({ text, modelUsed:model, intent }), { status:200 });
  } catch (e:any) {
    console.error(e);
    return new Response(JSON.stringify({ error:String(e?.message||e) }), { status:500 });
  }
}

export const dynamic = "force-dynamic";
