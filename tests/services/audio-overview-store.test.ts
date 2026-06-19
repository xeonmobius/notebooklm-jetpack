import { describe, it, expect, beforeEach } from 'vitest';
import { resetStorage } from '../setup';
import { getAudioOverviews, saveAudioOverview, deleteAudioOverview } from '@/services/audio-overview-store';
import type { AudioOverview } from '@/lib/types';

const sample = (id: string, title: string): AudioOverview => ({
  notebookId: id,
  notebookTitle: title,
  audioUrl: `https://example.com/${id}.mp3`,
  collectedAt: 0,
});

describe('audio-overview-store', () => {
  beforeEach(() => {
    resetStorage();
  });

  it('saves and lists overviews', async () => {
    await saveAudioOverview(sample('nb1', 'Notebook 1'));
    await saveAudioOverview(sample('nb2', 'Notebook 2'));
    const list = await getAudioOverviews();
    expect(list).toHaveLength(2);
  });

  it('upserts by notebookId — re-save refreshes, no duplicate', async () => {
    await saveAudioOverview(sample('nb1', 'Old Title'));
    await saveAudioOverview({ ...sample('nb1', 'New Title'), audioUrl: 'https://example.com/updated.mp3' });
    const list = await getAudioOverviews();
    expect(list).toHaveLength(1);
    expect(list[0].notebookTitle).toBe('New Title');
    expect(list[0].audioUrl).toBe('https://example.com/updated.mp3');
  });

  it('deletes by notebookId', async () => {
    await saveAudioOverview(sample('nb1', 'A'));
    await saveAudioOverview(sample('nb2', 'B'));
    const remaining = await deleteAudioOverview('nb1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].notebookId).toBe('nb2');
  });
});
