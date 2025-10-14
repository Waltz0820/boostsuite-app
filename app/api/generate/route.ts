// app/api/generate/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.XAI_API_KEY;
    const model = process.env.XAI_MODEL || "grok-4-fast";

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a precise Japanese rewriting AI for e-commerce listings." },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`xAI API error: ${text}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "(no response)";
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json({ text: "⚠️ Grok応答エラー（demo表示にフォールバック）" }, { status: 500 });
  }
}