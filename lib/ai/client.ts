import type { AIConfig } from './types'

export async function callAI(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  switch (config.provider) {
    case 'anthropic': return callAnthropic(config, systemPrompt, userPrompt)
    case 'openai': return callOpenAI(config, systemPrompt, userPrompt)
    case 'gemini': return callGemini(config, systemPrompt, userPrompt)
    case 'grok': return callGrok(config, systemPrompt, userPrompt)
    case 'ollama': return callOllama(config, systemPrompt, userPrompt)
    default: throw new Error(`Unknown provider: ${config.provider}`)
  }
}

async function callAnthropic(config: AIConfig, system: string, user: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: config.apiKey })
  const msg = await client.messages.create({
    model: config.model,
    max_tokens: 8192,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('Unexpected Anthropic response type')
  return block.text
}

async function callOpenAI(config: AIConfig, system: string, user: string): Promise<string> {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: config.apiKey })
  const res = await client.chat.completions.create({
    model: config.model,
    max_tokens: 8192,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  return res.choices[0]?.message?.content ?? ''
}

async function callGemini(config: AIConfig, system: string, user: string): Promise<string> {
  const { GoogleGenAI } = await import('@google/genai')
  const client = new GoogleGenAI({ apiKey: config.apiKey })
  const res = await client.models.generateContent({
    model: config.model,
    contents: `${system}\n\n${user}`,
  })
  return res.text ?? ''
}

async function callGrok(config: AIConfig, system: string, user: string): Promise<string> {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: 'https://api.x.ai/v1',
  })
  const res = await client.chat.completions.create({
    model: config.model,
    max_tokens: 8192,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  return res.choices[0]?.message?.content ?? ''
}

async function callOllama(config: AIConfig, system: string, user: string): Promise<string> {
  const { default: OpenAI } = await import('openai')
  const baseURL = `${config.baseUrl ?? 'http://localhost:11434'}/v1`
  const client = new OpenAI({ apiKey: 'ollama', baseURL })
  const res = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  return res.choices[0]?.message?.content ?? ''
}
