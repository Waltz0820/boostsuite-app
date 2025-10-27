/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const maxDuration = 120; // ← Vercel関数の最大実行時間を延長
export const dynamic = "force-dynamic";

/* =========================
   ユーティリティ（ファイルIO）
========================= */
function readText(rel: string): string {
  try {
    const p = path.join(process.cwd(), rel);
    return fs.readFileSync(p, "utf8");
  } catch {
    console.warn(`⚠️  Missing file: ${rel}`);
    return "";
  }
}
function parseReplaceDict(src: string): Array<{ from: string; to: string }> {
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
function parseCsvWords(src: string): string[] {
  return src
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* === ローカル知識のロード（起動時1回） === */
function readCategoryCsv(rel: string) {
  const t = readText(rel);
  const rows = t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  // 想定：ヘッダ: l1,l2,mode,pitch_keywords(パイプ区切り)
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
function readJsonSafe<T>(rel: string, fallback: T): T {
  try {
    const t = readText(rel);
    if (!t) return fallback;
    return JSON.parse(t) as T;
  } catch {
    return fallback;
  }
}
type EmotionJSON = {
  $schema?: string; version?: string; default_emotion?: string;
  emotions: Array<{
    id: string; aliases?: string[]; tones?: string[]; patterns?: string[];
    use_for_modes?: string[];
  }>;
  category_overrides?: Array<{
    category: string; primary_emotion: string; fallbacks?: string[];
  }>;
};
type StyleJSON = {
  $schema?: string; version?: string;
  defaults?: { voice?: string; sentence_length?: string; emoji?: boolean };
  styles: Array<{
    id: string; voice: string; rhythm: string;
    lexicon_plus?: string[]; lexicon_minus?: string[];
    use_for_modes?: string[];
  }>;
  media_overrides?: Array<{ media: string; sentence_length: string; emoji?: boolean }>;
};

const LOCAL_CATS = readCategoryCsv("knowledge/CategoryTree_v5.0.csv");
const LOCAL_EMO = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });

/* =========================
   プロンプト素材（ローカル）
========================= */
const CORE_PROMPT = readText("prompts/bs_prompt_v1.9.7.txt");
const YAKKI_ALL = [
  readText("prompts/filters/BoostSuite_薬機法フィルターA.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターB.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターC.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターD.txt"),
].filter(Boolean).join("\n");
const REPLACE_RULES = parseReplaceDict(readText("prompts/filters/Boost_Fashion_置き換え辞書.txt"));
const BEAUTY_WORDS = parseCsvWords(readText("prompts/filters/美顔器キーワード.csv"));

/* =========================
   OpenAIユーティリティ
========================= */
const isFiveFamily = (m: string) => /^gpt-5($|-)/i.test(m);

// OpenAI ペイロード型（温度系は任意）
type ChatPayload = {
  model: string;
  messages: { role: "system" | "user"; content: string }[];
  stream: boolean;
  temperature?: number;
  top_p?: number;
};

// ---- サーバ側タイムアウト＋リトライ ----
async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}
async function callOpenAI(payload: ChatPayload, apiKey: string, timeoutMs = 110_000) {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  };

  let lastErr: any;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", init, timeoutMs);
      const raw = await res.text();
      let json: any = {};
      try { json = JSON.parse(raw); } catch {}
      const content = json?.choices?.[0]?.message?.content ?? "";

      if (res.ok && content?.trim()) {
        return { ok: true as const, content, raw: json };
      }
      lastErr = { status: res.status, body: json || raw };
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        await new Promise(r => setTimeout(r, 800 * (i + 1)));
        continue;
      }
      return { ok: false as const, error: lastErr };
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
  return { ok: false as const, error: lastErr };
}

/* =========================
   Supabase クライアント
========================= */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 読み取り用（セッション不要）
function sbRead() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}

// サーバ用：cookies() 経由でセッションを読む（Next15: cookies は Promise）
async function sbServer() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // このAPIではサーバ側での書き換え不要（no-op）
      set() {},
      remove() {},
    },
  });
}

