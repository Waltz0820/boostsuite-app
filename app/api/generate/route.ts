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

// ====== プロンプト素材（現状あるファイルをそのまま使用） ======
const CORE_PROMPT = readText("prompts/bs_prompt_v1_8_4.txt");

const YAKKI_A = readText("prompts/filters/BoostSuite_薬機法フィルターA.txt");
const YAKKI_B = readText("prompts/filters/BoostSuite_薬機法フィルターB.txt");
const YAKKI_C = readText("prompts/filters/BoostSuite_薬機法フィルターC.txt");
const YAKKI_D = readText("prompts/filters/BoostSuite_薬機法フィルターD.txt");
const YAKKI_ALL = [YAKKI_A, YAKKI_B, YAKKI_C, YAKKI_D].filter(Boolean).join("\n");

const REPLACE_RAW = readText("prompts/filters/Boost_Fashion_置き換え辞書.txt");
const REPLACE_RULES = parseReplaceDict(REPLACE_RAW);

const BEAUTY_CSV = readText("prompts/filters/美顔器キーワード.csv");
const BEAUTY_WORDS = parseCsvWords(BEAUTY_CSV);

// ====== v1.9.6：三層出力ルール（LAYER_RULES） ======
const LAYER_RULES_V196 = [
  "【Boost Suite v1.9.6｜Structured Tone Architecture】",
  "出力末尾に次の3層をこの順で1回だけ出力すること：",
  "[FACT_LAYER] … 仕様・数値・根拠のみ。原文に無い情報は生成禁止（創作禁止）。",
  "[RHYTHM_LAYER] … 助詞・語尾・文間リズムのみ（意味や感情語は禁止）。",
  '[SENSE_LAYER] … 人が想像できる1行シーンだけ（例：「朝の準備が少し楽になります。」）。',
  "",
  "禁止事項：",
  "・原文に無い数値やスペックを生成しない。",
  "・過剰表現（最強/革命/魔法/奇跡/爆〜等）や感嘆符・命令口調は禁止。",
  "・感情表現は「静かな共鳴」レベルまで。",
  "・RHYTHM_LAYERに意味を追加しない。",
].join("\n");

// ====== v1.9.6：出力サニタイズ（誇張語/重複LAYER整理/語尾制御） ======
function sanitizeOutputV196(text: string): string {
  let out = (text || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  // LAYERの最後の1セットだけ残す
  const fact = out.match(/\[FACT_LAYER\][\s\S]*?(?=\n\[|$)/g)?.at(-1) ?? "[FACT_LAYER]\n";
  const rhythmRaw = out.match(/\[RHYTHM_LAYER\][\s\S]*?(?=\n\[|$)/g)?.at(-1) ?? "[RHYTHM_LAYER]\n";
  const sense = out.match(/\[SENSE_LAYER\][\s\S]*?(?=\n\[|$)/g)?.at(-1) ?? "[SENSE_LAYER]\n";

  out = out
    .replace(/\[FACT_LAYER\][\s\S]*?(?=\n\[|$)/g, "")
    .replace(/\[RHYTHM_LAYER\][\s\S]*?(?=\n\[|$)/g, "")
    .replace(/\[SENSE_LAYER\][\s\S]*?(?=\n\[|$)/g, "")
    .trimEnd();

  // 煽り系・誇張語の除去
  const banned = ["革命", "最強", "完璧", "爆", "奇跡", "魔法", "神", "速攻", "沸騰", "震撼"];
  out = out
    .split("\n")
    .filter((line) => !banned.some((b) => line.includes(b)))
    .join("\n");

  // RHYTHM_LAYER を許可語尾のみ残す（意味の追加禁止）
  const allowEndings = [
    "を支えます。",
    "が少し楽になります。",
    "が続けやすくなります。",
    "が日常に馴染みます。",
    "にちょうどいいと感じます。",
  ];
  const rhythmClean =
    "[RHYTHM_LAYER]\n" +
    rhythmRaw
      .replace(/^\[RHYTHM_LAYER\]\s*/m, "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => allowEndings.some((e) => s.endsWith(e)))
      .slice(0, 2)
      .join("\n");

  // 末尾に3層を再付与
  return `${out}\n\n${fact}\n${rhythmClean}\n${sense}`;
}

// ====== xAI 呼び出し ======
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt : JSON.stringify(body?.prompt ?? "");
    const userTemp: number | undefined = typeof body?.temperature === "number" ? body.temperature : undefined;
    const userTopP: number | undefined = typeof body?.top_p === "number" ? body.top_p : undefined;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error("XAI_API_KEY is missing on Vercel environment");
      return new Response(JSON.stringify({ error: "XAI_API_KEY not set" }), { status: 500 });
    }

    const system = CORE_PROMPT || "You are Boost Suite copy refiner.";

    // 置き換え辞書（参照用）
    const replaceTable =
      REPLACE_RULES.length > 0
        ? REPLACE_RULES.map((r) => `- 「${r.from}」=>「${r.to}」`).join("\n")
        : "（辞書なし）";

    const beautyList = BEAUTY_WORDS.length > 0 ? BEAUTY_WORDS.map((w) => `- ${w}`).join("\n") : "（語彙なし）";
    const yakkiBlock = YAKKI_ALL || "（薬機フィルター未設定）";

    // v1.9.6 ユーザー向けプロンプト
    const userContent = [
      "以下の原文を Boost 構文 v1.9.6 で“整流”してください。",
      "出力は日本語。事実＝8割、余韻＝2割（静かな共鳴）で、誇張は避けること。",
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
      "《三層出力ルール》",
      LAYER_RULES_V196,
      "",
      "— 原文 —",
      prompt,
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
        // デフォは精度寄せ。必要ならリクエストJSONで上書き可（temperature/top_p）
        temperature: userTemp ?? 0.55,
        top_p: userTopP ?? 0.9,
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
    const text = sanitizeOutputV196(raw);

    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (e: any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}