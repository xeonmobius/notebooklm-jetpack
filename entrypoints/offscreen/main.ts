/**
 * Offscreen document — provides DOM environment for HTML→Markdown conversion.
 * Service workers can't use DOMParser/Turndown reliably, so we delegate here.
 *
 * The actual DOM work lives in services/dom-workers.ts (shared with the
 * Firefox MV2 background, which has DOM natively and skips this document).
 */
import '@/lib/chrome-promise-shim';
import {
  htmlToMarkdown,
  htmlFragmentToMarkdown,
  parseRssXml,
  parseSitemapXml,
} from '@/services/dom-workers';

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'HTML_TO_MARKDOWN') {
    try {
      const result = htmlToMarkdown(msg.html);
      sendResponse({ success: true, ...result });
    } catch (err) {
      console.error('[offscreen] htmlToMarkdown error:', err);
      sendResponse({ success: false, error: String(err) });
    }
    return true;
  }

  if (msg.type === 'CONVERT_HTML_BATCH') {
    try {
      const htmls = (msg.htmls as string[]) || [];
      const markdowns = htmls.map(htmlFragmentToMarkdown);
      sendResponse({ success: true, markdowns });
    } catch (err) {
      console.error('[offscreen] CONVERT_HTML_BATCH error:', err);
      sendResponse({ success: false, error: String(err) });
    }
    return true;
  }

  if (msg.type === 'PARSE_RSS_XML') {
    try {
      const items = parseRssXml(msg.xml);
      sendResponse({ success: true, items });
    } catch (err) {
      console.error('[offscreen] parseRssXml error:', err);
      sendResponse({ success: false, error: String(err) });
    }
    return true;
  }

  if (msg.type === 'PARSE_SITEMAP_XML') {
    try {
      const result = parseSitemapXml(msg.xml);
      sendResponse({ success: true, ...result });
    } catch (err) {
      console.error('[offscreen] parseSitemapXml error:', err);
      sendResponse({ success: false, error: String(err) });
    }
    return true;
  }
});

console.log('[offscreen] Ready');
