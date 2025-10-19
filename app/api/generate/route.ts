/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

// ---------- utils ----------
function readText(rel: string): string {
  try {
    const p = path.join(process.cwd(), rel);
    return fs.readFileSync(p, "utf8");
  } catch {
    console.warn(`⚠️ Missing file: ${rel}`);
    return "";
  }
}
function parseReplaceDict(src: string): Array<{ from: string; to: string }> {
  return src
    .split(/\r?\n/).map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("=>"))
    .map((l) => {
      const [from, to] = l.split("=>");
      return { from: (from ?? "").trim(), to: (to ?? "").trim() };
    })
    .filter((r) => r.from && r.to);
}
function parseCsvWords(src: string): string[] {
  return src.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
}

// ---------- prompt materials ----------
const CORE_PROMPT = readText("prompts/bs_prompt_v1_8_4.txt"); // 内容は1.8.5に更新済みファイルへ
const YAKKI_A = readText("prompts/filters/BoostSuite_薬機法フィルターA.txt");
const YAKKI_B = readText("prompts/filters/BoostSuite_薬機法フィルターB.txt");
const YAKKI_C = readText("prompts/filters/BoostSuite_薬機法フィルターC.txt");
const YAKKI_D = readText("prompts/filters/BoostSuite_薬機法フィルターD.txt");
const YAKKI_ALL = [YAKKI_A, YAKKI_B, YAKKI_C, YAKKI_D].filter(Boolean).join("\n");

const REPLACE_RAW = readText("prompts/filters/Boost_Fashion_置き換え辞書.txt");
const REPLACE_RULES = parseReplaceDict(REPLACE_RAW);

const BEAUTY_CSV = readText("prompts/filters/美顔器キーワード.csv");
const BEAUTY_WORDS = parseCsvWords(BEAUTY_CSV);

// ---------- post filters (No-Invent & Naturalizer) ----------
const bannedSalesWords = [/ご提供/g, /サポートします/g, /寄り添います/g];
const NumberUnit = /\b\d{2,4}\s?(mAh|W|V|℃|度|cm|mm|L|l|ml|g|kg|Hz)\b/gi;
const TechSpecs  = /\b(Bluetooth\s?5\.[0-9]|Wi-?Fi\s?6[E]?|IPX\d|Type[-\s]?C)\b/gi;
const TimeSpecs  = /\b(最大|約)?\d{1,3}(分|時間)\b/gi;

function markUnverified(text: string) {
  return text
    .replace(NumberUnit, (m) => `【未検証:${m}】`)
    .replace(TechSpecs,  (m) => `【未検証:${m}】`)
    .replace(TimeSpecs,  (m) => `【未検証:${m}】`);
}
function softenSalesy(text: string) {
  let t = text;
  bannedSalesWords.forEach((re) => { t = t.replace(re, (m) => `【置換候補:${m}】`); });
  // ます/です終止の3連続を崩す（簡易）
  t = t.replace(/。(.*?)です。([^。]*?)です。/g, "。$1です。$2。");
  return t;
}
function humanScore(text: string) {
  const sentences = text.split(/。|\n/).filter(Boolean);
  let score = 0;

  // 句読点バランス
  const long = sentences.filter(s => s.length >= 36 && s.length <= 58);
  const commasOK = sentences.filter(s => (s.match(/、/g) || []).length <= 2);
  score += Math.min(20, Math.round((long.length / Math.max(1, sentences.length)) * 20));
  score += Math.min(20, Math.round((commasOK.length / Math.max(1, sentences.length)) * 20));

  // 語尾多様性
  const tails = sentences.map(s => s.trim().slice(-1));
  const sameTailRuns = /(.)\1\1/.test(tails.join(""));
  score += sameTailRuns ? 6 : 16; // 粗いが効く

  // 禁止語
  const bannedHit = bannedSalesWords.some(re => re.test(text));
  score += bannedHit ? 8 : 20;

  // 余韻出現率（最後の2文）
  const last2 = sentences.slice(-2).join("。");
  const yoyIn = /(かも|でしょう|広がる|楽しみになる|少し.*なる)/.test(last2) ? 20 : 8;
  score += yoyIn;

  // 比喩節度
  const meta = (text.match(/ような|みたいな/g) || []).length;
  score += meta === 1 ? 20 : meta === 2 ? 16 : meta >= 3 ? 8 : 12;

  return Math.max(0, Math.min(100, score));
}

// ---------- xAI call ----------
async function callGrok(apiKey: string, content: string, temperature = 0.8) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: Bearer ${apiKey} },
    body: JSON.stringify({
      model: "grok-4-fast-non-reasoning",
      messages: [{ role: "system", content: CORE_PROMPT || "You are Boost Suite copy refiner." },
                 { role: "user", content }],
      temperature,
      top_p: 0.9,
      stream: false
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "XAI_API_KEY not set" }), { status: 500 });

    // 共通素材
    const replaceTable = REPLACE_RULES.length
      ? REPLACE_RULES.map(r => `- 「${r.from}」=>「${r.to}」`).join("\n")
      : "（辞書なし）";
    const beautyList = BEAUTY_WORDS.length
      ? BEAUTY_WORDS.map(w => `- ${w}`).join("\n")
      : "（語彙なし）";
    const yakkiBlock = YAKKI_ALL || "（薬機フィルター未設定）";

    // ---- パート別生成（温度の擬似分離）----
    const base = [
      "以下の原文を Boost 構文 v1.8.5 で“整流”してください（日本語）。",
      "《Safety Layer｜薬機・景表 ガイド》", yakkiBlock,
      "《置き換え辞書（参考）》", replaceTable,
      "《カテゴリ語彙（Beauty）参考》", beautyList,
      "— 原文 —",
      typeof prompt === "string" ? String(prompt) : JSON.stringify(prompt)
    ].join("\n");

    const reqLead   = base + "\n\n【出力要件】lead_mode=A/E を優先。余韻2割を必ず適用。";
    const reqBul    = base + "\n\n【出力要件】bullet_mode=自動。機能2割:感性1割:ベネ2割（ジャンルに従う）。事実補完禁止。";
    const reqClose  = base + "\n\n【出力要件】close_mode=E（余韻テンプレ）。宣言→余白の二拍子。";
    const reqSNS    = base + "\n\n【出力要件】SNS要約200字。絵文字1–3個。営業語禁止。";

    const [lead, bullets, close, sns] = await Promise.all([
      callGrok(apiKey, reqLead, 0.95),
      callGrok(apiKey, reqBul, 0.70),
      callGrok(apiKey, reqClose, 0.92),
      callGrok(apiKey, reqSNS, 0.88),
    ]);

    // ---- 結合 & シールド ----
    let text =
`3.1 リード文
${lead}

3.7 バレット
${bullets}

3.6 クロージング
${close}

5. SNS要約
${sns}
`;

    // 事実補完の自動マーキング
    text = markUnverified(text);
    // 営業語・語尾の硬さの緩和
    text = softenSalesy(text);

    // スコア判定（70未満なら1回だけリトライ：closeのみ温度+0.05）
    const score1 = humanScore(text);
    if (score1 < 70) {
      const close2 = await callGrok(apiKey, reqClose + "\n（※語尾の余白をもう少し強める）", 0.97);
      let newText = text.replace(/3\.6 クロージング[\s\S]*?5\. SNS要約/, `3.6 クロージング\n${close2}\n\n5. SNS要約`);
      newText = softenSalesy(markUnverified(newText));
      const score2 = humanScore(newText);
      if (score2 > score1) text = newText;
    }

    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (e: any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}