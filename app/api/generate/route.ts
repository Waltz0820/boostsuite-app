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
   OpenAIユーティリティ
========================= */
const isFiveFamily = (m: string) => /^gpt-5($|-)/i.test(m);

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
      // 今回の API では Cookie の書き換えは不要なので no-op を渡す
      set() {},
      remove() {},
    },
  });
}

/* =========================
   推論（カテゴリ→感情→文体）
========================= */
type CategoryRow = {
  l1: string;
  l2: string;
  mode: string;
  pitch_keywords: string[] | null;
};
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

  // 1) カテゴリ推定（簡易）
  let cat: CategoryRow | null = null;
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
  if (!cat) {
    const res = await supabase
      .from("categories")
      .select("l1,l2,mode,pitch_keywords")
      .limit(1);
    cat = res.data?.[0] ?? null;
  }

  // 2) 感情：category_emotion_overrides → emotions
  let emotion: EmotionRow | null = null;
  if (cat) {
    const over = await supabase
      .from("category_emotion_overrides")
      .select("primary_emotion,fallbacks")
      .eq("category_l1", cat.l1)
      .eq("category_l2", cat.l2)
      .maybeSingle();

    const emoId = over.data?.primary_emotion ?? "安心";
    const emoRes = await supabase.from("emotions").select("*").eq("id", emoId).maybeSingle();
    emotion = emoRes.data ?? null;

    if (!emotion) {
      const fb = over.data?.fallbacks?.[0] ?? "安心";
      const fbRes = await supabase.from("emotions").select("*").eq("id", fb).maybeSingle();
      emotion = fbRes.data ?? null;
    }
  }
  if (!emotion) {
    const er = await supabase.from("emotions").select("*").eq("id", "安心").maybeSingle();
    emotion = er.data ?? null;
  }

  // 3) 文体：emotion.tones[0] に一致する style
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

  // 4) 媒体オーバーライド
  let mediaOverride: MediaOverrideRow | null = null;
  if (media) {
    const mr = await supabase.from("media_overrides").select("*").eq("media", media).maybeSingle();
    mediaOverride = mr.data ?? null;
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
   GET: ヘルスチェック（DB疎通）
========================= */
export async function GET() {
  try {
    const supabase = sbRead();
    const { data, error } = await supabase.from("categories").select("l1,l2,mode").limit(1);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, sampleCategory: data?.[0] ?? null }), {
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e?.message ?? String(e) }), {
      status: 500,
    });
  }
}

/* =========================
   POST: 生成 本体（user_id 自動付与）
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

    // 2) DB推論
    const intent = await mapIntentWithDB(String(prompt ?? ""), String(media ?? "ad"));

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
      `- media: ${media} / sentence_length: ${intent.media.sentence_length} / emoji: ${
        intent.media.emoji ? "true" : "false"
      }`,
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

    // 4) OpenAI 実行
    const model = typeof reqModel === "string" && reqModel.trim() ? reqModel.trim() : "gpt-5";
    const baseTemp = 0.35;
    const temp = typeof reqTemp === "number" ? reqTemp : jitter ? 0.45 : baseTemp;

    const payload: Record<string, any> = {
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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("OpenAI API error:", text);
      return new Response(JSON.stringify({ error: text }), { status: 500 });
    }
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";

    // 5) intent_logs へ保存（DB側 default auth.uid() を利用）
    await (await sbServer())
      .from("intent_logs")
      .insert({
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

/* App Router のキャッシュ回避 */
export const dynamic = "force-dynamic";
