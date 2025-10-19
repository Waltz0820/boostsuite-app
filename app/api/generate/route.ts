/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

// ====== ファイル読込ユーティリティ ======
function readText(rel: string): string {
  try {
    const p = path.join(process.cwd(), rel);
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    console.warn(`⚠️  Missing file: ${rel}`);
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

// ====== プロンプト素材 ======
const CORE_PROMPT = readText("prompts/bs_prompt_v1.9.17.txt");

const YAKKI_A = readText("prompts/filters/BoostSuite_薬機法フィルターA.txt");
const YAKKI_B = readText("prompts/filters/BoostSuite_薬機法フィルターB.txt");
const YAKKI_C = readText("prompts/filters/BoostSuite_薬機法フィルターC.txt");
const YAKKI_D = readText("prompts/filters/BoostSuite_薬機法フィルターD.txt");
const YAKKI_ALL = [YAKKI_A, YAKKI_B, YAKKI_C, YAKKI_D].filter(Boolean).join("\n");

const REPLACE_RAW = readText("prompts/filters/Boost_Fashion_置き換え辞書.txt");
const REPLACE_RULES = parseReplaceDict(REPLACE_RAW);

const BEAUTY_CSV = readText("prompts/filters/美顔器キーワード.csv");
const BEAUTY_WORDS = parseCsvWords(BEAUTY_CSV);

// ====== xAI 呼び出し ======
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, jitter = false, variants = 0 } = body ?? {};

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error("XAI_API_KEY is missing on Vercel environment");
      return new Response(JSON.stringify({ error: "XAI_API_KEY not set" }), { status: 500 });
    }

    const system = CORE_PROMPT || "You are Boost Suite copy refiner.";

    const replaceTable =
      REPLACE_RULES.length > 0
        ? REPLACE_RULES.map((r) => `- 「${r.from}」=>「${r.to}」`).join("\n")
        : "（辞書なし）";

    const beautyList =
      BEAUTY_WORDS.length > 0 ? BEAUTY_WORDS.map((w) => `- ${w}`).join("\n") : "（語彙なし）";

    const yakkiBlock = YAKKI_ALL || "（薬機フィルター未設定）";

    const controlLine = jitter
      ? `JITTER=${Math.max(1, Math.min(Number(variants) || 3, 5))} を有効化。余韻のみ微変化し、FACTSは共有。`
      : `JITTERは無効化（安定出力）。`;

    const userContent = [
      "以下の原文を Boost 構文 v1.9.17 で“段階整流”してください。",
      "出力は日本語。FACTSを固定し、最小の余韻＋音の自然さ（PhonoSense）で販売文に整えます。",
      controlLine,
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

    const baseTemp = 0.35;
    const temp = jitter ? 0.45 : baseTemp; // 余韻だけ軽く揺らす

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
        temperature: temp,
        top_p: 0.9,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("xAI API error:", text);
      return new Response(JSON.stringify({ error: text }), { status: 500 });
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (e: any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}