import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Use Jina.ai reader for clean text extraction
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: { Accept: "text/markdown" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: 502 }
      );
    }

    const text = await response.text();

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: "Could not extract readable text from URL" },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, sourceUrl: url });
  } catch (err) {
    console.error("ingest-url error:", err);
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 500 });
  }
}
