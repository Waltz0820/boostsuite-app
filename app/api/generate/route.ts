/* eslint-disable no-console */
// app/api/generate/route.ts
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* =========================
   File helpers
========================= */
function readText(rel: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
  } catch {
    console.warn(`⚠️ Missing file: ${rel}`);
    return "";
  }
}
function readJsonSafe<T>(rel: string, fallback: T): T {
  try {
    const txt = readText(rel);
    return txt ? (JSON.parse(txt) as T) : fallback;
  } catch {
    return fallback;
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
function capArray<T>(arr: T[] | null | undefined, n: number): T[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.slice(0, n);
}
function capLines(s: string, maxChars: number): string {
  if (!s) return "";
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars) + "\n…(truncated)";
}

/* =========================
   Local knowledge (optional)
========================= */
type EmotionJSON = {
  emotions: Array<{
    id: string; aliases?: string[]; tones?: string[]; patterns?: string[]; use_for_modes?: string[];
  }>;
  category_overrides?: Array<{ category: string; primary_emotion: string; fallbacks?: string[] }>;
};
type StyleJSON = {
  styles: Array<{
    id: string; voice: string; rhythm: string;
    lexicon_plus?: string[]; lexicon_minus?: string[]; use_for_modes?: string[];
  }>;
  media_overrides?: Array<{ media: string; sentence_length: string; emoji?: boolean }>;
};

const CORE_PROMPT = readText("prompts/bs_prompt_v1.9.7.txt") || readText("prompts/bs_prompt_v1.9.7.txt");
const YAKKI_ALL_RAW = [
  readText("prompts/filters/BoostSuite_薬機法フィルターA.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターB.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターC.txt"),
  readText("prompts/filters/BoostSuite_薬機法フィルターD.txt"),
].filter(Boolean).join("\n");
const REPLACE_RULES = parseReplaceDict(readText("prompts/filters/Boost_Fashion_置き換え辞書.txt"));
const BEAUTY_WORDS = parseCsvWords(readText("prompts/filters/美顔器キーワード.csv"));

const LOCAL_EMO = readJsonSafe<EmotionJSON>("knowledge/EmotionLayer.json", { emotions: [] });
const LOCAL_STYLE = readJsonSafe<StyleJSON>("knowledge/StyleLayer.json", { styles: [] });
// 参考：カテゴリツリーは今回は使わず（DB優先）。必要ならCSVパースを足す。

/* =========================
   OpenAI utils
========================= */
const isFiveFamily = (m: string) => /^gpt-5($|-)/i.test(m);

/* =========================
   Supabase clients
========================= */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function sbRead() {
  if (!SUPABASE_URL || !SUPABASE_ANON) throw new Error("Supabase URL/Anon Key missing");
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}
function sbWriteOrNull() {
  if (!SUPABASE_SERVICE) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
}

/* =========================
   DB mapping (category -> emotion -> style)
========================= */
type CategoryRow = { l1: string; l2: string; mode: string; pitch_keywords: string[] | null };
type EmotionRow = { id: string; aliases: string[] | null; tones: string[] | null; patterns: string[] | null; use_for_modes: string[] | null };
type StyleRow = { id: string; voice: string; rhythm: string; lexicon_plus: string[] | null; lexicon_minus: string[] | null; use_for_modes: string[] | null };
type MediaOverrideRow = { media: string; sentence_length: string; emoji: boolean };

async function mapIntentWithDB(input: string, media: string) {
  const supabase = sbRead();

  // 1) category（簡易）
  let cat: CategoryRow | null = null;
  const kw = [
    { q: "%ギフト%", f: "l1" },
    { q: "%入浴剤%", f: "l2" },
  ];
  for (const k of kw) {
    const r: PostgrestSingleResponse<CategoryRow[]> = await supabase
      .from("categories")
      .select("l1,l2,mode,pitch_keywords")
      .ilike(k.f as any, k.q)
      .limit(1);
    if (!r.error && r.data?.[0]) { cat = r.data[0]; break; }
  }
  if (!cat) {
    const r = await supabase.from("categories").select("l1,l2,mode,pitch_keywords").limit(1);
    cat = r.data?.[0] ?? null;
  }

  // 2) emotion（overrides -> emotions）※ローカルJSONもフォールバックに利用
  let emotion: EmotionRow | null = null;
  if (cat) {
    const over = await supabase
      .from("category_emotion_overrides")
      .select("primary_emotion,fallbacks")
      .eq("category_l1", cat.l1)
      .eq("category_l2", cat.l2)
      .maybeSingle();

    let emoId = over.data?.primary_emotion;
    if (!emoId) {
      // Local override fallback: "l1/l2" 形式
      const key = `${cat.l1}/${cat.l2}`;
      const hit = LOCAL_EMO.category_overrides?.find((o) => o.category === key);
      emoId = hit?.primary_emotion || "安心";
    }

    const emoRes = await supabase.from("emotions").select("*").eq("id", emoId).maybeSingle();
    emotion = emoRes.data ?? null;
    if (!emotion) {
      const fb = over.data?.fallbacks?.[0] || "安心";
      const fbRes = await supabase.from("emotions").select("*").eq("id", fb).maybeSingle();
      emotion = fbRes.data ?? null;
    }
  }
  if (!emotion) {
    const er = await supabase.from("emotions").select("*").eq("id", "安心").maybeSingle();
    emotion = er.data ?? null;
  }

  // 3) style（emotion.tones[0] -> styles）※ローカルJSONもフォールバック
  let style: StyleRow | null = null;
  const toneId = emotion?.tones?.[0];
  if (toneId) {
    const sr = await supabase.from("styles").select("*").eq("id", toneId).maybeSingle();
    style = sr.data ?? null;
  }
  if (!style) {
    const sr = await supabase.from("styles").select("*").eq("id", "やわらかい").maybeSingle();
    style = sr.data ?? null;
  }

  // 4) media override（DB優先、なければローカルStyleLayerのmedia_overrides）
  let mediaOverride: MediaOverrideRow | null = null;
  if (media) {
    const mr = await supabase.from("media_overrides").select("*").eq("media", media).maybeSingle();
    mediaOverride = mr.data ?? null;
  }
  if (!mediaOverride) {
    const mo = LOCAL_STYLE.media_overrides?.find((m) => m.media === media);
    if (mo) {
      mediaOverride = {
        media: mo.media,
        sentence_length: mo.sentence_length,
        emoji: Boolean(mo.emoji),
      };
    }
  }

  return {
    category: cat,
    emotion,
    style,
    media: {
      id: media,
      sentence_length: mediaOverride?.sentence_length ?? "short",
      emoji: mediaOverride?.emoji ?? false,
    },
  };
}

/* =========================
   GET: healthcheck
========================= */
export async function GET() {
  try {
    const supabase = sbRead();
    const { data } = await supabase.from("categories").select("l1,l2,mode").limit(1);
    return new Response(
      JSON.stringify({
        ok: true,
        sampleCategory: data?.[0] ?? null,
        localLoaded: {
          emos: LOCAL_EMO.emotions.length,
          styles: LOCAL_STYLE.styles.length,
        },
      }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e?.message || String(e) }), { status: 500 });
  }
}

