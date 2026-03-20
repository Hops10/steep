import { NextRequest, NextResponse } from "next/server";
import { checkRecall } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  try {
    const { chunkText, userRecall } = await req.json();

    if (!chunkText || !userRecall) {
      return NextResponse.json(
        { error: "chunkText and userRecall are required" },
        { status: 400 }
      );
    }

    const result = await checkRecall(chunkText, userRecall);
    return NextResponse.json(result);
  } catch (err) {
    console.error("check-recall error:", err);
    const message = err instanceof Error ? err.message : "Check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
