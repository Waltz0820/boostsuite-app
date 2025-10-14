export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "XAI_API_KEY not set" }), { status: 500 });
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
          { role: "system", content: "You are Boost Suite copy refiner." }, // or 読み込んだv1.8.4
          {
            role: "user",
            content: `以下の原文をBoost構文 v1.8.4 で整流してください。
出力は日本語。

--- 原文 ---
${prompt}`,
          },
        ],
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: text }), { status: 500 });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}