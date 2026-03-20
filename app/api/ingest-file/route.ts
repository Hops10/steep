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

async function extractPdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text ?? "";
}

async function extractDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}
