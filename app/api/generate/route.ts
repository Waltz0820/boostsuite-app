/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

/* =========================
   ファイル読込ユーティリティ
========================= */
function readText(rel: string): string {
  try {
    const p = path.join(process.cwd(), rel);
    return fs.readFileSync(p, "utf8");
  } catch {
    console.warn(`⚠️ Missing file: ${rel}`);
    return "";
  }
}

function readJsonSafe<T>(rel: string, fallback: T): T {
  try {
    const p = path.join(process.cwd(), rel);
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    console.warn(`⚠️ Missing or invalid JSON: ${rel}`);
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

/* =========================
   knowledge データ読込
========================= */
type CategoryRow = {
  l1: string;
  l2: string;
  mode: string;
  pitch_keywords?: string[];
};

type EmotionJSON = {
  default_emotion?: string;
  emotions: Array<{
    id: string;
    aliases?: string[];
    tones?: string[];
    patterns?: string[];
    use_for_modes?: string[];
  }>;
  category_overrides?: Array<{
    category: string;
    primary_emotion: string;
    fallbacks?: string[];
  }>;
};

type StyleJSON = {
  styles: Array<{
    id: string;
    voice: string;
    rhythm: string;
    lexicon_plus?: string[];
    lexicon_minus?: string[];
    use_for_modes?: string[];
  }>;
  media_overrides?: Array<{ media: string; sentence_length: string; emoji?: boolean }>;
};

function readCategoryCsv(rel: string): CategoryRow[] {
  const src = readText(rel);
  if (!src) return [];
  const lines = src.split(/\r?\n/).slice(1);
  return lines
    .map((l) => l.split(",").map((s) => s.trim()))
    .filter((c) => c.length >= 3)
    .map(([l1, l2, mode, ...rest]) => ({
      l1,
      l2,
      mode,
      pitch_keywords: rest.filter(Boolean),
    }));
}

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
]
  .filter(Boolean)
  .join("\n");
const REPLACE_RULES = parseReplaceDict(readText("prompts/filters/Boost_Fashion_置き換え辞書.txt"));
const BEAUTY_WORDS = parseCsvWords(readText("prompts/filters/美顔器キーワード.csv"));

/* =========================
   Supabase クライアント
========================= */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function sbRead() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}

async function sbServer() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

/* =========================
   簡易ローカルカテゴリ判定
========================= */
function pickLocalCategory(input: string): CategoryRow | null {
  const text = String(input || "").toLowerCase();

  const direct = LOCAL_CATS.find(
    (c) => text.includes(c.l1.toLowerCase()) || text.includes(c.l2.toLowerCase())
  );
  if (direct) return direct;

  if (/(ギフト|贈り物|プレゼント)/.test(input)) {
    return LOCAL_CATS.find((c) => c.l1 === "ギフト" && c.l2 === "パーソナルギフト") ?? null;
  }
  if (/(入浴剤|バスソルト|バスボム)/.test(input)) {
    return LOCAL_CATS.find((c) => c.l1 === "ギフト" && c.l2 === "パーソナルギフト") ?? null;
  }
  return LOCAL_CATS[0] ?? null;
}

/* =========================
   推論（カテゴリ→感情→文体）
========================= */
type EmotionRow = {
  id: string;
  aliases: string[] | null;
  tones: string[] | null;
  patterns: string[] | null;
  use_for_modes: string[] | null;
};
type StyleRow = {
  id: string;
  voice: string;
  rhythm: string;
  lexicon_plus: string[] | null;
  lexicon_minus: string[] | null;
  use_for_modes: string[] | null;
};
type MediaOverrideRow = { media: string; sentence_length: string; emoji: boolean };

