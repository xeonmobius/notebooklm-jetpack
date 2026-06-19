# Audio Overview Center — Design (Lean MVP)

**Date:** 2026-06-19
**Status:** Approved (lean build)

## Goal
Collect NotebookLM Audio Overviews in one place inside the popup; play + download MP3. Reuses existing audio/download/storage plumbing.

## Architecture
1. **`notebooklm.content.ts`** — `DETECT_AUDIO_OVERVIEW` message handler; best-effort scrape of the audio URL from the current notebook page.
2. **`background.ts`** — handlers: `DETECT_AUDIO_OVERVIEW` (forwards to content script), `GET_AUDIO_OVERVIEWS`, `SAVE_AUDIO_OVERVIEW` (upsert), `DELETE_AUDIO_OVERVIEW`, `DOWNLOAD_AUDIO_OVERVIEW` (MP3 via `chrome.downloads`).
3. **`services/audio-overview-store.ts`** — storage CRUD mirroring `bookmarks.ts` patterns. Dedup by `notebookId`.
4. **`components/AudioCenter.tsx`** + new "Audio" tab in `App.tsx` (Radix Tabs). Cards: notebook title, in-popup `<audio controls>`, download MP3, delete.

## Data model
```ts
interface AudioOverview {
  notebookId: string;
  notebookTitle: string;
  audioUrl: string;
  collectedAt: number;
  listened?: boolean;
}
```

## Data flow
Popup opens → if current tab is a notebook, popup asks background to detect → background asks content script → content script scrapes audio URL + notebook id/title → popup shows "Save" → save upserts to store → list reloads. Download = `chrome.downloads.download({url, filename})` (podcast pattern). Upsert-on-save keeps URL fresh (mitigates audio-URL expiry).

## Reuse
- `services/podcast.ts` audio model + `chrome.downloads` path (`background.ts:279`).
- `services/bookmarks.ts` storage patterns.
- Radix Tabs in `App.tsx`.
- `sanitizeFilename` from `services/podcast.ts` for download filenames.

## Scope — YAGNI cuts
- ✅ Detect (current notebook), list, in-popup play, download MP3, delete.
- ❌ Scan-all-notebooks automation (needs audio RPC discovery — defer).
- ❌ Persistent in-page Now-Playing bar, playlists, queue, skip-listened, bulk ZIP.

## Risk
Audio Overview URL location in the DOM is unconfirmed (no browser access to a logged-in NotebookLM during design). Best-effort scrape order: `<audio src>` → `<audio source[src]>` → `[data-audio-url]`. If attempt misses → user tests on real notebook → selector iteration (1 round, no design change).

## Testing
- Store CRUD: unit test (chrome storage mock, like existing tests).
- Detect + UI: manual (user on a real notebook with a generated Audio Overview).

## Effort
~1 day, ~250 lines net.
