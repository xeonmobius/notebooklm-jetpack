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
 * today serializes fine for MV2.
 *
 * Async funcs: MV2's tabs.executeScript can't await an injected Promise, so the
 * result is roundtripped via chrome.runtime.sendMessage (a one-shot listener in
 * the background, keyed by a random id). Both sync and async funcs work on MV2.
 */

interface InjectionResult<T = unknown> {
  result: T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunc = (...args: any[]) => any;

export async function executeScript<T = unknown>(
  tabId: number,
  opts: { files?: string[]; func?: AnyFunc; args?: unknown[] },
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
      const fnStr = opts.func.toString();
      const isAsync = opts.func.constructor.name === 'AsyncFunction';
      if (isAsync) {
        const result = await execAsyncFuncMv2(tabId, fnStr, opts.args ?? []);
        return [{ result: result as T }];
      }
      const argStr = (opts.args ?? []).map((a) => JSON.stringify(a)).join(', ');
      const code = `(${fnStr})(${argStr})`;
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

/**
 * MV2 async-func fallback: inject a bootstrap that runs the async func in the
 * page and posts the result back via runtime.sendMessage. The background's
 * one-shot listener (keyed by id) resolves. Timeout cleans up if the tab dies.
 *
 * This is required because tabs.executeScript({code: async-expr}) returns the
 * unawaited Promise object, not the resolved value.
 */
function execAsyncFuncMv2(tabId: number, fnStr: string, args: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const listener = (msg: unknown): true | undefined => {
      if (typeof msg !== 'object' || msg === null) return;
      const m = msg as { __esResult?: string; result?: unknown; error?: string };
      if (m.__esResult !== id) return;
      clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(listener);
      if (m.error) reject(new Error(m.error));
      else resolve(m.result);
      return true;
    };
    const timer = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(new Error('executeScript async roundtrip timeout'));
    }, 30_000);
    chrome.runtime.onMessage.addListener(listener);

    const argStr = args.map((a) => JSON.stringify(a)).join(', ');
    const bootstrap =
      `(async()=>{try{const r=await(${fnStr})(${argStr});` +
      `chrome.runtime.sendMessage({__esResult:${JSON.stringify(id)},result:r})}catch(e){` +
      `chrome.runtime.sendMessage({__esResult:${JSON.stringify(id)},error:String(e)})}})();`;

    (chrome.tabs as unknown as {
      executeScript(tabId: number, details: { code: string }): Promise<unknown>;
    })
      .executeScript(tabId, { code: bootstrap })
      .catch((err: unknown) => {
        clearTimeout(timer);
        chrome.runtime.onMessage.removeListener(listener);
        reject(err);
      });
  });
}
