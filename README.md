# Steep — Active Reading for Professionals

AI-powered reading comprehension tool with structured active reading and adversarial questioning.

## What it does

**Sprint 1 — Active Reading Mode** (built)
- Load documents via paste, URL, PDF, or Word (.docx)
- AI processes document into logical chunks with summaries, concepts, and Socratic questions
- 6-step active reading loop per chunk: predict → overview → read → recall → feedback → challenge
- Concept Well: click any highlighted term → definition, mechanism, linked concepts (with recursive navigation)
- Progress tracking (unread/read) persisted to localStorage

**Sprint 2 — Passive Mode** (designed for, not built)
- TTS with bidirectional voice
- `heard` status distinct from `read` — hooks exist, never conflated

## Tech Stack

- Next.js 15 (App Router, TypeScript strict)
- Tailwind CSS
- Anthropic Claude API (`claude-sonnet-4-6`)
- pdf-parse + mammoth for file ingestion
- Jina.ai reader for URL fetching
- localStorage for persistence (no auth/DB)

## Setup

```bash
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY
npm install
npm run dev
```

## Architecture

```
app/
  api/
    ingest-url/       → Jina.ai URL fetching
    ingest-file/      → PDF + Word extraction
    process-document/ → Claude AI processing pipeline
    check-recall/     → Recall comparison + feedback
components/
  ingestion/          → DocumentIngestion (4 input modes)
  reading/            → ChunkReader, ReaderView, DocumentSidebar, ProcessingView
  concepts/           → ConceptPanel (recursive navigation)
  ui/                 → Button, Textarea, Badge
lib/
  anthropic.ts        → Claude API client
  storage.ts          → localStorage persistence
  highlight.ts        → Concept term highlighting
  utils.ts            → Shared utilities
types/index.ts        → All TypeScript interfaces
```

## Design Principles

1. **Adversarial layer is the differentiator** — Socratic questioning challenges the *document*, not just comprehension
2. **Concept Well** supports recursive definition diving with full breadcrumb navigation
3. **Clean, professional UI** — not a consumer app
4. **Sprint 2 hooks** — `heard` status, passive mode architecture ready but not implemented
