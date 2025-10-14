// app/api/generate/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.XAI_MODEL ?? "grok-4-fast",
      messages: [
        {
          role: "system",
          content: "あなたは日本語の商品説明を自然で売れる表現に整流するAIです。必要に応じてBeauty/Gadgetカテゴリ文体も最適化します。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return new Response(`Grok API Error: ${errText}`, { status: 500 });
  }

  const data = await res.json();

  // ✅ Grokが返す形式に完全対応
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.output?.[0]?.content ??
    "⚠️ Grok応答エラー（demo表示にフォールバック）";

  return Response.json({ text });
}