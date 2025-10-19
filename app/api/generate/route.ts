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

// ====== xAI 呼び出し ======
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

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

    // ★ v1.9.2 Rational Flow：最小差分でガードレールを追加
    const userContent = [
      "以下の原文を Boost 構文 v1.8.4 をベースに、“v1.9.2 Rational Flow”で整流してください。",
      "出力は日本語。日本語として耳で読んでも自然で、合理的な余韻を残してください。",
      "",
      "【v1.9.2 追加ルール】",
      "・スペック一回主義：同じ仕様・数値を複数回書かない（重複禁止）。",
      "・補完禁止：原文にない数値や固有仕様を勝手に作らない。わからない場合は書かない（占位語句も禁止）。",
      "・プレースホルダー禁止：「未検証」「置換候補」「[ ] や 【 】での欠落表示」を一切使わない。",
      "・ナチュラル最優先：言い切り過剰・大仰・過度に詩的な表現は避ける。身近な便利さ・合理的余韻で締める。",
      "・quiet適性：ハイブランド/ラグジュアリー想定では情緒を抑制し、カタログ的・寡黙な記述を優先（必要時）。",
      "・構成厳守：各セクションは一度だけ。見出しや順序の重複出力はしない。",
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
        model: "grok-4-fast-non-reasoning", // ここはダッシュボードで許可した正確なモデル名
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        // デフォは柔らかさ寄りに（必要に応じてクライアント側で変更）
        temperature: 0.7,
        stream: false,
        // まれな重複を抑えるため、十分なトークン確保
        max_tokens: 2200,
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