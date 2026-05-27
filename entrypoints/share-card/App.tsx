import { useState, useEffect, useRef } from 'react';
import { toCanvas } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { marked } from 'marked';
import type { QAPair } from '@/lib/types';

marked.setOptions({ gfm: true, breaks: false });

const QR_URL = 'https://youtu.be/9gPTuJZRHJk';

interface ShareCardData {
  pairs: QAPair[];
  title: string;
  platform: string;
  platformIcon: string;
  url: string;
}

/** Detect Chinese locale */
function isZh(): boolean {
  return navigator.language.startsWith('zh');
}

/** Bilingual strings */
const i18n = {
  question: () => isZh() ? '提问' : 'Question',
  answer: () => isZh() ? '回答' : 'Answer',
  source: () => isZh() ? '来源' : 'Source',
  madeWith: () => isZh()
    ? 'Made with ❤️ by YouTuber「绿皮火车」'
    : 'Made with ❤️ by YouTuber「绿皮火车」',
  platformLabel: (key: string, fallback: string) => {
    const zh: Record<string, string> = {
      claude: 'Claude · AI 对话',
      chatgpt: 'ChatGPT · AI 对话',
      gemini: 'Gemini · AI 对话',
    };
    const en: Record<string, string> = {
      claude: 'Claude · AI Conversation',
      chatgpt: 'ChatGPT · AI Conversation',
      gemini: 'Gemini · AI Conversation',
    };
    const dict = isZh() ? zh : en;
    return dict[key] || `${fallback} · AI`;
  },
};

type ExportFormat = 'jpeg' | 'png' | 'pdf' | 'clipboard' | 'markdown';