/* =========================
   POST: main
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
      console.error("OPENAI_API_KEY missing");
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
    }

    const intent = await mapIntentWithDB(String(prompt ?? ""), String(media ?? "ad"));

    // ===== プロンプトを軽量化して構築 =====
    const system = CORE_PROMPT || "You are Boost Suite copy refiner.";

    const yakkiBlock = capLines(YAKKI_ALL_RAW, 2000); // 2KB まで
    const replaceLines = capArray(REPLACE_RULES, 40).map((r) => `- 「${r.from}」=>「${r.to}」`).join("\n");
    const beautyList = capArray(BEAUTY_WORDS, 80).map((w) => `- ${w}`).join("\n");

    const controlLine = jitter
      ? `JITTER=${Math.max(1, Math.min(Number(variants) || 3, 5))} を有効化。余韻のみ微変化し、FACTSは共有。`
      : `JITTERは無効化（安定出力）。`;

    const intentBlock = [
      "《カテゴリ推論》",
      intent.category
        ? `- カテゴリ: ${intent.category.l1} > ${intent.category.l2}（mode: ${intent.category.mode}）`
        : "- カテゴリ: 不明",
      intent.category?.pitch_keywords?.length
        ? `- 訴求軸: ${capArray(intent.category.pitch_keywords, 6).join("、")}`
        : "- 訴求軸: なし",
      "",
      "《感情推論》",
      intent.emotion
        ? `- 感情: ${intent.emotion.id}（例: ${(intent.emotion.patterns ?? [])[0] ?? "—"}）`
        : "- 感情: 不明",
      "",
      "《文体推論》",
      intent.style
        ? `- トーン: ${intent.style.id}｜${intent.style.voice}／${intent.style.rhythm}`
        : "- 文体: 不明",
      "",
      "《媒体最適化》",
      `- media: ${media} / sentence_length: ${intent.media.sentence_length} / emoji: ${intent.media.emoji ? "true" : "false"}`,
    ].join("\n");

    const userContent = [
      "以下の原文を Boost 構文 v1.9.7 で“段階整流”してください。",
      "出力は日本語。FACTSを固定し、最小の余韻＋音の自然さ（PhonoSense）で販売文に整えます。",
      controlLine,
      "",
      intentBlock,
      "",
      "《Safety Layer｜薬機・景表 配慮ガイド》",
      yakkiBlock || "（薬機フィルター未設定）",
      "",
      "《置き換え辞書（参考）》",
      replaceLines || "（辞書なし）",
      "",
      "《カテゴリ語彙（Beauty）参考リスト》",
      beautyList || "（語彙なし）",
      "",
      "— 原文 —",
      typeof prompt === "string" ? String(prompt) : JSON.stringify(prompt),
    ].join("\n");

    // ===== OpenAI 呼び出し（空返し対策付き） =====
    const baseTemp = 0.35;
    const temp = typeof reqTemp === "number" ? reqTemp : jitter ? 0.45 : baseTemp;

    const defaultModel =
      typeof reqModel === "string" && reqModel.trim() ? reqModel.trim() : "gpt-5";

    const payload: Record<string, any> = {
      model: defaultModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      stream: false,
      max_tokens: 900, // 明示
    };
    if (!isFiveFamily(defaultModel)) {
      payload.temperature = temp;
      payload.top_p = 0.9;
    }

    let res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });

    let data: any = await res.json().catch(() => ({}));
    let text: string =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      "";

    // 1st fallback: gpt-5-mini 同プロンプト
    if (!res.ok || !text?.trim()) {
      const p2 = { ...payload, model: "gpt-5-mini" };
      if (!isFiveFamily(p2.model)) { p2.temperature = temp; p2.top_p = 0.9; }
      const r2 = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(p2),
      });
      const d2: any = await r2.json().catch(() => ({}));
      text =
        d2?.choices?.[0]?.message?.content ??
        d2?.choices?.[0]?.text ??
        text;
    }

    // 2nd fallback: gpt-4o-mini 超軽量プロンプト
    if (!text?.trim()) {
      const litePrompt =
        `以下の原文を広告向けの短い販売文（日本語）に整えてください。\n` +
        `・断定しすぎず、事実＋安全表現\n・媒体: ${media}\n\n— 原文 —\n` +
        String(prompt ?? "");
      const p3: Record<string, any> = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Boost Suite copy refiner." },
          { role: "user", content: litePrompt },
        ],
        stream: false,
        max_tokens: 800,
        temperature: 0.35,
        top_p: 0.9,
      };
      const r3 = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(p3),
      });
      const d3: any = await r3.json().catch(() => ({}));
      text =
        d3?.choices?.[0]?.message?.content ??
        d3?.choices?.[0]?.text ??
        text;
    }

    // 最終ガード
    if (!text?.trim()) {
      text = [
        `[推定ジャンル]: ${intent.category ? `${intent.category.l1} > ${intent.category.l2}` : "不明"}`,
        "",
        "【推奨トーン】",
        intent.style
          ? `- ${intent.style.id}｜${intent.style.voice}／${intent.style.rhythm}`
          : "- 不明",
        "",
        "【媒体最適化】",
        `- media: ${media} / sentence_length: ${intent.media.sentence_length} / emoji: ${intent.media.emoji ? "true" : "false"}`,
        "",
        "【注意】OpenAI応答が空でした。再実行してください。",
      ].join("\n");
    }

    // ===== ログ保存（service key があるときのみ）=====
    const writer = sbWriteOrNull();
    if (writer) {
      await writer.from("intent_logs").insert({
        media,
        input_text: typeof prompt === "string" ? prompt : JSON.stringify(prompt),
        category_l1: intent.category?.l1 ?? null,
        category_l2: intent.category?.l2 ?? null,
        mode: intent.category?.mode ?? null,
        emotion_id: intent.emotion?.id ?? null,
        style_id: intent.style?.id ?? null,
      });
    }

    return new Response(
      JSON.stringify({
        text,
        modelUsed: defaultModel,
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
      }),
      { status: 200 }
    );
  } catch (e: any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}

/* App Router no-cache */
export const dynamic = "force-dynamic";