async function mapIntentWithDB(input: string, media: string) {
  const supabase = sbRead();
  let cat: CategoryRow | null = null;

  // DB検索
  const keywords = [
    { q: "%ギフト%", f: "l1" },
    { q: "%入浴剤%", f: "l2" },
  ];
  for (const k of keywords) {
    const res: PostgrestSingleResponse<CategoryRow[]> = await supabase
      .from("categories")
      .select("l1,l2,mode,pitch_keywords")
      .ilike(k.f as any, k.q)
      .limit(1);
    if (!res.error && res.data && res.data.length > 0) {
      cat = res.data[0];
      break;
    }
  }
  // DB無い場合は local CSV
  if (!cat) cat = pickLocalCategory(input);

  // 感情
  let emotion: EmotionRow | null = null;
  const emoId = LOCAL_EMO.default_emotion ?? "安心";
  const emoRes = await supabase.from("emotions").select("*").eq("id", emoId).maybeSingle();
  emotion = emoRes.data ?? null;
  if (!emotion && LOCAL_EMO.emotions.length > 0) {
    const local = LOCAL_EMO.emotions.find((e) => e.id === emoId) ?? LOCAL_EMO.emotions[0];
    emotion = {
      id: local.id,
      aliases: local.aliases ?? [],
      tones: local.tones ?? [],
      patterns: local.patterns ?? [],
      use_for_modes: local.use_for_modes ?? [],
    };
  }

  // 文体
  let style: StyleRow | null = null;
  const toneId = emotion?.tones?.[0] ?? "やわらかい";
  const sr = await supabase.from("styles").select("*").eq("id", toneId).maybeSingle();
  style = sr.data ?? null;
  if (!style) {
    const localS = LOCAL_STYLE.styles.find((s) => s.id === toneId) ?? LOCAL_STYLE.styles[0];
    style = {
      id: localS.id,
      voice: localS.voice,
      rhythm: localS.rhythm,
      lexicon_plus: localS.lexicon_plus ?? [],
      lexicon_minus: localS.lexicon_minus ?? [],
      use_for_modes: localS.use_for_modes ?? [],
    };
  }

  // 媒体
  let sentence_length = "short";
  let emoji = false;
  const localMO = LOCAL_STYLE.media_overrides?.find((m) => m.media === media);
  if (localMO) {
    sentence_length = localMO.sentence_length;
    emoji = !!localMO.emoji;
  }

  return {
    category: cat,
    emotion,
    style,
    media: { id: media, sentence_length, emoji },
  };
}

/* =========================
   GET: ヘルスチェック
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
          cats: LOCAL_CATS.length,
          emos: LOCAL_EMO.emotions.length,
          styles: LOCAL_STYLE.styles.length,
        },
      }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e?.message }), { status: 500 });
  }
}

/* =========================
   POST: 生成本体
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, media = "ad", jitter = false, variants = 0, model: reqModel, temperature: reqTemp } =
      body ?? {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");

    const sb = await sbServer();
    const { data: userRes } = await sb.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const intent = await mapIntentWithDB(String(prompt ?? ""), String(media ?? "ad"));

    const system = CORE_PROMPT || "You are Boost Suite copy refiner.";
    const replaceTable =
      REPLACE_RULES.length > 0
        ? REPLACE_RULES.map((r) => `- 「${r.from}」=>「${r.to}」`).join("\n")
        : "（辞書なし）";
    const beautyList =
      BEAUTY_WORDS.length > 0 ? BEAUTY_WORDS.map((w) => `- ${w}`).join("\n") : "（語彙なし）";
    const yakkiBlock = YAKKI_ALL || "（薬機フィルター未設定）";
    const controlLine = jitter
      ? `JITTER=${Math.max(1, Math.min(Number(variants) || 3, 5))} を有効化。`
      : `JITTERは無効化（安定出力）。`;

    const userContent = [
      "以下の原文を Boost 構文 v1.9.7 で整流してください。",
      controlLine,
      "",
      `カテゴリ: ${intent.category?.l1 ?? ""} > ${intent.category?.l2 ?? ""}`,
      `感情: ${intent.emotion?.id ?? ""}`,
      `文体: ${intent.style?.id ?? ""}`,
      `媒体: ${intent.media.id}`,
      "",
      "《Safety Layer｜薬機・景表 配慮ガイド》",
      yakkiBlock,
      "",
      "《置き換え辞書》",
      replaceTable,
      "",
      "《カテゴリ語彙（Beauty）》",
      beautyList,
      "",
      "— 原文 —",
      typeof prompt === "string" ? String(prompt) : JSON.stringify(prompt),
    ].join("\n");

    const model = reqModel || "gpt-5";
    const temp = typeof reqTemp === "number" ? reqTemp : jitter ? 0.45 : 0.35;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        temperature: temp,
        top_p: 0.9,
      }),
    });

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";

    await sb.from("intent_logs").insert({
      media,
      input_text: prompt,
      category_l1: intent.category?.l1 ?? null,
      category_l2: intent.category?.l2 ?? null,
      mode: intent.category?.mode ?? null,
      emotion_id: intent.emotion?.id ?? null,
      style_id: intent.style?.id ?? null,
    });

    return new Response(
      JSON.stringify({
        text,
        intent,
        userId,
      }),
      { status: 200 }
    );
  } catch (e: any) {
    console.error("API crashed:", e);
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}

export const dynamic = "force-dynamic";
