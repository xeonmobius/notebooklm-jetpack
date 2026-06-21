/**
 * Targeted cross-browser Promise shim.
 *
 * Firefox MV2's `chrome.*` namespace is callback-only — methods return
 * `undefined` instead of a Promise. The codebase uses Promise form for
 * `chrome.storage.*` and `chrome.tabs.*` (await / .then). Those namespaces
 * are swapped to webextension-polyfill's Promise-based `browser.*` on Firefox.
 *
 * Callback-form calls (`chrome.runtime.sendMessage(msg, cb)`, `chrome.downloads.download`)
 * are LEFT on native chrome — Firefox's `chrome.*` supports callbacks natively,
 * so the ~30 popup sendMessage call sites work unchanged. Reassigning the whole
 * `chrome` (blanket shim) would break those callbacks; this targeted swap doesn't.
 *
 * Chrome: `import.meta.env.BROWSER === 'firefox'` is a build-time constant,
 * Vite dead-code-eliminates the branch, so this file is a no-op there.
 *
 * Import this FIRST in every entrypoint so it runs before any chrome.* call.
 */

import browser from 'webextension-polyfill';

if (import.meta.env.BROWSER === 'firefox') {
  const c = globalThis.chrome as { storage: unknown; tabs: unknown; webRequest: unknown };
  // ponytail: only swap namespaces called in Promise form. Add more here if a
  // Promise-form call surfaces on another namespace (audit: runtime/downloads
  // use callback form and stay native; scripting doesn't exist on MV2 —
  // tracked separately as a tabs.executeScript fallback).
  c.storage = browser.storage;
  c.tabs = browser.tabs;
  // webRequest: Firefox's chrome.webRequest may be incomplete; use the polyfill's.
  c.webRequest = (browser as unknown as { webRequest: typeof chrome.webRequest }).webRequest;
}

export {};
