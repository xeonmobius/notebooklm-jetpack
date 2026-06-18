/**
 * Minimal dependency-free HTML sanitizer for marked output.
 *
 * Threat model: markdown fed to marked.parse() may contain raw HTML blocks
 * (from Turndown conversion of scraped pages, or from user-supplied .md
 * sources). marked passes raw HTML through unchanged by default. The rendered
 * HTML is later injected into a real tab via CDP Page.setDocumentContent for
 * PDF rendering, so any surviving <script>/<iframe>/on*= handler executes
 * in a live browser context.
 *
 * This module overrides marked's html renderer to strip dangerous tags and
 * attributes while preserving benign inline HTML (<sup>, <u>, tables, etc.)
 * so legitimate document fidelity is not lost.
 *
 * It is defense-in-depth, not a full sanitizer. For contexts that need
 * guarantees use DOMPurify on a real DOM. Here we have no DOM (service worker).
 */

/** Tags whose entire subtree must be removed. */
const DROP_BLOCK_RE = /<\/?(script|style|iframe|object|embed|svg|math|form|button|input|textarea|select|option|noscript|template|link|meta|base|frame|frameset|applet|area|audio|video|source|track)\b[^>]*>/gi;

/** Self-closing void forms of the same tags. Handled by DROP_BLOCK_RE via `[^>]*>`. */

/** Strips the full subtree for container tags that appear in pairs. */
const DROP_SUBTREE_RE = /<(script|style|iframe|object|embed|svg|math|form|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** Event-handler attributes: onclick=, onload=, onerror=, etc. */
const ON_ATTR_RE = /\son[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Dangerous URL schemes in href/src/xlink:href/formaction/action/etc. */
const DANGEROUS_URL_RE = /(href|src|xlink:href|formaction|action|data|poster|background|cite|longdesc|usemap|profile)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** URL schemes we never allow. */
const BLOCKED_SCHEME_RE = /^\s*(javascript|vbscript|data:text\/html|data:application\/x-|file|mhtml|blob:text\/html)/i;

/**
 * Sanitize a raw HTML fragment from a marked token.
 * Returns HTML safe to embed in the PDF document.
 */
export function sanitizeMarkedHtml(html: string): string {
  if (!html || !html.length) return '';

  let out = html;

  // 1. Drop entire subtrees for paired dangerous tags (content too).
  out = out.replace(DROP_SUBTREE_RE, '');

  // 2. Drop any remaining dangerous tags (self-closing or unclosed).
  out = out.replace(DROP_BLOCK_RE, '');

  // 3. Strip all on* event-handler attributes from surviving tags.
  out = out.replace(ON_ATTR_RE, '');

  // 4. Scrub URL-bearing attributes that resolve to a blocked scheme.
  out = out.replace(DANGEROUS_URL_RE, (match) => {
    const valueMatch = match.match(/=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/);
    const value = valueMatch?.[1] ?? valueMatch?.[2] ?? valueMatch?.[3] ?? '';
    if (BLOCKED_SCHEME_RE.test(value)) {
      return ''; // drop the attribute entirely
    }
    return match; // keep benign value
  });

  return out;
}

/**
 * Install the html renderer override on the provided marked instance.
 * Call once at module load. Idempotent — repeated calls re-install the same
 * override with no compounding effect.
 *
 * Usage:
 *   import { marked } from 'marked';
 *   import { installMarkedSanitizer } from '@/lib/marked-sanitize';
 *   installMarkedSanitizer(marked);
 */
export function installMarkedSanitizer(markedInstance: {
  use: (opts: { renderer: { html: (token: { text: string }) => string } }) => unknown;
}): void {
  markedInstance.use({
    renderer: {
      html: ({ text }: { text: string }) => sanitizeMarkedHtml(text),
    },
  });
}