/* =========================
   推論（カテゴリ→感情→文体）
========================= */
type CategoryRow = { l1: string; l2: string; mode: string; pitch_keywords: string[] | null };
type EmotionRow = {
  id: string; aliases: string[] | null; tones: string[] | null; patterns: string[] | null; use_for_modes: string[] | null;
};
type StyleRow = {
  id: string; voice: string; rhythm: string; lexicon_plus: string[] | null; lexicon_minus: string[] | null; use_for_modes: string[] | null;
};
type MediaOverrideRow = { media: string; sentence_length: string; emoji: boolean };

async function mapIntentWithDBThenLocal(input: string, media: string) {
  const supabase = sbRead();
  const text = String(input || "");

  // 0) ざっくりジャンル検出のキーワード（必要なら増やす）
  const hintMap: Record<string, string[]> = {
    "ガジェット": ["モバイルバッテリー","mAh","充電","Type-C","USB","出力","ポート","PSE","LED","LCD","ワット","A","電源","ケーブル"],
    "ビューティー": ["美顔器","美容液","化粧水","美容","洗顔","毛穴","保湿"],
    "ギフト": ["ギフト","プレゼント","贈り物","名入れ","ラッピング","のし"],
  };

  function keywordScore(s: string, words: string[]) {
    let score = 0;
    for (const w of words) {
      if (w && s.includes(w)) score += 1;
    }
    return score;
  }

  // 1) DBカテゴリを全部読み、スコア付け（件数が多いなら LIMIT してもOK）
  const dbCats = await supabase
    .from("categories")
    .select("l1,l2,mode,pitch_keywords");

  const candidates: Array<CategoryRow> = [];

  if (!dbCats.error && dbCats.data?.length) {
    for (const c of dbCats.data) {
      const words = (c.pitch_keywords ?? []).concat([c.l1, c.l2]).filter(Boolean) as string[];
      const s1 = keywordScore(text, words);
      const s2 = Object.entries(hintMap)
        .filter(([k]) => k === c.l1) // l1 が “ガジェット” “ギフト” などに一致したら加点
        .reduce((acc, [, ws]) => acc + keywordScore(text, ws), 0);
      const score = s1 + s2;
      (c as any).__score = score;
      candidates.push(c as any);
    }
  }

  // 2) ローカル辞書のカテゴリも混ぜてスコアリング
  for (const lc of LOCAL_CATS) {
    const words = (lc.pitch_keywords ?? []).concat([lc.l1, lc.l2]).filter(Boolean);
    const s1 = keywordScore(text, words);
    const s2 = Object.entries(hintMap)
      .filter(([k]) => k === lc.l1)
      .reduce((acc, [, ws]) => acc + keywordScore(text, ws), 0);
    const score = s1 + s2;
    candidates.push({
      l1: lc.l1,
      l2: lc.l2,
      mode: lc.mode,
      pitch_keywords: lc.pitch_keywords,
      __score: score,
      __local: true,
    } as any);
  }

  // 3) スコア最大を採用（ゼロしかない場合は DB/ローカルの先頭）
  candidates.sort((a: any, b: any) => (b.__score ?? 0) - (a.__score ?? 0));
  let cat: CategoryRow | null =
    (candidates[0]?.__score ?? 0) > 0
      ? { l1: candidates[0].l1, l2: candidates[0].l2, mode: candidates[0].mode, pitch_keywords: candidates[0].pitch_keywords }
      : null;

  if (!cat) {
    // DB先頭→なければローカル先頭
    if (!dbCats.error && dbCats.data?.length) {
      const c = dbCats.data[0];
      cat = { l1: c.l1, l2: c.l2, mode: c.mode, pitch_keywords: c.pitch_keywords };
    } else if (LOCAL_CATS.length) {
      const lc = LOCAL_CATS[0];
      cat = { l1: lc.l1, l2: lc.l2, mode: lc.mode, pitch_keywords: lc.pitch_keywords };
    }
  }

  // 4) 感情（DB overrides → DB emotions → ローカルJSON）
  let emotion: EmotionRow | null = null;
  if (cat) {
    const over = await supabase
      .from("category_emotion_overrides")
      .select("primary_emotion,fallbacks")
      .eq("category_l1", cat.l1)
      .eq("category_l2", cat.l2)
      .maybeSingle();

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
    // ローカル fallback
    const defId = LOCAL_EMO.default_emotion || "安心";
    const hit = LOCAL_EMO.emotions?.find(e => e.id === defId) ?? LOCAL_EMO.emotions?.[0];
    if (hit) {
      emotion = {
        id: hit.id,
        aliases: hit.aliases ?? [],
        tones: hit.tones ?? [],
        patterns: hit.patterns ?? [],
        use_for_modes: hit.use_for_modes ?? [],
      };
    }
  }

  // 5) 文体（DB styles → ローカル styles）
  let style: StyleRow | null = null;
  const toneId = emotion?.tones?.[0] || "やわらかい";
  const sr = await supabase.from("styles").select("*").eq("id", toneId).maybeSingle();
  style = sr.data ?? null;

  if (!style) {
    const def = LOCAL_STYLE.styles?.find(s => s.id === toneId) ?? LOCAL_STYLE.styles?.[0];
    if (def) {
      style = {
        id: def.id,
        voice: def.voice,
        rhythm: def.rhythm,
        lexicon_plus: def.lexicon_plus ?? [],
        lexicon_minus: def.lexicon_minus ?? [],
        use_for_modes: def.use_for_modes ?? [],
      };
    }
  }

  // 6) 媒体オーバーライド（DB → ローカル）
  let sentence_length = "short";
  let emoji = false;
  if (media) {
    const mr: PostgrestSingleResponse<MediaOverrideRow | null> = await supabase
      .from("media_overrides")
      .select("*")
      .eq("media", media)
      .maybeSingle();
    if (mr.data) {
      sentence_length = mr.data.sentence_length;
      emoji = mr.data.emoji;
    } else if (LOCAL_STYLE.media_overrides?.length) {
      const mo = LOCAL_STYLE.media_overrides.find(m => m.media === media);
      if (mo) {
        sentence_length = mo.sentence_length;
        emoji = !!mo.emoji;
      }
    }
  }

  return {
    category: cat,
    emotion,
    style,
    media: { id: media, sentence_length, emoji },
  };
}

