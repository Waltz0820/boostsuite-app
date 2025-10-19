/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

// ====== ファイル読込ユーティリティ ======
function readText(rel: string): string {
  try {
    const p = path.join(process.cwd(), rel);
    return fs.readFileSync(p, "utf8");
  } catch {
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

// ====== プロンプト素材（キャッシュ） ======
const CORE_PROMPT_194 = readText("prompts/bs_prompt_v1_9_4.txt");
const CORE_PROMPT_193 = readText("prompts/bs_prompt_v1_9_3.txt");
const CORE_PROMPT_184 = readText("prompts/bs_prompt_v1_8_4.txt");
const CORE_PROMPT = CORE_PROMPT_194 || CORE_PROMPT_193 || CORE_PROMPT_184 || "You are Boost Suite copy refiner.";

const YAKKI_A = readText("prompts/filters/BoostSuite_薬機法フィルターA.txt");
const YAKKI_B = readText("prompts/filters/BoostSuite_薬機法フィルターB.txt");
const YAKKI_C = readText("prompts/filters/BoostSuite_薬機法フィルターC.txt");
const YAKKI_D = readText("prompts/filters/BoostSuite_薬機法フィルターD.txt");
const YAKKI_ALL = [YAKKI_A, YAKKI_B, YAKKI_C, YAKKI_D].filter(Boolean).join("\n");

const REPLACE_RAW = readText("prompts/filters/Boost_Fashion_置き換え辞書.txt");
const REPLACE_RULES = parseReplaceDict(REPLACE_RAW);

const BEAUTY_CSV = readText("prompts/filters/美顔器キーワード.csv");
const BEAUTY_WORDS = parseCsvWords(BEAUTY_CSV);

// ====== 追加トーンガード（v1.9.3ベース＋最小限の1.9.4学び） ======
const TONE_GUARD = [
  "※ 出力は日本語。誇張・命令・煽り（例: 想像して。〜しよう。〜してみて。）は禁止。",
  "※ 効果の断定や医学的示唆は不可。事実の出典は原文内の記述に限定。創作・推測の数値や寸法を追加しない。",
  "※ 未検証・プレースホルダー（例: 【未検証:〜】）は一切出力しない。",
  "※ 段落やバレットの重複禁止。各モジュールは内容を重ねずに簡潔に。",
  "※ 余韻は“合理的な満足感”で静かに収束させる（比喩・ドラマ・大仰な表現を盛らない）。",
].join("\n");

// ====== xAI 呼び出し ======
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = body?.prompt ?? "";
    // 任意指定: { temperature?: number }
    const reqTemp = typeof body?.temperature === "number" ? body.temperature : undefined;
    const temperature = Number.isFinite(reqTemp) ? Math.max(0, Math.min(1.0, reqTemp as number)) : 0.7;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error("XAI_API_KEY is missing on Vercel environment");
      return new Response(JSON.stringify({ error: "XAI_API_KEY not set" }), { status: 500 });
    }

    const replaceTable =
      REPLACE_RULES.length > 0
        ? REPLACE_RULES.map((r) => `- 「${r.from}」=>「${r.to}」`).join("\n")
        : "（辞書なし）";
    const beautyList =
      BEAUTY_WORDS.length > 0 ? BEAUTY_WORDS.map((w) => `- ${w}`).join("\n") : "（語彙なし）";
    const yakkiBlock = YAKKI_ALL || "（薬機フィルター未設定）";

    const userContent = [
      "以下の原文を Boost 構文 v1.9.3 で“整流”してください。（v1.9.4のトーンガード適用）",
      TONE_GUARD,
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

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4-fast-non-reasoning",
        messages: [
          { role: "system", content: CORE_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature,
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