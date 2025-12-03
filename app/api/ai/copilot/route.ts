import { generateText } from "ai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { trackAiUsage } from "@/lib/ai/usage";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const {
    apiKey: key,
    model = "gpt-4o-mini",
    prompt,
    system,
  } = await req.json();

  const apiKey = key || process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ai gateway API key." },
      { status: 401 },
    );
  }

  try {
    // Check usage limits
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checkAiUsage, incrementAiUsage } = await import("@/lib/ai/usage");
    const canProceed = await checkAiUsage(user.id);

    if (!canProceed) {
      return NextResponse.json(
        { error: "AI usage limit exceeded for this month." },
        { status: 403 },
      );
    }

    const result = await generateText({
      abortSignal: req.signal,
      maxOutputTokens: 50,
      model: `openai/${model}`,
      prompt,
      system,
      temperature: 0.7,
    });

    // Track usage (fire and forget)
    trackAiUsage(user.id, "copilot_usage", result.usage.totalTokens);
    incrementAiUsage(user.id);

    return NextResponse.json({ text: result.text ?? "" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(null, { status: 408 });
    }

    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 },
    );
  }
}
