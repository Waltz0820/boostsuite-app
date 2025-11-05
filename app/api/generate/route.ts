/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/* =========================================================================
   Boost Suite API v2.1.0 — Intent Precision + LeadGuard Fix
   ====================================================================== */
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SERVER_TIMEOUT_MS = Math.max(60_000, Math.min(295_000, (maxDuration - 5) * 1000));
const STAGE1_TIMEOUT_MS = Math.min(SERVER_TIMEOUT_MS, 120_000);
const STAGE2_TIMEOUT_MS = Math.min(SERVER_TIMEOUT_MS, 120_000);

/* =========================================================================
   File utils
   ========================================================================= */
function readText(rel: string): string {
  try { return fs.readFileSync(path.join(process.cwd(), rel), "utf8"); }
  catch { console.warn(`⚠️  Missing file: ${rel}`); return ""; }
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
   Local knowledge
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
  styles: Array<{ id: string; voice: string; rhythm: string; lexicon_plus?: string[]; lexicon_minus?: string[]; use_for_modes?: string[] }>;
  media_overrides?: Array<{ media: string; sentence_length: string; emoji?: boolean }>;
};

const LOCAL_CATS  = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO   = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

/* =========================================================================
   Prompts
   ========================================================================= */
const CORE_PROMPT_V202 = readText("prompts/bs_prompt_v2.0.2.txt");
const CORE_PROMPT_V200 = readText("prompts/bs_prompt_v2.0.0.txt");
const CORE_PROMPT_V199 = readText("prompts/bs_prompt_v1.9.9.txt");
const CORE_PROMPT      = CORE_PROMPT_V202 || CORE_PROMPT_V200 || CORE_PROMPT_V199 || "You are Boost Suite copy refiner.";

const YAKKI_A = readText("prompts/filters/BoostSuite_薬機法フィルターA.txt");
const YAKKI_B = readText("prompts/filters/BoostSuite_薬機法フィルターB.txt");
const YAKKI_C = readText("prompts/filters/BoostSuite_薬機法フィルターC.txt");
const YAKKI_D = readText("prompts/filters/BoostSuite_薬機法フィルターD.txt");

const REPLACE_RULES = parseReplaceDict(readText("prompts/filters/Boost_Fashion_置き換え辞書.txt"));
const BEAUTY_WORDS  = parseCsvWords(readText("prompts/filters/美顔器キーワード.csv"));

/* =========================================================================
   SEO related words（初期辞書：Comet拡張想定）
   ========================================================================= */
const SEO_WORDS = readJsonSafe<Record<string, string[]>>(
  "prompts/filters/SEO_related_words.json",
  {
    "アロマ": ["アロマディフューザー","ムードライト","アロマ加湿器","間接照明","癒し家電","就寝用","リラックス","タイマー"],
    "美顔器": ["RF美顔器","EMS美顔器","光美容","温冷ケア","ホームエステ","イオン導入","LEDケア"],
    "ギフト": ["ギフト","プレゼント","ラッピング","誕生日","記念日","母の日","贈り物"],
    "モバイルバッテリー": ["PSE適合","Type-C入出力","急速充電","ケーブル内蔵","LED表示","機内持ち込み"]
  }
);

/* =========================================================================
   OpenAI helpers
   ========================================================================= */
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
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) { await new Promise(r=>setTimeout(r, 800*(i+1))); continue; }
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
   ========================================================================= */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function sbRead() { return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } }); }
async function sbServer() {
  const ck = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, { cookies: { get: n=>ck.get(n)?.value, set(){}, remove(){} } });
}

/* =========================================================================
   Helpers（入力整形 / セクション整形 / 軸削除）
   ========================================================================= */
function compactInputText(src: string, maxChars = 16000) {
  if (!src) return "";
  let s = src.replace(/\r/g,"");
  s = s.replace(/[ \t]{2,}/g," ");
  s = s.replace(/\n{3,}/g,"\n\n");
  if (s.length > maxChars) s = s.slice(0, maxChars) + "\n…（一部省略）";
  return s;
}

