import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function estimateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function extractTitle(text: string, fallback = "Untitled Document"): string {
  const firstLine = text.trim().split("\n")[0]?.trim();
  if (firstLine && firstLine.length > 0 && firstLine.length < 120) {
    return firstLine;
  }
  return fallback;
}
