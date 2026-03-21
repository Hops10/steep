// Shared pacer utilities used by ReadingPacer (active) and PassivePacer (passive)

export interface Phrase {
  text: string;
  wordCount: number;
  blockIndex: number;
}

export interface Word {
  text: string;
  blockIndex: number;
}

export const PACER_GRANULARITY_KEY = "steep_pacer_granularity";
export type Granularity = "word" | "phrase";

export function loadGranularity(): Granularity {
  if (typeof window === "undefined") return "phrase";
  const v = localStorage.getItem(PACER_GRANULARITY_KEY);
  return v === "word" ? "word" : "phrase";
}

export function saveGranularity(g: Granularity): void {
  if (typeof window !== "undefined") localStorage.setItem(PACER_GRANULARITY_KEY, g);
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, "").replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "").replace(/^\s*\d+\.\s/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1").replace(/^\s*>\s/gm, "")
    .replace(/^-{3,}$/gm, "").trim();
}

export function splitBlocks(markdown: string): string[] {
  return markdown.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
}

export function blockToPhrases(block: string, blockIndex: number): Phrase[] {
  const words = stripMarkdown(block).split(/\s+/).filter(Boolean);
  const phrases: Phrase[] = [];
  let i = 0;
  while (i < words.length) {
    const ends = (idx: number) => /[.!?]["']?$/.test(words[idx]);
    const group = [words[i]];
    if (!ends(i) && i + 1 < words.length) {
      group.push(words[i + 1]);
      if (!ends(i + 1) && i + 2 < words.length) group.push(words[i + 2]);
    }
    phrases.push({ text: group.join(" "), wordCount: group.length, blockIndex });
    i += group.length;
  }
  return phrases;
}

export function blockToWords(block: string, blockIndex: number): Word[] {
  return stripMarkdown(block).split(/\s+/).filter(Boolean).map(text => ({ text, blockIndex }));
}

/** Build block → [start, end] index ranges for a flat array of items with blockIndex */
export function buildBlockRanges(count: number, items: { blockIndex: number }[]): { start: number; end: number }[] {
  return Array.from({ length: count }, (_, bi) => {
    const start = items.findIndex(p => p.blockIndex === bi);
    const end = start + items.filter(p => p.blockIndex === bi).length - 1;
    return { start, end };
  });
}
