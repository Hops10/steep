import type { AIConfig } from './types'
import { DEFAULT_AI_CONFIG, AI_CONFIG_STORAGE_KEY } from './types'

export function loadAIConfig(): AIConfig {
  if (typeof window === 'undefined') return DEFAULT_AI_CONFIG
  try {
    const raw = localStorage.getItem(AI_CONFIG_STORAGE_KEY)
    if (!raw) return DEFAULT_AI_CONFIG
    return JSON.parse(raw) as AIConfig
  } catch {
    return DEFAULT_AI_CONFIG
  }
}

export function saveAIConfig(config: AIConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config))
}
