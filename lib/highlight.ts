/**
 * Highlights concept terms in text with clickable spans.
 * Returns HTML string safe for dangerouslySetInnerHTML.
 */
export function highlightConcepts(text: string, terms: string[]): string {
  if (!terms.length) return escapeHtml(text).replace(/\n/g, "<br/>");

  // Sort by length descending to match longer terms first
  const sorted = [...terms].sort((a, b) => b.length - a.length);

  // Build regex from terms (case-insensitive, word boundaries)
  const escaped = sorted.map((t) => escapeRegex(t));
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  const html = escapeHtml(text).replace(
    new RegExp(`\\b(${escaped.map(escapeHtml).join("|")})\\b`, "gi"),
    (match) =>
      `<mark class="concept-highlight" data-concept="${match}" ` +
      `style="background:transparent;border-bottom:2px solid #6366f1;cursor:pointer;` +
      `font-weight:500;color:#4f46e5;">${match}</mark>`
  );

  return html.replace(/\n/g, "<br/>");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