function normalizeOutputFormatting(t: string) {
  if (!t) return t;
  let s = t.replace(/\r\n?/g, "\n");
  // 見出し（1. / 2. / 3.1 など）の前後に空行を強制
  s = s.replace(/(^|\n)\s*(\d+\.(?:\d+)?\s*【)/g, "\n\n$2");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function stripAxes(s: string, opts: { skipImageAxis?: boolean; skipCTAAxis?: boolean }) {
  let out = s;
  if (opts.skipImageAxis) {
    out = out.replace(/〔画像軸〕[\s\S]*?(?=〔|$)/, "");
  }
  if (opts.skipCTAAxis) {
    out = out.replace(/〔CTA軸〕[\s\S]*?(?=〔|$)/, "");
  }
  // 余計な連続改行を整える
  return normalizeOutputFormatting(out);
}

/* =========================================================================
   Utils: ギフト誤爆防止 / 販売者語禁止 / FactLock 強化
   ========================================================================= */
const SELLER_WORDS_RE = /\b(?:当店|弊社|当社|当ショップ|our store|our shop|the store|the shop)\b/g;
const GIFT_WORDS_RE = /(ギフト|プレゼント|贈り物|ラッピング|名入れ|のし|gift)/gi;

function stripSellerWords(text: string) {
  return text.replace(SELLER_WORDS_RE, "").replace(/\s{2,}/g," ").trim();
}

// ギフト文面を安全側で弱める／削る
function pruneGift(text: string, allowGift: boolean) {
  if (allowGift) return text;
  let out = text
    .replace(/【ギフト\｜?】/g,"")
    .replace(/[（(]ギフト対応[)）]/g,"")
    .replace(/ギフト[向用]?(として|に|向け|可)?/g,"")
    .replace(/プレゼント[向用]?(として|に|向け|可)?/g,"")
    .replace(/贈り物[向用]?(として|に|向け|可)?/g,"")
    .replace(/ラッピング可|ラッピング対応|名入れ対応/g,"")
    .replace(/(記念日|母の日|父の日|誕生日)の?[^。]*贈り物[^。]*。?/g, "")
    .replace(/大切な方への贈り物に。?/g, "");
  out = out.replace(/^Q\.\s*(名入れ|ラッピング).+$/gm, "Q. 付属品や仕様に関する質問は？");
  out = out.replace(/^A\.\s*(名入れ|ラッピング).+$/gm, "A. 仕様・付属品の詳細は商品ページの記載をご確認ください。");
  return out;
}

// 医療/誇張/断定などを抑制＋単位/句読点整形＋販売者語削除
function factLock(text: string) {
  if (!text) return text;
  let result = text;

  const hardClaims = [
    /完治/g, /永久に/g, /100%/g, /１００％/g, /絶対/g, /治す/g, /劇的/g, /最強/g,
    /即効性がある/g, /即効で/g, /保証/g, /完全/g, /奇跡/g, /誰でも/g, /必ず/g
  ];
  hardClaims.forEach((re)=>{ result = result.replace(re, "※個人差があります"); });

  result = result
    .replace(/ｍｌ/gi, "mL")
    .replace(/ＭＬ/g, "mL")
    .replace(/㎖/g, "mL")
    .replace(/ｗ/g, "W")
    .replace(/Ｗ/g, "W")
    .replace(/ｖ/gi, "V")
    .replace(/Ｖ/g, "V")
    .replace(/℃/g, "°C")
    .replace(/　/g, " ")
    .replace(/。。/g, "。")
    .replace(/、、/g, "、")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  result = stripSellerWords(result);

  return result;
}

/* =========================================================================
   Yakki（薬機/景表）適用判定
   ========================================================================= */
async function loadYakkiBlockForCategory(cat: CategoryRow | null) {
  const supabase = sbRead();
  let need = false;

  if (cat) {
    const r = await supabase
      .from("yakki_sensitive_categories")
      .select("category_l1,category_l2")
      .eq("category_l1", cat.l1)
      .eq("category_l2", cat.l2)
      .maybeSingle();
    if (!r.error && r.data) {
      need = true;
    } else {
      const l1 = (cat.l1 || "").toLowerCase();
      const l2 = (cat.l2 || "").toLowerCase();
      if (
        /(beauty|ビューティー|コスメ|美容|ヘルス|健康|サプリ|スキンケア|スカルプ|脱毛|ダイエット)/i.test(l1) ||
        /(美容|美顔器|化粧水|美容液|クリーム|育毛|育発|医療|治療|血圧|血糖|体脂肪)/i.test(l2)
      ) {
        need = true;
      }
    }
  }

  if (!need) return "";
  return [YAKKI_A, YAKKI_B, YAKKI_C, YAKKI_D].filter(Boolean).join("\n");
}

/* =========================================================================
   Intent mapping（カテゴリ精度回復：ギフト語は低ウエイト）
   ========================================================================= */
type CategoryRow = { l1: string; l2: string; mode: string; pitch_keywords: string[] | null };
type EmotionRow  = { id: string; aliases: string[] | null; tones: string[] | null; patterns: string[] | null; use_for_modes: string[] | null };
type StyleRow    = { id: string; voice: string; rhythm: string; lexicon_plus: string[] | null; lexicon_minus: string[] | null; use_for_modes: string[] | null };
type MediaOverrideRow = { media: string; sentence_length: string; emoji: boolean };

async function mapIntentWithDBThenLocal(input: string, media: string) {
  const supabase = sbRead();
  const text = String(input || "");

  const hintMap: Record<string,{words:string[]; weight:number}> = {
    "ガジェット":   { words:["モバイルバッテリー","mAh","充電","Type-C","USB","出力","ポート","PSE","LED","LCD","ワット","A","電源","ケーブル"], weight: 1.0 },
    "ビューティー": { words:["美顔器","美容液","化粧水","美容","洗顔","毛穴","保湿","RF","EMS","LED","温冷"], weight: 1.0 },
    "家電":         { words:["加湿器","空気清浄","アロマ","ディフューザー","ヒーター","冷風","調光","タイマー"], weight: 0.9 },
    // ギフト語は極小ウエイト（誤爆抑制）
    "ギフト":       { words:["ギフト","プレゼント","贈り物","名入れ","ラッピング","のし"], weight: 0.2 },
  };

  const scoreWords = (s:string, words:string[], w=1)=> words.reduce((acc,wd)=>acc+(wd && s.includes(wd) ? w : 0),0);

  const candidates: Array<{ row: CategoryRow; score: number }> = [];

  const addCandidate = (row: CategoryRow) => {
    const words = (row.pitch_keywords ?? []).concat([row.l1, row.l2]).filter(Boolean) as string[];
    let score = scoreWords(text, words, 1);
    // 機能/構造語の重み
    Object.entries(hintMap).forEach(([k,def])=>{
      if (k === row.l1) score += scoreWords(text, def.words, def.weight);
    });
    candidates.push({ row, score });
  };

  const dbCats = await supabase.from("categories").select("l1,l2,mode,pitch_keywords");
  if (!dbCats.error && dbCats.data?.length) dbCats.data.forEach(c=>addCandidate({
    l1:c.l1, l2:c.l2, mode:c.mode, pitch_keywords:c.pitch_keywords ?? []
  }));

  LOCAL_CATS.forEach(lc=>addCandidate({ l1:lc.l1, l2:lc.l2, mode:lc.mode, pitch_keywords:lc.pitch_keywords ?? [] }));

  candidates.sort((a,b)=>b.score-a.score);
  const top = candidates[0]; const second = candidates[1];
  const confidence = top ? (top.score / ((top.score||0) + (second?.score||0) + 1)) : 0;

  let cat: CategoryRow | null = (top?.score ?? 0) > 0 ? top.row : null;

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

  return { category: cat, category_confidence: confidence, emotion, style, media: { id: media, sentence_length, emoji } };
}

/* =========================================================================
   GET: Health
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
        CORE_PROMPT === CORE_PROMPT_V202 ? "v2.0.2" :
        CORE_PROMPT === CORE_PROMPT_V200 ? "v2.0.0" :
        (CORE_PROMPT === CORE_PROMPT_V199 ? "v1.9.9" : "custom"),
    }), { status: 200 });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, message: e?.message ?? String(e) }), { status: 500 });
  }
}

/* =========================================================================
   POST: Dual-Core generation (Stage1 → Stage2)
   ========================================================================= */
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

    // === SmartSEO（カテゴリ + 原文） & ギフト接頭辞厳格判定 ===
    const kwKey = intent.category?.l2 || intent.category?.l1 || "";
    const rawText = String(prompt || "");
    const textLower = rawText.toLowerCase();
    const fromText = Object.entries(SEO_WORDS)
      .filter(([key]) => textLower.includes(key.toLowerCase()))
      .flatMap(([, arr]) => arr);
    const fromCat = SEO_WORDS[kwKey] || [];
    const relatedSEO = Array.from(new Set([...fromText, ...fromCat])).slice(0, 8);

    // ✅ ギフト許可は「原文に明示」されたときのみ
    const giftExplicit = /(ギフト|プレゼント|贈り物|ラッピング|名入れ|のし|gift)/i.test(rawText);
    const giftPrefixAllowed = !!giftExplicit;

    // ✅ 薬機フィルター自動適用
    const yakkiBlock = await loadYakkiBlockForCategory(intent.category);
    const yakkiNote = yakkiBlock ? "（薬機/景表フィルター適用）" : "（薬機/景表フィルター：該当なし→スキップ）";

    // === 媒体/カテゴリに応じたA/B軸スキップ判定
    const isMallMedia = /^(amazon|rakuten|yahoo|mall|mercari)$/i.test(String(media));
    const skipCTAAxis = isMallMedia;                        // モールはCTAカスタム不可 → スキップ
    const skipImageAxis = (intent.category_confidence ?? 0) < 0.40; // カテゴリ信頼度が低い → 画像軸スキップ

    const controlLine = jitter
      ? `JITTER=${Math.max(1, Math.min(Number(variants) || 3, 5))} を有効化。余韻のみ微変化し、FACTSは共有。`
      : `JITTERは無効化（安定出力）。`;

    const intentBlockLines = [
      "《カテゴリ推論》",
      intent.category ? `- カテゴリ: ${intent.category.l1} > ${intent.category.l2}（mode: ${intent.category.mode} / conf=${(intent.category_confidence||0).toFixed(2)}）` : "- カテゴリ: 不明",
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
      "",
      "《SmartSEO候補（max8）》",
      relatedSEO.length ? `- ${relatedSEO.join(" / ")}` : "- なし",
      `- ギフト接頭辞の許可（原文明示ベース）: ${giftPrefixAllowed ? "true" : "false"}`,
      `- Safety: ${yakkiNote}`,
      "",
      "《A/B軸生成ルール》",
      `- 画像軸: ${skipImageAxis ? "スキップ（カテゴリ信頼度<0.40）" : "生成"}`,
      `- CTA軸: ${skipCTAAxis ? "スキップ（モール媒体）" : "生成"}`,
    ].join("\n");

    const compacted = typeof prompt === "string" ? compactInputText(String(prompt)) : compactInputText(JSON.stringify(prompt));

    /* ------------------------- Stage1 : FACT整流 ------------------------- */
    const s1Model = (typeof stage1Model === "string" && stage1Model.trim()) ? stage1Model.trim() : DEFAULT_STAGE1_MODEL;
    const s1Temp  = typeof stage1Temperature === "number" ? stage1Temperature : (typeof temperature === "number" ? temperature : 0.22);

    const yakkiSection = yakkiBlock ? `《Safety Layer（薬機/景表）》\n${yakkiBlock}\n` : "（本カテゴリは薬機/景表の厳格適用対象外のため特別ルール無し）\n";

    const s1UserContent = [
      "【Stage1｜FACT整流・法規配慮（v2.1.0 SmartSEO+LeadGuard）】",
      "目的：事実・仕様・法規の整合を最優先し、過不足ない“素体文”を作る。感情語や煽り表現は排除し、後段で温度付与する。",
      "",
      intentBlockLines,
      "",
      yakkiSection,
      "《置き換え辞書（参考）》",
      replaceTable || "（辞書なし）",
      "",
      "《カテゴリ語彙（Beauty）参考》",
      beautyList || "（語彙なし）",
      "",
      "《タイトル生成規則》",
      "- 出力は必ず2本：「タイトル（バランス）」「タイトル（SEO）」。",
      "- 左詰め優先：カテゴリ/代表語 → 主要語 → 補助語 → 容量/型番/色。",
      "- SEO版はSmartSEO候補から**2〜3語**を“自然に”採用（羅列・不自然禁止）。",
      "- **【ギフト｜】接頭辞は《許可=true》のときのみ**。falseのときは付けない（本文にも過度に含めない）。",
      "- 見出し間には**必ず空行**を入れて可読性を担保する（1行以上）。",
      "",
      "《禁止》販売者語（当店/弊社/our store 等）。",
      "",
      "《注意事項の提示形式》",
      "- Objections(FAQ)は「短問短答」を原則に3件以上。注意事項は冗長にせず、FAQ形式でも提示可。",
      "",
      "《A/Bテスト出力ルール》",
      "- 画像軸は『生成可』のときのみ出力。スキップ指定時は出力しない。",
      "- CTA軸は『生成可』のときのみ出力。スキップ指定時は出力しない。",
      "",
      "— 原文 —",
      compacted,
      "",
      "出力は Boost Suite v2 テンプレ全項目を含む完成形。リード/クロージングは控えめ（後段で人間味付与）。",
      "各セクションの見出し（1. 2. 3.1 …）の前後に**空行**を入れて区切ること。",
      controlLine,
      "",
    ].join("\n");

    const s1Payload: any = {
      model: s1Model,
      messages: [
        { role: "system", content: CORE_PROMPT },
        { role: "user", content: s1UserContent },
      ],
      stream: false,
    };
    if (!isFiveFamily(s1Model)) { s1Payload.temperature = s1Temp; s1Payload.top_p = 0.9; }

    let s1 = await callOpenAI(s1Payload, apiKey, STAGE1_TIMEOUT_MS);

    if (!s1.ok) {
      console.warn("Stage1 primary failed:", s1.error);
      const alt1: any = { ...s1Payload, model: "gpt-4o-mini", temperature: Math.min(0.18, s1Temp), top_p: 0.85 };
      let s1b = await callOpenAI(alt1, apiKey, Math.min(STAGE1_TIMEOUT_MS, 90_000));
      if (!s1b.ok) {
        console.warn("Stage1 alt(gpt-4o-mini) failed:", s1b.error);
        const alt2: any = { ...s1Payload, model: "gpt-5" };
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
    const stage1TextRaw = normalizeOutputFormatting(s1.content as string);

    /* ------------------------- Stage2 : Humanize（Warmflow Extended） ------------------------- */
    const s2Model = (typeof stage2Model === "string" && stage2Model.trim()) ? stage2Model.trim() : DEFAULT_STAGE2_MODEL;
    const baseTemp = 0.34;
    const s2Temp   = typeof stage2Temperature === "number" ? stage2Temperature : (typeof temperature === "number" ? temperature : (jitter ? 0.48 : baseTemp));

    const DEFAULT_INSTANT_ACTION = "電源を入れてすぐ始められる";
    const DEFAULT_SENSORY_IMAGE  = "夜の手元灯のようにやわらかい明かり";
    const DEFAULT_CTA_PHRASE     = "今夜は香りでひと休み。";

    const instantAction = DEFAULT_INSTANT_ACTION;
    const sensoryImage  = DEFAULT_SENSORY_IMAGE;
    const ctaPhrase     = DEFAULT_CTA_PHRASE;

    const jitterNote = jitter
      ? "JITTER有効：3.1リードと3.6クロージングのみ [v1],[v2],[v3] の複数案を提示。その他セクションは共通の単一出力。"
      : "JITTER無効：各セクション単一出力。";

    const giftBanLine = (!giftPrefixAllowed ? "- **ギフト/プレゼント/贈り物/ラッピング/名入れ等の語は使用しない。**" : "- ギフト語の使用は原文明示の範囲で控えめに。");

    const s2UserContent = [
      "【Stage2｜Warmflow-Humanize（v2.1.0 LeadGuard）】",
      "目的：Stage1のFACTを改変せず、リード/クロージング中心に“人の息遣い”と即効性を加える。AI臭は除去。",
      "",
      "《固定ルール》",
      "- **タイトル（バランス/SEO）は一切変更しない**（句読点や表記揺れも不可）。",
      "- リードは WP+（6行）固定：1)状況提示 / 2)即効ワード / 3)機能A+B / 4)体験 / 5)データ / 6)余韻。",
      "- 即効ワードは必ず1行を独立させて挿入：例）「電源を入れてすぐ始められる。」",
      "- 具体語を1語：例）「手元灯」「ポケット」「朝の支度」。詩的誇張は不可。",
      "- Q&A/注意の事実改変禁止（語尾の整えのみ可）。",
      "- **販売者語（当店/弊社/our store 等）を使用しない**。",
      giftBanLine,
      "- 各セクション見出しの前後には**空行**を入れて区切ること。",
      "",
      "《挿入用フレーズ》",
      `- 即効性: ${instantAction}`,
      `- 情景: ${sensoryImage}`,
      `- CTA: ${ctaPhrase}`,
      "",
      jitterNote,
      "",
      "— Stage1 素体 —",
      stage1TextRaw,
      "",
      "《出力要件》",
      "- Boost Suite v2 テンプレ（バレット含む）を“一度で完成”。",
      "- SNS要約は180〜220字／絵文字2〜4個／末尾にCTA1文。",
      "- A/Bテスト軸は『生成可』の指定に従う（スキップ指定の軸は**一切出力しない**）。",
      "- JITTER有効時は 3.1 と 3.6 のみ複数案。[v1]〜で明示。他は単一。",
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
          const s1Locked = factLock(stripSellerWords(pruneGift(stage1TextRaw, giftPrefixAllowed)));
          const s1Formatted = stripAxes(normalizeOutputFormatting(s1Locked), { skipImageAxis, skipCTAAxis });
          return new Response(JSON.stringify({
            text: s1Formatted,
            modelUsed: `${s1Model} (Stage1 only)`,
            degraded: true,
            reason: { stage2_primary: s2.error, stage2_fallback: s2b.error },
            intent: {
              category: intent.category,
              confidence: intent.category_confidence ?? 0,
              emotion: intent.emotion ? { id: intent.emotion.id, sample: intent.emotion.patterns?.[0] ?? null } : null,
              style: intent.style ? { id: intent.style.id, voice: intent.style.voice, rhythm: intent.style.rhythm, sentence_length: intent.media.sentence_length, emoji: intent.media.emoji } : null,
            },
            abSkips: { imageAxis: skipImageAxis, ctaAxis: skipCTAAxis },
            userId,
          }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "stage2_failed", detail: { primary: s2.error, fallback: s2b.error } }), { status: 502 });
      }
      s2 = s2b;
    }

    // === ポスト処理：整形 → 軸スキップ → ギフト/販売者語/FactLock
    const stage2TextRaw = normalizeOutputFormatting(s2.ok ? (s2.content as string) : stage1TextRaw);
    const axesPruned = stripAxes(stage2TextRaw, { skipImageAxis, skipCTAAxis });
    const noGift = pruneGift(axesPruned, giftPrefixAllowed);
    const noSeller = stripSellerWords(noGift);
    const lockedText = factLock(noSeller);

    // === ログ保存
    await sbRead().from("intent_logs").insert({
      media,
      input_text: typeof prompt === "string" ? prompt : JSON.stringify(prompt),
      category_l1: intent.category?.l1 ?? null,
      category_l2: intent.category?.l2 ?? null,
      mode: intent.category?.mode ?? null,
      emotion_id: intent.emotion?.id ?? null,
      style_id: intent.style?.id ?? null,
      category_confidence: intent.category_confidence ?? null,
    });

    await sbRead().from("lint_logs").insert({
      user_id: userId,
      input_text: typeof prompt === "string" ? prompt : JSON.stringify(prompt),
      output_text: stage2TextRaw,
      locked_text: lockedText,
      diff_chars: (stage2TextRaw?.length ?? 0) - (lockedText?.length ?? 0),
      created_at: new Date().toISOString(),
      media,
      skip_axes: { image: skipImageAxis, cta: skipCTAAxis },
    });

    return new Response(JSON.stringify({
      text: lockedText,
      modelUsed: { stage1: s1Model, stage2: (s2.ok ? s2Model : null) },
      jitter,
      relatedSEO,
      giftPrefixAllowed,
      safety: { yakkiApplied: !!yakkiBlock },
      abSkips: { imageAxis: skipImageAxis, ctaAxis: skipCTAAxis },
      intent: {
        category: intent.category,
        confidence: intent.category_confidence ?? 0,
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
