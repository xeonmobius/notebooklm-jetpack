import { useState, useEffect } from 'react';
import { Download, Trash2, Plus, Headphones } from 'lucide-react';
import type { AudioOverview } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { sanitizeFilename } from '@/services/podcast';

interface Detected {
  notebookId: string;
  notebookTitle: string;
  audioUrl: string;
}

export function AudioCenter({ notebookLMTabId }: { notebookLMTabId: number | null }) {
  const { t } = useI18n();
  const [list, setList] = useState<AudioOverview[]>([]);
  const [current, setCurrent] = useState<Detected | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    chrome.runtime.sendMessage({ type: 'GET_AUDIO_OVERVIEWS' }, (resp) => {
      if (chrome.runtime.lastError) return;
      setList(Array.isArray(resp) ? resp : []);
    });
  };

  useEffect(() => {
    refresh();
    if (notebookLMTabId != null) {
      chrome.runtime.sendMessage({ type: 'DETECT_AUDIO_OVERVIEW', tabId: notebookLMTabId }, (resp) => {
        if (chrome.runtime.lastError) return;
        setCurrent((resp as Detected) || null);
      });
    } else {
      setCurrent(null);
    }
  }, [notebookLMTabId]);

  const saveCurrent = () => {
    if (!current) return;
    setBusy(true);
    chrome.runtime.sendMessage(
      { type: 'SAVE_AUDIO_OVERVIEW', overview: { ...current, collectedAt: Date.now() } },
      (resp) => {
        setBusy(false);
        if (chrome.runtime.lastError) return;
        setList(Array.isArray(resp) ? resp : []);
      },
    );
  };

  const download = (o: AudioOverview) => {
    const filename = `${sanitizeFilename(o.notebookTitle) || 'audio-overview'}.mp3`;
    chrome.runtime.sendMessage({ type: 'DOWNLOAD_AUDIO_OVERVIEW', audioUrl: o.audioUrl, filename });
  };

  const remove = (notebookId: string) => {
    chrome.runtime.sendMessage({ type: 'DELETE_AUDIO_OVERVIEW', notebookId }, (resp) => {
      if (chrome.runtime.lastError) return;
      setList(Array.isArray(resp) ? resp : []);
    });
  };

  return (
    <div className="space-y-3">
      {notebookLMTabId != null && (
        current ? (
          <button
            onClick={saveCurrent}
            disabled={busy}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-notebooklm-blue bg-notebooklm-light hover:bg-notebooklm-blue/15 rounded-lg transition-all btn-press disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('audio.saveCurrent')}
          </button>
        ) : (
          <p className="text-[11px] text-gray-400 text-center py-2">{t('audio.noCurrent')}</p>
        )
      )}

      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center py-8 flex flex-col items-center gap-2">
            <Headphones className="w-6 h-6 opacity-40" />
            {t('audio.empty')}
          </p>
        ) : (
          list.map((o) => (
            <div key={o.notebookId} className="bg-white border border-border rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-900 truncate">{o.notebookTitle}</span>
                <button
                  onClick={() => remove(o.notebookId)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                  title={t('delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* ponytail: in-popup playback may be cross-origin blocked; download is the reliable path. */}
              <audio controls src={o.audioUrl} className="w-full h-8" preload="none" />
              <div className="flex gap-1.5">
                <button
                  onClick={() => download(o)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-all btn-press"
                >
                  <Download className="w-3 h-3" />
                  {t('audio.download')}
                </button>
                <a
                  href={`https://notebooklm.google.com/notebook/${o.notebookId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-all btn-press"
                >
                  {t('audio.openNotebook')}
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