export function ShareCardApp() {
  const [data, setData] = useState<ShareCardData | null>(null);
  const [saving, setSaving] = useState(false);
  const [showIsland, setShowIsland] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chrome.storage.local.get('shareCardData', (result) => {
      if (result.shareCardData) {
        setData(result.shareCardData);
        chrome.storage.local.remove('shareCardData');
      }
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filename = data ? buildFilename(data) : 'share-card';
  const pixelRatio = 3;

  // Cache the high-res canvas to avoid re-rendering fonts/DOM on each export
  const canvasCacheRef = useRef<HTMLCanvasElement | null>(null);
  const cacheKeyRef = useRef<string>('');

  const getCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!cardRef.current) throw new Error('Card ref not ready');
    // Invalidate cache when island toggle or content changes
    const key = `${showIsland}-${data?.pairs.length}-${data?.title}`;
    if (canvasCacheRef.current && cacheKeyRef.current === key) {
      return canvasCacheRef.current;
    }
    const canvas = await toCanvas(cardRef.current, {
      pixelRatio,
      backgroundColor: '#f6f1ea',
    });
    canvasCacheRef.current = canvas;
    cacheKeyRef.current = key;
    return canvas;
  };

  const handleSave = async (format: ExportFormat = 'jpeg') => {
    if (!cardRef.current || !data) return;
    setSaving(true);
    setShowDropdown(false);
    try {
      // Markdown + PDF export skip canvas rendering — the pairs are already
      // raw markdown from the Turndown pipeline upstream.
      if (format === 'markdown') {
        downloadText(buildMarkdown(data), `${filename}.md`);
        return;
      }
      if (format === 'pdf') {
        // Render markdown → styled HTML → print-friendly PDF via the docs
        // CDP pipeline in the background (text-selectable, A4, paginated).
        await exportConversationPdf(data);
        return;
      }

      const canvas = await getCanvas();

      if (format === 'jpeg') {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        downloadDataUrl(dataUrl, `${filename}.jpg`);
      } else if (format === 'png') {
        const dataUrl = canvas.toDataURL('image/png');
        downloadDataUrl(dataUrl, `${filename}.png`);
      } else if (format === 'clipboard') {
        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
          }
        }, 'image/png');
      }
    } catch (err) {
      console.error('Failed to save card:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="loading">
        <p>Loading...</p>
      </div>
    );
  }

  const platformKey = data.platform?.toLowerCase() || '';
  const platformLabel = i18n.platformLabel(platformKey, data.platform);

  return (
    <div className="page">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="save-group" ref={dropdownRef}>
          <button
            onClick={() => handleSave('jpeg')}
            disabled={saving}
            className="save-btn"
          >
            {saving ? 'Saving\u2026' : 'Save JPEG'}
          </button>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={saving}
            className="save-btn save-dropdown-toggle"
            aria-label="More formats"
          >
            ▾
          </button>
          {showDropdown && (
            <div className="save-dropdown">
              <button onClick={() => handleSave('png')}>PNG</button>
              <button onClick={() => handleSave('pdf')}>PDF</button>
              <button onClick={() => handleSave('clipboard')}>Clipboard</button>
              <button onClick={() => handleSave('markdown')}>Markdown (.md)</button>
            </div>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showIsland}
            onChange={(e) => setShowIsland(e.target.checked)}
            style={{ accentColor: '#c4553a' }}
          />
          <span className="hint">Dynamic Island</span>
        </label>
        <span className="hint" style={{ marginLeft: 'auto' }}>3x retina</span>
      </div>

      {/* Card preview */}
      <div className="card-wrapper">
        <div ref={cardRef} className="card">
          {/* Safe area for Dynamic Island */}
          {showIsland && (
            <div className="card-safe-area">
              <div className="dynamic-island" />
            </div>
          )}

          {/* Header */}
          <div className="card-header" style={!showIsland ? { paddingTop: 28 } : undefined}>
            <div className="platform-label">{platformLabel}</div>
            <h1 className="card-title">{data.title}</h1>
          </div>

          {/* Q&A pairs */}
          <div className="pairs">
            {data.pairs.map((pair, i) => (
              <div key={pair.id}>
                <div className="pair">
                  {pair.question && (
                    <div className="question-block">
                      <div className="role-label">{i18n.question()}</div>
                      <div className="question-text">{renderMarkdown(pair.question)}</div>
                    </div>
                  )}
                  {pair.answer && (
                    <div className="answer-block">
                      <div className="answer-label">{i18n.answer()}</div>
                      <div className="answer-text">{renderMarkdown(pair.answer)}</div>
                    </div>
                  )}
                </div>
                {i < data.pairs.length - 1 && (
                  <div className="pair-divider">· · ·</div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="card-footer">
            <div className="footer-left">
              <span className="footer-brand">NotebookLM Jetpack</span>
              <span className="footer-made-with">{i18n.madeWith()}</span>
            </div>
            <div className="footer-qr">
              <QRCodeSVG
                value={QR_URL}
                size={52}
                bgColor="transparent"
                fgColor="#8a7e70"
                level="M"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/** Strip characters illegal in filenames; collapse whitespace; cap length. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/**
 * Friendly default download name shared by md/jpg/png/pdf:
 * `{title} - {YYYY-MM-DD}`, falling back to `{platform} 对话 {date}` when the
 * conversation has no title. Date is local time so it matches the user's day.
 */
function buildFilename(data: ShareCardData): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const title = data.title?.trim();
  const base = title
    ? `${title} - ${date}`
    : `${data.platform || 'AI'} ${isZh() ? '对话' : 'Conversation'} ${date}`;
  return sanitizeFilename(base);
}

/** Trigger a download of plain text content (used for the .md export). */
function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/** Anchor-download a base64 payload (used for the PDF bytes from background). */
function downloadBase64(b64: string, filename: string, type: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Render the conversation to a print-friendly PDF via the background's CDP
 * pipeline (same path as the docs export — text-selectable, A4, paginated).
 * The background prints to PDF (needs chrome.debugger) and ships the bytes
 * back; we anchor-download here so the UTF-8 filename is honored.
 * Resolves when the background reports done/error or after a safety timeout.
 */
function exportConversationPdf(data: ShareCardData): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { port.disconnect(); } catch { /* already gone */ }
      resolve();
    };
    const port = chrome.runtime.connect({ name: 'pdf-export' });
    port.onMessage.addListener((msg: { phase?: string; base64?: string; filename?: string }) => {
      if (msg.phase === 'pdf-ready' && msg.base64 && msg.filename) {
        downloadBase64(msg.base64, msg.filename, 'application/pdf');
      }
      if (msg.phase === 'done' || msg.phase === 'error') finish();
    });
    port.onDisconnect.addListener(finish);
    const timer = setTimeout(finish, 90_000);
    port.postMessage({
      type: 'GENERATE_CONVERSATION_PDF',
      data: {
        title: data.title,
        platform: data.platform,
        url: data.url,
        pairs: data.pairs.map((p) => ({ question: p.question, answer: p.answer })),
        isZh: isZh(),
        filename: buildFilename(data),
      },
    });
  });
}

/**
 * Serialize Q&A pairs into a markdown document. The pair.question / pair.answer
 * fields are already raw markdown (Turndown output), so this only adds the
 * scaffolding: H1 title, a source blockquote, bold role labels, and `---`
 * dividers. Role labels are bold text (not headings) so that `##` headings
 * inside an AI answer keep their own hierarchy intact.
 */
function buildMarkdown(data: ShareCardData): string {
  // Pure colon, no trailing space — a space before `**` breaks bold (`**Q: **`).
  const colon = isZh() ? '：' : ':';
  // Source line wants a readable gap after the half-width colon.
  const sourceSep = isZh() ? '' : ' ';
  const blocks: string[] = [];

  if (data.title?.trim()) blocks.push(`# ${data.title.trim()}`);

  const sourceParts = [data.platform, data.url].filter(Boolean).join(' · ');
  if (sourceParts) blocks.push(`> ${i18n.source()}${colon}${sourceSep}${sourceParts}`);

  data.pairs.forEach((pair, i) => {
    if (pair.question?.trim()) {
      blocks.push(`**${i18n.question()}${colon}**\n\n${pair.question.trim()}`);
    }
    if (pair.answer?.trim()) {
      blocks.push(`**${i18n.answer()}${colon}**\n\n${pair.answer.trim()}`);
    }
    if (i < data.pairs.length - 1) blocks.push('---');
  });

  return blocks.join('\n\n') + '\n';
}

/**
 * Render markdown via marked's token AST, mapped to React nodes.
 * Walking the AST (instead of marked's HTML output + dangerouslySetInnerHTML)
 * eliminates the XSS surface from any raw HTML that survives Turndown
 * (e.g. <iframe>, <script>) — unknown tokens just get stringified as text.
 */
function renderMarkdown(md: string): React.ReactNode {
  if (!md?.trim()) return null;
  const tokens = marked.lexer(md);
  return tokens.map((tok, i) => renderBlockToken(tok, `b${i}`));
}

type AnyToken = { type: string; [k: string]: any };

function renderBlockToken(tok: AnyToken, key: string): React.ReactNode {
  switch (tok.type) {
    case 'paragraph':
      return <p key={key}>{renderInlineTokens(tok.tokens)}</p>;
    case 'heading': {
      const level = Math.min(Math.max(tok.depth || 2, 2), 4);
      const Tag = (`h${level}` as 'h2');
      return <Tag key={key}>{renderInlineTokens(tok.tokens)}</Tag>;
    }
    case 'blockquote':
      return (
        <blockquote key={key}>
          {(tok.tokens as AnyToken[]).map((t, i) => renderBlockToken(t, `${key}-${i}`))}
        </blockquote>
      );
    case 'list': {
      const items = (tok.items as AnyToken[]).map((item, i) => (
        <li key={`${key}-${i}`}>
          {(item.tokens as AnyToken[]).map((t, j) =>
            t.type === 'text'
              ? renderInlineTokens((t as any).tokens || [{ type: 'text', text: (t as any).text }])
              : renderBlockToken(t, `${key}-${i}-${j}`)
          )}
        </li>
      ));
      return tok.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
    }
    case 'code':
      return (
        <div key={key} className="code-block">
          {tok.lang && <span className="code-lang">{tok.lang}</span>}
          <pre><code>{tok.text}</code></pre>
        </div>
      );
    case 'hr':
      return <hr key={key} />;
    case 'space':
      return null;
    case 'html':
      // Raw HTML in markdown — render as plain text to avoid XSS.
      return <p key={key}>{tok.raw}</p>;
    default:
      // Fallback: surface raw text without interpretation.
      return tok.raw ? <p key={key}>{tok.raw}</p> : null;
  }
}

function renderInlineTokens(tokens: AnyToken[] | undefined): React.ReactNode {
  if (!tokens) return null;
  return tokens.map((tok, i) => {
    const k = `i${i}`;
    switch (tok.type) {
      case 'text':
        return tok.tokens
          ? <span key={k}>{renderInlineTokens(tok.tokens)}</span>
          : <span key={k}>{tok.text}</span>;
      case 'strong':
        return <strong key={k}>{renderInlineTokens(tok.tokens)}</strong>;
      case 'em':
        return <em key={k}>{renderInlineTokens(tok.tokens)}</em>;
      case 'codespan':
        return <code key={k} className="inline-code">{tok.text}</code>;
      case 'link':
        // Render link text only — no anchor (share image is static, href adds noise)
        return <span key={k}>{renderInlineTokens(tok.tokens)}</span>;
      case 'br':
        return <br key={k} />;
      case 'del':
        return <s key={k}>{renderInlineTokens(tok.tokens)}</s>;
      case 'escape':
        return <span key={k}>{tok.text}</span>;
      case 'html':
        return <span key={k}>{tok.raw}</span>;
      default:
        return tok.raw ? <span key={k}>{tok.raw}</span> : null;
    }
  });
}
