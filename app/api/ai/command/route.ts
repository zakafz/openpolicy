import { createOpenAI } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

export const runtime = "edge";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { messages, system } = await req.json();

    const coreMessages = convertToCoreMessages(messages);

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: coreMessages,
      system: system || "You are a helpful writing assistant.",
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
