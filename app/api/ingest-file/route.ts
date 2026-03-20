import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const type = file.type;
    const name = file.name;

    let text = "";

    if (type === "application/pdf" || name.endsWith(".pdf")) {
      text = await extractPdf(buffer);
    } else if (
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      text = await extractDocx(buffer);
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 422 });
    }

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: "Could not extract readable text from file" },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, filename: name });
  } catch (err) {
    console.error("ingest-file error:", err);
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Heuristic: reconstruct markdown structure from raw PDF text. */
function reconstructMarkdown(rawText: string): string {
  const lines = rawText.split("\n");
  return lines
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (/^[•]\s/.test(t)) return `- ${t.slice(2)}`;
      if (/^[-*]\s/.test(t) || /^\d+\.\s/.test(t)) return t;
      if (t === t.toUpperCase() && t.length > 3 && t.length < 80 && /[A-Z]/.test(t)) {
        return `## ${t}`;
      }
      if (t.length < 60 && t.endsWith(":")) return `### ${t}`;
      return t;
    })
    .join("\n");
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  const raw: string = data.text ?? "";
  return reconstructMarkdown(raw);
}

async function extractDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TurndownModule = require("turndown");
  const TurndownService = TurndownModule.default ?? TurndownModule;
  const result = await mammoth.convertToHtml({ buffer });
  const html: string = result.value ?? "";
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });
  return td.turndown(html);
}
