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
 // 1行「A=>B」形式。空行・#コメントは無視
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
 // カンマ/改行区切り
 return src
   .split(/[\r\n,]+/)
   .map((s) => s.trim())
   .filter(Boolean);
}

// ====== プロンプト素材（キャッシュ） ======
const CORE_PROMPT =
 readText("prompts/bs_prompt_v1_9_5.txt") || // v1.9.5 を優先
 readText("prompts/bs_prompt_v1_8_4.txt"); // フォールバック

const YAKKI_A = readText("prompts/filters/BoostSuite_薬機法フィルターA.txt");
const YAKKI_B = readText("prompts/filters/BoostSuite_薬機法フィルターB.txt");
const YAKKI_C = readText("prompts/filters/BoostSuite_薬機法フィルターC.txt");
const YAKKI_D = readText("prompts/filters/BoostSuite_薬機法フィルターD.txt");
const YAKKI_ALL = [YAKKI_A, YAKKI_B, YAKKI_C, YAKKI_D].filter(Boolean).join("\n");

const REPLACE_RAW = readText("prompts/filters/Boost_Fashion_置き換え辞書.txt");
const REPLACE_RULES = parseReplaceDict(REPLACE_RAW);

const BEAUTY_CSV = readText("prompts/filters/美顔器キーワード.csv");
const BEAUTY_WORDS = parseCsvWords(BEAUTY_CSV);

// ====== Dual-Layer 強制ブロック（モデルに厳格に守らせる） ======
const DUAL_LAYER_RULES = [
 "【Dual-Layer 出力規約（厳守）】",
 "- すべての主要ブロックの末尾に [FACT_LAYER] と [RHYTHM_LAYER] を出力すること。",
 "- FACT_LAYER：仕様・数値・機能・比較・安全文言など“事実のみ”。",
 "- RHYTHM_LAYER：語尾・助詞・接続の“余韻”のみ。意味の追加や誇張は禁止。",
 "- RHYTHM_LAYER の許可語尾は次のみ：",
 "  ① ～を支えます。② ～が少し楽になります。③ ～が続けやすくなります。",
 "  ④ ～がちょうどいいと感じます。⑤ ～が日常に馴染みます。",
 "- 『かも／でしょう／かもしれない／未検証／TBD／仮』等の曖昧語・占い語は禁止。",
 "- 未記載スペックの創作・補完は禁止。原文にない数値・主張は書かない。"
].join("\n");

// ====== 出力サニタイズ（最小限） ======
function sanitizeOutput(text: string): string {
 let out = text;

 // 連続する全角・半角スペースや空行を少し整理
 out = out.replace(/[ \t]+\n/g, "\n");
 out = out.replace(/\n{3,}/g, "\n\n");

 // 明示禁止語の残骸を削る（過剰置換は避け、危険語のみ）
 out = out.replace(/未検証[:：]?[^\n]*/g, ""); // 【未検証:xx】行を削除
 out = out.replace(/[［【]未検証[］】]/g, "");

 // FACT/RHYTHMの双方が最低1回は含まれるか軽く確認（失敗時は末尾にテンプレ追記）
 if (!/\[FACT_LAYER\]/.test(out) || !/\[RHYTHM_LAYER\]/.test(out)) {
   out +=
     "\n\n[FACT_LAYER]\n（仕様・機能・根拠をここに簡潔に列挙）\n[RHYTHM_LAYER]\n（許可語尾のいずれかで1-2行）";
 }

 return out;
}

// ====== xAI 呼び出し ======
export async function POST(req: Request) {
 try {
   const body = await req.json().catch(() => ({}));
   const prompt = typeof body?.prompt === "string" ? body.prompt : JSON.stringify(body?.prompt ?? "");
   const userTemperature =
     typeof body?.temperature === "number" && body.temperature >= 0 && body.temperature <= 1
       ? body.temperature
       : undefined;

   const apiKey = process.env.XAI_API_KEY;
   if (!apiKey) {
     console.error("XAI_API_KEY is missing on Vercel environment");
     return new Response(JSON.stringify({ error: "XAI_API_KEY not set" }), { status: 500 });
   }

   const model = process.env.XAI_MODEL || "grok-4-fast-non-reasoning";
   const temperature = userTemperature ?? Number(process.env.XAI_TEMPERATURE ?? 0.5);

   const system = CORE_PROMPT || "You are Boost Suite copy refiner.";

   // 置き換え辞書（参照用）
   const replaceTable =
     REPLACE_RULES.length > 0
       ? REPLACE_RULES.map((r) => `- 「${r.from}」=>「${r.to}」`).join("\n")
       : "（辞書なし）";

   const beautyList = BEAUTY_WORDS.length > 0 ? BEAUTY_WORDS.map((w) => `- ${w}`).join("\n") : "（語彙なし）";

   const yakkiBlock = YAKKI_ALL || "（薬機フィルター未設定）";

   const userContent = [
     "以下の原文を Boost 構文 v1.9.5（Dual-Layer Mode）で“整流”してください。",
     "出力は日本語。まず事実を組み、余韻は許可語尾だけで最小限に。",
     "",
     DUAL_LAYER_RULES,
     "",
     "《Safety Layer｜薬機・景表 ガイド》",
     yakkiBlock,
     "",
     "《置き換え辞書（参考）》",
     replaceTable,
     "",
     "《カテゴリ語彙（Beauty）参考リスト》",
     beautyList,
     "",
     "— 原文 —",
     prompt
   ].join("\n");

   const res = await fetch("https://api.x.ai/v1/chat/completions", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${apiKey}`
     },
     body: JSON.stringify({
       model,
       messages: [
         { role: "system", content: system },
         { role: "user", content: userContent }
       ],
       temperature,
       stream: false
     })
   });

   if (!res.ok) {
     const text = await res.text();
     console.error("xAI API error:", text);
     return new Response(JSON.stringify({ error: text }), { status: 500 });
   }

   const data = await res.json();
   const rawText: string = data?.choices?.[0]?.message?.content ?? "";
   const text = sanitizeOutput(rawText);

   return new Response(JSON.stringify({ text, meta: { model, temperature } }), { status: 200 });
 } catch (e: any) {
   console.error("API route crashed:", e?.stack || e?.message || e);
   return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
 }
}