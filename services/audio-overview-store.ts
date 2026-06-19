// Audio Overview Center — storage for NotebookLM Audio Overviews.
// Mirrors the bookmarks.ts patterns: chrome.storage.local, dedup by notebookId.

import type { AudioOverview } from '@/lib/types';

const STORAGE_KEY = 'nlm_audio_overviews';

export async function getAudioOverviews(): Promise<AudioOverview[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const list = result[STORAGE_KEY] as AudioOverview[] | undefined;
    return list || [];
  } catch {
    return [];
  }
}

/** Upsert by notebookId — re-saving refreshes the audioUrl (mitigates URL expiry). */
export async function saveAudioOverview(overview: AudioOverview): Promise<AudioOverview[]> {
  const list = await getAudioOverviews();
  const idx = list.findIndex((o) => o.notebookId === overview.notebookId);
  const next = { ...overview, collectedAt: Date.now() };
  if (idx >= 0) list[idx] = { ...list[idx], ...next };
  else list.unshift(next);
  await persist(list);
  return list;
}

export async function deleteAudioOverview(notebookId: string): Promise<AudioOverview[]> {
  const list = (await getAudioOverviews()).filter((o) => o.notebookId !== notebookId);
  await persist(list);
  return list;
}

async function persist(list: AudioOverview[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: list });
  } catch {
    /* ponytail: storage unavailable — surface to caller if quota becomes an issue */
  }
}
