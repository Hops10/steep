import { NextRequest, NextResponse } from "next/server";
import { processDocument } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    if (text.trim().length < 100) {
      return NextResponse.json({ error: "Document too short" }, { status: 400 });
    }

    const processed = await processDocument(text);
    return NextResponse.json(processed);
  } catch (err) {
    console.error("process-document error:", err);
    const message = err instanceof Error ? err.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
