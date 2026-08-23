const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

export function sanitizeUserText(input: string, maxLength: number): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  return escapeHtml(trimmed.slice(0, maxLength));
}

export function isBlank(input: string): boolean {
  return input.trim().length === 0;
}
