import { NextRequest, NextResponse } from 'next/server'
import type { AIConfig } from '@/lib/ai/types'
import { callAI } from '@/lib/ai/client'
import { buildRecallPrompt, RECALL_SYSTEM, parseJSON } from '@/lib/ai/prompts'

interface RecallResult {
  feedback: string
  gaps: string[]
  strengths: string[]
}

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
    const { chunkText, userRecall, aiConfig } = body as {
      chunkText: string
      userRecall: string
      aiConfig?: AIConfig
    }

    if (!chunkText || !userRecall) {
      return NextResponse.json(
        { error: 'chunkText and userRecall are required' },
        { status: 400 },
      )
    }

    const config = resolveConfig(aiConfig)
    const raw = await callAI(config, RECALL_SYSTEM, buildRecallPrompt(chunkText, userRecall))
    const result = parseJSON<RecallResult>(raw)
    return NextResponse.json(result)
  } catch (err) {
    console.error('check-recall error:', err)
    const message = err instanceof Error ? err.message : 'Check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
