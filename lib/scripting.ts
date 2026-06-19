/**
 * Cross-browser executeScript.
 *
 * Chrome (MV3): chrome.scripting.executeScript.
 * Firefox (MV2): chrome.tabs.executeScript (chrome.tabs is the polyfilled
 * browser.tabs via chrome-promise-shim, so it's Promise-based).
 *
 * Return shape normalized to MV3's [{result}] so callers work unchanged.
 *
 * Func args are JSON-serialized — functions MUST be self-contained (no closure
 * captures). MV3 already requires this, so any func that works via chrome.scripting
 * today serializes fine for MV2. Async funcs are NOT supported on Firefox MV2
 * (tabs.executeScript can't await an injected Promise) — leave those on
 * chrome.scripting (Chrome-only, fail gracefully elsewhere).
 */

interface InjectionResult<T = unknown> {
  result: T;
}

export async function executeScript<T = unknown>(
  tabId: number,
  opts: { files?: string[]; func?: (...args: unknown[]) => T; args?: unknown[] },
): Promise<InjectionResult<T>[]> {
  if (import.meta.env.BROWSER === 'firefox') {
    if (opts.files) {
      // MV2 injects files sequentially; surface the last file's return (usually undefined).
      let last: unknown;
      for (const file of opts.files) {
        last = await execMv2(tabId, { file });
      }
      return [{ result: last as T }];
    }
    if (opts.func) {
      const argStr = (opts.args ?? []).map((a) => JSON.stringify(a)).join(', ');
      const code = `(${opts.func.toString()})(${argStr})`;
      const result = await execMv2(tabId, { code });
      return [{ result: result as T }];
    }
    return [];
  }

  // Chrome MV3
  if (opts.files) {
    return chrome.scripting.executeScript({
      target: { tabId },
      files: opts.files,
    }) as Promise<InjectionResult<T>[]>;
  }
  if (opts.func) {
    return chrome.scripting.executeScript({
      target: { tabId },
      func: opts.func as (...args: never[]) => T,
      args: (opts.args ?? []) as never[],
    }) as Promise<InjectionResult<T>[]>;
  }
  return Promise.resolve([] as InjectionResult<T>[]);
}

// ponytail: chrome.tabs is the polyfilled browser.tabs on Firefox (Promise-based).
// tabs.executeScript returns one result per frame; default is top frame only,
// so we take the last entry.
async function execMv2(tabId: number, details: { file?: string; code?: string }): Promise<unknown> {
  const results = await (chrome.tabs as unknown as {
    executeScript(tabId: number, details: { file?: string; code?: string }): Promise<unknown[]>;
  }).executeScript(tabId, details);
  return Array.isArray(results) ? results[results.length - 1] : results;
}
