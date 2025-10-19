/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

// ====== ファイル読込ユーティリティ（ビルド時にバンドルされる相対パス） ======
function readText(rel: string): string {
  try {
    const p = path.join(process.cwd(), rel);
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    console.warn(`⚠️  Missing file: ${rel}`);
    return "";
  }
}

function parseReplaceDict(src: string): Array<{ from: string; to: string }> {
  // 1行「A=>B」形式を想定。空行・コメント(#)は無視
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
  // カンマ/改行を区切りに単語を列挙
  return src
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ====== プロンプト素材（キャッシュ） ======
const CORE_PROMPT = readText("prompts/bs_prompt_v1_9_3.txt") || readText("prompts/bs_prompt_v1_8_4.txt"); // フォールバックで1.8.4
const YAKKI_A = readText("prompts/filters/BoostSuite_薬機法フィルターA.txt");
const YAKKI_B = readText("prompts/filters/BoostSuite_薬機法フィルターB.txt");
const YAKKI_C = readText("prompts/filters/BoostSuite_薬機法フィルターC.txt");
const YAKKI_D = readText("prompts/filters/BoostSuite_薬機法フィルターD.txt");
const YAKKI_ALL = [YAKKI_A, YAKKI_B, YAKKI_C, YAKKI_D].filter(Boolean).join("\n");

const REPLACE_RAW = readText("prompts/filters/Boost_Fashion_置き換え辞書.txt");
const REPLACE_RULES = parseReplaceDict(REPLACE_RAW);

const BEAUTY_CSV = readText("prompts/filters/美顔器キーワード.csv");
const BEAUTY_WORDS = parseCsvWords(BEAUTY_CSV);

// ====== 出力サニタイズ（プレースホルダー漏れや重複・過剰空行を軽く除去） ======
function sanitizeLLM(text: string): string {
  if (!text) return text;
  let out = text;

  // 「未検証」「置換候補」等のプレースホルダー漏れを除去
  out = out.replace(/【\s*未検証\s*:[^】]*】/g, "");
  out = out.replace(/【\s*置換候補[^】]*】/g, "");
  out = out.replace(/（?未検証:?[^）]*）?/g, "");

  // 連続する同一行や過剰な空行を抑制
  out = out.replace(/\n{3,}/g, "\n\n");

  // 変な全角スペースの連続を整理
  out = out.replace(/[ \t　]{3,}/g, " ");

  // 先頭尾の余分な空白
  out = out.trim();

  return out;
}

// ====== xAI 呼び出し ======
export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({} as any));
    const { prompt, temperature } = (payload || {}) as {
      prompt?: string;
      temperature?: number;
    };

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'prompt' string" }), { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error("XAI_API_KEY is missing on Vercel environment");
      return new Response(JSON.stringify({ error: "XAI_API_KEY not set" }), { status: 500 });
    }

    // システム/ユーザー連結（安全層＋辞書＋カテゴリ語彙を含める）
    const system = CORE_PROMPT || "You are Boost Suite copy refiner.";

    // 置き換え辞書を LLM に“参照用”として渡す（最終表現はLLM側に任せる）
    const replaceTable =
      REPLACE_RULES.length > 0
        ? REPLACE_RULES.map((r) => `- 「${r.from}」=>「${r.to}」`).join("\n")
        : "（辞書なし）";

    const beautyList =
      BEAUTY_WORDS.length > 0 ? BEAUTY_WORDS.map((w) => `- ${w}`).join("\n") : "（語彙なし）";

    const yakkiBlock = YAKKI_ALL || "（薬機フィルター未設定）";

    // Grokに“禁止事項”を明示（プレースホルダー・未記載のでっち上げ禁止）
    const hardRules = [
      "【厳格ルール】",
      "・原文に無い容量・W数・サイズ等のスペックを補完しない（推測・一般常識での補完も禁止）。",
      "・『未検証』『置換候補』『TBD』『N/A』などのプレースホルダー語を出力しない。",
      "・同じ段落や行を繰り返さない。自然な日本語で、言い切りは控えめに。",
      "・“想像して”“〜してみて”などの過剰な煽りを避け、身近な合理的な余韻で締める。",
    ].join("\n");

    const userContent = [
      "以下の原文を Boost 構文 v1.9.3（論理＋控えめ余韻）で“整流”してください。",
      "出力は日本語。事実ベース8割＋身近な合理的余韻2割。誇張・過度な感情強調は不要。",
      "",
      hardRules,
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
      String(prompt),
    ].join("\n");

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4-fast-non-reasoning",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        temperature:
          typeof temperature === "number" && temperature >= 0 && temperature <= 1
            ? temperature
            : 0.6, // デフォは落ち着いた温度
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("xAI API error:", text);
      return new Response(JSON.stringify({ error: text }), { status: 500 });
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const text = sanitizeLLM(raw);

    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (e: any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}