import { NextRequest, NextResponse } from "next/server";
import type { AIConfig } from "@/lib/ai/types";
import { callAI } from "@/lib/ai/client";
import { parseJSON } from "@/lib/ai/prompts";

interface ReviewRecommendation {
  timing: "1 day" | "1 week" | "1 month";
  focus: string;
}

interface SynthesisResult {
  feedback: string;
  reviewRecommendations: ReviewRecommendation[];
}

const SYSTEM = `You are a reading coach evaluating a reader's synthesis after completing a full document. Your job is to give honest, constructive feedback on their synthesis and recommend a concrete spaced-repetition review schedule.`;

function buildPrompt(
  documentTitle: string,
  chunkSummaries: string[],
  userSynthesis: string
): string {
  const summaryList = chunkSummaries.map((s, i) => `Section ${i + 1}: ${s}`).join("\n");
  return `Document: "${documentTitle}"\n\nDocument sections:\n${summaryList}\n\nReader's synthesis:\n${userSynthesis}\n\nReturn JSON:\n{\n  "feedback": "2-3 sentences of honest, specific feedback on what they captured well and what they glossed over",\n  "reviewRecommendations": [\n    { "timing": "1 day", "focus": "specific section or concept to revisit" }\n  ]\n}\n\nProvide 1-3 review recommendations. Use timing values: "1 day", "1 week", "1 month". Return ONLY valid JSON.`;
}

function resolveConfig(aiConfig?: AIConfig): AIConfig {
  if (aiConfig?.provider) return aiConfig;
  return { provider: "anthropic", model: "claude-sonnet-4-6", apiKey: process.env.ANTHROPIC_API_KEY };
}

export async function POST(req: NextRequest) {
  try {
    const { documentTitle, chunkSummaries, userSynthesis, aiConfig } = await req.json() as {
      documentTitle: string;
      chunkSummaries: string[];
      userSynthesis: string;
      aiConfig?: AIConfig;
    };
    if (!userSynthesis?.trim()) {
      return NextResponse.json({ error: "userSynthesis is required" }, { status: 400 });
    }
    const config = resolveConfig(aiConfig);
    const raw = await callAI(config, SYSTEM, buildPrompt(documentTitle ?? "Untitled", chunkSummaries ?? [], userSynthesis));
    const result = parseJSON<SynthesisResult>(raw);
    return NextResponse.json(result);
  } catch (err) {
    console.error("synthesis error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
