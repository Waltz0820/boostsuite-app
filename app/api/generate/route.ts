export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error('XAI_API_KEY is missing on Vercel environment');
      return new Response(JSON.stringify({ error: 'XAI_API_KEY not set' }), { status: 500 });
    }

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4-fast-non-reasoning', // ← ここは君が権限ONにしたモデル名に合わせる
        messages: [
          { role: 'system', content: 'You are Boost Suite copy refiner.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('xAI API error:', text);
      return new Response(JSON.stringify({ error: text }), { status: 500 });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (e: any) {
    console.error('API route crashed:', e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}