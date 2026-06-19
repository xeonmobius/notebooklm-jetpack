import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, parseRssXml, parseSitemapXml } from '@/services/dom-workers';

describe('dom-workers (extracted from offscreen/main.ts)', () => {
  it('htmlToMarkdown converts HTML to markdown and pulls the title', () => {
    const html = `<!DOCTYPE html><html><head><title>Ignored</title></head>
      <body><article><h1>Real Title</h1><p>Hello <strong>world</strong></p></article></body></html>`;
    const { markdown, title } = htmlToMarkdown(html);
    expect(title).toBe('Real Title');
    expect(markdown).toContain('Hello');
    expect(markdown).toContain('**world**');
  });

  it('parseRssXml extracts items from an RSS 2.0 feed', () => {
    const xml = `<rss><channel>
      <item><link>https://example.com/a</link><title>A</title><pubDate>Mon</pubDate></item>
    </channel></rss>`;
    const items = parseRssXml(xml);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      url: 'https://example.com/a',
      title: 'A',
      pubDate: 'Mon',
    });
  });

  it('parseSitemapXml extracts page URLs', () => {
    const xml = `<urlset>
      <url><loc>https://x.com/1</loc></url>
      <url><loc>https://x.com/2</loc></url>
    </urlset>`;
    const result = parseSitemapXml(xml);
    expect(result.urls).toEqual(['https://x.com/1', 'https://x.com/2']);
    expect(result.sitemapUrls).toEqual([]);
  });
});
