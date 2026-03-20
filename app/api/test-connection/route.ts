import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/client'
import type { AIConfig } from '@/lib/ai/types'

export async function POST(req: NextRequest) {
  try {
    const { aiConfig, message } = await req.json() as { aiConfig: AIConfig; message?: string }
    const response = await callAI(
      aiConfig,
      'You are a test assistant.',
      message ?? 'Reply with only "OK".',
    )
    return NextResponse.json({ success: true, response })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Connection failed'
    return NextResponse.json({ success: false, error }, { status: 200 })
  }
}