/* =========================
   GET: ヘルス（DB疎通＋ローカル読込）
========================= */
export async function GET() {
  try {
    const supabase = sbRead();
    const { data, error } = await supabase.from("categories").select("l1,l2,mode").limit(1);
    if (error) throw error;
    return new Response(
      JSON.stringify({
        ok: true,
        sampleCategory: data?.[0] ?? null,
        localLoaded: {
          cats: LOCAL_CATS.length,
          emos: LOCAL_EMO.emotions?.length ?? 0,
          styles: LOCAL_STYLE.styles?.length ?? 0,
        },
      }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e?.message ?? String(e) }), {
      status: 500,
    });
  }
}

/* =========================
   POST: 生成 本体（user_id 自動付与/RLS対応）
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      jitter = false,
      variants = 0,
      model: reqModel,
      temperature: reqTemp,
      media = "ad",
    } = body ?? {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY is missing");
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
    }

    // 1) サーバ側でログインユーザー取得（cookie セッション）
    const sb = await sbServer();
    const { data: userRes } = await sb.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    // 2) DB→ローカル辞書で推論
    const intent = await mapIntentWithDBThenLocal(String(prompt ?? ""), String(media ?? "ad"));

    // 3) プロンプト構築
    const system = CORE_PROMPT || "You are Boost Suite copy refiner.";
    const replaceTable =
      REPLACE_RULES.length > 0
        ? REPLACE_RULES.map((r) => `- 「${r.from}」=>「${r.to}」`).join("\n")
        : "（辞書なし）";
    const beautyList = BEAUTY_WORDS.length > 0 ? BEAUTY_WORDS.map((w) => `- ${w}`).join("\n") : "（語彙なし）";
    const yakkiBlock = YAKKI_ALL || "（薬機フィルター未設定）";
    const controlLine = jitter
      ? `JITTER=${Math.max(1, Math.min(Number(variants) || 3, 5))} を有効化。余韻のみ微変化し、FACTSは共有。`
      : `JITTERは無効化（安定出力）。`;

    const intentBlockLines = [
      "《カテゴリ推論》",
      intent.category
        ? `- カテゴリ: ${intent.category.l1} > ${intent.category.l2}（mode: ${intent.category.mode}）`
        : "- カテゴリ: 不明",
      intent.category?.pitch_keywords?.length
        ? `- 訴求軸: ${intent.category.pitch_keywords.join("、")}`
        : "- 訴求軸: なし",
      "",
      "《感情推論》",
      intent.emotion
        ? `- 感情: ${intent.emotion.id}\n- 例フレーズ: ${(intent.emotion.patterns ?? []).slice(0, 1).join(" / ") || "（なし）"}`
        : "- 感情: 不明",
      "",
      "《文体推論》",
      intent.style
        ? `- トーン: ${intent.style.id}\n- Voice: ${intent.style.voice}\n- Rhythm: ${intent.style.rhythm}`
        : "- 文体: 不明",
      "",
      "《媒体最適化》",
      `- media: ${media} / sentence_length: ${intent.media.sentence_length} / emoji: ${intent.media.emoji ? "true" : "false"}`,
    ];

    const userContent = [
      "以下の原文を Boost 構文 v1.9.7 で“段階整流”してください。",
      "出力は日本語。FACTSを固定し、最小の余韻＋音の自然さ（PhonoSense）で販売文に整えます。",
      controlLine,
      "",
      intentBlockLines.join("\n"),
      "",
      "《Safety Layer｜薬機・景表 配慮ガイド》",
      yakkiBlock,
      "",
      "《置き換え辞書（参考）》",
      replaceTable,
      "",
      "《カテゴリ語彙（Beauty）参考リスト》",
      beautyList,
      "",
      "— 原文 —",
      typeof prompt === "string" ? String(prompt) : JSON.stringify(prompt),
    ].join("\n");

    // 4) OpenAI 実行（gpt-5 既定、温度は5系には付けない）
    const model = typeof reqModel === "string" && reqModel.trim() ? reqModel.trim() : "gpt-5";
    const baseTemp = 0.35;
    const temp = typeof reqTemp === "number" ? reqTemp : jitter ? 0.45 : baseTemp;

    let payload: ChatPayload = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      stream: false,
    };
    if (!isFiveFamily(model)) {
      payload.temperature = temp;
      payload.top_p = 0.9;
    }

    // 1発目: 指定モデル
    const first = await callOpenAI(payload, apiKey);
    let text = first.ok ? first.content : "";

    // だめ/空ならミニに自動フォールバック
    if (!text.trim()) {
      const p2: ChatPayload = { ...payload, model: "gpt-5-mini" };
      if (!isFiveFamily(p2.model)) { p2.temperature = temp; p2.top_p = 0.9; }
      const second = await callOpenAI(p2, apiKey, 90_000);
      if (second.ok) text = second.content;
      else {
        console.error("OpenAI failed", { first: (first as any).error, second: (second as any).error });
        return new Response(
          JSON.stringify({ error: "openai_fetch_failed", detail: (first as any).error ?? (second as any).error }),
          { status: 502 }
        );
      }
    }

    // 5) intent_logs へ保存（DB側 default auth.uid() を利用 / RLS: INSERT with check (user_id = auth.uid())）
    await sb.from("intent_logs").insert({
      media,
      input_text: typeof prompt === "string" ? prompt : JSON.stringify(prompt),
      category_l1: intent.category?.l1 ?? null,
      category_l2: intent.category?.l2 ?? null,
      mode: intent.category?.mode ?? null,
      emotion_id: intent.emotion?.id ?? null,
      style_id: intent.style?.id ?? null,
    });

    return new Response(
      JSON.stringify({
        text,
        modelUsed: model,
        intent: {
          category: intent.category,
          emotion: intent.emotion
            ? { id: intent.emotion.id, sample: intent.emotion.patterns?.[0] ?? null }
            : null,
          style: intent.style
            ? {
                id: intent.style.id,
                voice: intent.style.voice,
                rhythm: intent.style.rhythm,
                sentence_length: intent.media.sentence_length,
                emoji: intent.media.emoji,
              }
            : null,
        },
        userId,
      }),
      { status: 200 }
    );
  } catch (e: any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}
