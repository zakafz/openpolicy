import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  const { messages, system } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
    system: system || "You are a helpful writing assistant.",
  });

  return result.toTextStreamResponse();
}
