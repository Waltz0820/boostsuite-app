/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

// ====== ファイル読込ユーティリティ ======
function readText(rel: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
  } catch {
    console.warn(`⚠️ Missing file: ${rel}`);
    return "";
  }
}

// ====== カンマ/改行で語彙抽出 ======
function parseCsvWords(src: string): string[] {
  return src.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
}

// ====== 辞書パース ======
function parseReplaceDict(src: string): Array<{ from: string; to: string }> {
  return src
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#") && l.includes("=>"))
    .map(l => {
      const [from, to] = l.split("=>");
      return { from: from.trim(), to: to.trim() };
    });
}

// ====== ジャンル簡易検出 ======
function detectGenre(text: string): string {
  if (/コート|ジャケット|パンツ|スカート|シャツ|ワンピ/i.test(text)) return "ファッション";
  if (/美顔器|スキンケア|美容液|RF|LED/i.test(text)) return "ビューティー";
  if (/スマート|Bluetooth|イヤホン|バッテリー/i.test(text)) return "ガジェット";
  if (/炊飯器|エアフライヤー|掃除機|トースター/i.test(text)) return "家電";
  return "未指定";
}

// ====== 温度自動設定 ======
function autoTemperature(genre: string): number {
  switch (genre) {
    case "ファッション": return 0.9;
    case "ビューティー": return 0.85;
    case "ガジェット": return 0.8;
    case "家電": return 0.75;
    default: return 0.7;
  }
}

// ====== ファイル読込 ======
const CORE_PROMPT = readText("prompts/bs_prompt_v1_9_0.txt");
const YAKKI_ALL = ["A", "B", "C", "D"]
  .map(t => readText(`prompts/filters/BoostSuite_薬機法フィルター${t}.txt`))
  .join("\n");
const REPLACE_RULES = parseReplaceDict(readText("prompts/filters/Boost_Fashion_置き換え辞書.txt"));
const BEAUTY_WORDS = parseCsvWords(readText("prompts/filters/美顔器キーワード.csv"));

// ====== POST ======
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) throw new Error("XAI_API_KEY not set");

    const genre = detectGenre(prompt);
    const temperature = autoTemperature(genre);

    const userContent = [
      "以下の原文を Boost 構文 v1.9.0（Grok暴れ構文）で“整流”してください。",
      "出力は日本語で、事実ベースを軸に余韻で感情を滲ませてください。",
      "",
      "《Safety Layer｜薬機・景表フィルター》",
      YAKKI_ALL,
      "",
      "《ファッション置換辞書（参考）》",
      REPLACE_RULES.map(r => `- 「${r.from}」=>「${r.to}」`).join("\n"),
      "",
      "《カテゴリ語彙（Beauty）》",
      BEAUTY_WORDS.map(w => `- ${w}`).join("\n"),
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
          { role: "system", content: CORE_PROMPT || "You are Boost Suite refiner." },
          { role: "user", content: userContent },
        ],
        temperature,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), { status: 200 });

  } catch (e: any) {
    console.error("❌ API error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}