import { NextRequest, NextResponse } from "next/server";
import type { AIConfig } from "@/lib/ai/types";
import { callAI } from "@/lib/ai/client";
import { parseJSON } from "@/lib/ai/prompts";

interface ChunkInfo {
  id: string;
  title: string;
  summary: string;
}

interface Recommendation {
  chunkId: string;
  reason: string;
}

const SYSTEM = `You are a reading coach. Given a list of document sections and which ones the reader flagged as interesting, recommend 2-4 sections worth active reading. Be concise and specific about why each section warrants deeper engagement.`;

function buildPrompt(chunks: ChunkInfo[], flaggedIds: string[]): string {
  const flaggedSet = new Set(flaggedIds);
  const chunkList = chunks.map((c, i) =>
    `Section ${i + 1} [id: ${c.id}]${flaggedSet.has(c.id) ? " ★FLAGGED" : ""}\nSummary: ${c.summary}`
  ).join("\n\n");

  return `The reader just listened to a document. Here are the sections:\n\n${chunkList}\n\nFlagged sections: ${flaggedIds.length > 0 ? flaggedIds.join(", ") : "none"}\n\nReturn JSON:\n{\n  "recommendations": [\n    { "chunkId": "chunk_1", "reason": "one sentence why this is worth active reading" }\n  ]\n}\n\nPrioritize flagged sections. Return 2-4 recommendations. Return ONLY valid JSON.`;
}

function resolveConfig(aiConfig?: AIConfig): AIConfig {
  if (aiConfig?.provider) return aiConfig;
  return { provider: "anthropic", model: "claude-sonnet-4-6", apiKey: process.env.ANTHROPIC_API_KEY };
}

export async function POST(req: NextRequest) {
  try {
    const { chunks, flaggedIds, aiConfig } = await req.json() as {
      chunks: ChunkInfo[];
      flaggedIds: string[];
      aiConfig?: AIConfig;
    };
    if (!chunks?.length) {
      return NextResponse.json({ error: "chunks are required" }, { status: 400 });
    }
    const config = resolveConfig(aiConfig);
    const raw = await callAI(config, SYSTEM, buildPrompt(chunks, flaggedIds ?? []));
    const result = parseJSON<{ recommendations: Recommendation[] }>(raw);
    return NextResponse.json(result);
  } catch (err) {
    console.error("passive-recommendations error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
