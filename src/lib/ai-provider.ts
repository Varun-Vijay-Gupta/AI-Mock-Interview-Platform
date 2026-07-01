import { parseJsonFromAi } from "@/lib/ai-json";

export type AIProviderName = "local" | "groq" | "openai";

export function getAIProvider(): AIProviderName {
  const value = (process.env.AI_PROVIDER ?? "local").toLowerCase();
  if (value === "groq" && process.env.GROQ_API_KEY) return "groq";
  if (value === "openai" && process.env.OPENAI_API_KEY) return "openai";
  return "local";
}

export function isLocalAI() {
  return getAIProvider() === "local";
}

/** Free local engine — no external API. Optional Groq (free tier) if configured. */
export async function chatJson(system: string, user: string): Promise<string | null> {
  const provider = getAIProvider();
  if (provider === "local") return null;

  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });
    if (!res.ok) {
      console.warn("Groq API error:", await res.text());
      return null;
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? null;
  }

  // openai — only when explicitly configured
  const { getOpenAIClient } = await import("@/lib/openai");
  const completion = await getOpenAIClient().responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return completion.output_text || null;
}

export function parseAiJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  return parseJsonFromAi<T>(raw, fallback);
}
