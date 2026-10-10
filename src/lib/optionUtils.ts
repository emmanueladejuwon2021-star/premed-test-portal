export const OPTION_MARKERS: Record<string, string> = {
  option_a: '\u200B\u200C\u200B',
  option_b: '\u200B\u200D\u200B',
  option_c: '\u200B\uFEFF\u200B',
  option_d: '\u200D\u200C\u200D'
};

export const CORRECT_OPTION_MARKER = '\u200E\u200F\u200E';

/**
 * Extracts the original base option key (option_a/b/c/d) from a potentially shuffled option text.
 * Returns null if no valid marker is found.
 */
export function extractOriginalKey(text: unknown): string | null {
  if (!text) return null;
  const str = String(text);
  if (str.includes('\u200B\u200C\u200B')) return 'option_a';
  if (str.includes('\u200B\u200D\u200B')) return 'option_b';
  if (str.includes('\u200B\uFEFF\u200B')) return 'option_c';
  if (str.includes('\u200D\u200C\u200D')) return 'option_d';
  return null;
}

/**
 * Strips all option markers from the text to make it purely clean text.
 */
export function stripOptionMarkers(text: unknown): string {
  if (!text) return '';
  let clean = String(text);
  clean = clean.replace(/\u200B\u200C\u200B/g, '');
  clean = clean.replace(/\u200B\u200D\u200B/g, '');
  clean = clean.replace(/\u200B\uFEFF\u200B/g, '');
  clean = clean.replace(/\u200D\u200C\u200D/g, '');
  clean = clean.replace(/\u200E\u200F\u200E/g, '');
  return clean;
}

/**
 * Normalizes any option key representations (like 'a', 'b', 'opt_a', 'option_a')
 * to standard 'option_a', 'option_b', 'option_c', 'option_d' keys.
 */
export function normalizeOptionKey(key: unknown): string {
  if (!key) return '';
  const k = String(key).trim().toLowerCase();
  if (k.startsWith('option_')) return k;
  if (k.startsWith('opt_')) return 'option_' + k.substring(4);
  const map: Record<string, string> = {
    a: 'option_a',
    b: 'option_b',
    c: 'option_c',
    d: 'option_d'
  };
  return map[k] || k;
}
