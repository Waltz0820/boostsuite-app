import { generateText } from "ai";
import { xai } from "@ai-sdk/xai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { input } = await req.json();

  if (!input) {
    return new Response(JSON.stringify({ error: "No input" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { text } = await generateText({
    model: xai(process.env.XAI_MODEL || "grok-4-fast"),
    prompt: input,
    system:
      "You are Boost Suite's 整流AI. Rewrite product descriptions into persuasive, natural Japanese for e-commerce. Avoid risky expressions (薬機/景表).",
  });

  return new Response(JSON.stringify({ text }), {
    headers: { "Content-Type": "application/json" },
  });
}