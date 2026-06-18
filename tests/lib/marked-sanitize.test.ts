import { describe, it, expect } from 'vitest';
import { sanitizeMarkedHtml } from '@/lib/marked-sanitize';

describe('sanitizeMarkedHtml', () => {
  it('drops <script> blocks entirely (content too)', () => {
    const input = '<script>alert(1)</script><p>ok</p>';
    expect(sanitizeMarkedHtml(input)).toBe('<p>ok</p>');
  });

  it('drops <iframe>, <object>, <embed>, <svg>, <style>, <form> subtrees', () => {
    for (const tag of ['iframe', 'object', 'embed', 'svg', 'style', 'form', 'noscript', 'template']) {
      const out = sanitizeMarkedHtml(`<${tag} src="x">evil</${tag}>`);
      expect(out).not.toContain(tag);
      expect(out).not.toContain('evil');
    }
  });

  it('drops void dangerous tags (link, meta, base)', () => {
    for (const tag of ['link', 'meta', 'base']) {
      expect(sanitizeMarkedHtml(`<${tag} rel="stylesheet" href="evil">`)).toBe('');
    }
  });

  it('strips on*= event handler attributes from surviving tags', () => {
    const out = sanitizeMarkedHtml('<p onclick="steal()" onload="x()" class="safe">hi</p>');
    expect(out).toBe('<p class="safe">hi</p>');
    expect(out).not.toMatch(/\son\w+=/i);
  });

  it('strips href="javascript:" and src="javascript:" but keeps benign URLs', () => {
    const input = '<a href="javascript:alert(1)">x</a><a href="https://ok.com">y</a>';
    const out = sanitizeMarkedHtml(input);
    expect(out).not.toContain('javascript');
    expect(out).toContain('https://ok.com');
  });

  it('strips vbscript: and data:text/html schemes', () => {
    const out = sanitizeMarkedHtml('<a href="vbscript:msgbox(1)">x</a><a href="data:text/html,<script>alert(1)</script>">y</a>');
    expect(out).not.toContain('vbscript');
    expect(out).not.toContain('data:text/html');
  });

  it('preserves benign inline HTML (sup, u, em, tables)', () => {
    const input = '<sup>[1]</sup><u>underline</u><em>em</em>';
    expect(sanitizeMarkedHtml(input)).toBe(input);
  });

  it('preserves table markup (Turndown passthrough)', () => {
    const input = '<table><tr><td>cell</td></tr></table>';
    expect(sanitizeMarkedHtml(input)).toBe(input);
  });

  it('handles empty input', () => {
    expect(sanitizeMarkedHtml('')).toBe('');
  });

  it('handles nested attack vectors', () => {
    // Nested <script> inside what looks like a comment — should still drop
    const input = '<p>text</p><script>var x = "</script>"</script>';
    const out = sanitizeMarkedHtml(input);
    expect(out).not.toContain('<script');
  });

  it('strips formaction and other less-common URL attrs with blocked schemes', () => {
    const out = sanitizeMarkedHtml('<button formaction="javascript:alert(1)">x</button>');
    // button tag itself is dropped, but verify no javascript survives
    expect(out).not.toContain('javascript');
    expect(out).not.toContain('button');
  });
});
