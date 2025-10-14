// ← 追加
import fs from "node:fs";
import path from "node:path";

// ← 追加: v1.8.4プロンプトをファイルから読み込み
function loadSystemPrompt(): string {
  try {
    const p = path.join(process.cwd(), "prompts", "bs_prompt_v1_8_4.txt");
    return fs.readFileSync(p, "utf8");
  } catch {
    console.warn("⚠️ system prompt ファイルが見つかりません。デフォルト文を使用します。");
    return "You are Boost Suite copy refiner.";
  }
}

const SYSTEM_PROMPT = loadSystemPrompt(); // ← 追加

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error("XAI_API_KEY is missing on Vercel environment");
      return new Response(JSON.stringify({ error: "XAI_API_KEY not set" }), {
        status: 500,
      });
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4-fast-non-reasoning",
        messages: [
          // ↓ 差し替え
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              以下の原文をBoost構文 v1.8.4 で整流してください。 +
              `出力は日本語。\n\n--- 原文 ---\n${prompt}`,
          },
        ],
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("xAI API error:", text);
      return new Response(JSON.stringify({ error: text }), { status: 500 });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (e: any) {
    console.error("API route crashed:", e?.stack || e?.message || e);
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500 }
    );
  }
}