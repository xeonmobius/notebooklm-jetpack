/**
 * Shared offscreen document manager.
 *
 * MV3 service workers lack DOM APIs (DOMParser, document, etc.).
 * This module ensures a single offscreen document is available and
 * provides helpers to delegate DOM-dependent work to it.
 *
 * On Firefox (MV2 persistent background with DOM natively), the offscreen
 * document doesn't exist — work runs inline via services/dom-workers.
 */

// ponytail: build-time constant. Chrome build dead-code-eliminates the Firefox
// branch (and the dynamic import of dom-workers), so Turndown/DOMParser never
// enter the service-worker bundle.
const isFirefox = import.meta.env.BROWSER === 'firefox';

let offscreenReady = false;

export async function ensureOffscreen(): Promise<void> {
  // Firefox MV2 background has DOM natively; no offscreen document needed.
  if (isFirefox) return;
  if (offscreenReady) return;
  const contexts = await (chrome.runtime as unknown as { getContexts(f: { contextTypes: string[] }): Promise<{ documentUrl: string }[]> })
    .getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length > 0) {
    offscreenReady = true;
    return;
  }
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: 'DOM-dependent operations: HTML→Markdown, XML parsing',
  });
  offscreenReady = true;
  console.log('[offscreen] Document created');
}

/** Send a message to the offscreen document and return the response. */
export function sendOffscreenMessage<T>(message: Record<string, unknown>): Promise<T> {
  if (isFirefox) {
    return runDomWorkerInline<T>(message);
  }
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response?.success) {
        resolve(response as T);
      } else {
        reject(new Error(response?.error || 'Unknown offscreen error'));
      }
    });
  });
}

/**
 * Firefox path: run the DOM workers directly in the persistent background,
 * which has DOMParser/Turndown natively. Dynamic import keeps this code (and
 * Turndown) out of the Chrome service-worker bundle entirely.
 */
async function runDomWorkerInline<T>(message: Record<string, unknown>): Promise<T> {
  const dom = await import('./dom-workers');
  switch (message.type) {
    case 'HTML_TO_MARKDOWN': {
      const result = dom.htmlToMarkdown(message.html as string);
      return { success: true, ...result } as T;
    }
    case 'CONVERT_HTML_BATCH': {
      const markdowns = ((message.htmls as string[]) || []).map(dom.htmlFragmentToMarkdown);
      return { success: true, markdowns } as T;
    }
    case 'PARSE_RSS_XML': {
      const items = dom.parseRssXml(message.xml as string);
      return { success: true, items } as T;
    }
    case 'PARSE_SITEMAP_XML': {
      const result = dom.parseSitemapXml(message.xml as string);
      return { success: true, ...result } as T;
    }
    default:
      throw new Error(`Unknown offscreen message type: ${message.type}`);
  }
}
