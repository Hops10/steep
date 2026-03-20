import { NextRequest, NextResponse } from 'next/server'
import type { AIConfig } from '@/lib/ai/types'
import { callAI } from '@/lib/ai/client'
import { buildProcessingPrompt, PROCESSING_SYSTEM, parseJSON } from '@/lib/ai/prompts'
import type { ProcessedDocument } from '@/types'

function resolveConfig(aiConfig?: AIConfig): AIConfig {
  if (aiConfig?.provider) return aiConfig
  return {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    apiKey: process.env.ANTHROPIC_API_KEY,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, aiConfig } = body as { text: string; aiConfig?: AIConfig }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    if (text.trim().length < 100) {
      return NextResponse.json({ error: 'Document too short' }, { status: 400 })
    }

    const config = resolveConfig(aiConfig)
    const raw = await callAI(config, PROCESSING_SYSTEM, buildProcessingPrompt(text))
    const processed = parseJSON<ProcessedDocument>(raw)
    return NextResponse.json(processed)
  } catch (err) {
    console.error('process-document error:', err)
    const message = err instanceof Error ? err.message : 'Processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
